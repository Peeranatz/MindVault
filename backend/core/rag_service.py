import json
import re
from pathlib import Path
from typing import Dict, List


_TH_LABELS = {
    "topic": "หัวข้อ",
    "content": "เนื้อหา",
    "questions": "ประเด็นจากแบบประเมิน",
    "question": "ประเด็นจากแบบประเมิน",
    "details": "แนวทาง",
    "description": "คำอธิบาย",
    "action": "วิธีปฏิบัติ",
    "method": "วิธีทำ",
    "procedure": "ขั้นตอน",
    "steps": "ขั้นตอน",
    "benefit": "ประโยชน์",
    "recommendation": "คำแนะนำ",
    "caution": "ข้อควรระวัง",
    "physical": "อาการทางกาย",
    "mental": "อาการทางใจ",
    "behavioral": "พฤติกรรมที่พบ",
    "meaning": "การตีความ",
    "level": "ระดับ",
    "range": "ช่วงคะแนน",
}

_IGNORE_KEYS = {
    "metadata",
    "chunk_id",
    "book_info",
    "publisher",
    "contact",
    "edition",
    "title",
}

# Try multiple candidate knowledge files.
_CANDIDATE_KB = [
    Path(__file__).resolve().parents[2] / "chunking_sky.txt",
    Path(__file__).resolve().parents[3] / "chunking_sky.txt",
    Path(__file__).resolve().parents[2] / "knowledge_base.txt",
    Path(__file__).resolve().parents[3] / "knowledge_base.txt",
]


def _load_chunks(kb_path: Path) -> List[Dict]:
    if not kb_path.exists():
        return []
    try:
        raw = kb_path.read_text(encoding="utf-8").strip()
        if not raw:
            return []

        # JSON chunk format: {"knowledge_chunks": [...]}
        if raw.startswith("{"):
            data = json.loads(raw)
            chunks = data.get("knowledge_chunks", [])
            if isinstance(chunks, list):
                return chunks

        # Plain text fallback: split by blank lines into chunks.
        paragraphs = [p.strip() for p in re.split(r"\n\s*\n", raw) if p.strip()]
        if not paragraphs:
            return []
        return [
            {
                "topic": "Knowledge Base",
                "chunk_id": f"kb-{idx + 1}",
                "content": paragraph,
            }
            for idx, paragraph in enumerate(paragraphs)
        ]
    except Exception:
        return []


def _load_first_available_chunks() -> List[Dict]:
    for path in _CANDIDATE_KB:
        chunks = _load_chunks(path)
        if chunks:
            return chunks
    return []


_CHUNKS = _load_first_available_chunks()


def _normalize_for_match(text: str) -> str:
    # Keep Thai/English letters and digits, remove spaces and punctuation.
    return re.sub(r"[^0-9a-zA-Z\u0E00-\u0E7F]", "", str(text or "").lower())


def _char_ngrams(text: str, n: int = 3) -> set[str]:
    if len(text) < n:
        return {text} if text else set()
    return {text[i : i + n] for i in range(len(text) - n + 1)}


def _chunk_text(c: Dict) -> str:
    # Include all fields in a chunk, not only "content", so chunks with
    # "details", "procedure", "steps" are retrievable too.
    try:
        return json.dumps(c, ensure_ascii=False)
    except Exception:
        return str(c)


def _topic_bonus(topic: str) -> float:
    low = str(topic or "").lower()
    bonus = 0.0

    helpful_keywords = [
        "ผ่อนคลาย",
        "คลายเครียด",
        "หายใจ",
        "นวด",
        "แนวทางปฏิบัติ",
        "recommendation",
        "breathing",
        "relaxation",
        "massage",
    ]
    symptom_keywords = ["สัญญาณ", "อาการ", "symptoms"]
    lower_priority_keywords = ["แบบประเมิน", "assessment", "คะแนน", "scoring"]

    if any(keyword in low for keyword in helpful_keywords):
        bonus += 4.0
    if any(keyword in low for keyword in symptom_keywords):
        bonus += 1.5
    if any(keyword in low for keyword in lower_priority_keywords):
        bonus -= 2.0

    return bonus


def _shorten(text: str, max_len: int = 220) -> str:
    clean = re.sub(r"\s+", " ", str(text or "")).strip()
    if len(clean) <= max_len:
        return clean
    return clean[:max_len].rstrip() + "..."


def _flatten_value(value, prefix: str = "") -> List[str]:
    lines: List[str] = []
    if value is None:
        return lines

    if isinstance(value, str):
        t = value.strip()
        if t:
            label = _TH_LABELS.get(prefix.lower(), prefix) if prefix else ""
            lines.append(f"{label}: {t}" if label else t)
        return lines

    if isinstance(value, (int, float, bool)):
        label = _TH_LABELS.get(prefix.lower(), prefix) if prefix else ""
        lines.append(f"{label}: {value}" if label else str(value))
        return lines

    if isinstance(value, list):
        for item in value:
            lines.extend(_flatten_value(item, prefix))
        return lines

    if isinstance(value, dict):
        # Preferred compact phrasing for common patterns.
        if "action" in value and "description" in value:
            action = str(value.get("action") or "").strip()
            desc = str(value.get("description") or "").strip()
            if action and desc:
                lines.append(f"{action}: {desc}")
                return lines
        if "range" in value and "level" in value and "meaning" in value:
            rng = str(value.get("range") or "").strip()
            lvl = str(value.get("level") or "").strip()
            meaning = str(value.get("meaning") or "").strip()
            if rng and lvl and meaning:
                lines.append(f"ช่วง {rng} ({lvl}): {meaning}")
                return lines

        for k, v in value.items():
            key = str(k)
            if key.lower() in _IGNORE_KEYS:
                continue
            lines.extend(_flatten_value(v, key))
        return lines

    lines.append(f"{prefix}: {value}" if prefix else str(value))
    return lines


def _relevant_excerpt(c: Dict, query: str, q_tokens: List[str], q_grams: set[str]) -> str:
    topic = str(c.get("topic") or "หัวข้อไม่ระบุ").strip()

    candidate_lines = _flatten_value(c)
    if not candidate_lines:
        return topic

    ranked = []
    for line in candidate_lines:
        low = line.lower()
        token_score = sum(low.count(tok) for tok in q_tokens)
        n_line = _normalize_for_match(low)
        grams = _char_ngrams(n_line, 3)
        gram_overlap = len(q_grams & grams)
        gram_score = gram_overlap / max(len(q_grams), 1)
        score = token_score + (gram_score * 6)
        if score > 0:
            ranked.append((score, line))

    if ranked:
        ranked.sort(key=lambda x: x[0], reverse=True)
        picked = [line for _, line in ranked[:3]]
    else:
        picked = candidate_lines[:2]

    # Remove duplicated label noise and keep only concise, human-friendly lines.
    cleaned: List[str] = []
    seen = set()
    for line in picked:
        line = re.sub(r"\s+", " ", line).strip()
        if not line or line.lower().startswith("หัวข้อ:"):
            continue
        norm = line.lower()
        if norm in seen:
            continue
        seen.add(norm)
        cleaned.append(line)

    bullets = "\n".join(f"- {_shorten(line)}" for line in cleaned[:3] if line.strip())
    return f"{topic}\n{bullets}".strip()


def retrieve_sources(query: str, limit: int = 2) -> List[str]:
    """
    Lightweight RAG retriever: keyword overlap scoring against chunked knowledge.
    Returns top `limit` formatted snippets. 
    If no meaningful keyword match is found, returns an empty list to avoid sending irrelevant/duplicate info.
    """
    if not _CHUNKS:
        return []

    q_tokens = [
        t for t in re.split(r"[\s,.;:?!]+", str(query or "").lower()) if len(t) >= 2
    ]
    q_norm = _normalize_for_match(query)
    q_grams = _char_ngrams(q_norm, 3)

    scored = []
    for c in _CHUNKS:
        raw_content = c.get("content")
        if isinstance(raw_content, (dict, list)):
            raw_content = json.dumps(raw_content, ensure_ascii=False)

        text = _chunk_text(c).lower()
        topic = str(c.get("topic") or "").lower()
        # Token overlap scoring (fast path)
        token_score = sum(text.count(tok) + (topic.count(tok) * 2) for tok in q_tokens)

        # Thai-friendly fallback using char 3-gram overlap.
        c_norm = _normalize_for_match(text)
        c_grams = _char_ngrams(c_norm, 3)
        gram_overlap = len(q_grams & c_grams)
        gram_score = gram_overlap / max(len(q_grams), 1)

        score = token_score + (gram_score * 10) + _topic_bonus(topic)

        if score > 0:
            scored.append(
                (
                    score,
                    _relevant_excerpt(c, query, q_tokens, q_grams),
                )
            )

    scored.sort(key=lambda x: x[0], reverse=True)
    if scored:
        return [s for _, s in scored[:limit]]

    # Removed fallback: ถ้าหาเรื่องที่ตรงกับข้อความไม่ได้เลย ก็ไม่ต้องตอบกลับข้อมูลความรู้มั่วๆ ไป
    return []
