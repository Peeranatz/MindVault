import json
import re
from pathlib import Path
from typing import Dict, List

# Try multiple candidate paths (repo root and workspace root)
_CANDIDATE_KB = [
    Path(__file__).resolve().parents[2]
    / "chunking_sky.txt",  # MindVault-V2/chunking_sky.txt
    Path(__file__).resolve().parents[3]
    / "chunking_sky.txt",  # Smart_Diary/chunking_sky.txt
]
DEFAULT_KB = next((p for p in _CANDIDATE_KB if p.exists()), _CANDIDATE_KB[0])


def _load_chunks(kb_path: Path) -> List[Dict]:
    if not kb_path.exists():
        return []
    try:
        data = json.loads(kb_path.read_text(encoding="utf-8"))
        return data.get("knowledge_chunks", [])
    except Exception:
        return []


_CHUNKS = _load_chunks(DEFAULT_KB)


def retrieve_sources(query: str, limit: int = 3) -> List[str]:
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

    scored = []
    for c in _CHUNKS:
        raw_content = c.get("content")
        if isinstance(raw_content, (dict, list)):
            raw_content = json.dumps(raw_content, ensure_ascii=False)
        
        text = str(raw_content or "").lower()
        topic = str(c.get("topic") or "").lower()
        chunk_id = c.get("chunk_id") or "chunk"
        
        # ถ่วงน้ำหนักคะแนน กรณีเจอคีย์เวิร์ดใน topic จะได้คะแนนเยอะกว่า
        score = sum(text.count(tok) + (topic.count(tok) * 2) for tok in q_tokens)
        
        if score > 0:
            scored.append(
                (
                    score,
                    f"{c.get('topic')} ({chunk_id}): {str(raw_content or '').strip()[:400]}",
                )
            )

    scored.sort(key=lambda x: x[0], reverse=True)
    if scored:
        return [s for _, s in scored[:limit]]

    # Removed fallback: ถ้าหาเรื่องที่ตรงกับข้อความไม่ได้เลย ก็ไม่ต้องตอบกลับข้อมูลความรู้มั่วๆ ไป
    return []
