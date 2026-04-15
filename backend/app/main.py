"""FastAPI application entry point."""

import logging
from contextlib import asynccontextmanager

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from app.api import auth, chat, conversations, admin, email, slack, quickbooks, upload
from app.config import get_settings
from app.db.database import init_db

logger = logging.getLogger(__name__)
settings = get_settings()


@asynccontextmanager
async def lifespan(app: FastAPI):
    # Validate critical configuration at startup
    if not settings.anthropic_api_key:
        logger.critical("ANTHROPIC_API_KEY is not set — chat will not work!")
    elif settings.anthropic_api_key == "":
        logger.critical("ANTHROPIC_API_KEY is empty — chat will not work!")
    else:
        logger.info("Anthropic API key configured (model: %s)", settings.claude_model)

    if settings.secret_key.startswith("change-me"):
        logger.warning("SECRET_KEY is still the default — change it for production!")

    if not settings.samsara_api_key:
        logger.warning("SAMSARA_API_KEY is not set — Samsara tools will be unavailable")
    if not settings.fleethunt_api_key:
        logger.warning("FLEETHUNT_API_KEY is not set — FleetHunt tools will be unavailable")

    await init_db()
    logger.info("Application started successfully")
    yield


app = FastAPI(
    title="Multi-Department AI Agent Portal",
    description="Single portal with role-based access for Sales, Finance, Accounting, Restaurant & Logistics AI agents",
    version="1.0.0",
    lifespan=lifespan,
)

# CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins.split(","),
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Routes
app.include_router(auth.router)
app.include_router(chat.router)
app.include_router(conversations.router)
app.include_router(admin.router)
app.include_router(email.router)
app.include_router(slack.router)
app.include_router(quickbooks.router)
app.include_router(upload.router)


@app.get("/health")
async def health():
    return {"status": "healthy", "service": settings.app_name}
