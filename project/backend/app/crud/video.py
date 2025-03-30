# app/crud/video.py
from typing import Optional

from sqlalchemy.orm import Session
from ..models.video_raw import VideoRaw


def create_video(
    db: Session,
    title: str,
    description: Optional[str],
    framerate: int,
    video: VideoRaw,
    user_id: int,
) -> VideoRaw:
    db_video = VideoRaw(
        title=title,
        description=description,
        amount_frames=framerate,
        file_path=video.file_path,
        user_id=user_id,
    )
    db.add(db_video)
    db.commit()
    db.refresh(db_video)
    return db_video


def get_video(db: Session, video_id: int) -> Optional[VideoRaw]:
    return db.query(VideoRaw).filter(VideoRaw.id == video_id).first()
