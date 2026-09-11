from fastapi import APIRouter, Depends, HTTPException, status, Request
from sqlalchemy.orm import Session

from database import get_db
from models.user import User
from schemas.user import UserCreate, UserLogin, RefreshTokenRequest, LogoutRequest
from security.hashing import hash_password, verify_password
from security.jwt import (create_access_token, create_refresh_token, SECRET_KEY, ALGORITHM)
from security.dependencies import get_current_user
from jose import JWTError, jwt
from datetime import datetime, timezone
from fastapi.security import HTTPBearer
from models.refresh_token import RefreshToken
from fastapi.responses import RedirectResponse
from authlib.integrations.starlette_client import OAuth
from config import GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET

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


@router.post("/register")
def register_user(
    user: UserCreate,
    db: Session = Depends(get_db)
):
    existing_user = db.query(User).filter(
        User.email == user.email
    ).first()

    if existing_user:
        raise HTTPException(
            status_code=400,
            detail="Email already registered"
        )

    new_user = User(
        name=user.name,
        email=user.email,
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
    existing_user = db.query(User).filter(
        User.email == user.email
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
        "token_type": "bearer"
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
                url="http://localhost:5173/login?error=google_auth_failed"
            )

        google_id = user_info.get("sub")
        email = user_info.get("email")
        name = user_info.get("name")
        email_verified = user_info.get("email_verified")

        if not google_id or not email:
            return RedirectResponse(
                url="http://localhost:5173/login?error=google_auth_failed"
            )
            
        if not email_verified:
            return RedirectResponse(
            url="http://localhost:5173/login?error=google_email_not_verified"
        )

        if not name:
            name = email.split("@")[0]

        # -------------------------------------------------
        # 1. Find existing Google account
        # -------------------------------------------------
        user = (
            db.query(User)
            .filter(User.google_id == google_id)
            .first()
        )

        # -------------------------------------------------
        # 2. If not found, check existing email account
        # -------------------------------------------------
        if not user:
            user = (
                db.query(User)
                .filter(User.email == email)
                .first()
            )

        # -------------------------------------------------
        # 3. Existing account
        # -------------------------------------------------
        if user:

            # Link Google to existing email/password account
            if not user.google_id:
                user.google_id = google_id

                db.commit()
                db.refresh(user)

        # -------------------------------------------------
        # 4. New Google account
        # -------------------------------------------------
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

        # -------------------------------------------------
        # 5. Create Interxora access token
        # -------------------------------------------------
        access_token = create_access_token(
            data={
                "sub": str(user.id),
                "email": user.email,
            }
        )

        # -------------------------------------------------
        # 6. Create refresh token
        # -------------------------------------------------
        refresh_token, jti, expires_at = create_refresh_token(
            data={
                "sub": str(user.id),
                "email": user.email,
            }
        )

        # -------------------------------------------------
        # 7. Store refresh token
        # -------------------------------------------------
        new_refresh_token = RefreshToken(
            user_id=user.id,
            jti=jti,
            expires_at=expires_at,
            revoked=False,
        )

        db.add(new_refresh_token)
        db.commit()

        # -------------------------------------------------
        # 8. Send tokens to frontend
        # -------------------------------------------------
        request.session["access_token"] = access_token
        request.session["refresh_token"] = refresh_token
        
        return RedirectResponse(
            url="http://localhost:5173/google-callback"
        )

    except Exception as e:

        print("Google OAuth Error:", e)

        return RedirectResponse(
            url="http://localhost:5173/login?error=google_auth_failed"
        )

        
@router.get("/google/session")
async def google_session(request: Request):
    access_token = request.session.pop("access_token", None)
    refresh_token = request.session.pop("refresh_token", None)

    if not access_token:
        raise HTTPException(
            status_code=401,
            detail="Google authentication session not found"
        )

    return {
        "access_token": access_token,
        "refresh_token": refresh_token,
        "token_type": "bearer"
    }
    
    
@router.post("/refresh")
def refresh_token(
    data: RefreshTokenRequest,
    db: Session = Depends(get_db),
):
    # 1. Decode refresh JWT
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

    # 2. Make sure this is a refresh token
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

    # 3. Find token in database
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

    # 4. Check whether token was already revoked
    if stored_token.revoked:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has already been revoked",
        )

    # 5. Check expiration
    if stored_token.expires_at <= datetime.now(timezone.utc):
        stored_token.revoked = True
        db.commit()

        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Refresh token has expired",
        )

    # 6. Get user
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

    # 7. Revoke old refresh token
    stored_token.revoked = True

    # 8. Create new access token
    new_access_token = create_access_token(
        data={
            "sub": str(user.id),
            "email": user.email,
        }
    )

    # 9. Create new refresh token
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

    # 10. Store new refresh token
    new_token_record = RefreshToken(
        user_id=user.id,
        jti=new_jti,
        expires_at=new_expires_at,
        revoked=False,
    )

    db.add(new_token_record)
    db.commit()

    # 11. Return new tokens
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
    # Decode refresh token
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

    # Make sure it is a refresh token
    if payload.get("type") != "refresh":
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    jti = payload.get("jti")

    if not jti:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid refresh token",
        )

    # Find token in database
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

    # Revoke token
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
    