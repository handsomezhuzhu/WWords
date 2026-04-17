import json
from urllib.parse import urlparse

import httpx
from fastapi import HTTPException, status
from sqlalchemy.orm import Session

from . import models, schemas


def get_active_config(db: Session, current_user: models.User) -> models.SystemConfig | None:
    if current_user.is_admin:
        admin_config = (
            db.query(models.SystemConfig)
            .filter(models.SystemConfig.owner_id == current_user.id)
            .order_by(models.SystemConfig.created_at.desc())
            .first()
        )
        if admin_config:
            return admin_config

    return (
        db.query(models.SystemConfig)
        .join(models.User, models.SystemConfig.owner_id == models.User.id)
        .filter(models.User.is_admin.is_(True))
        .order_by(models.SystemConfig.created_at.desc())
        .first()
    )


def complete_word(
    request: schemas.AICompletionRequest,
    db: Session,
    current_user: models.User,
) -> schemas.AICompletionResponse:
    config = get_active_config(db, current_user)
    if not config or not config.api_url or not config.api_key:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="AI service is not configured",
        )

    if request.direction == schemas.AICompletionDirection.ZH_TO_EN:
        target_instruction = f"""
        Target Chinese Word: "{request.word}"
        Task: Translate this Chinese word to English and provide details for the English translation.
        If there are multiple common English translations, pick the most common one as the main "word".
        """
    else:
        target_instruction = f"""
        Target English Word: "{request.word}"
        """

    prompt = f"""
    You are a helpful assistant that provides dictionary data for language learning.
    {target_instruction}

    Please provide the following information in strict JSON format:
    1. Phonetics (UK and US) for the English word
    2. Parts of Speech (list with pos, English meaning, Chinese meaning). For "meaningZh", provide VERY CONCISE Chinese definitions (1-4 words max). Avoid long descriptive sentences.
    3. Examples (list with English sentence and Chinese translation)
    4. Synonyms (list of strings)
    5. Antonyms (list of strings)

    Format:
    {{
        "word": "The English word",
        "phonetics": {{"uk": "...", "us": "..."}},
        "partsOfSpeech": [{{"pos": "...", "meaningEn": "...", "meaningZh": "..."}}],
        "examples": [{{"sentenceEn": "...", "sentenceZh": "..."}}],
        "synonyms": ["..."],
        "antonyms": ["..."]
    }}

    Ensure the JSON is valid and contains no other text.
    """

    try:
        headers = {
            "Authorization": f"Bearer {config.api_key}",
            "Content-Type": "application/json",
        }

        url = config.api_url.rstrip("/")
        parsed_url = urlparse(url)
        if url.endswith("/chat/completions") or url.endswith("/v1/chat/completions"):
            pass
        elif parsed_url.path in ("", "/"):
            url += "/v1/chat/completions"
        elif url.endswith("/v1"):
            url += "/chat/completions"
        else:
            url += "/chat/completions"

        payload = {
            "model": config.model,
            "messages": [
                {"role": "system", "content": "You are a dictionary API. Output JSON only."},
                {"role": "user", "content": prompt},
            ],
            "temperature": float(config.temperature),
        }

        with httpx.Client(timeout=30.0) as client:
            response = client.post(url, headers=headers, json=payload)
            response.raise_for_status()
            data = response.json()

        choices = data.get("choices") or []
        if not choices or "message" not in choices[0]:
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="AI provider returned an unexpected response",
            )

        content = choices[0]["message"].get("content", "")
        if content.startswith("```json"):
            content = content[7:]
        if content.endswith("```"):
            content = content[:-3]
        content = content.strip()

        result = json.loads(content)
        return schemas.AICompletionResponse(
            word=result.get("word", request.word),
            phonetics=schemas.Phonetics(**result.get("phonetics", {})),
            partsOfSpeech=[schemas.PartOfSpeech(**item) for item in result.get("partsOfSpeech", [])],
            examples=[schemas.Example(**item) for item in result.get("examples", [])],
            synonyms=result.get("synonyms", []),
            antonyms=result.get("antonyms", []),
            direction=request.direction,
        )
    except httpx.TimeoutException as exc:
        raise HTTPException(
            status_code=status.HTTP_504_GATEWAY_TIMEOUT,
            detail="AI provider request timed out",
        ) from exc
    except httpx.HTTPStatusError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"AI provider returned HTTP {exc.response.status_code}",
        ) from exc
    except json.JSONDecodeError as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider returned invalid JSON",
        ) from exc
    except HTTPException:
        raise
    except Exception as exc:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="AI provider request failed",
        ) from exc
