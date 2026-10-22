# 🎓 Study Planner AI

An AI-powered study planner that creates **personalized learning paths** with curated courses, resources, and week-by-week roadmaps. Built with 4 specialized AI agents working together.

## ✨ What It Does

Type in what you want to learn, and 4 AI agents collaborate to build you a complete study plan:

| Agent | Role |
|---|---|
| 📋 **Intake Specialist** | Understands your topic, motivation, and level |
| 🔍 **Goal Researcher** | Researches the best learning strategy for your goal |
| ✍️ **Prompt Engineer** | Crafts the perfect instructions for the planner |
| 🎓 **Course Planner** | Generates a full study plan with courses, resources & tips |

## 🖥️ Features

- 🌑 Dark glassmorphism UI with animated backgrounds
- 📚 **History sidebar** — never lose a past study plan (saved in browser)
- 📋 Copy study plan as markdown
- 🔒 Rate limiting, CSRF protection, input validation
- 📱 Fully responsive — works on mobile, tablet, desktop

## 🚀 Setup

### 1. Clone the repo

```bash
git clone https://github.com/hi-hello1/milloai-agenticlearningai
cd study-planner-ai
```

### 2. Create a virtual environment

```bash
python -m venv venv
# Windows
venv\Scripts\activate
# macOS/Linux
source venv/bin/activate
```

### 3. Install dependencies

```bash
pip install -r requirements.txt
```

### 4. Set up your API key

Create a `.env` file in the project root:

```env
GEMINI_API_KEY=your_gemini_api_key_here
FLASK_SECRET_KEY=any_random_string_here
```

> ⚠️ **Never commit your `.env` file to git.** It's already in `.gitignore`.

You can get a Gemini API key from [Google AI Studio](https://aistudio.google.com/apikey).

### 5. Run the app

```bash
python app.py
```

Open **http://127.0.0.1:5000** in your browser.

## 📁 Project Structure

```
├── agent.py              # 4 CrewAI agents + tasks
├── app.py                # Flask backend (API)
├── requirements.txt      # Python dependencies
├── .env                  # API keys (not in git)
├── .gitignore            # Protects secrets
├── templates/
│   └── index.html        # Web UI
└── static/
    ├── style.css         # Styling
    └── script.js         # Frontend logic
```

## 🛡️ Security

- API keys stored in `.env` (never hardcoded)
- Rate limited to 5 requests/hour per IP
- CSRF token protection on all POST requests
- Input validation with length limits and whitelisting
- Security headers (CSP, X-Frame-Options, XSS protection)
- Markdown output sanitized with DOMPurify

## 🛠️ Built With

- [CrewAI](https://www.crewai.com/) — Multi-agent orchestration
- [Gemini 2.5 Flash](https://ai.google.dev/) — LLM
- [Flask](https://flask.palletsprojects.com/) — Backend
- [marked.js](https://marked.js.org/) — Markdown rendering
- [DOMPurify](https://github.com/cure53/DOMPurify) — XSS protection

## 📄 License

me
