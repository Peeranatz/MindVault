import os
import random
import re
from typing import List, Optional
from dotenv import load_dotenv
import traceback

# Force load from absolute path to ensure we always get it
env_path = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), '.env')
load_dotenv(dotenv_path=env_path)  # Load environment variables from .env if present

GEMINI_KEY = (
    os.getenv("GEMINI_API_KEY")
    or os.getenv("GEN_LANG_CLIENT")
    or os.getenv("gen-lang-client")
)
print(f"DEBUG LLM_ENGINE: Loaded API KEY (starts with): {str(GEMINI_KEY)[:5] if GEMINI_KEY else None}")


def _detect_crisis(message: str) -> bool:
    crisis_patterns = [
        r"suicide",
        r"kill myself",
        r"want to die",
        r"อยากตาย",
        r"ฆ่าตัวตาย",
        r"ทำร้ายตัวเอง",
        r"ไม่อยากมีชีวิต",
        r"อยู่ไปก็ไม่มีค่า",
        r"ตายๆ ไป",
        r"\bตาย\b",
        r"ตายดีกว่า",
        r"จบชีวิต",
        r"โดดตึก",
        r"กินยาเกิน",
    ]
    msg = message.lower()
    return any(re.search(pat, msg) for pat in crisis_patterns)


def _detect_distortion(message: str) -> Optional[str]:
    msg = message.lower()
    if any(w in msg for w in ["เสมอ", "ตลอด", "ไม่มีอะไรดี"]):
        return "Overgeneralization"
    if any(w in msg for w in ["ทั้งหมด", "ไม่มีค่า", "ล้มเหลวทุกอย่าง"]):
        return "All-or-Nothing"
    return None


def _estimate_mood(message: str) -> int:
    positive = ["ดีใจ", "โล่ง", "สบาย", "ขอบคุณ", "happy", "calm"]
    negative = ["เศร้า", "เครียด", "กังวล", "โกรธ", "ผิดหวัง", "sad", "anxious"]
    msg = message.lower()
    pos = sum(msg.count(p.lower()) for p in positive)
    neg = sum(msg.count(n.lower()) for n in negative)
    if neg > pos + 1:
        return 2
    if pos > neg + 1:
        return 4
    return 3


def _call_gemini(
    message: str, mbti: Optional[str], sources: List[str]
) -> Optional[str]:
    if not GEMINI_KEY:
        return None
    try:
        import google.generativeai as genai  # type: ignore

        genai.configure(api_key=GEMINI_KEY)
        model = genai.GenerativeModel("gemini-2.5-flash")

        persona = f"ผู้ใช้ที่คุณกำลังคุยด้วยมีบุคลิกภาพ MBTI แบบ {mbti} ปรับสไตล์การโต้ตอบให้อบอุ่น เข้าอกเข้าใจ และเข้ากับไทป์ {mbti} โดยเฉพาะ" if mbti else "ผู้ใช้ที่คุณกำลังคุยด้วยไม่ได้ระบุ MBTI โปรดตอบด้วยความเห็นอกเห็นใจอย่างเป็นธรรมชาติ"
        
        system = (
            "คุณคือผู้ช่วยจดบันทึกไดอารี่เรื่องสุขภาพจิตที่แสนอบอุ่นและเป็นกันเอง "
            "ตอบด้วยภาษาที่เป็นธรรมชาติ เป็นมนุษย์ ไม่เหมือนหุ่นยนต์ และให้ความรู้สึกเหมือนเพื่อนที่เข้าใจ "
            f"{persona} "
            "ข้อทบทวนทางการแพทย์: หากมี Knowledge Snippets (RAG) เข้ามา ให้หยิบข้อมูลเฉพาะส่วนที่เกี่ยวข้องมาประยุกต์ใช้เพื่อความถูกต้อง "
            "แต่ห้ามตอบแบบคัดลอกตำราหรือบอกตรงๆ ว่ามาจากความรู้ ให้เล่าเรื่องแบบละมุนละม่อมและเป็นธรรมชาติที่สุด "
            "หลีกเลี่ยงการให้คำแนะนำทางการแพทย์ที่เฉพาะเจาะจง ให้เน้นการรับฟังและเสนอแนะวิธีรับมือเบื้องต้นที่ปลอดภัยและทำได้ทันที "
            "พยายามตอบให้กระชับ ไม่เยิ่นเย้อจนเกินไป"
        )

        prompt = system + "\n\nไดอารี่/ข้อความของผู้ใช้:\n" + message
        if sources:
            prompt += "\n\nข้อมูลทางการแพทย์อ้างอิง (Knowledge Snippets):\n" + "\n".join(sources[:3])

        print(f"DEBUG LLM_ENGINE: Sending prompt to Gemini...")
        resp = model.generate_content(prompt)
        print(f"DEBUG LLM_ENGINE: Received response from Gemini")
        return resp.text if resp and getattr(resp, "text", None) else None
    except Exception as e:
        print(f"DEBUG LLM_ENGINE: Error calling Gemini: {e}")
        traceback.print_exc()
        return None


def generate_response(
    message: str, mbti: Optional[str] = None, sources: Optional[List[str]] = None
) -> dict:
    if not isinstance(message, str):
        message = str(message)
    sources = sources or []

    gemini_reply = _call_gemini(message, mbti, sources)

    mood_score = _estimate_mood(message)
    distortion = _detect_distortion(message)
    crisis = _detect_crisis(message)

    reply_lines: List[str] = []
    if gemini_reply:
        reply_lines.append(gemini_reply.strip())
    else:
        empathy_opts = [
            "ได้ยินเลยว่ากำลังรู้สึกแบบนี้นะ ผมอยู่ตรงนี้ด้วย",
            "รับรู้ความรู้สึกตรงนี้นะ อยู่กับคุณเสมอ",
            "ขอบคุณที่เล่าให้ฟังนะ ฟังดูไม่ง่ายเลย",
        ]
        guidance_opts = [
            "ลองหายใจลึก ช้า สัก 4-4-6 ครั้ง แล้วเลือกทำสิ่งเล็กที่สุดตอนนี้",
            "พักสายตา/ลุกยืดตัวสั้น ๆ แล้วจด 1 งานเล็กที่ทำได้ทันที",
            "ถ้าโอเค ลองยืดไหล่ สูดลมหายใจ 3 ครั้ง แล้วดื่มน้ำอุ่นสักแก้ว",
        ]
        empathy = random.choice(empathy_opts)
        guidance = random.choice(guidance_opts)
        if crisis:
            guidance = "ถ้ารู้สึกไม่ปลอดภัย โปรดโทร 1323 หรือบอกคนใกล้ชิดทันที"
        reply_lines.append(f"{empathy} {guidance}")
        if sources:
            reply_lines.append("มีข้อมูลเกี่ยวข้อง ลองกดปุ่มแหล่งอ้างอิง (RAG) เพื่อดูรายละเอียด")

    return {
        "response": "\n".join(reply_lines),
        "detected_mood": mood_score,
        "cognitive_distortion": distortion,
        "is_crisis": crisis,
    }
