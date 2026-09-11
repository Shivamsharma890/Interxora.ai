from pydantic import BaseModel, EmailStr, Field

class UserCreate(BaseModel):
    name: str
    email: EmailStr
    password: str = Field(min_length=8, max_length=72)
    
class UserLogin(BaseModel):
    email:EmailStr
    password:str
    
class RefreshTokenRequest(BaseModel):
    refresh_token:str
    
class LogoutRequest(BaseModel):
    refresh_token: str