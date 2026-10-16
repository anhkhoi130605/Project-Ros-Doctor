from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.agents.embedding import shutdown_embedding_model
from src.agents.embedding.models import reset_global_embedding_manager
from src.agents.retrieval.pipeline import shutdown_rag_pipeline, start_rag_pipeline
from src.api.routes import router
from src.config import get_settings


@asynccontextmanager
async def lifespan(app: FastAPI):
    settings = get_settings()
    reset_global_embedding_manager()
    start_rag_pipeline()
    print(f"Starting {settings.app_name} in {settings.app_env} mode")
    try:
        yield
    finally:
        print("Shutting down...")
        try:
            await shutdown_rag_pipeline()
        finally:
            await shutdown_embedding_model()


app = FastAPI(
    title="AI20K Agent",
    description="AI Agent built with LangGraph",
    version="1.0.0",
    lifespan=lifespan,
)

settings = get_settings()
app.add_middleware(
    CORSMiddleware,
    allow_origins=[origin.strip() for origin in settings.cors_origins.split(",") if origin.strip()],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(router, prefix="/api/v1")


@app.get("/health")
async def health():
    return {"status": "ok", "env": settings.app_env}
