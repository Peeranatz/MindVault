# MindVault AI 🧠✨

MindVault is an AI-powered personal diary and mental health companion designed to provide a safe space for users to express their feelings. It uses advanced LLMs and RAG (Retrieval-Augmented Generation) to offer empathetic responses tailored to the user's MBTI personality, track moods, and provide relevant psychoeducational resources.

## 🌟 Features

- **Personalized AI Companion:** Integrates with the Google Gemini API to respond empathetically. The AI adjusts its conversational tone based on the user's MBTI type (e.g., INFP, INTJ).
- **RAG-based Knowledge Retrieval:** Analyzes the context of user entries and fetches relevant psychological insights or grounding techniques from a curated knowledge base (`chunking_sky.txt`).
- **Real-time Crisis Detection:** Actively scans inputs for critical keywords. If acute distress is detected, it triggers immediate UI warnings and provides emergency contact info (e.g., 1323 in Thailand).
- **Mood Tracking & Cognitive Distortion Analysis:** Automatically estimates mood scores and detects cognitive distortions (e.g., All-or-Nothing thinking) from journal entries.
- **Modern UI:** Built with Next.js and Tailwind CSS for a smooth, responsive, and calming user experience.

## 🛠️ Tech Stack

### Frontend
- **Framework:** Next.js (React)
- **Styling:** Tailwind CSS
- **Language:** TypeScript

### Backend
- **Framework:** FastAPI (Python)
- **Database:** SQLite
- **AI Integrations:** Google Generative AI (Gemini 2.5 Flash)
- **Other:** python-dotenv (Environment management)

## 🚀 Getting Started

### Prerequisites

- Node.js (v18 or newer)
- Python (v3.10 or newer)
- A Google Gemini API Key

### 1. Clone the repository

```bash
git clone https://github.com/Peeranatz/MindVault.git
cd MindVault
```

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd backend
   ```
2. Install Python dependencies:
   ```bash
   pip install -r requirements.txt
   ```
3. Create a `.env` file in the `backend` directory (or use the one provided by your environment) and add your Gemini API Key:
   ```env
   GEMINI_API_KEY=your_gemini_api_key_here
   ```
4. Start the FastAPI server (runs on `http://127.0.0.1:8001` by default):
   ```bash
   uvicorn main:app --port 8001 --reload
   ```

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd frontend
   ```
2. Install NPM packages:
   ```bash
   npm install
   ```
3. Start the Next.js development server (runs on `http://localhost:3001` or `3000`):
   ```bash
   npm run dev
   ```

*(Alternatively, you can run both simultaneously using the provided `run.bat` script on Windows).*

## 🔒 Privacy & Data
All diary entries and logs are stored locally in `app.db` via SQLite. MindVault emphasizes user privacy; data is only sent to the Gemini API for inference and is not collected centrally.

## 🤝 Contributing
Contributions, issues, and feature requests are welcome! Feel free to check the issues page.

---
*Created with ❤️ for better mental well-being.*
