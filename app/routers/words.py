from datetime import datetime

from fastapi import APIRouter, Depends, HTTPException, Query
from sqlalchemy.orm import Session

from .. import schemas, models, ai
from ..database import get_db
from ..security import get_current_user

router = APIRouter(prefix="/words", tags=["words"])


def find_duplicate_word(
    db: Session,
    owner_id: int,
    english: str | None,
    chinese: str | None,
    exclude_word_id: int | None = None,
):
    query = db.query(models.Word).filter(models.Word.owner_id == owner_id)
    if exclude_word_id is not None:
        query = query.filter(models.Word.id != exclude_word_id)

    if english:
        duplicate = query.filter(models.Word.english == english).first()
        if duplicate:
            return duplicate

    if chinese:
        duplicate = query.filter(models.Word.chinese == chinese).first()
        if duplicate:
            return duplicate

    return None


@router.post("", response_model=schemas.Word, include_in_schema=False)
@router.post("/", response_model=schemas.Word)
def create_word(
    word: schemas.WordCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing_word = find_duplicate_word(db, current_user.id, word.english, word.chinese)
    if existing_word:
        raise HTTPException(status_code=400, detail="Word already exists")

    new_word = models.Word(owner_id=current_user.id, **word.model_dump())
    db.add(new_word)
    db.commit()
    db.refresh(new_word)
    return new_word


@router.get("", response_model=schemas.WordListResponse, include_in_schema=False)
@router.get("/", response_model=schemas.WordListResponse)
def list_words(
    page: int = Query(default=1, ge=1),
    page_size: int = Query(default=12, ge=1, le=100),
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    base_query = db.query(models.Word).filter(models.Word.owner_id == current_user.id)
    now = datetime.utcnow()

    items = (
        base_query
        .order_by(models.Word.created_at.desc())
        .offset((page - 1) * page_size)
        .limit(page_size)
        .all()
    )

    return schemas.WordListResponse(
        items=items,
        total=base_query.count(),
        page=page,
        page_size=page_size,
        due_total=base_query.filter(models.Word.next_review_at <= now).count(),
        active_total=base_query.filter(models.Word.success_streak >= 1).count(),
        stable_total=base_query.filter(models.Word.interval_index >= 3).count(),
    )


@router.post("/complete", response_model=schemas.AICompletionResponse)
def complete_word(
    request: schemas.AICompletionRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    return ai.complete_word(request, db, current_user)


@router.put("/{word_id}", response_model=schemas.Word)
def update_word(
    word_id: int,
    word_update: schemas.WordUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user),
):
    existing_word = db.query(models.Word).filter_by(id=word_id, owner_id=current_user.id).first()
    if not existing_word:
        raise HTTPException(status_code=404, detail="Word not found")

    update_data = word_update.model_dump(exclude_unset=True)
    next_english = update_data.get("english", existing_word.english)
    next_chinese = update_data.get("chinese", existing_word.chinese)
    duplicate = find_duplicate_word(
        db,
        current_user.id,
        next_english,
        next_chinese,
        exclude_word_id=word_id,
    )
    if duplicate:
        raise HTTPException(status_code=400, detail="Word already exists")

    for key, value in update_data.items():
        setattr(existing_word, key, value)

    db.commit()
    db.refresh(existing_word)
    return existing_word


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
