from datetime import datetime
from enum import Enum, IntEnum
from typing import List, Optional

from pydantic import BaseModel, EmailStr, Field, field_validator, model_validator


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


class UserUpdate(BaseModel):
    is_admin: Optional[bool] = None


class UserPreferencesUpdate(BaseModel):
    preferred_language: Optional[str] = None
    preferred_theme: Optional[str] = None

    @field_validator("preferred_language", "preferred_theme", mode="before")
    @classmethod
    def normalize_preferences(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value


class UserPasswordChange(BaseModel):
    current_password: str
    new_password: str


class AdminUserCreate(UserBase):
    password: str
    is_admin: bool = False


class AdminUserUpdate(BaseModel):
    email: Optional[EmailStr] = None
    preferred_language: Optional[str] = None
    preferred_theme: Optional[str] = None
    is_admin: Optional[bool] = None
    password: Optional[str] = None

    @field_validator("preferred_language", "preferred_theme", "password", mode="before")
    @classmethod
    def normalize_admin_strings(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value


class UserListResponse(BaseModel):
    items: List[User]
    total: int
    page: int
    page_size: int
    query: Optional[str] = None


class ReviewMode(str, Enum):
    EN_TO_ZH = "en_to_zh"
    ZH_TO_EN = "zh_to_en"


class AICompletionDirection(str, Enum):
    EN_TO_ZH = "en_to_zh"
    ZH_TO_EN = "zh_to_en"


class ReviewGrade(IntEnum):
    DONT_KNOW = 0
    UNCLEAR = 1
    KNOW = 2


class WordBase(BaseModel):
    english: Optional[str] = Field(default=None, max_length=128)
    chinese: Optional[str] = Field(default=None, max_length=255)
    phonetics: Optional[str] = None  # JSON string
    definition: Optional[str] = Field(default=None, max_length=2000)
    part_of_speech: Optional[str] = Field(default=None, max_length=128)
    parts_of_speech: Optional[str] = None  # JSON string
    examples: Optional[str] = Field(default=None, max_length=4000)  # JSON string

    @field_validator(
        "english",
        "chinese",
        "phonetics",
        "definition",
        "part_of_speech",
        "parts_of_speech",
        "examples",
        mode="before",
    )
    @classmethod
    def normalize_optional_text(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value


class WordCreate(WordBase):
    @model_validator(mode="after")
    def validate_primary_content(self):
        if not self.english and not self.chinese:
            raise ValueError("Either english or chinese must be provided")
        return self


class WordUpdate(WordBase):
    pass


class Word(WordBase):
    id: int
    next_review_at: datetime
    interval_index: int
    success_streak: int

    class Config:
        from_attributes = True


class WordListResponse(BaseModel):
    items: List[Word]
    total: int
    page: int
    page_size: int
    due_total: int
    active_total: int
    stable_total: int


class SystemConfigBase(BaseModel):
    provider: str = "openai"
    api_key: Optional[str] = None
    api_url: Optional[str] = None
    model: str = "gpt-4o-mini"
    temperature: int = Field(default=0, ge=0, le=2)

    @field_validator("provider", "api_key", "api_url", "model", mode="before")
    @classmethod
    def normalize_config_text(cls, value):
        if value is None:
            return None
        if isinstance(value, str):
            normalized = value.strip()
            return normalized or None
        return value


class SystemConfigCreate(SystemConfigBase):
    pass


class SystemConfig(SystemConfigBase):
    id: int
    owner_id: int
    created_at: datetime
    api_key: Optional[str] = None
    api_key_masked: Optional[str] = None
    api_key_configured: bool = False

    class Config:
        from_attributes = True


class Phonetics(BaseModel):
    uk: Optional[str] = None
    us: Optional[str] = None


class PartOfSpeech(BaseModel):
    pos: str
    meaningEn: Optional[str] = None
    meaningZh: Optional[str] = None


class Example(BaseModel):
    sentenceEn: str
    sentenceZh: str


class ReviewRequest(BaseModel):
    count: int = Field(..., ge=1, le=50)
    mode: ReviewMode


class ReviewItem(BaseModel):
    id: int
    question: str
    answer: str
    examples: List[Example] = []


class ReviewAnswer(BaseModel):
    grade: ReviewGrade


class AICompletionRequest(BaseModel):
    word: str = Field(..., min_length=1, max_length=128)
    direction: AICompletionDirection = AICompletionDirection.EN_TO_ZH

    @field_validator("word")
    @classmethod
    def normalize_word(cls, value: str):
        normalized = value.strip()
        if not normalized:
            raise ValueError("Word must not be empty")
        return normalized


class AICompletionResponse(BaseModel):
    word: str
    phonetics: Optional[Phonetics] = None
    partsOfSpeech: List[PartOfSpeech] = []
    examples: List[Example] = []
    synonyms: List[str] = []
    antonyms: List[str] = []
    direction: str
