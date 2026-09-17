// =============================================
//  Study Planner AI — Frontend Logic
//  With: History, CSRF, DOMPurify, Polling
// =============================================

// --------------- DOM Elements ---------------
const form = document.getElementById("study-form");
const btnGenerate = document.getElementById("btn-generate");
const btnContent = btnGenerate.querySelector(".btn-content");
const loadingSection = document.getElementById("loading-section");
const resultsSection = document.getElementById("results-section");
const errorSection = document.getElementById("error-section");
const errorMessage = document.getElementById("error-message");
const markdownContent = document.getElementById("markdown-content");
const btnCopy = document.getElementById("btn-copy");
const btnRetry = document.getElementById("btn-retry");
const btnBackToForm = document.getElementById("btn-back-to-form");
const formSection = document.getElementById("form-section");

// Sidebar elements
const sidebar = document.getElementById("sidebar");
const btnSidebarToggle = document.getElementById("btn-sidebar-toggle");
const btnSidebarClose = document.getElementById("btn-sidebar-close");
const historyList = document.getElementById("history-list");
const sidebarEmpty = document.getElementById("sidebar-empty");
const btnNewPlan = document.getElementById("btn-new-plan");
const btnClearHistory = document.getElementById("btn-clear-history");
const historyBadge = document.getElementById("history-badge");

// --------------- CSRF Token ---------------
const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content || "";

// --------------- State ---------------
let rawMarkdown = "";
let phaseInterval = null;
let pollInterval = null;
let currentViewingId = null; // The history item currently being viewed

// --------------- History (localStorage) ---------------
const STORAGE_KEY = "study_planner_history";

function getHistory() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function saveHistory(history) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
}

function addToHistory(entry) {
  const history = getHistory();
  history.unshift(entry); // newest first
  saveHistory(history);
  renderHistory();
}

function deleteFromHistory(id) {
  let history = getHistory();
  history = history.filter((h) => h.id !== id);
  saveHistory(history);
  if (currentViewingId === id) {
    currentViewingId = null;
    showForm();
  }
  renderHistory();
}

function clearAllHistory() {
  localStorage.removeItem(STORAGE_KEY);
  currentViewingId = null;
  showForm();
  renderHistory();
}

function formatDate(isoString) {
  const d = new Date(isoString);
  const months = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
  return `${months[d.getMonth()]} ${d.getDate()}, ${d.getHours()}:${String(d.getMinutes()).padStart(2, "0")}`;
}

const levelEmojis = {
  beginner: "🌱",
  intermediate: "📈",
  advanced: "🚀",
  mastery: "👑",
};

function renderHistory() {
  const history = getHistory();

  // Update badge
  if (history.length > 0) {
    historyBadge.style.display = "flex";
    historyBadge.textContent = history.length;
  } else {
    historyBadge.style.display = "none";
  }

  // Clear list (keep empty state)
  const items = historyList.querySelectorAll(".history-item");
  items.forEach((el) => el.remove());

  if (history.length === 0) {
    sidebarEmpty.style.display = "flex";
    return;
  }

  sidebarEmpty.style.display = "none";

  history.forEach((entry) => {
    const item = document.createElement("div");
    item.className = "history-item" + (entry.id === currentViewingId ? " active" : "");
    item.dataset.id = entry.id;
    item.innerHTML = `
      <div class="history-item-info">
        <span class="history-topic">${escapeHtml(entry.topic)}</span>
        <span class="history-meta">${levelEmojis[entry.level] || ""} ${capitalize(entry.level)} · ${formatDate(entry.date)}</span>
      </div>
      <button class="history-delete" data-id="${entry.id}" title="Delete">✕</button>
    `;

    // Click to view
    item.addEventListener("click", (e) => {
      if (e.target.closest(".history-delete")) return;
      viewHistoryItem(entry.id);
    });

    // Delete button
    item.querySelector(".history-delete").addEventListener("click", (e) => {
      e.stopPropagation();
      deleteFromHistory(entry.id);
    });

    historyList.appendChild(item);
  });
}

function viewHistoryItem(id) {
  const history = getHistory();
  const entry = history.find((h) => h.id === id);
  if (!entry) return;

  currentViewingId = id;
  renderHistory(); // Update active state
  showResults(entry.result);

  // On mobile, close sidebar after selecting
  if (window.innerWidth < 769) {
    closeSidebar();
  }
}

function escapeHtml(text) {
  const div = document.createElement("div");
  div.textContent = text;
  return div.innerHTML;
}

function capitalize(s) {
  return s ? s.charAt(0).toUpperCase() + s.slice(1) : "";
}

// --------------- Sidebar Toggle ---------------
function openSidebar() {
  sidebar.classList.add("open");
}

function closeSidebar() {
  sidebar.classList.remove("open");
}

btnSidebarToggle.addEventListener("click", () => {
  if (sidebar.classList.contains("open")) {
    closeSidebar();
  } else {
    openSidebar();
  }
});

btnSidebarClose.addEventListener("click", closeSidebar);

// Close sidebar on outside click (mobile)
document.addEventListener("click", (e) => {
  if (
    window.innerWidth < 769 &&
    sidebar.classList.contains("open") &&
    !sidebar.contains(e.target) &&
    !btnSidebarToggle.contains(e.target)
  ) {
    closeSidebar();
  }
});

// --------------- Sidebar Action Buttons ---------------
btnNewPlan.addEventListener("click", () => {
  currentViewingId = null;
  renderHistory();
  showForm();
  if (window.innerWidth < 769) closeSidebar();
});

btnClearHistory.addEventListener("click", () => {
  if (getHistory().length === 0) return;
  clearAllHistory();
});

// --------------- Agent Loading Phases ---------------
const phases = [
  { text: "📋 Understanding your learning goals…", agent: 0 },
  { text: "🔍 Researching optimal learning strategies…", agent: 1 },
  { text: "✍️ Engineering the perfect prompt…", agent: 2 },
  { text: "🎓 Crafting your personalized study plan…", agent: 3 },
];

function startLoadingAnimation() {
  const phaseEl = document.getElementById("loading-phase");
  const steps = document.querySelectorAll(".agent-step");
  let currentPhase = 0;

  steps.forEach((s) => s.classList.remove("active", "done"));

  function advancePhase() {
    if (currentPhase >= phases.length) {
      currentPhase = phases.length - 1;
      return;
    }
    if (currentPhase > 0) {
      steps[currentPhase - 1].classList.remove("active");
      steps[currentPhase - 1].classList.add("done");
    }
    steps[currentPhase].classList.add("active");
    phaseEl.textContent = phases[currentPhase].text;
    currentPhase++;
  }

  advancePhase();
  phaseInterval = setInterval(advancePhase, 12000);
}

function stopLoadingAnimation() {
  if (phaseInterval) {
    clearInterval(phaseInterval);
    phaseInterval = null;
  }
  document.querySelectorAll(".agent-step").forEach((s) => {
    s.classList.remove("active");
    s.classList.add("done");
  });
}

// --------------- View State Management ---------------
function showForm() {
  stopPolling();
  formSection.style.display = "";
  loadingSection.classList.remove("active");
  resultsSection.classList.remove("active");
  errorSection.classList.remove("active");
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function showLoading() {
  formSection.style.display = "none";
  loadingSection.classList.add("active");
  resultsSection.classList.remove("active");
  errorSection.classList.remove("active");
  btnGenerate.disabled = true;
  btnContent.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="spin-inline"><circle cx="12" cy="12" r="10" stroke-dasharray="50" stroke-dashoffset="20"/></svg>
    Generating…
  `;
  startLoadingAnimation();
  loadingSection.scrollIntoView({ behavior: "smooth", block: "center" });
}

function showResults(markdown) {
  stopLoadingAnimation();
  rawMarkdown = markdown;
  formSection.style.display = "none";
  loadingSection.classList.remove("active");
  resultsSection.classList.add("active");
  errorSection.classList.remove("active");

  // Render markdown with DOMPurify sanitization
  const rawHtml = marked.parse(markdown);
  markdownContent.innerHTML = DOMPurify.sanitize(rawHtml);

  // Open links in new tab
  markdownContent.querySelectorAll("a").forEach((a) => {
    a.setAttribute("target", "_blank");
    a.setAttribute("rel", "noopener noreferrer");
  });

  resetButton();
  resultsSection.scrollIntoView({ behavior: "smooth", block: "start" });
}

function showError(message) {
  stopLoadingAnimation();
  stopPolling();
  formSection.style.display = "none";
  loadingSection.classList.remove("active");
  resultsSection.classList.remove("active");
  errorSection.classList.add("active");
  errorMessage.textContent = message;
  resetButton();
  errorSection.scrollIntoView({ behavior: "smooth", block: "center" });
}

function resetButton() {
  btnGenerate.disabled = false;
  btnContent.innerHTML = `
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2"/></svg>
    Generate Study Plan
  `;
}

// --------------- Polling for Task Status ---------------
function stopPolling() {
  if (pollInterval) {
    clearInterval(pollInterval);
    pollInterval = null;
  }
}

function startPolling(taskId, topic, motivation, level, courseType) {
  const POLL_INTERVAL_MS = 5000; // Poll every 5 seconds
  const MAX_POLL_TIME_MS = 10 * 60 * 1000; // Give up after 10 minutes
  const startTime = Date.now();

  pollInterval = setInterval(async () => {
    // Timeout safety
    if (Date.now() - startTime > MAX_POLL_TIME_MS) {
      stopPolling();
      showError("The request timed out after 10 minutes. Please try again.");
      return;
    }

    try {
      const res = await fetch(`/status/${taskId}`);
      const data = await res.json();

      if (data.status === "done") {
        stopPolling();

        // Save to history
        const entry = {
          id: Date.now(),
          topic,
          motivation,
          level,
          course_type: courseType,
          result: data.result,
          date: new Date().toISOString(),
        };
        addToHistory(entry);
        currentViewingId = entry.id;
        renderHistory();

        showResults(data.result);
        form.reset();
      } else if (data.status === "error") {
        stopPolling();
        showError(data.error || "Something went wrong. Please try again.");
      }
      // If "running", do nothing — keep polling
    } catch (err) {
      console.error("Polling error:", err);
      // Don't stop polling on a single network glitch — it might recover
    }
  }, POLL_INTERVAL_MS);
}

// --------------- Form Submission ---------------
form.addEventListener("submit", async (e) => {
  e.preventDefault();

  const topic = document.getElementById("topic").value.trim();
  const motivation = document.getElementById("motivation").value.trim();
  const level = document.getElementById("level").value;
  const courseType = document.getElementById("course_type").value;

  if (!topic || !motivation) {
    showError("Please fill in all fields before generating.");
    return;
  }

  showLoading();

  try {
    // Step 1: Submit the request — server returns a task_id immediately
    const response = await fetch("/generate", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "X-CSRFToken": csrfToken,
      },
      body: JSON.stringify({
        topic,
        motivation,
        level,
        course_type: courseType,
      }),
    });

    const data = await response.json();

    if (!response.ok) {
      showError(data.error || "Something went wrong. Please try again.");
      return;
    }

    // Step 2: Start polling for results
    startPolling(data.task_id, topic, motivation, level, courseType);

  } catch (err) {
    console.error(err);
    showError(
      "Network error — could not reach the server. Make sure it's running."
    );
  }
});

// --------------- Back to Form ---------------
btnBackToForm.addEventListener("click", () => {
  currentViewingId = null;
  renderHistory();
  showForm();
});

// --------------- Copy to Clipboard ---------------
btnCopy.addEventListener("click", async () => {
  try {
    await navigator.clipboard.writeText(rawMarkdown);
    btnCopy.classList.add("copied");
    btnCopy.innerHTML = `
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="20 6 9 17 4 12"/></svg>
      Copied!
    `;
    setTimeout(() => {
      btnCopy.classList.remove("copied");
      btnCopy.innerHTML = `
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"/><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"/></svg>
        Copy Markdown
      `;
    }, 2000);
  } catch {
    const area = document.createElement("textarea");
    area.value = rawMarkdown;
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    area.remove();
  }
});

// --------------- Retry ---------------
btnRetry.addEventListener("click", () => {
  showForm();
});

// --------------- Init ---------------
// Render history on page load
renderHistory();

// Add inline spin animation
const style = document.createElement("style");
style.textContent = `
  .spin-inline {
    animation: spinInline 1s linear infinite;
  }
  @keyframes spinInline {
    to { transform: rotate(360deg); }
  }
`;
document.head.appendChild(style);
