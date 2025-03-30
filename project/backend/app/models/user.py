"""Module for defining the User SQLAlchemy model.

File path: /backend/app/models/user.py

This module defines the `User` model, which represents user accounts,
including personal details, authentication data, and roles in the database.
"""

from sqlalchemy import Column, Integer, String, Boolean
from ..dependencies.database import Base


class User(Base):
    """SQLAlchemy model for storing user account data."""

    __tablename__ = "users"

    id: int = Column(Integer, primary_key=True, index=True)
    name: str = Column(String, index=True)
    email: str = Column(String, unique=True, index=True)
    username: str = Column(String, unique=True, index=True, nullable=False)
    hashed_password: str = Column(String, nullable=False)
    is_active: bool = Column(Boolean, default=True)
    role: str = Column(String, default="user")