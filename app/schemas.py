from datetime import datetime
from typing import Optional, List
from pydantic import BaseModel, EmailStr


class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"


class TokenData(BaseModel):
    email: Optional[str] = None


class UserBase(BaseModel):
    email: EmailStr
    preferred_language: str = "en"
    preferred_theme: str = "light"


class UserCreate(UserBase):
    password: str


class User(UserBase):
    id: int
    is_admin: bool

    class Config:
        from_attributes = True


class WordBase(BaseModel):
    english: Optional[str] = None
    chinese: Optional[str] = None
    part_of_speech: Optional[str] = None
    definition: Optional[str] = None
    examples: Optional[str] = None


class WordCreate(WordBase):
    pass


class Word(WordBase):
    id: int
    next_review_at: datetime
    review_interval_days: int

    class Config:
        from_attributes = True


class SystemConfigBase(BaseModel):
    provider: str = "openai"
    api_key: Optional[str] = None
    model: str = "gpt-4o-mini"
    temperature: int = 0


class SystemConfigCreate(SystemConfigBase):
    pass


class SystemConfig(SystemConfigBase):
    id: int
    owner_id: int
    created_at: datetime

    class Config:
        from_attributes = True


class ReviewRequest(BaseModel):
    count: int
    mode: str  # en_to_zh or zh_to_en


class ReviewItem(BaseModel):
    id: int
    question: str
    answer: str


class AICompletionRequest(BaseModel):
    english: Optional[str] = None
    chinese: Optional[str] = None
    part_of_speech: Optional[str] = None
    definition: Optional[str] = None


class AICompletionResponse(BaseModel):
    english: str
    chinese: str
    part_of_speech: str
    definition: str
    examples: List[str]
    translation: List[str]
