from datetime import datetime, timedelta

from app import models, scheduler


class DummyWord(models.Word):
    def __init__(self):
        self.interval_index = 0
        self.success_streak = 0
        self.next_review_at = datetime.utcnow()
        self.last_reviewed_at = None


def test_schedule_remembered_increases_interval():
    word = DummyWord()
    scheduler.schedule_next(word, grade=2)
    assert word.interval_index == 1
    assert word.success_streak == 1
    assert word.next_review_at >= datetime.utcnow() + timedelta(minutes=29)


def test_schedule_forgotten_resets_interval():
    word = DummyWord()
    word.interval_index = 4
    word.success_streak = 3
    scheduler.schedule_next(word, grade=0)
    assert word.interval_index == 0
    assert word.success_streak == 0
    assert word.next_review_at >= datetime.utcnow() + timedelta(minutes=4)


def test_schedule_unclear_moves_back_one_interval():
    word = DummyWord()
    word.interval_index = 3
    word.success_streak = 2
    scheduler.schedule_next(word, grade=1)
    assert word.interval_index == 2
    assert word.success_streak == 0
    assert word.last_reviewed_at is not None
