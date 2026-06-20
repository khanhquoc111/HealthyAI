from fastapi import APIRouter, HTTPException
from knowledge.knowledge_loader import KnowledgeLoader

router = APIRouter(
    prefix="/knowledge",
    tags=["Knowledge"]
)

knowledge_loader = KnowledgeLoader()

@router.get("/")
def list_knowledge_articles():
    return {
        "articles": knowledge_loader.list_articles()
    }

@router.get("/{article_id}")
def get_knowledge_article(article_id: str):
    try:
        return knowledge_loader.load_article(article_id)
    except FileNotFoundError:
        raise HTTPException(
            status_code=404,
            detail=f"Article '{article_id}' not found"
        )
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )

@router.post("/{article_id}/reload")
def reload_knowledge_article(article_id: str):
    try:
        knowledge_loader.reload_article(article_id)
        return {
            "status": "success",
            "message": f"Article '{article_id}' reloaded"
        }
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=str(e)
        )