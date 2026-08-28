import { getQuestions } from "./firebase.js";

const searchBox = document.getElementById("searchBox");
const results = document.getElementById("searchResults");
const suggestions = document.getElementById("suggestions");
const searchMeta = document.getElementById("searchMeta");
const searchButton = document.getElementById("searchButton");
const filterChips = document.querySelectorAll(".chip");
const subjectFilter = document.getElementById("subjectFilter");
const difficultyFilter = document.getElementById("difficultyFilter");

let questions = [];
let activeFilter = "All";
let activeSuggestionIndex = -1;
let debounceTimer = null;
const params = new URLSearchParams(window.location.search);
const initialQuery = params.get("q") || "";
const initialSubject = params.get("subject") || "";

async function load() {
    if (!results) return;

    results.innerHTML = '<div class="empty-state loading">Loading questions…</div>';

    questions = await getQuestions();

    if (searchBox && initialQuery) {
        searchBox.value = initialQuery;
    }

    // Automatically apply the subject from the URL to the dropdown filter
    if (subjectFilter && initialSubject) {
        for (let i = 0; i < subjectFilter.options.length; i++) {
            if (subjectFilter.options[i].value.toLowerCase() === initialSubject.toLowerCase()) {
                subjectFilter.selectedIndex = i;
                break;
            }
        }
    }

    renderResults();
}

function normalizeText(value) {
    return (value || "").toLowerCase().trim();
}

function getFilteredQuestions(keyword) {
    const term = normalizeText(keyword);
    
    const activeSubject = subjectFilter ? subjectFilter.value.toLowerCase() : "";
    const activeDifficulty = difficultyFilter ? difficultyFilter.value.toLowerCase() : "";

    return questions.filter(q => {
        const question = normalizeText(q.question);
        const chapter = normalizeText(q.chapter);
        const subject = normalizeText(q.subject);
        const exam = normalizeText(q.exam);
        const difficulty = normalizeText(q.difficulty);

        const matchesExam = activeFilter === "All" || exam === activeFilter.toLowerCase();
        
        // Support matching exact subjects or falling back to "All" options
        const matchesSubject = !activeSubject || activeSubject.includes("all") || subject === activeSubject;
        const matchesDifficulty = !activeDifficulty || activeDifficulty.includes("any") || activeDifficulty.includes("all") || difficulty === activeDifficulty;

        if (!matchesExam || !matchesSubject || !matchesDifficulty) return false;
        
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

    const activeSub = subjectFilter ? subjectFilter.value.toLowerCase() : "";
    const activeDiff = difficultyFilter ? difficultyFilter.value.toLowerCase() : "";
    
    // Check if any filters (chips or dropdowns) are actively applied
    const hasActiveFilters = activeFilter !== "All" || 
                             (activeSub && !activeSub.includes("all")) || 
                             (activeDiff && !activeDiff.includes("any") && !activeDiff.includes("all"));

    // Only show the empty setup state if there is NO text typed AND NO filters are applied
    if (!keyword.trim() && !hasActiveFilters) {
        searchMeta.innerHTML = '<p class="meta-text">Start typing to search questions by chapter, subject, exam, or keyword.</p>';
        results.innerHTML = '<div class="empty-state">Try searching for a topic like “Thermodynamics” or “JEE Main”.</div>';
        return;
    }

    if (!filtered.length) {
        results.innerHTML = '<div class="empty-state">No questions matched your search. Try a different keyword or filter.</div>';
        return;
    }

    const resultLabel = keyword.trim() ? `for “${keyword}”` : "matching your filters";
    searchMeta.innerHTML = `<p class="meta-text">Showing ${filtered.length} result${filtered.length > 1 ? 's' : ''} ${resultLabel}</p>`;

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
            <a href="question.html?id=${q.docId || q.id}&subject=${encodeURIComponent(q.subject || 'General')}&chapter=${encodeURIComponent(q.chapter || '')}">Solve Question →</a>
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
if (subjectFilter) {
    subjectFilter.addEventListener("change", renderResults);
}
if (difficultyFilter) {
    difficultyFilter.addEventListener("change", renderResults);
}
load();
