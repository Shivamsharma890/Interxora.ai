from datetime import datetime, timedelta, timezone
from uuid import uuid4
from jose import jwt
from config import (
    SECRET_KEY,
    ALGORITHM,
    ACCESS_TOKEN_EXPIRE_MINUTES,
)

def create_access_token(data: dict):
    to_encode = data.copy()

    expire = datetime.now(timezone.utc) + timedelta(
        minutes=ACCESS_TOKEN_EXPIRE_MINUTES
    )

    to_encode.update({
        "exp": expire,
        "type": "access",
    })

    return jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )


def create_refresh_token(data: dict):
    to_encode = data.copy()

    jti = str(uuid4())

    expire = datetime.now(timezone.utc) + timedelta(
        days=7
    )

    to_encode.update({
        "exp": expire,
        "jti": jti,
        "type": "refresh",
    })

    token = jwt.encode(
        to_encode,
        SECRET_KEY,
        algorithm=ALGORITHM,
    )

    return token, jti, expire