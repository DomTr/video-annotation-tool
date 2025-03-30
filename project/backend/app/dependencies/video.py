from fastapi import Depends
from sqlalchemy.orm import Session
from ..dependencies.database import get_db
from ..services.video_service import VideoService


def get_video_service(db_session: Session = Depends(get_db)) -> VideoService:
    return VideoService(db_session=db_session)
