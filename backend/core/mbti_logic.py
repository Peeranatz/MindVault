import os
import random
import re
from typing import List

GEMINI_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GEN_LANG_CLIENT")
    or os.getenv("gen-lang-client")
)


def classify_from_answers(answers: List[str]) -> str:
    """
    Try LLM first; fallback to simple keyword heuristic.
    """
    joined = " ".join(answers).strip()
    mbti = None

    if GEMINI_KEY:
        try:
            import google.generativeai as genai  # type: ignore

            genai.configure(api_key=GEMINI_KEY)
            model = genai.GenerativeModel("gemini-2.5-flash")
            prompt = (
                "You are an expert MBTI analyst. Analyze the following combined answers "
                "from a user and determine their MBTI type. Output ONLY the 4-letter MBTI type "
                "(e.g., INFP, ENFJ, ISTJ, etc.). Do not include any other text or explanation.\n\n"
                f"User answers: {joined}"
            )
            resp = model.generate_content(prompt)
            text = (
                resp.text.strip().upper()
                if resp and getattr(resp, "text", None)
                else ""
            )
            match = re.search(r"\b[EI][NS][FT][JP]\b", text)
            if match:
                mbti = match.group(0)
        except Exception:
            mbti = None

    if mbti:
        return mbti

    # Fallback heuristic
    low = joined.lower()
    if any(k in low for k in ["plan", "logic", "analyze", "วางแผน", "เหตุผล"]):
        return "INTJ"
    if any(k in low for k in ["feel", "emotion", "รู้สึก", "ใจ", "ความรู้สึก"]):
        return random.choice(["INFP", "ENFP"])
    return "INFP"
