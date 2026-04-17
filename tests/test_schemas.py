import pytest
from pydantic import ValidationError

from app import schemas


def test_word_create_requires_primary_text():
    with pytest.raises(ValidationError):
        schemas.WordCreate(english="   ", chinese="  ")


def test_word_create_normalizes_whitespace():
    payload = schemas.WordCreate(english=" hello ", chinese=" 你好 ")
    assert payload.english == "hello"
    assert payload.chinese == "你好"


def test_review_request_rejects_out_of_range_count():
    with pytest.raises(ValidationError):
        schemas.ReviewRequest(count=0, mode="en_to_zh")


def test_review_answer_rejects_invalid_grade():
    with pytest.raises(ValidationError):
        schemas.ReviewAnswer(grade=5)
