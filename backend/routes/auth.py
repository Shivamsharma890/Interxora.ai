from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session
from pydantic import BaseModel
from database import get_db
from models.user import User
from models.refresh_token import RefreshToken
from schemas.user import UserCreate, UserLogin, RefreshTokenRequest, LogoutRequest
from security.hashing import hash_password, verify_password
from security.jwt import (create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM)
from security.dependencies import get_current_user
from jose import JWTError, jwt
from datetime import datetime, timezone, timedelta
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, FRONTEND_URL
import os
from uuid import uuid4
import smtplib
from email.message import EmailMessage
from urllib.parse import quote

router = APIRouter(
    prefix="/auth",
    tags=["Authentication"]
)

oauth = OAuth()
oauth.register(
    name="google",
    client_id=GOOGLE_CLIENT_ID,
    client_secret=GOOGLE_CLIENT_SECRET,
    server_metadata_url="https://accounts.google.com/.well-known/openid-configuration",
    client_kwargs={
        "scope": "openid email profile"
    },
)

class ForgotPasswordRequest(BaseModel):
    email: str


class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str


PASSWORD_RESET_MINUTES = int(os.getenv("PASSWORD_RESET_MINUTES", "15"))
PASSWORD_RESET_DEBUG = os.getenv("PASSWORD_RESET_DEBUG", "false").lower() == "true"
RESET_REQUEST_LIMIT = int(os.getenv("PASSWORD_RESET_REQUEST_LIMIT", "3"))
RESET_REQUEST_WINDOW = int(os.getenv("PASSWORD_RESET_REQUEST_WINDOW", "900"))
RESET_ATTEMPT_LIMIT = int(os.getenv("PASSWORD_RESET_ATTEMPT_LIMIT", "10"))
RESET_ATTEMPT_WINDOW = int(os.getenv("PASSWORD_RESET_ATTEMPT_WINDOW", "900"))


_rate_limits: dict[str, list[float]] = {}


def _rate_limit(key: str, limit: int, window: int) -> None:
    now = datetime.now(timezone.utc).timestamp()
    recent = [
        timestamp
        for timestamp in _rate_limits.get(key, [])
        if now - timestamp < window
    ]

    if len(recent) >= limit:
        _rate_limits[key] = recent
        raise HTTPException(
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            detail="Too many requests. Please try again later.",
        )

    recent.append(now)
    _rate_limits[key] = recent


def _client_ip(request: Request) -> str:
    return request.client.host if request.client else "unknown"


def _send_password_reset_email(email: str, reset_url: str) -> bool:
    smtp_host = os.getenv("SMTP_HOST")
    smtp_port = int(os.getenv("SMTP_PORT", "587"))
    smtp_user = os.getenv("SMTP_USER")
    smtp_password = os.getenv("SMTP_PASSWORD")
    smtp_from = os.getenv("SMTP_FROM_EMAIL") or smtp_user

    if not all([smtp_host, smtp_user, smtp_password, smtp_from]):
        return False

    message = EmailMessage()
    message["Subject"] = "Reset your Interxora password"
    message["From"] = smtp_from
    message["To"] = email
    message.set_content(
        f"""Hello,

We received a request to reset your Interxora password.

Open this link to choose a new password:
{reset_url}

This link expires in {PASSWORD_RESET_MINUTES} minutes and can only be used once.

If you did not request this, you can safely ignore this email.

Regards,
Interxora.ai
"""
    )

    with smtplib.SMTP(smtp_host, smtp_port, timeout=15) as server:
        server.starttls()
        server.login(smtp_user, smtp_password)
        server.send_message(message)

    return True


@router.post("/forgot-password")
def forgot_password(
    data: ForgotPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    email = data.email.strip().lower()

    _rate_limit(
        f"forgot:ip:{_client_ip(request)}",
        RESET_REQUEST_LIMIT,
        RESET_REQUEST_WINDOW,
    )
    _rate_limit(
        f"forgot:email:{email}",
        RESET_REQUEST_LIMIT,
        RESET_REQUEST_WINDOW,
    )

    generic_response = {
        "message": "If an account exists for this email, a password reset link has been sent."
    }

    user = db.query(User).filter(User.email == email).first()

    if not user:
        return generic_response

    if user.password_hash is None:
        return generic_response

    reset_jti = str(uuid4())
    expires_at = datetime.now(timezone.utc) + timedelta(
        minutes=PASSWORD_RESET_MINUTES
    )

    reset_record = RefreshToken(
        user_id=user.id,
        jti=reset_jti,
        expires_at=expires_at,
        revoked=False,
    )

    db.add(reset_record)
    db.commit()

    raw_token = jwt.encode(
        {
            "sub": str(user.id),
            "jti": reset_jti,
            "type": "password_reset",
            "exp": expires_at,
        },
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    frontend_base = FRONTEND_URL.rstrip("/")
    reset_url = (
        f"{frontend_base}/reset-password?token="
        f"{quote(raw_token, safe='')}"
    )

    try:
        sent = _send_password_reset_email(user.email, reset_url)
    except Exception as exc:
        print("Password reset email error:", exc)
        sent = False

    if not sent:
        print("Password reset email was not sent.")

    if PASSWORD_RESET_DEBUG and os.getenv("ENVIRONMENT", "development").lower() == "development":
        return {
            **generic_response,
            "debug_reset_url": reset_url,
        }

    return generic_response


@router.post("/reset-password")
def reset_password(
    data: ResetPasswordRequest,
    request: Request,
    db: Session = Depends(get_db),
):
    token = data.token.strip()
    new_password = data.new_password

    _rate_limit(
        f"reset:ip:{_client_ip(request)}",
        RESET_ATTEMPT_LIMIT,
        RESET_ATTEMPT_WINDOW,
    )

    if not token:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    if len(new_password) < 8:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Password must be at least 8 characters",
        )

    try:
        payload = jwt.decode(
            token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    if payload.get("type") != "password_reset":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    user_id = payload.get("sub")
    reset_jti = payload.get("jti")

    if not user_id or not reset_jti:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    try:
        user_id = int(user_id)
    except (TypeError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    reset_record = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.jti == reset_jti,
            RefreshToken.user_id == user_id,
        )
        .first()
    )

    if not reset_record or reset_record.revoked:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    expires_at = reset_record.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        reset_record.revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    user = db.query(User).filter(User.id == user_id).first()

    if not user:
        reset_record.revoked = True
        db.commit()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Invalid or expired reset link",
        )

    user.password_hash = hash_password(new_password)
    reset_record.revoked = True

    active_refresh_tokens = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.user_id == user.id,
            RefreshToken.revoked == False,
            RefreshToken.jti != reset_record.jti,
        )
        .all()
    )

    for refresh_record in active_refresh_tokens:
        refresh_record.revoked = True

    db.commit()

    return {
        "message": "Password reset successful. Please log in with your new password."
    }


@router.post("/register")
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    email = user.email.strip().lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        name=user.name,
        email=email,
        password_hash=hash_password(user.password)
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User registered successfully",
        "user": {
            "id": new_user.id,
            "name": new_user.name,
            "email": new_user.email
        }
    }


@router.post("/login")
def login_user(
    user: UserLogin,
    db: Session = Depends(get_db)
):
    email = user.email.strip().lower()

    existing_user = db.query(User).filter(
        User.email == email
    ).first()

    if not existing_user:
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if existing_user.password_hash is None:
        raise HTTPException(
            status_code=401,
            detail="This account uses Google login. Please continue with Google."
        )

    if not verify_password(
        user.password,
        existing_user.password_hash
    ):
        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        data={
            "sub": str(existing_user.id),
            "email": existing_user.email
        }
    )

    refresh_token, jti, expires_at = create_refresh_token(
        data={
            "sub": str(existing_user.id),
            "email": existing_user.email
        }
    )

    new_refresh_token = RefreshToken(
        user_id=existing_user.id,
        jti=jti,
        expires_at=expires_at,
        revoked=False,
    )

    db.add(new_refresh_token)
    db.commit()

    return {
        "message": "Login successful",
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer",
        "user": {
            "id": existing_user.id,
            "name": existing_user.name,
            "email": existing_user.email,
        },
    }


@router.get("/google")
async def google_login(request: Request):
    redirect_uri = request.url_for("google_callback")
    return await oauth.google.authorize_redirect(
        request,
        redirect_uri
    )


@router.get("/google/callback", name="google_callback")
async def google_callback(
    request: Request,
    db: Session = Depends(get_db)
):
    try:
        token = await oauth.google.authorize_access_token(request)

        user_info = token.get("userinfo")

        if not user_info:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=google_auth_failed"
            )

        google_id = user_info.get("sub")
        email = user_info.get("email")
        name = user_info.get("name")
        email_verified = user_info.get("email_verified")

        if not google_id or not email:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=google_auth_failed"
            )

        if not email_verified:
            return RedirectResponse(
                url=f"{FRONTEND_URL}/login?error=google_email_not_verified"
            )

        if not name:
            name = email.split("@")[0]

        user = (
            db.query(User)
            .filter(User.google_id == google_id)
            .first()
        )

        if not user:
            user = (
                db.query(User)
                .filter(User.email == email)
                .first()
            )

        if user:
            if not user.google_id:
                user.google_id = google_id

                db.commit()
                db.refresh(user)
        else:
            user = User(
                name=name,
                email=email,
                password_hash=None,
                google_id=google_id,
            )

            db.add(user)
            db.commit()
            db.refresh(user)

        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
            }
        )

        refresh_token, jti, expires_at = create_refresh_token(
            data={
                "sub": str(user.id),
                "email": user.email,
            }
        )

        new_refresh_token = RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=expires_at,
            revoked=False,
        )

        db.add(new_refresh_token)
        db.commit()

        request.session["google_auth"] = {
            "access_token": access_token,
            "refresh_token": refresh_token,
            "user": {
                "id": user.id,
                "name": user.name,
                "email": user.email,
            },
        }

        return RedirectResponse(
            url=f"{FRONTEND_URL}/google-callback"
        )

    except Exception as e:
        print("Google OAuth Error:", e)

        return RedirectResponse(
            url=f"{FRONTEND_URL}/login?error=google_auth_failed"
        )


@router.get("/google/session")
async def google_session(request: Request):
    google_auth = request.session.pop("google_auth", None)

    if not google_auth:
        raise HTTPException(
            status_code=401,
            detail="Google authentication session not found"
        )

    access_token = google_auth.get("access_token")
    refresh_token = google_auth.get("refresh_token")
    user = google_auth.get("user")

    if not access_token or not refresh_token or not user:
        raise HTTPException(
            status_code=401,
            detail="Incomplete Google authentication session"
        )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "user": user,
        "token_type": "bearer"
    }


@router.post("/refresh")
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            data.refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    user_id = payload.get("sub")
    jti = payload.get("jti")

    if not user_id or not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    if str(jti).startswith("password_reset:"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    stored_token = (
        db.query(RefreshToken)
        .filter(
            RefreshToken.jti == jti,
            RefreshToken.user_id == int(user_id),
        )
        .first()
    )

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token not found",
        )

    if stored_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has already been revoked",
        )

    expires_at = stored_token.expires_at
    if expires_at.tzinfo is None:
        expires_at = expires_at.replace(tzinfo=timezone.utc)

    if expires_at <= datetime.now(timezone.utc):
        stored_token.revoked = True
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    user = (
        db.query(User)
        .filter(User.id == int(user_id))
        .first()
    )

    if not user:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
        )

    stored_token.revoked = True

    new_access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
        }
    )

    (
        new_refresh_token,
        new_jti,
        new_expires_at,
    ) = create_refresh_token(
        data={
            "sub": str(user.id),
            "email": user.email,
        }
    )

    new_token_record = RefreshToken(
        user_id=user.id,
        jti=new_jti,
        expires_at=new_expires_at,
        revoked=False,
    )

    db.add(new_token_record)
    db.commit()

    return {
        "access_token": new_access_token,
        "refresh_token": new_refresh_token,
        "token_type": "bearer",
    }


@router.post("/logout")
def logout(
    data: LogoutRequest,
    db: Session = Depends(get_db),
):
    try:
        payload = jwt.decode(
            data.refresh_token,
            SECRET_KEY,
            algorithms=[ALGORITHM],
        )
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired refresh token",
        )

    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    jti = payload.get("jti")

    if not jti or str(jti).startswith("password_reset:"):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    stored_token = (
        db.query(RefreshToken)
        .filter(RefreshToken.jti == jti)
        .first()
    )

    if not stored_token:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Refresh token not found",
        )

    stored_token.revoked = True

    db.commit()

    return {
        "message": "Logout successful"
    }


@router.get("/me")
def get_my_profile(
    current_user: User = Depends(get_current_user)
):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email
    }
