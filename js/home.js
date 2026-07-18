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

        container.innerHTML += `
        <div class="question-preview">

            <div class="question-header">

                <span class="exam-tag">${q.exam}</span>

                <span class="chapter-tag">${q.chapter}</span>

                <span class="difficulty ${q.difficulty.toLowerCase()}">
                    ${q.difficulty}
                </span>

            </div>

            <h3>${q.question}</h3>

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