from sqlalchemy import Column, Integer, String, ForeignKey, DateTime, Boolean
from sqlalchemy.orm import relationship


from ..dependencies.database import Base


class VideoRaw(Base):
    __tablename__ = "videos_raw"

    id: int = Column(Integer, primary_key=True, index=True)
    title: str = Column(String, index=True)
    file_path: str = Column(String, index=True)
    frames_folder_path: str = Column(String, index=True)
    amount_frames: int = Column(Integer, index=True)
    description: str = Column(String, index=True)
    upload_date: DateTime = Column(DateTime, index=True)
    edit_date: DateTime = Column(DateTime, index=True)
    views: int = Column(Integer, index=True)
    user_id: int = Column(Integer, ForeignKey("users.id"))
    physician: int = Column(Integer, ForeignKey("users.id"))
    permission: str = Column(String, index=True)
    isAnnotated: bool = Column(Boolean, index=True)
    duration: int = Column(Integer, index=True)
    frames_load_finished: bool = Column(Boolean, index=False)

    # Define relationships
    annotations = relationship("Annotations", back_populates="video")

