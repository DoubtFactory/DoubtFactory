import { getQuestions } from "./firebase.js";

async function loadLatestQuestions() {

    const questions = await getQuestions();

    // Latest first
    questions.sort((a, b) => b.id - a.id);

    const latest = questions.slice(0, 6);

    const container = document.getElementById("latestQuestions");

    if (!container) return;

    container.innerHTML = "";

    latest.forEach(q => {

        const difficultyClass = (q.difficulty || "Medium").toLowerCase();

        container.innerHTML += `
        <div class="question-preview">

            <div class="question-header">

                <span class="exam-tag">${q.exam || "Exam"}</span>

                <span class="chapter-tag">${q.chapter || "Chapter"}</span>

                <span class="difficulty ${difficultyClass}">
                    ${q.difficulty || "Medium"}
                </span>

            </div>

            <h3>${q.question || "No question available"}</h3>

            <div class="question-meta">
                <span>📅 ${q.year || "N/A"}</span>
                <span>👁 ${q.views || 0}</span>
                <span>👍 ${q.likes || 0}</span>
            </div>

            <div class="question-buttons">

                <a class="primary-btn"
                href="question.html?id=${q.docId}&subject=${encodeURIComponent(q.subject)}&chapter=${encodeURIComponent(q.chapter)}">

                    Solve Question →

                </a>

            </div>

        </div>
        `;

    });

}

loadLatestQuestions();
async function loadStats() {

    const questions = await getQuestions();

    document.getElementById("statQuestions").textContent =
        questions.length;

    const videos = questions.filter(q => q.youtube && q.youtube !== "");

    document.getElementById("statVideos").textContent =
        videos.length;

}

loadStats();