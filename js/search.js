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

async function load() {
    results.innerHTML = '<div class="empty-state loading">Loading questions…</div>';
    questions = await getQuestions();
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

        return (
            question.includes(term) ||
            chapter.includes(term) ||
            subject.includes(term) ||
            exam.includes(term) ||
            difficulty.includes(term)
        );
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
        .filter(q => {
            const text = `${q.question} ${q.chapter} ${q.subject} ${q.exam}`.toLowerCase();
            return text.includes(term);
        })
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
    suggestions.innerHTML = suggestionItems.map((item, index) => `
        <button class="suggestion-item" data-index="${index}">
            <strong>${highlightMatch(item.label, term)}</strong>
            <span>${highlightMatch(item.value, term)}</span>
        </button>
    `).join("");

    document.querySelectorAll('.suggestion-item').forEach(button => {
        button.addEventListener('click', () => {
            searchBox.value = button.querySelector('span').textContent;
            suggestions.style.display = 'none';
            renderResults();
        });
    });
}

function highlightMatch(text, term) {
    if (!term) return text;
    const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const regex = new RegExp(`(${escapedTerm})`, 'gi');
    return text.replace(regex, '<mark>$1</mark>');
}

function renderResults() {
    const keyword = searchBox.value;
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

    filtered.forEach(q => {
        const excerpt = (q.question || "").length > 180 ? `${q.question.slice(0, 180)}...` : q.question;
        results.innerHTML += `
            <div class="search-result-card">
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
                <a href="question.html?id=${q.docId}&subject=${encodeURIComponent(q.subject)}&chapter=${encodeURIComponent(q.chapter)}">
                    Solve Question →
                </a>
            </div>
        `;
    });
}

function debounceSearch() {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(() => {
        renderResults();
        renderSuggestions(searchBox.value);
    }, 300);
}

searchBox.addEventListener("input", () => {
    debounceSearch();
});

searchBox.addEventListener("keydown", (event) => {
    const items = document.querySelectorAll('.suggestion-item');

    if (event.key === 'Enter') {
        event.preventDefault();
        if (activeSuggestionIndex >= 0 && items[activeSuggestionIndex]) {
            items[activeSuggestionIndex].click();
        } else {
            renderResults();
        }
        return;
    }

    if (event.key === 'ArrowDown') {
        event.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex + 1) % items.length;
        items.forEach((item, index) => item.classList.toggle('active', index === activeSuggestionIndex));
        return;
    }

    if (event.key === 'ArrowUp') {
        event.preventDefault();
        activeSuggestionIndex = (activeSuggestionIndex - 1 + items.length) % items.length;
        items.forEach((item, index) => item.classList.toggle('active', index === activeSuggestionIndex));
        return;
    }
});

searchButton.addEventListener("click", () => {
    renderResults();
    renderSuggestions(searchBox.value);
});

filterChips.forEach(chip => {
    chip.addEventListener("click", () => {
        filterChips.forEach(btn => btn.classList.remove('active'));
        chip.classList.add('active');
        activeFilter = chip.dataset.filter;
        renderResults();
    });
});

load();