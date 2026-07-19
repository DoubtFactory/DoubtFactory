import { getQuestions } from "./firebase.js";

const searchBox = document.getElementById("searchBox");
const results = document.getElementById("searchResults");
const suggestions = document.getElementById("suggestions");
const searchMeta = document.getElementById("searchMeta");
const searchButton = document.getElementById("searchButton");
const filterChips = document.querySelectorAll(".chip");

let questions = [];
let activeFilter = "All";
let activeSuggestionIndex = -1;
let debounceTimer = null;
const params = new URLSearchParams(window.location.search);
const initialQuery = params.get("q") || "";

async function load() {

    if (!results) return;

    results.innerHTML =
        '<div class="empty-state loading">Loading questions…</div>';

    questions = await getQuestions();
console.log("Questions loaded:", questions);

    if (searchBox && initialQuery) {
        searchBox.value = initialQuery;
    }

    renderResults();

}

function normalizeText(value) {
    return (value || "").toLowerCase().trim();
}

function getFilteredQuestions(keyword) {
    const term = normalizeText(keyword);

    return questions.filter(q => {
        const question = normalizeText(q.question);
        const chapter = normalizeText(q.chapter);
        const subject = normalizeText(q.subject);
        const exam = normalizeText(q.exam);
        const difficulty = normalizeText(q.difficulty);

        const matchesFilter = activeFilter === "All" || exam === activeFilter.toLowerCase();

        if (!matchesFilter) return false;
        if (!term) return true;

        return question.includes(term) || chapter.includes(term) || subject.includes(term) || exam.includes(term) || difficulty.includes(term);
    });
}

function renderSuggestions(keyword) {
    const term = normalizeText(keyword);
    suggestions.innerHTML = "";

    if (!term) {
        suggestions.style.display = "none";
        return;
    }

    const suggestionItems = questions
        .filter(q => `${q.question} ${q.chapter} ${q.subject} ${q.exam}`.toLowerCase().includes(term))
        .slice(0, 5)
        .map(q => ({
            label: q.chapter || q.subject || q.exam,
            value: q.question
        }));

    if (!suggestionItems.length) {
        suggestions.style.display = "none";
        return;
    }

    suggestions.style.display = "block";
    const fragment = document.createDocumentFragment();

    suggestionItems.forEach((item, index) => {
        const button = document.createElement("button");
        button.className = "suggestion-item";
        button.dataset.index = index;
        button.innerHTML = `<strong>${highlightMatch(item.label, term)}</strong><span>${highlightMatch(item.value, term)}</span>`;
        button.addEventListener("click", () => {
            if (searchBox) {
                searchBox.value = button.querySelector("span").textContent;
            }
            suggestions.style.display = "none";
            renderResults();
        });
        fragment.appendChild(button);
    });

    suggestions.appendChild(fragment);
}

function highlightMatch(text, term) {
    if (!term) return text;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    const regex = new RegExp(`(${escapedTerm})`, "gi");
    return text.replace(regex, "<mark>$1</mark>");
}

function renderResults() {
    const keyword = searchBox ? searchBox.value : "";
    const filtered = getFilteredQuestions(keyword);
    results.innerHTML = "";
    searchMeta.innerHTML = "";

    if (!keyword.trim()) {
        searchMeta.innerHTML = '<p class="meta-text">Start typing to search questions by chapter, subject, exam, or keyword.</p>';
        results.innerHTML = '<div class="empty-state">Try searching for a topic like “Thermodynamics” or “JEE Main”.</div>';
        return;
    }

    if (!filtered.length) {
        results.innerHTML = '<div class="empty-state">No questions matched your search. Try a different keyword or filter.</div>';
        return;
    }

    searchMeta.innerHTML = `<p class="meta-text">Showing ${filtered.length} result${filtered.length > 1 ? 's' : ''} for “${keyword}”</p>`;

    const fragment = document.createDocumentFragment();

    filtered.forEach(q => {
        const excerpt = (q.question || "").length > 180 ? `${q.question.slice(0, 180)}...` : q.question;
        const card = document.createElement("div");
        card.className = "search-result-card";
        card.innerHTML = `
            <div class="result-top">
                <span class="result-tag">${q.exam || "Exam"}</span>
                <span class="result-tag alt">${q.chapter || "Chapter"}</span>
            </div>
            <h3>${highlightMatch(q.chapter || q.subject || "Question", normalizeText(keyword))}</h3>
            <p>${highlightMatch(excerpt, normalizeText(keyword))}</p>
            <div class="result-meta">
                <span>${q.subject || "Subject"}</span>
                <span>${q.difficulty || "Medium"}</span>
            </div>
            <a href="question.html?id=${q.docId}&subject=${encodeURIComponent(q.subject)}&chapter=${encodeURIComponent(q.chapter)}">Solve Question →</a>
        `;
        fragment.appendChild(card);
    });

    results.appendChild(fragment);
}

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        renderResults();
        renderSuggestions(searchBox.value);
    }, 250);
}

if (searchBox) {
    searchBox.addEventListener("input", debounceSearch);
}

if (searchButton) {
    searchButton.addEventListener("click", (event) => {
        event.preventDefault();
        renderResults();
        renderSuggestions(searchBox.value);
    });
}

filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
        filterChips.forEach(btn => btn.classList.remove("active"));
        chip.classList.add("active");
        activeFilter = chip.dataset.filter;
        renderResults();
    });
});

load();