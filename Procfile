web: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 300 --workers 1 --threads 4

services:
  - type: web
    name: crewai-study-planner
    runtime: python
    buildCommand: pip install -r requirements.txt
    startCommand: gunicorn app:app --bind 0.0.0.0:$PORT --timeout 300 --workers 1 --threads 4
    envVars:
      - key: PYTHON_VERSION
        value: "3.11.11"
      - key: GEMINI_API_KEY
        sync: false
      - key: FLASK_SECRET_KEY
        generateValue: true
