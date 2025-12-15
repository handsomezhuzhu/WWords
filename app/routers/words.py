from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from .. import schemas, models, ai
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/words", tags=["words"])


@router.post("/", response_model=schemas.Word)
def create_word(
    word: schemas.WordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    new_word = models.Word(owner_id=current_user.id, **word.dict())
    db.add(new_word)
    db.commit()
    db.refresh(new_word)
    return new_word


@router.get("/", response_model=list[schemas.Word])
def list_words(
    db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.Word)
        .filter(models.Word.owner_id == current_user.id)
        .order_by(models.Word.created_at.desc())
        .all()
    )


@router.post("/complete", response_model=schemas.AICompletionResponse)
def complete_word(request: schemas.AICompletionRequest):
    return ai.complete_word(request)


@router.delete("/{word_id}")
def delete_word(
    word_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    word = db.query(models.Word).filter_by(id=word_id, owner_id=current_user.id).first()
    if not word:
        raise HTTPException(status_code=404, detail="Word not found")
    db.delete(word)
    db.commit()
    return {"detail": "deleted"}
