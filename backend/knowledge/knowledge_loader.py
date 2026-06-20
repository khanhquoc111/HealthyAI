import json
import time
from pathlib import Path
from typing import Dict, List

from knowledge.knowledge_schema import KnowledgeArticle

class KnowledgeLoader:
    def __init__(self, articles_dir: Path = None):
        # Sửa lỗi: Cố định đường dẫn tuyệt đối đến thư mục 'articles' cùng cấp với file này
        if articles_dir is None:
            self.articles_dir = Path(__file__).resolve().parent / "articles"
        else:
            self.articles_dir = Path(articles_dir)
            
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

    def reload_article(self, article_id: str):
        self.load_article(article_id, force_reload=True)

    def clear_cache(self):
        self._cache.clear()
        self._last_modified.clear()