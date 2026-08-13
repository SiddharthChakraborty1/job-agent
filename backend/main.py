import logging
from contextlib import asynccontextmanager
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

# Importing settings triggers validation; exits with code 1 if any var is missing
from config import settings  # noqa: F401
from routers.analyze import router as analyze_router
from routers.auth import router as auth_router

logging.basicConfig(
    level=logging.INFO,
    format="%(levelname)s:     %(name)s - %(message)s",
)

logger = logging.getLogger(__name__)


@asynccontextmanager
async def lifespan(app: FastAPI):
    logger.info(
        "Resume Job Finder started. Models: costly=%s, cheap=%s. Search: Serper",
        settings.costly_model,
        settings.cheap_model,
    )
    yield


app = FastAPI(title="Resume Job Finder", lifespan=lifespan)

_cors_origins = list(
    dict.fromkeys(
        settings.frontend_urls + ["http://localhost:3000", "http://localhost:5173"]
    )
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=_cors_origins,
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router, prefix="/api")
app.include_router(analyze_router, prefix="/api")


@app.get("/health")
async def health():
    return {"status": "ok"}
