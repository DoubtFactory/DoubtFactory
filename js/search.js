import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const searchInput = document.getElementById("searchInput");
    const searchBtn = document.getElementById("searchBtn");
    const examFilter = document.getElementById("examFilter");
    const subjectFilter = document.getElementById("subjectFilter");
    const diffFilter = document.getElementById("diffFilter");
    const resultsContainer = document.getElementById("searchResultsContainer");
    const resultsInfo = document.getElementById("resultsInfo");

    let allQuestions = [];

    // Fetch questions on load
    try {
        allQuestions = await getQuestions();
        populateSubjects();
    } catch (err) {
        console.error("Failed to load questions for search:", err);
        resultsContainer.innerHTML = `<p style="color: #ef4444; text-align: center;">Failed to connect to the database. Please try again.</p>`;
    }

    // Populate Dynamic Subjects from DB
    function populateSubjects() {
        const subjects = [...new Set(allQuestions.map(q => q.subject).filter(Boolean))].sort();
        subjectFilter.innerHTML = '<option value="All">All Subjects</option>';
        subjects.forEach(sub => {
            const opt = document.createElement("option");
            opt.value = sub;
            opt.textContent = sub;
            subjectFilter.appendChild(opt);
        });
    }

    // Highlighting Helper Function for Dark Theme
    function highlightText(text, term) {
        if (!term) return text;
        const safeText = String(text || "").replace(/<[^>]*>?/gm, ''); // Strip existing HTML
        
        // Escape regex characters in the search term
        const escapedTerm = term.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
        const regex = new RegExp(`(${escapedTerm})`, "gi");
        
        // Replace with the dark-theme highlight class
        return safeText.replace(regex, `<span class="search-highlight">$1</span>`);
    }

    // Core Render Function
    function renderResults() {
        const searchTerm = searchInput.value.toLowerCase().trim();
        const selectedExam = examFilter.value;
        const selectedSubject = subjectFilter.value;
        const selectedDiff = diffFilter.value;

        // If completely empty search and no filters, don't show all 1000s of questions. Just clear.
        if (!searchTerm && selectedExam === "All" && selectedSubject === "All" && selectedDiff === "All") {
            resultsInfo.textContent = "";
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; border: 2px dashed var(--border-color); border-radius: var(--radius-lg);">
                    <p style="color: var(--text-secondary); margin: 0; font-size: 16px;">Type a keyword or select filters above to start searching.</p>
                </div>
            `;
            return;
        }

        const filtered = allQuestions.filter(q => {
            let match = true;
            
            // Filter by Exam
            if (selectedExam !== "All" && q.exam !== selectedExam) match = false;
            
            // Filter by Subject
            if (selectedSubject !== "All" && q.subject !== selectedSubject) match = false;
            
            // Filter by Difficulty
            if (selectedDiff !== "All" && q.difficulty !== selectedDiff) match = false;
            
            // Filter by Keyword (checks Question, Chapter, and Options)
            if (searchTerm) {
                const qText = String(q.question || "").toLowerCase();
                const qChap = String(q.chapter || "").toLowerCase();
                const qOpts = q.options ? q.options.join(" ").toLowerCase() : "";
                
                if (!qText.includes(searchTerm) && !qChap.includes(searchTerm) && !qOpts.includes(searchTerm)) {
                    match = false;
                }
            }

            return match;
        });

        // Update count text
        if (searchTerm) {
            resultsInfo.textContent = `Showing ${filtered.length} result${filtered.length === 1 ? '' : 's'} for "${searchTerm}"`;
        } else {
            resultsInfo.textContent = `Showing ${filtered.length} filtered result${filtered.length === 1 ? '' : 's'}`;
        }

        if (filtered.length === 0) {
            resultsContainer.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">No matches found</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Try using different keywords or loosening your filters.</p>
                </div>`;
            return;
        }

        // Render as standard Dark Theme Cards
        resultsContainer.innerHTML = filtered.map(q => {
            const diff = String(q.difficulty || "Medium");
            const diffClass = diff.toLowerCase() === "easy" ? "badge-easy" : (diff.toLowerCase() === "hard" ? "badge-hard" : "badge-medium");
            
            // Generate a snippet with highlights
            const rawSnippet = String(q.question || "").replace(/<[^>]*>?/gm, '').substring(0, 180);
            const finalSnippet = highlightText(rawSnippet + (String(q.question).length > 180 ? "..." : ""), searchTerm);

            // Highlight chapter name if it matches
            const highlightedChapter = highlightText(q.chapter || "Chapter", searchTerm);

            return `
                <div class="exam-q-card">
                    <div class="exam-badges">
                        <span class="badge badge-exam">${q.exam || "Exam"}</span>
                        <span class="badge badge-year">${q.year || "Year"}</span>
                        <span class="badge badge-subject">${q.subject || "Subject"}</span>
                        <span class="badge badge-chapter" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${highlightedChapter}</span>
                        <span class="badge ${diffClass}">${diff}</span>
                    </div>
                    <div class="exam-q-text">${finalSnippet}</div>
                    <a href="question.html?id=${q.docId || q.id}" class="solve-btn-link">Solve Question →</a>
                </div>
            `;
        }).join("");
    }

    // Event Listeners (Triggers render when typing, clicking, or changing filters)
    searchInput.addEventListener("keyup", (e) => {
        // Trigger live search on every keystroke
        renderResults();
    });

    searchBtn.addEventListener("click", renderResults);
    examFilter.addEventListener("change", renderResults);
    subjectFilter.addEventListener("change", renderResults);
    diffFilter.addEventListener("change", renderResults);

    // Initial Empty State Call
    renderResults();
});
