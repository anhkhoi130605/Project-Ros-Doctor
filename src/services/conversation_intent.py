"""Recognize whole conversational requests without swallowing diagnostic instructions."""
import re
import unicodedata


def _plain(text: str) -> str:
    return "".join(c for c in unicodedata.normalize("NFD", text.lower())
                   if unicodedata.category(c) != "Mn").replace("đ", "d").strip()


def is_conversation_query(query: str) -> bool:
    greeting = r"(?:xin chao|chao ban|chao|hello|hi|hey)"
    capability = (
        r"(?:ban (?:co the )?(?:ho tro|giup)(?: toi|minh)? (?:nhung gi|gi)"
        r"|ban la ai|what can you (?:do|help (?:me )?with)|who are you)"
    )
    return bool(re.fullmatch(
        rf"(?:{greeting}(?:[\s,!?.]+{capability})?|{capability})[\s,!?.]*", _plain(query)
    ))


def is_vietnamese_query(query: str) -> bool:
    # Curly apostrophes and quotation marks in English are not Vietnamese letters.
    letters = "".join(char for char in query if char.isalpha())
    return any(ord(char) > 127 for char in letters) or bool(
        re.search(r"\b(?:xin chao|chao ban|ban ho tro|bang chung|phien nay|khong dung)\b", _plain(query))
    )
