from datetime import datetime, timedelta
from app import scheduler
from app import models


class DummyWord(models.Word):
    def __init__(self):
        self.review_interval_days = 1
        self.next_review_at = datetime.utcnow()


def test_schedule_remembered_increases_interval():
    word = DummyWord()
    scheduler.schedule_next(word, remembered=True)
    assert word.review_interval_days == 2


def test_schedule_forgotten_resets_interval():
    word = DummyWord()
    word.review_interval_days = 4
    scheduler.schedule_next(word, remembered=False)
    assert word.review_interval_days == 1
    assert word.next_review_at.date() == (
        datetime.utcnow() + timedelta(days=1)
    ).date()
