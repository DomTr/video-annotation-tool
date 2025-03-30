from typing import Optional

from pydantic import BaseModel


class AnnotationBase(BaseModel):
    video_id: int
    frame_id: int
    polyp_id: int
    label: str
    x1: float
    y1: float
    x2: float
    y2: float
    width: float
    height: float
    start_time: float
    end_time: Optional[float] = None
    content: Optional[str] = None


class AnnotationCreate(AnnotationBase):
    pass


class AnnotationUpdate(AnnotationBase):
    pass


class AnnotationInDBBase(AnnotationBase):
    id: int
    user_id: int
    label: str

    class Config:
        from_attributes = True
