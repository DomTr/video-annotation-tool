"""Module for defining the Frames SQLAlchemy model.

File path: /backend/app/models/frames.py

This module defines the `Frames` model, which represents individual frames
of a video, their associated metadata, and relationships with users and
annotations in the database.
"""

from sqlalchemy import (
    Column, Integer, String, ForeignKey, Boolean, Time
)
from sqlalchemy.orm import relationship

from ..dependencies.database import Base


class Frames(Base):
    """SQLAlchemy model for storing video frame data."""
    __tablename__ = "frames"

    id: int = Column(Integer, primary_key=True, index=True)
    file_path: str = Column(String, index=True)
    file_number: str = Column(String, index=True)
    video_time: Time = Column(Time, index=True)
    video_time_milliseconds: int = Column(Integer, index=True)
    video_id: int = Column(Integer, ForeignKey("videos_raw.id"))
    user_id: int = Column(Integer, ForeignKey("users.id"))
    owner_id: int = Column(Integer, ForeignKey("users.id"))
    permission: str = Column(String, index=True)
    annotated: bool = Column(Boolean, index=True)

    # Define relationships
    annotations = relationship("Annotations", back_populates="frame")

