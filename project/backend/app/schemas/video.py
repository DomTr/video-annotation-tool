from pydantic import BaseModel
from typing import Optional
from datetime import datetime


class Videoraw(BaseModel):
    id: Optional[int] = 1
    title: str
    description: Optional[str] = None
    framerate: Optional[int] = 1
    file_path: Optional[str] = None
    upload_date: Optional[datetime] = None
    duration: Optional[int] = 0
    user_id: Optional[int] = 1
    physician: Optional[str] = None
    frames_loaded: bool
    isAnnotated: Optional[bool] = False

    class Config:
        from_attributes = True


class VideoCreate(Videoraw):
    pass