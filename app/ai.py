from typing import Optional
from . import schemas


EXAMPLE_SENTENCES = {
    "hello": ["Hello, how are you?", "The teacher said hello to every student."],
    "学习": ["我喜欢学习新的语言。", "每天学习一点点会有进步。"],
}


def complete_word(request: schemas.AICompletionRequest) -> schemas.AICompletionResponse:
    """A deterministic, offline AI completion stub.

    In production you could replace this with a call to an LLM provider.
    """
    english = request.english or "example"
    chinese = request.chinese or "示例"
    part = request.part_of_speech or "noun"
    definition = request.definition or "A placeholder definition generated offline."

    examples = EXAMPLE_SENTENCES.get(english.lower(), [f"This is an example sentence using {english}."])
    translation = ["这是一个示例句子的翻译。" for _ in examples]

    return schemas.AICompletionResponse(
        english=english,
        chinese=chinese,
        part_of_speech=part,
        definition=definition,
        examples=examples,
        translation=translation,
    )
