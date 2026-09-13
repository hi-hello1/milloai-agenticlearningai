import os
import re
import secrets
import traceback

from dotenv import load_dotenv
from flask import Flask, render_template, request, jsonify, session
from flask_limiter import Limiter
from flask_limiter.util import get_remote_address

load_dotenv()

# Auto-detect directory structure (local has templates/ & static/ folders,
# but GitHub/Render has a flat layout with all files at root)
_base_dir = os.path.dirname(os.path.abspath(__file__))
_has_folders = os.path.isdir(os.path.join(_base_dir, 'templates'))
app = Flask(
    __name__,
    template_folder='templates' if _has_folders else '.',
    static_folder='static' if _has_folders else '.',
    static_url_path='/static',
)
app.secret_key = os.getenv("FLASK_SECRET_KEY", secrets.token_hex(32))

# --------------- Rate Limiting ---------------
limiter = Limiter(
    get_remote_address,
    app=app,
    default_limits=[],
    storage_uri="memory://",
)

# --------------- Allowed Values ---------------
ALLOWED_LEVELS = {"beginner", "intermediate", "advanced", "mastery"}
ALLOWED_COURSE_TYPES = {"free", "paid", "both"}
MAX_TOPIC_LENGTH = 200
MAX_MOTIVATION_LENGTH = 500


# --------------- Security Headers ---------------
@app.after_request
def set_security_headers(response):
    response.headers["X-Content-Type-Options"] = "nosniff"
    response.headers["X-Frame-Options"] = "DENY"
    response.headers["X-XSS-Protection"] = "1; mode=block"
    response.headers["Referrer-Policy"] = "strict-origin-when-cross-origin"
    response.headers["Content-Security-Policy"] = (
        "default-src 'self'; "
        "script-src 'self' https://cdn.jsdelivr.net 'unsafe-inline'; "
        "style-src 'self' https://fonts.googleapis.com 'unsafe-inline'; "
        "font-src 'self' https://fonts.gstatic.com; "
        "img-src 'self' data:; "
        "connect-src 'self'"
    )
    return response


# --------------- CSRF Protection ---------------
@app.before_request
def csrf_protect():
    if request.method == "POST":
        token = request.headers.get("X-CSRFToken", "")
        if not token or token != session.get("csrf_token"):
            return jsonify({"error": "Invalid or missing CSRF token."}), 403


# --------------- Helper ---------------
def strip_html(text):
    """Remove any HTML tags from user input."""
    return re.sub(r"<[^>]+>", "", text)


# --------------- Routes ---------------
@app.route("/")
def index():
    if "csrf_token" not in session:
        session["csrf_token"] = secrets.token_hex(32)
    return render_template("index.html", csrf_token=session["csrf_token"])


@app.route("/generate", methods=["POST"])
@limiter.limit("5 per hour")
def generate():
    data = request.get_json()
    if not data:
        return jsonify({"error": "Invalid request body."}), 400

    # Extract and sanitize inputs
    topic = strip_html(data.get("topic", "").strip())
    motivation = strip_html(data.get("motivation", "").strip())
    level = data.get("level", "").strip().lower()
    course_type = data.get("course_type", "").strip().lower()

    # Validate required fields
    if not all([topic, motivation, level, course_type]):
        return jsonify({"error": "All four fields are required."}), 400

    # Validate lengths
    if len(topic) > MAX_TOPIC_LENGTH:
        return jsonify({"error": f"Topic must be under {MAX_TOPIC_LENGTH} characters."}), 400
    if len(motivation) > MAX_MOTIVATION_LENGTH:
        return jsonify({"error": f"Motivation must be under {MAX_MOTIVATION_LENGTH} characters."}), 400

    # Whitelist validation
    if level not in ALLOWED_LEVELS:
        return jsonify({"error": f"Invalid level. Must be one of: {', '.join(ALLOWED_LEVELS)}"}), 400
    if course_type not in ALLOWED_COURSE_TYPES:
        return jsonify({"error": f"Invalid course type. Must be one of: {', '.join(ALLOWED_COURSE_TYPES)}"}), 400

    try:
        from agent import run_crew

        result = run_crew(topic, motivation, level, course_type)
        return jsonify({"result": result})
    except Exception as e:
        traceback.print_exc()
        return jsonify({"error": "An error occurred while generating your study plan. Please try again."}), 500


# --------------- Error Handlers ---------------
@app.errorhandler(429)
def ratelimit_handler(e):
    return jsonify({
        "error": "You've reached the limit of 5 study plans per hour. Please wait and try again later."
    }), 429


if __name__ == "__main__":
    port = int(os.environ.get("PORT", 5000))
    app.run(debug=False, host="0.0.0.0", port=port)
