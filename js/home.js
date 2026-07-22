import { getQuestions } from "./firebase.js";

function createSkeletonCards(count = 2) {
    const fragment = document.createDocumentFragment();

    for (let i = 0; i < count; i += 1) {
        const card = document.createElement("div");
        card.className = "skeleton-card";
        card.innerHTML = `
            <div class="skeleton-line short"></div>
            <div class="skeleton-line long"></div>
            <div class="skeleton-line medium"></div>
        `;
        fragment.appendChild(card);
    }

    return fragment;
}

function renderLatestQuestions(questions, container) {
    if (!container) return;

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
           <h3 class="question-title">
${
    (q.question || "").length > 170
        ? (q.question || "").substring(0,170) + "..."
        : (q.question || "No question available")
}
</h3>
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

function updateStats(questions) {
    const statQuestions = document.getElementById("statQuestions");
    const statVideos = document.getElementById("statVideos");

    if (statQuestions) {
        statQuestions.textContent = questions.length;
        statQuestions.removeAttribute("aria-busy");
    }

    if (statVideos) {
        const videos = questions.filter(q => q.youtube && q.youtube !== "");
        statVideos.textContent = videos.length;
        statVideos.removeAttribute("aria-busy");
    }
}

async function loadHomeContent() {
    const container = document.getElementById("latestQuestions");

    if (container) {
        container.replaceChildren(createSkeletonCards(2));
        container.setAttribute("aria-busy", "true");
    }

    try {
        const questions = await getQuestions();
        renderLatestQuestions(questions, container);
        updateStats(questions);
    } catch (error) {
        if (container) {
            container.replaceChildren();
            const message = document.createElement("p");
            message.className = "empty-state";
            message.textContent = "Questions are loading slowly. Please refresh in a moment.";
            container.appendChild(message);
        }
    }
}

loadHomeContent();
const homeSearchForm = document.querySelector(".search-box");
const homeSearchInput = document.getElementById("homeSearch");

if (homeSearchForm && homeSearchInput) {
    homeSearchForm.addEventListener("submit", (e) => {
        e.preventDefault();

        const keyword = homeSearchInput.value.trim();

        if (!keyword) return;

        window.location.href = `search.html?q=${encodeURIComponent(keyword)}`;
    });
}