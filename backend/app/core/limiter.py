from slowapi import Limiter
from slowapi.util import get_remote_address

# クライアントIPをキーにレート制限
limiter = Limiter(key_func=get_remote_address)
