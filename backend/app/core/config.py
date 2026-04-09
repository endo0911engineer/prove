from pydantic_settings import BaseSettings


class Settings(BaseSettings):
    database_url: str
    secret_key: str
    algorithm: str = "HS256"
    access_token_expire_minutes: int = 15

    storage_backend: str = "local"  # "local" or "s3"

    aws_access_key_id: str = ""
    aws_secret_access_key: str = ""
    aws_region: str = "ap-northeast-1"
    s3_bucket_name: str = "prove-images"

    class Config:
        env_file = ".env"


settings = Settings()
