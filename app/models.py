from datetime import datetime
from sqlalchemy import Boolean, Column, DateTime, ForeignKey, Integer, String, Text
from sqlalchemy.orm import relationship

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    hashed_password = Column(String, nullable=False)
    is_admin = Column(Boolean, default=False)
    preferred_language = Column(String, default="en")
    preferred_theme = Column(String, default="light")

    words = relationship("Word", back_populates="owner")


class Word(Base):
    __tablename__ = "words"

    id = Column(Integer, primary_key=True, index=True)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    english = Column(String, nullable=True)
    chinese = Column(String, nullable=True)
    part_of_speech = Column(String, nullable=True)
    definition = Column(Text, nullable=True)
    examples = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    next_review_at = Column(DateTime, default=datetime.utcnow)
    easiness = Column(Integer, default=2)
    review_interval_days = Column(Integer, default=1)

    owner = relationship("User", back_populates="words")


class SystemConfig(Base):
    __tablename__ = "system_configs"

    id = Column(Integer, primary_key=True, index=True)
    provider = Column(String, default="openai")
    api_key = Column(String, nullable=True)
    model = Column(String, default="gpt-4o-mini")
    temperature = Column(Integer, default=0)
    owner_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
