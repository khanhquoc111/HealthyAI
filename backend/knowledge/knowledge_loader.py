import json
import time
from pathlib import Path
from typing import Dict, List

from knowledge.knowledge_schema import KnowledgeArticle

class KnowledgeLoader:
    def __init__(self, articles_dir: Path = None):
        # Cố định đường dẫn tuyệt đối đến thư mục 'articles' cùng cấp với file này
        if articles_dir is None:
            self.articles_dir = Path(__file__).resolve().parent / "articles"
        else:
            self.articles_dir = Path(articles_dir)
            
        # Đảm bảo thư mục articles luôn tồn tại để tránh lỗi khi lưu file lần đầu
        self.articles_dir.mkdir(parents=True, exist_ok=True)
            
        self._cache = {}
        self._last_modified = {}

    def load_article(self, article_id: str, force_reload: bool = False) -> Dict:
        article_path = self.articles_dir / f"{article_id}.json"

        if not article_path.exists():
            raise FileNotFoundError(f"Knowledge article '{article_id}' not found at {article_path}")

        current_mtime = article_path.stat().st_mtime

        if (
            force_reload
            or article_id not in self._cache
            or self._last_modified.get(article_id) != current_mtime
        ):
            with open(article_path, "r", encoding="utf-8") as f:
                data = json.load(f)

            validated = KnowledgeArticle(**data)
            self._cache[article_id] = validated.model_dump()
            self._last_modified[article_id] = current_mtime

            print(f"🔄 Knowledge '{article_id}' loaded at {time.strftime('%H:%M:%S')}")

        return self._cache[article_id]

    def list_articles(self) -> List[Dict]:
        articles = []
        for file in self.articles_dir.glob("*.json"):
            try:
                article_id = file.stem
                article = self.load_article(article_id)
                articles.append({
                    "id": article["id"],
                    "name": article["name"],
                    "category": article["category"],
                    "summary": article["summary"]
                })
            except Exception as e:
                # In ra lỗi chi tiết thay vì im lặng continue
                print(f"❌ Lỗi khi tải bài viết '{file.name}': {e}")
                continue

        return sorted(articles, key=lambda x: x["name"])
        
    def save_article(self, article_data: Dict) -> Dict:
        """Lưu hoặc cập nhật bài viết dạng JSON."""
        article_id = article_data.get("id")
        if not article_id:
            raise ValueError("Thiếu trường 'id' trong dữ liệu bài viết.")
            
        # Xác thực dữ liệu qua Pydantic schema trước khi lưu
        validated_article = KnowledgeArticle(**article_data)
        
        # Tạo đường dẫn lưu file
        article_path = self.articles_dir / f"{article_id}.json"
        
        # Ghi dữ liệu ra file
        with open(article_path, "w", encoding="utf-8") as f:
            json.dump(validated_article.model_dump(), f, ensure_ascii=False, indent=4)
            
        print(f"✅ Đã lưu file thành công: {article_path}")
        
        # Tải lại vào bộ nhớ cache để trả về
        return self.load_article(article_id, force_reload=True)

    def reload_article(self, article_id: str):
        self.load_article(article_id, force_reload=True)

    def clear_cache(self):
        self._cache.clear()
        self._last_modified.clear()
    
    def delete_article(self, article_id: str) -> bool:
        """Xóa bài viết JSON khỏi hệ thống."""
        article_path = self.articles_dir / f"{article_id}.json"
        
        if article_path.exists():
            article_path.unlink() # Xóa file vật lý
            
            # Xóa khỏi cache nếu đang tồn tại
            if article_id in self._cache:
                del self._cache[article_id]
            if article_id in self._last_modified:
                del self._last_modified[article_id]
                
            print(f"🗑️ Đã xóa file: {article_path}")
            return True
        else:
            raise FileNotFoundError(f"Không tìm thấy bài viết '{article_id}' để xóa.")