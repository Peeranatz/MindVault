# MindVault

MindVault คือเว็บแอปสำหรับบันทึกไดอารี่สุขภาพใจด้วย AI โดยออกแบบให้เป็นพื้นที่ปลอดภัยสำหรับการระบายความรู้สึกในชีวิตประจำวัน พร้อมระบบช่วยวิเคราะห์อารมณ์, ตรวจสัญญาณความเสี่ยงเบื้องต้น, และอ้างอิงความรู้ด้วย RAG เพื่อให้คำตอบมีความโปร่งใสและตรวจสอบได้

โปรเจกต์นี้ประกอบด้วย:
- Frontend (Next.js + TypeScript) สำหรับหน้าผู้ใช้และแพทย์
- Backend (FastAPI + SQLAlchemy) สำหรับ API และ business logic
- SQLite สำหรับการพัฒนาในเครื่อง
- Gemini API สำหรับสร้างคำตอบ AI และสรุปเชิงคลินิก

## 1) ภาพรวมความสามารถของระบบ

ระบบรองรับ 2 บทบาทหลัก:
- ผู้ใช้ (User)
  - สมัคร/เข้าสู่ระบบ
  - ทำแบบประเมิน MBTI
  - เขียนไดอารี่และรับคำตอบจาก AI
  - กดดูแหล่งอ้างอิง RAG ใต้คำตอบ
- แพทย์ (Doctor)
  - เชื่อมผู้ป่วยด้วยชื่อผู้ใช้
  - เชิญผู้ป่วยผ่าน QR Invite
  - ค้นหารายชื่อผู้ป่วยใน Dashboard
  - เปิดหน้าโปรไฟล์ผู้ป่วยเพื่อดูสรุป 30 วัน + AI Clinical Summary

ฟีเจอร์สำคัญ:
- ปรับโทนคำตอบตาม MBTI
- วิเคราะห์อารมณ์ (mood) และ cognitive distortion เบื้องต้น
- ตรวจจับข้อความเสี่ยง (crisis keyword detection)
- แสดงแหล่งอ้างอิง RAG แบบอ่านง่าย
- ระบบเชิญผู้ป่วยด้วย QR และเชื่อมอัตโนมัติเมื่อสมัคร

## 2) เทคโนโลยีที่ใช้

Frontend:
- Next.js 14
- React 18
- TypeScript
- Tailwind CSS
- Axios
- qrcode.react

Backend:
- FastAPI
- SQLAlchemy
- Pydantic v2
- python-jose (JWT)
- bcrypt/passlib
- google-generativeai

Database:
- SQLite (ค่าเริ่มต้นสำหรับ local)

## 3) โครงสร้างโปรเจกต์

โฟลเดอร์หลัก:
- `backend/`
  - `api/` endpoint ต่างๆ (`auth`, `journal`, `doctor`, `connect`, `mbti`)
  - `core/` service หลัก (`llm_engine`, `rag_service`, `mbti_logic`)
  - `database/` db setup และ ORM models
- `frontend/`
  - routes ของผู้ใช้/แพทย์/auth
  - components กลาง เช่น Toast, Loading, RAG popup
  - client API (`src/lib/api.ts`)
- `chunking_sky.txt`
  - คลังความรู้แบบ chunk สำหรับ RAG
- `run.bat`
  - สตาร์ท backend + frontend (Windows)
- `start_backend.bat`, `start_frontend.bat`
  - สตาร์ทแยกบริการ

## 4) สิ่งที่ต้องติดตั้งก่อนเริ่ม (Prerequisites)

ติดตั้งให้พร้อมก่อน:
- Git
- Python 3.10+ (แนะนำ 3.11)
- Node.js 18+ (หรือ 20 LTS)

หมายเหตุสำหรับ Windows:
- ถ้าเจอ `git is not recognized` ให้เปิด terminal ใหม่หลังติดตั้ง Git
- ถ้าเจอ `npm is not recognized` ให้ตรวจ PATH ของ Node.js

## 5) วิธีติดตั้งแบบเร็วที่สุด (Windows)

1. Clone โปรเจกต์

```bash
git clone https://github.com/Peeranatz/MindVault.git
cd MindVault
```

2. ตั้งค่า Backend

```bash
cd backend
python -m venv venv
venv\Scripts\pip install -r requirements.txt
cd ..
```

3. ตั้งค่า Frontend

```bash
cd frontend
npm install
cd ..
```

4. สร้างไฟล์ `backend/.env`

```env
GEMINI_API_KEY=YOUR_GEMINI_API_KEY
SECRET_KEY=YOUR_STRONG_RANDOM_SECRET
DATABASE_URL=sqlite:///./app.db
JWT_EXPIRE_MINUTES=60
APP_ENV=development
```

คำอธิบายสำคัญ:
- `GEMINI_API_KEY` ต้องมี ถ้าไม่มีระบบจะ fallback เป็นคำตอบแบบ rule-based บางส่วน
- `SECRET_KEY` ใช้เซ็น JWT ควรตั้งให้สุ่มและเดายาก
- `DATABASE_URL` ค่าเริ่มต้นใช้ SQLite ในเครื่อง

5. รันระบบทั้งหมดด้วยไฟล์ batch

```bash
run.bat
```

URL หลังรันสำเร็จ:
- Frontend: `http://localhost:3000`
- Backend: `http://localhost:8001`
- Swagger: `http://localhost:8001/docs`

## 6) วิธีรันแบบแยกบริการ (Manual)

Terminal 1 (Backend):

```bash
cd backend
venv\Scripts\python.exe -m uvicorn backend.main:app --port 8001 --reload
```

Terminal 2 (Frontend):

```bash
cd frontend
npm run dev
```

## 7) Environment Variables ที่ระบบใช้งาน

ตัวแปรหลักฝั่ง backend:
- `GEMINI_API_KEY`
- `SECRET_KEY`
- `DATABASE_URL`
- `JWT_EXPIRE_MINUTES`
- `APP_ENV`
- `GEN_LANG_CLIENT` (legacy fallback)

ข้อควรระวัง:
- ห้าม commit ค่า API key จริงขึ้น Git
- ไฟล์ `backend/.env` ถูก ignore ไว้แล้ว

## 8) API หลักของระบบ

Auth:
- `POST /auth/register`
- `POST /auth/login`
- `GET /auth/me`

Journal:
- `POST /journal`
- `GET /journal`

MBTI:
- `POST /mbti/analyze`

Doctor:
- `POST /doctor/connect`
- `GET /doctor/patients`
- `GET /doctor/patients/{patient_id}/summary`
- `GET /doctor/patients/{patient_id}/profile`
- `POST /doctor/invite`
- `GET /doctor/invite/{token}`

Connect request flow:
- `GET /connect/requests`
- `POST /connect/handle`

Health check:
- `GET /health`

## 9) การตั้งค่าระบบ RAG

ระบบ retriever จะมองหาไฟล์ตามลำดับนี้:
1. `chunking_sky.txt`
2. `knowledge_base.txt`

รูปแบบไฟล์ที่รองรับ:
- JSON ที่มี key `knowledge_chunks` (แนะนำ)
- Plain text (จะแบ่งย่อหน้าด้วยบรรทัดว่าง)

ตัวอย่าง JSON ที่แนะนำ:

```json
{
  "knowledge_chunks": [
    {
      "chunk_id": "breathing_001",
      "topic": "เทคนิคการหายใจ",
      "content": "หายใจเข้า 1-4 กลั้น 1-4 ผ่อนออก 1-8"
    }
  ]
}
```

พฤติกรรมการดึงข้อมูล:
- ให้คะแนนจาก token overlap + n-gram similarity (รองรับภาษาไทยดีขึ้น)
- จัดลำดับหัวข้อเชิงปฏิบัติให้อยู่ก่อนหัวข้อเชิงประเมิน
- ส่งกลับเป็นข้อความอ้างอิงแบบหัวข้อ + bullet (อ่านง่าย)

## 10) เช็กลิสต์ทดสอบระบบหลังติดตั้ง

1. Auth:
- สมัครผู้ใช้ 1 บัญชี และแพทย์ 1 บัญชี
- login ได้ทั้ง 2 บทบาท

2. User flow:
- ทำ MBTI สำเร็จ
- ส่งบันทึกได้
- ได้คำตอบจาก AI
- กดปุ่ม RAG แล้วเห็นแหล่งอ้างอิง

3. Doctor flow:
- สร้าง QR invite
- สมัครผู้ใช้ผ่าน invite token
- ผู้ป่วยขึ้นใน dashboard
- กดดูโปรไฟล์ผู้ป่วยและเห็นข้อมูลสรุป

4. Restart test:
- ปิดและเปิด backend/frontend ใหม่
- ระบบยังใช้งานได้ด้วย config เดิม

## 11) ปัญหาที่พบบ่อยและวิธีแก้ (Troubleshooting)

### 11.1 ได้ 401 Unauthorized
สาเหตุที่พบบ่อย:
- token ใน localStorage หมดอายุหรือไม่ถูกต้อง
- backend เพิ่ง restart และ session เดิมใช้ไม่ได้

วิธีแก้:
- logout/login ใหม่
- ล้าง token ใน browser แล้ว login ใหม่

### 11.2 กด RAG แล้วไม่มีข้อมูล
สาเหตุ:
- ไฟล์คลังความรู้ว่าง
- prompt ไม่ตรงกับหัวข้อความรู้พอ

วิธีแก้:
- ตรวจว่า `chunking_sky.txt` มีข้อมูลจริง
- ลอง prompt ที่มี keyword ชัดขึ้น

### 11.3 `git` ใช้ไม่ได้บน Windows
วิธีแก้:
- ติดตั้ง Git for Windows
- ปิด/เปิด terminal ใหม่
- หรือเรียกตรงผ่าน `C:\Program Files\Git\cmd\git.exe`

### 11.4 static/css แปลกๆ หรือหน้าเพี้ยน
วิธีแก้:
- ปิด dev server ที่ซ้ำซ้อน
- รัน frontend ใหม่
- ลบ `.next` แล้ว `npm run dev` ใหม่

## 12) คำแนะนำสำหรับการ push ขึ้น Git

ก่อน push ทุกครั้ง:
- ตรวจว่าไม่มี secret ในไฟล์ tracked
- อย่า commit `.env`
- อย่า commit runtime logs / local DB โดยไม่ตั้งใจ

ไฟล์ที่ถูก ignore แล้ว:
- `.env` และไฟล์ env อื่นๆ
- runtime logs (`backend_out.txt`, `backend_err.txt`)
- cache/build artifacts
- `app.db` สำหรับ local development

## 13) แนวทางพัฒนาต่อ (สำหรับ contributor)

ข้อเสนอเพื่อพัฒนาต่อ:
- เพิ่ม automated tests ของ API routes
- เพิ่ม migration (Alembic) แทน create table อัตโนมัติ
- เพิ่ม observability/logging สำหรับการตัดสินใจของ LLM/RAG
- ปรับจาก `google-generativeai` ไป SDK ใหม่ในอนาคต
- เพิ่ม role-based guard และ UX ตอน error ให้ชัดขึ้น

## 14) ข้อจำกัดความรับผิดชอบ

MindVault เป็นระบบช่วยสะท้อนความรู้สึกและให้คำแนะนำเบื้องต้น ไม่ใช่เครื่องมือวินิจฉัยโรคทางการแพทย์

หากมีความเสี่ยงทำร้ายตนเองหรือภาวะฉุกเฉินด้านสุขภาพจิต กรุณาติดต่อสายด่วนสุขภาพจิต 1323 หรือหน่วยฉุกเฉินใกล้คุณทันที

---

MindVault ถูกออกแบบให้ใช้งานได้จริงทั้งเชิงผู้ใช้ทั่วไปและทีมพัฒนาที่ต้อง clone ไปต่อยอด
