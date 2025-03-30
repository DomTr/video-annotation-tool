from fastapi import FastAPI
from starlette.middleware.cors import CORSMiddleware
from starlette.middleware.sessions import SessionMiddleware

from .core.config import settings
from .dependencies.database import Base, engine, SessionLocal

from .routers import annotations, login, auth, videos, users

Base.metadata.create_all(bind=engine)
db = SessionLocal()
origins = ["http://localhost:3000", "https://fp-p15.fwe24.ivia.ch", "localhost:3000/"]


app = FastAPI()


app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,  # Allowed origins
    allow_credentials=True,
    allow_methods=["*"],  # Allowed HTTP methods
    allow_headers=["*"],  # Allowed headers
)
app.add_middleware(SessionMiddleware, secret_key=settings.SECRET_KEY)
app.include_router(login.router)
app.include_router(auth.router)
app.include_router(videos.router)
app.include_router(
    annotations.router,
)
app.include_router(users.router)
