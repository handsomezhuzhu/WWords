from datetime import datetime, timedelta
import random
from typing import List

from sqlalchemy.orm import Session

from . import models

EBBINGHAUS_INTERVALS = [1, 2, 4, 7, 15]  # days


def schedule_next(word: models.Word, remembered: bool):
    if remembered:
        next_interval = min(word.review_interval_days * 2, EBBINGHAUS_INTERVALS[-1])
        word.review_interval_days = next_interval
    else:
        word.review_interval_days = 1
    word.next_review_at = datetime.utcnow() + timedelta(days=word.review_interval_days)


def get_due_words(db: Session, user_id: int) -> List[models.Word]:
    now = datetime.utcnow()
    return (
        db.query(models.Word)
        .filter(models.Word.owner_id == user_id, models.Word.next_review_at <= now)
        .order_by(models.Word.next_review_at.asc())
        .all()
    )


def pick_for_review(db: Session, user_id: int, count: int) -> List[models.Word]:
    due = get_due_words(db, user_id)
    if len(due) <= count:
        return due
    return random.sample(due, count)
