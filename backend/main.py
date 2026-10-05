from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware
from config import (
    ALLOWED_ORIGINS,
    SECRET_KEY,
    SESSION_HTTPS_ONLY,
    SESSION_SAME_SITE,
)
from routes.auth import router as auth_router
from routes.interview import router as interview_router
from routes.knowledge import router as knowledge_router


app = FastAPI(
    title="Interxora.AI API",
    description="Backend API for Interxora.AI",
    version="1.0.0",
)


app.add_middleware(
    CORSMiddleware,
    allow_origins=ALLOWED_ORIGINS,
    allow_credentials=True,
    allow_methods=["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allow_headers=["Authorization", "Content-Type"],
)


app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY,
    same_site=SESSION_SAME_SITE,
    https_only=SESSION_HTTPS_ONLY,
)

app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(knowledge_router)


@app.get("/")
def root():
    return {
        "message": "Interxora.AI API is running"
    }
