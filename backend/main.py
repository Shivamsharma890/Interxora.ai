from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from routes.auth import router as auth_router
from routes.interview import router as interview_router
from starlette.middleware.sessions import SessionMiddleware
from config import SECRET_KEY

app = FastAPI(
    title="Interxora.AI API",
    description="Backend API for Interxora.AI",
    version="1.0.0"
)

app.add_middleware(
    SessionMiddleware,
    secret_key=SECRET_KEY
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173", "http://127.0.0.1:5173"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(interview_router)

@app.get("/")
def root():
    return {
        "message": "Interxora.AI API is running"
    }






# from fastapi import FastAPI, Depends
# from sqlalchemy.orm import Session

# from database import get_db
# from models.user import User
# from schemas.user import UserCreate


# app = FastAPI(
#     title="AI Interview Coach API",
#     description="Backend API for AI Interview Coach",
#     version="1.0.0"
# )


# @app.get("/")
# def root():
#     return {
#         "message": "AI Interview Coach API is running"
#     }


# @app.post("/users")
# def create_user(
#     user: UserCreate,
#     db: Session = Depends(get_db)
# ):
#     new_user = User(
#         name=user.name,
#         email=user.email
#     )

#     db.add(new_user)
#     db.commit()
#     db.refresh(new_user)

#     return {
#         "message": "User created successfully",
#         "user": {
#             "id": new_user.id,
#             "name": new_user.name,
#             "email": new_user.email
#         }
#     }
    
# @app.get("/users")
# def get_users(db: Session = Depends(get_db)):

#     users = db.query(User).all()

#     return {
#         "users": [
#             {
#                 "id": user.id,
#                 "name": user.name,
#                 "email": user.email
#             }
#             for user in users
#         ]
#     }