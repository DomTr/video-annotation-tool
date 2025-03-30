"""Module for defining the Annotations SQLAlchemy model.

File path: /backend/app/models/annotations.py

This module defines the `Annotations` model, which represents annotation
data linked to videos, frames, and users in the database.
"""

from sqlalchemy import (
    Column, Integer, String, ForeignKey, Float, BigInteger
)
from sqlalchemy.orm import relationship

from ..dependencies.database import Base


class Annotations(Base):
    """SQLAlchemy model for storing annotation data."""
    __tablename__ = "annotations"

    id: int = Column(Integer, primary_key=True, index=True)
    video_id: int = Column(Integer, ForeignKey("videos_raw.id"))
    frame_id: int = Column(Integer, ForeignKey("frames.id"))
    user_id: int = Column(Integer, ForeignKey("users.id"))
    polyp_id: int = Column(BigInteger, index=True)
    label: str = Column(String, index=True)
    x1: float = Column(Float, index=True)
    y1: float = Column(Float, index=True)
    x2: float = Column(Float, index=True)
    y2: float = Column(Float, index=True)
    width: float = Column(Float, index=True)
    height: float = Column(Float, index=True)
    start_time: float = Column(Float, index=True)
    end_time: float = Column(Float, index=True)
    content: str = Column(String, nullable=True, index=True)

    # Define relationships
    video = relationship("VideoRaw", back_populates="annotations")
    frame = relationship("Frames", back_populates="annotations")

