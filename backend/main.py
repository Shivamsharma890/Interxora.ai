# from fastapi import FastAPI
# from fastapi.middleware.cors import CORSMiddleware
# from routes.auth import router as auth_router
# from routes.interview import router as interview_router
# from starlette.middleware.sessions import SessionMiddleware
# from config import SECRET_KEY

# app = FastAPI(
#     title="Interxora.AI API",
#     description="Backend API for Interxora.AI",
#     version="1.0.0"
# )

# app.add_middleware(
#     SessionMiddleware,
#     secret_key=SECRET_KEY
# )

# app.add_middleware(
#     CORSMiddleware,
#     allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
#     allow_credentials=True,
#     allow_methods=["*"],
#     allow_headers=["*"],
# )

# app.include_router(auth_router)
# app.include_router(interview_router)

# @app.get("/")
# def root():
#     return {
#         "message": "Interxora.AI API is running"
#     }


#......................new.....................
from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

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
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


app.include_router(auth_router)
app.include_router(interview_router)
app.include_router(knowledge_router)


@app.get("/")
def root():
    return {
        "message": "Interxora.AI API is running"
    }