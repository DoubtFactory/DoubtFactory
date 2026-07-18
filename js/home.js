import { getQuestions } from "./firebase.js";

async function loadLatestQuestions() {
    const container = document.getElementById("latestQuestions");
    if (!container) return;

    const questions = await getQuestions();
    const latest = [...questions]
        .sort((a, b) => (b.id || 0) - (a.id || 0))
        .slice(0, 6);

    const fragment = document.createDocumentFragment();

    latest.forEach(q => {
        const difficultyClass = (q.difficulty || "Medium").toLowerCase();
        const card = document.createElement("div");
        card.className = "question-preview";
        card.innerHTML = `
            <div class="question-header">
                <span class="exam-tag">${q.exam || "Exam"}</span>
                <span class="chapter-tag">${q.chapter || "Chapter"}</span>
                <span class="difficulty ${difficultyClass}">${q.difficulty || "Medium"}</span>
            </div>
            <h3>${q.question || "No question available"}</h3>
            <div class="question-meta">
                <span>📅 ${q.year || "N/A"}</span>
                <span>👁 ${q.views || 0}</span>
                <span>👍 ${q.likes || 0}</span>
            </div>
            <div class="question-buttons">
                <a class="primary-btn" href="question.html?id=${q.docId}&subject=${encodeURIComponent(q.subject)}&chapter=${encodeURIComponent(q.chapter)}">Solve Question →</a>
            </div>
        `;
        fragment.appendChild(card);
    });

    container.replaceChildren(fragment);
}

async function loadStats() {
    const questions = await getQuestions();
    const statQuestions = document.getElementById("statQuestions");
    const statVideos = document.getElementById("statVideos");

    if (statQuestions) {
        statQuestions.textContent = questions.length;
    }

    if (statVideos) {
        const videos = questions.filter(q => q.youtube && q.youtube !== "");
        statVideos.textContent = videos.length;
    }
}

loadLatestQuestions();
loadStats();