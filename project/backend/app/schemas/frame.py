from pydantic import BaseModel


class FrameInfo(BaseModel):
    id: int
    path: str

    class Config:
        from_attributes = True
