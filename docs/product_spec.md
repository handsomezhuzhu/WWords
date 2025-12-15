# Online English Word Book - Product & Architecture Specification

## Goals
- Provide a multilingual (Chinese/English) web experience for collecting, completing, and reviewing vocabulary.
- Use AI completion to enrich partially provided word data with standardized JSON results (definitions, parts of speech, translations, example sentences).
- Support both admin and learner journeys with lightweight, attractive UI that offers light/dark themes.

## Roles
- **Admin**: manages users, AI providers/keys, rate limits, and model presets. Needs protected console.
- **User**: registers/logs in, maintains personal wordbook, requests AI completion, and practices flashcards.

## Core User Flows
1. **Registration/Login**
   - Email/password or social login; locale preference stored per user.
   - On first login, prompt to choose interface language (zh/EN) and theme.

2. **Add Word**
   - Accept partial data: Chinese only, English only, or both.
   - User chooses translation direction: zh→en or en→zh (with multi-part-of-speech support).
   - UI form: base word, optional part of speech, meaning, notes.
   - User can send current entry to AI completion.

3. **AI Completion**
   - Request is routed to AI service with normalized prompt, expecting strict JSON:
     ```json
     {
       "word": "",
       "phonetics": {
         "uk": "",
         "us": ""
       },
       "partsOfSpeech": [
         {"pos": "noun", "meaningEn": "", "meaningZh": ""}
       ],
       "examples": [
         {"sentenceEn": "", "sentenceZh": ""}
       ],
       "synonyms": [""],
       "antonyms": [""],
       "direction": "zh_to_en | en_to_zh"
     }
     ```
   - Backend validates JSON schema before saving.
   - Admin can configure model name, temperature, and max tokens; store per-tenant.

4. **Flashcards (Ebbinghaus-based)**
   - User chooses review direction: English→Chinese or Chinese→English.
   - User selects number of words to review; backend samples words based on spaced repetition schedule (Ebbinghaus intervals: 5m, 30m, 12h, 1d, 2d, 4d, 7d...).
   - Review screen shows single prompt with three buttons: **I know it**, **Unclear**, **Don't know**.
   - Response updates next review date (shorter interval for unclear/don't know; longer for known).

5. **Wordbook Management**
   - CRUD on words, tags, and review state.
   - Bulk import/export (CSV/JSON) with language auto-detection.

## Non-Functional Requirements
- Minimalistic UI with theme toggle and language switch always accessible.
- Responsive layout for mobile/desktop.
- Auditable admin actions; logs for AI usage.
- Role-based access control.
- Rate limiting for AI endpoints.
- Persistence: SQLite for initial storage to keep operations simple and portable.
- Packaging: single-container Docker deployment for app + database.
- CI/CD: GitHub Action builds and publishes the latest container image.

## Data Model (initial)
- **User**: id, email, password hash, role (admin/user), locale, theme, createdAt.
- **WordEntry**: id, ownerId, baseText, language (en/zh), phonetics (JSON), partsOfSpeech (JSON array), examples (JSON array), synonyms, antonyms, tags, direction, createdAt, updatedAt.
- **ReviewSchedule**: id, wordId, userId, lastReviewedAt, nextReviewAt, easinessFactor, intervalIndex, successStreak.
- **AIConfig**: id, provider, model, apiKey alias/secret store pointer, temperature, maxTokens, rateLimit.
- **AuditLog**: id, actorId, action, payload, createdAt.

## Deployment & Operations
- **Runtime**: single Docker container including the web application and SQLite database file (mounted volume for durability recommended).
- **Environment**: image should expose minimal environment variables for secrets (admin seed user, AI provider keys, locale defaults).
- **CI/CD**: GitHub Action builds the container on push to main and publishes a `latest` tag for rapid deployment.

## API Sketch
- `POST /api/auth/register` / `POST /api/auth/login`.
- `GET/POST/PUT/DELETE /api/words` for CRUD.
- `POST /api/words/:id/complete` triggers AI completion; returns validated JSON.
- `POST /api/review/plan` with `{ count, direction }` returns selected words.
- `POST /api/review/:id/answer` updates review schedule based on user response.
- `GET/PUT /api/admin/ai-config` (admin only) for provider/model settings.
- `GET /api/admin/users` and role updates.

## AI Prompting Guidelines
- Include direction flag (zh→en or en→zh) and provided fields.
- Enforce JSON-only response; reject if non-JSON.
- Include at least two example sentences with translations.

## UX Notes
- Landing: quick add form + CTA to practice.
- Review page: keyboard shortcuts (1: know, 2: unclear, 3: don't know).
- Theme & language toggles in header; remember preference.
- Admin console uses table views for users and AI config.

## Future Enhancements
- Speech playback for phonetics.
- Image associations for nouns.
- Offline-friendly PWA mode for review.
