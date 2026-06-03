from __future__ import annotations

import argparse
import json
import mimetypes
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from urllib.parse import parse_qs, urlparse
from modules.plugin_manager import get_all_plugins, get_plugin, load_all_plugins
from modules.plugin_trainer import train_plugin_model

from healthyai_service import (
    DEFAULT_PROFILE,
    ai_advice,
    analyze_profile,
    diet_recommendations,
    medication_report,
    reference_payload,
    search_drugs,
)


PROJECT_DIR = Path(__file__).resolve().parent
STATIC_DIR = PROJECT_DIR / "frontend" / "dist"


def _json_default(value):
    if isinstance(value, set):
        return sorted(value)
    if hasattr(value, "item"):
        return value.item()
    raise TypeError(f"Object of type {type(value).__name__} is not JSON serializable")


class HealthyAIHandler(BaseHTTPRequestHandler):
    server_version = "HealthyAIAPI/1.0"

    def end_headers(self):
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        super().end_headers()

    def do_OPTIONS(self):
        self.send_response(204)
        self.end_headers()

    def do_GET(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/") or "/"

        if path == "/api/health":
            self._send_json(200, {"ok": True, "service": "healthyai"})
            return

        if path == "/api/default-profile":
            self._send_json(200, {"profile": DEFAULT_PROFILE})
            return

        if path == "/api/reference":
            self._send_json(200, reference_payload())
            return

        if path == "/api/drugs":
            params = parse_qs(parsed.query)
            search = params.get("search", [""])[0]
            limit = int(params.get("limit", ["100"])[0])
            self._send_json(200, search_drugs(search=search, limit=limit))
            return
        
        # Trả về danh sách rút gọn các bệnh để Frontend làm Menu thả xuống
        if path == "/api/plugins":
            plugins = get_all_plugins()
            plugin_list = [
                {"disease_id": pid, "disease_name": pdata.get("name", "Chưa đặt tên")}
                for pid, pdata in plugins.items()
            ]
            self._send_json(200, plugin_list)
            return

        # Trả về toàn bộ file cấu hình JSON của một bệnh cụ thể
        if path.startswith("/api/plugins/"):
            # Lấy mã bệnh từ URL (ví dụ: /api/plugins/diabetes -> diabetes)
            plugin_id = path.split("/")[-1]
            plugin_data = get_plugin(plugin_id)
            
            if plugin_data:
                self._send_json(200, plugin_data)
            else:
                self._send_json(404, {"error": f"Không tìm thấy cấu hình cho bệnh: {plugin_id}"})
            return

        self._serve_static(parsed.path)

    def do_POST(self):
        parsed = urlparse(self.path)
        path = parsed.path.rstrip("/")

        try:
            payload = self._read_json()

            if path == "/api/analyze":
                self._send_json(200, analyze_profile(payload.get("profile", payload)))
                return

            if path == "/api/diet":
                self._send_json(200, diet_recommendations(payload.get("profile", payload)))
                return

            if path == "/api/medications/check":
                selected_drugs = payload.get("selected_drugs") or payload.get("drugs") or []
                self._send_json(200, medication_report(payload.get("profile", {}), selected_drugs))
                return

            if path == "/api/advice":
                self._send_json(200, ai_advice(payload.get("profile", payload)))
                return

            if path.startswith("/api/plugins/") and path.endswith("/train"):
                plugin_id = path.split("/")[-2]  # /api/plugins/diabetes/train → diabetes
                plugin = get_plugin(plugin_id)
                if not plugin:
                    self._send_json(404, {"error": f"Không tìm thấy plugin: {plugin_id}"})
                    return

                # Đọc CSV từ request body dạng raw bytes
                length = int(self.headers.get("Content-Length", "0"))
                if length == 0:
                    self._send_json(400, {"error": "Thiếu file CSV trong request body"})
                    return

                csv_bytes = self.rfile.read(length)
                result = train_plugin_model(plugin_id, plugin, csv_bytes)

                if result["ok"]:
                    load_all_plugins()  # Reload cache để ml_model.enabled = true có hiệu lực ngay
                    self._send_json(200, result)
                else:
                    self._send_json(500, result)
                return

            self._send_json(404, {"error": "Không tìm thấy endpoint"})
        except Exception as exc:
            self._send_json(500, {"error": str(exc)})

    def _read_json(self) -> dict:
        length = int(self.headers.get("Content-Length", "0"))
        if length == 0:
            return {}
        raw = self.rfile.read(length)
        if not raw:
            return {}
        return json.loads(raw.decode("utf-8"))

    def _send_json(self, status: int, payload: dict):
        body = json.dumps(payload, ensure_ascii=False, default=_json_default).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def _serve_static(self, request_path: str):
        if not STATIC_DIR.exists():
            self._send_json(
                404,
                {
                    "error": "Chưa có frontend build. Chạy `npm run build` trong thư mục frontend hoặc dùng Vite dev server.",
                },
            )
            return

        clean_path = request_path.lstrip("/")
        target = (STATIC_DIR / clean_path).resolve()
        if request_path in ("", "/") or not target.exists() or STATIC_DIR.resolve() not in target.parents:
            target = STATIC_DIR / "index.html"

        if not target.exists():
            self._send_json(404, {"error": "Không tìm thấy file frontend"})
            return

        content = target.read_bytes()
        content_type, _ = mimetypes.guess_type(str(target))
        self.send_response(200)
        self.send_header("Content-Type", content_type or "application/octet-stream")
        self.send_header("Content-Length", str(len(content)))
        self.end_headers()
        self.wfile.write(content)

    def log_message(self, format, *args):
        print(f"[HealthyAI] {self.address_string()} - {format % args}")


def main():
    parser = argparse.ArgumentParser(description="HealthyAI API server")
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8000)
    args = parser.parse_args()

    server = ThreadingHTTPServer((args.host, args.port), HealthyAIHandler)
    print(f"HealthyAI API đang chạy tại http://{args.host}:{args.port}")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n[HealthyAI] Đang tiến hành đóng các kết nối socket an toàn...")
    finally:
        server.server_close()
        print("[HealthyAI] Server đã tắt hoàn toàn. Hẹn gặp lại!")


if __name__ == "__main__":
    main()
