from datetime import datetime, timedelta, timezone

import jwt
from jwt.exceptions import InvalidTokenError

from config import settings

ALGORITHM = "HS256"
ACCESS_TOKEN_EXPIRE_MINUTES = 30


def create_access_token(user_id: int):
    expire = datetime.now(timezone.utc) + timedelta(minutes=ACCESS_TOKEN_EXPIRE_MINUTES)

    payload = {"sub": str(user_id), "exp": expire}

    return jwt.encode(payload, settings.secret_key, algorithm=ALGORITHM)


def decode_access_token(token: str):
    try:
        payload = jwt.decode(token, settings.secret_key, algorithms=[ALGORITHM])

        user_id = payload.get("sub")

        if user_id is None:
            return None

        return int(user_id)

    except InvalidTokenError:
        return None
