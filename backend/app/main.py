import sys
import logging
from loguru import logger
from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from prometheus_fastapi_instrumentator import Instrumentator

from app.core.config import settings
from app.core.logger import setup_logger

setup_logger()

app = FastAPI(
    title=settings.PROJECT_NAME,
    openapi_url=f"{settings.API_V1_STR}/openapi.json",
    description="Enterprise API Core for RAG pipelines and Document Intelligence"
)

# CORS setup for frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Instrument for Prometheus Metrics
Instrumentator().instrument(app).expose(app)

@app.on_event("startup")
async def startup_event():
    logger.info("Starting up Enterprise AI Copilot API")

@app.get("/health")
def health_check():
    return {"status": "healthy"}

from app.api.api import api_router
app.include_router(api_router, prefix=settings.API_V1_STR)

