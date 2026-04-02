from fastapi import APIRouter
from .auth import router as auth_router
from .users import router as users_router
from .posts import router as posts_router
from .feed import router as feed_router
from .reactions import router as reactions_router
from .follows import router as follows_router
from .search import router as search_router
from .achievements import router as achievements_router
from .comments import router as comments_router

api_router = APIRouter(prefix="/api/v1")
api_router.include_router(auth_router)
api_router.include_router(users_router)
api_router.include_router(posts_router)
api_router.include_router(feed_router)
api_router.include_router(reactions_router)
api_router.include_router(follows_router)
api_router.include_router(search_router)
api_router.include_router(achievements_router)
api_router.include_router(comments_router)
