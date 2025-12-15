from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models, scheduler
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/review", tags=["review"])


@router.post("/start", response_model=list[schemas.ReviewItem])
def start_review(
    request: schemas.ReviewRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    words = scheduler.pick_for_review(db, current_user.id, request.count)
    items = []
    for word in words:
        if request.mode == "en_to_zh":
            question = word.english or word.definition or ""
            answer = word.chinese or word.definition or ""
        elif request.mode == "zh_to_en":
            question = word.chinese or word.definition or ""
            answer = word.english or word.definition or ""
        else:
            raise HTTPException(status_code=400, detail="Invalid mode")
        items.append(
            schemas.ReviewItem(id=word.id, question=question, answer=answer)
        )
    return items


@router.post("/{word_id}/result")
def submit_result(
    word_id: int,
    remembered: bool,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    word = db.query(models.Word).filter_by(id=word_id, owner_id=current_user.id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    scheduler.schedule_next(word, remembered)
    db.add(word)
    db.commit()
    return {"detail": "updated"}
