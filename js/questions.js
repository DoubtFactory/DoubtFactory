import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // Get URL Parameters
    const urlParams = new URLSearchParams(window.location.search);
    const subjectParam = urlParams.get("subject");
    const chapterParam = urlParams.get("chapter");

    // Set Page Title
    const titleEl = document.getElementById("chapterTitle");
    if (titleEl) {
        titleEl.textContent = chapterParam ? `${chapterParam} Questions` : "Chapter Questions";
        document.title = `${chapterParam || "Chapter"} | Doubt Factory`;
    }

    // DOM Elements
    const examFilterContainer = document.getElementById("examFilterContainer");
    const examFilter = document.getElementById("examFilter");
    const yearFilter = document.getElementById("yearFilter");
    const diffFilter = document.getElementById("difficultyFilter");
    const searchInput = document.getElementById("searchQuestion");
    const qList = document.getElementById("questionList");

    // Filter Logic based on Subject
    if (subjectParam === "Botany" || subjectParam === "Zoology") {
        // Biology is NEET only. Hide the exam filter.
        examFilterContainer.style.display = "none";
    } else if (subjectParam === "Maths") {
        // Maths is JEE only
        examFilter.innerHTML = `
            <option value="All">All Exams</option>
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
        `;
    } else {
        // Physics & Chemistry have all exams
        examFilter.innerHTML = `
            <option value="All">All Exams</option>
            <option value="JEE Main">JEE Main</option>
            <option value="JEE Advanced">JEE Advanced</option>
            <option value="NEET">NEET</option>
        `;
    }

    let allQuestions = [];

    try {
        // Fetch all questions from Firebase
        const rawQuestions = await getQuestions();
        
        // Isolate questions for this specific chapter and subject
        allQuestions = rawQuestions.filter(q => {
            let match = true;
            if (subjectParam && q.subject !== subjectParam) match = false;
            if (chapterParam && q.chapter !== chapterParam) match = false;
            return match;
        });

        // Dynamically populate available years based on fetched chapter data
        const years = [...new Set(allQuestions.map(q => q.year).filter(Boolean))].sort((a, b) => b - a);
        yearFilter.innerHTML = '<option value="All">All Years</option>';
        years.forEach(y => {
            const opt = document.createElement("option");
            opt.value = y;
            opt.textContent = y;
            yearFilter.appendChild(opt);
        });

        // Initial render
        renderQuestions();

    } catch (err) {
        console.error("Error loading chapter questions:", err);
        qList.innerHTML = `<p style="color: #EF4444; text-align: center; padding: 40px 0;">Failed to load questions. Please check your connection.</p>`;
    }

    function renderQuestions() {
        const examVal = examFilter.value;
        const yearVal = yearFilter.value;
        const diffVal = diffFilter.value;
        const searchVal = searchInput.value.toLowerCase();

        const filtered = allQuestions.filter(q => {
            let match = true;

            // Apply Exam filter ONLY if it is visible (i.e. not Biology)
            if (examFilterContainer.style.display !== "none" && examVal !== "All") {
                if (q.exam !== examVal) match = false;
            }

            if (yearVal !== "All" && String(q.year) !== String(yearVal)) match = false;
            if (diffVal !== "All" && q.difficulty !== diffVal) match = false;
            if (searchVal && !(q.question && q.question.toLowerCase().includes(searchVal))) match = false;
            return match;
        });

        if (filtered.length === 0) {
            qList.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">No questions found</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Try adjusting your filters or search term.</p>
                </div>`;
            return;
        }

        // Sort descending by Year, then by Timestamp
        const sorted = filtered.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.timestamp || 0) - (a.timestamp || 0));

        // Inject the Dark Theme cards
        qList.innerHTML = sorted.map(q => {
            const diff = (q.difficulty || "Medium");
            const diffClass = diff.toLowerCase() === "easy" ? "badge-easy" : (diff.toLowerCase() === "hard" ? "badge-hard" : "badge-medium");
            
            // Text Snippet
            const snippet = q.question 
                ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 160) + (q.question.length > 160 ? "..." : "") 
                : "Question text";

            return `
                <div class="exam-q-card">
                    <div class="exam-badges">
                        <span class="badge badge-exam">${q.exam || "Exam"}</span>
                        <span class="badge badge-year">${q.year || "Year"}</span>
                        <span class="badge badge-subject">${q.subject || "Subject"}</span>
                        <span class="badge badge-chapter" style="max-width: 250px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${q.chapter || "Chapter"}</span>
                        <span class="badge ${diffClass}">${diff}</span>
                    </div>
                    <div class="exam-q-text">${snippet}</div>
                    <a href="question.html?id=${q.docId || q.id}" class="solve-btn-link">Solve Question →</a>
                </div>
            `;
        }).join("");
    }

    // Attach Event Listeners to trigger re-renders
    examFilter.addEventListener("change", renderQuestions);
    yearFilter.addEventListener("change", renderQuestions);
    diffFilter.addEventListener("change", renderQuestions);
    searchInput.addEventListener("input", renderQuestions);
});
