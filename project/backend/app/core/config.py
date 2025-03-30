# app/core/config.py

from pydantic_settings import BaseSettings, SettingsConfigDict
from typing import Any, Callable, Dict, List


class Settings(BaseSettings):
    DATABASE_URL: str = "sqlite:///./test.db"
    POSTGRES_USER: str = "postgres"
    POSTGRES_PASSWORD: str = "defaultpassword"
    POSTGRES_HOST: str = "localhost"
    POSTGRES_PORT: int = 5432
    SECRET_KEY: str = "your-secret-key"
    ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 30

    model_config = SettingsConfigDict(
        env_file=".env",
        env_nested_delimiter="__",
        extra="ignore",  # Ignore extra environment variables not defined in the model
    )

    @classmethod
    def customise_sources(
        cls,
        init_settings: Callable[..., Dict[str, Any]],
        env_settings: Callable[..., Dict[str, Any]],
        file_secret_settings: Callable[..., Dict[str, Any]],
    ) -> List[Callable[..., Dict[str, Any]]]:
        return [
            init_settings,
            env_settings,
            file_secret_settings,
        ]


# Instantiate the settings object
settings = Settings()
