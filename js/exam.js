import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const targetExam = urlParams.get("type") || "NEET";

    // Set page title and banner text
    const examTitleEl = document.getElementById("examTitle");
    if (examTitleEl) {
        examTitleEl.textContent = `${targetExam} Questions`;
        document.title = `${targetExam} Questions | Doubt Factory`;
    }

    const yearSelect = document.getElementById("examYearFilter");
    const subjectSelect = document.getElementById("examSubjectFilter");
    const chapterSelect = document.getElementById("examChapterFilter");
    const container = document.getElementById("examQuestionsContainer");
    const countText = document.getElementById("questionCountText");

    let allQuestions = [];
    let examQuestions = [];

    try {
        allQuestions = await getQuestions();
        
        // Filter strictly by target exam
        examQuestions = allQuestions.filter(q => q.exam === targetExam);

        // Populate dynamic filters based on available data
        populateFilters();
        renderQuestions();

    } catch (err) {
        console.error("Error loading questions: ", err);
        container.innerHTML = `<p style="text-align: center; color: #ef4444; padding: 40px 0;">Failed to load questions. Please check your connection.</p>`;
    }

    function populateFilters() {
        // 1. Populate Years (Descending)
        const years = [...new Set(examQuestions.map(q => q.year).filter(Boolean))].sort((a, b) => b - a);
        yearSelect.innerHTML = '<option value="All">All Years</option>';
        years.forEach(y => {
            const opt = document.createElement("option");
            opt.value = y;
            opt.textContent = y;
            yearSelect.appendChild(opt);
        });

        // 2. Populate Subjects in Structured Hierarchy
        const availableSubjects = [...new Set(examQuestions.map(q => q.subject).filter(Boolean))];
        let subjectHTML = '<option value="All">All Subjects</option>';

        // Physics First
        if (availableSubjects.includes('Physics')) {
            subjectHTML += '<option value="Physics">Physics</option>';
        }

        // Chemistry Group (Strict Order: Physical, Inorganic, Organic)
        const chemOrder = ['Physical Chemistry', 'Inorganic Chemistry', 'Organic Chemistry'];
        const chemSubjects = chemOrder.filter(s => availableSubjects.includes(s));
        if (chemSubjects.length > 0) {
            subjectHTML += '<optgroup label="Chemistry">';
            chemSubjects.forEach(s => {
                subjectHTML += `<option value="${s}">${s}</option>`;
            });
            subjectHTML += '</optgroup>';
        }

        // Maths (If JEE)
        if (availableSubjects.includes('Maths')) {
            subjectHTML += '<option value="Maths">Maths</option>';
        }

        // Biology Group (Strict Order: Botany, Zoology)
        const bioOrder = ['Botany', 'Zoology'];
        const bioSubjects = bioOrder.filter(s => availableSubjects.includes(s));
        if (bioSubjects.length > 0) {
            subjectHTML += '<optgroup label="Biology">';
            bioSubjects.forEach(s => {
                subjectHTML += `<option value="${s}">${s}</option>`;
            });
            subjectHTML += '</optgroup>';
        }

        // Catch any remaining subjects just in case
        const handledSubjects = ['Physics', 'Physical Chemistry', 'Inorganic Chemistry', 'Organic Chemistry', 'Maths', 'Botany', 'Zoology'];
        const otherSubjects = availableSubjects.filter(s => !handledSubjects.includes(s)).sort();
        otherSubjects.forEach(s => {
            subjectHTML += `<option value="${s}">${s}</option>`;
        });

        subjectSelect.innerHTML = subjectHTML;

        // 3. Populate Chapters
        updateChapters();
    }

    function updateChapters() {
        const selectedSubject = subjectSelect.value;
        const currentChapter = chapterSelect.value;

        let filteredForChapters = examQuestions;
        if (selectedSubject !== "All") {
            filteredForChapters = examQuestions.filter(q => q.subject === selectedSubject);
        }

        const chapters = [...new Set(filteredForChapters.map(q => q.chapter).filter(Boolean))].sort();
        chapterSelect.innerHTML = '<option value="All">All Chapters</option>';
        chapters.forEach(c => {
            const opt = document.createElement("option");
            opt.value = c;
            opt.textContent = c;
            chapterSelect.appendChild(opt);
        });

        if (chapters.includes(currentChapter)) {
            chapterSelect.value = currentChapter;
        } else {
            chapterSelect.value = "All";
        }
    }

    function renderQuestions() {
        const selectedYear = yearSelect.value;
        const selectedSubject = subjectSelect.value;
        const selectedChapter = chapterSelect.value;

        const filtered = examQuestions.filter(q => {
            let match = true;
            if (selectedYear !== "All" && String(q.year) !== String(selectedYear)) match = false;
            if (selectedSubject !== "All" && q.subject !== selectedSubject) match = false;
            if (selectedChapter !== "All" && q.chapter !== selectedChapter) match = false;
            return match;
        });

        countText.textContent = `${filtered.length} Question${filtered.length === 1 ? '' : 's'}`;

        if (filtered.length === 0) {
            container.innerHTML = `
                <div style="text-align: center; padding: 60px 20px; background: var(--bg-card); border-radius: var(--radius-lg); border: 1px solid var(--border-color);">
                    <h3 style="color: var(--text-primary); margin-bottom: 8px;">No questions found</h3>
                    <p style="color: var(--text-secondary); margin: 0;">Try adjusting your year, subject, or chapter filters.</p>
                </div>`;
            return;
        }

        // Sort descending by year / timestamp
        const sorted = filtered.sort((a, b) => (b.year || 0) - (a.year || 0) || (b.timestamp || 0) - (a.timestamp || 0));

        container.innerHTML = sorted.map(q => {
            const diff = (q.difficulty || "Medium").toLowerCase();
            const diffClass = diff === "easy" ? "badge-easy" : (diff === "hard" ? "badge-hard" : "badge-medium");
            const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 160) + (q.question.length > 160 ? "..." : "") : "Question text";

            return `
                <div class="exam-q-card">
                    <div class="exam-badges">
                        <span class="badge badge-year">${q.year || targetExam}</span>
                        <span class="badge badge-subject">${q.subject || "Subject"}</span>
                        <span class="badge badge-chapter">${q.chapter || "Chapter"}</span>
                        <span class="badge ${diffClass}">${q.difficulty || "Medium"}</span>
                    </div>
                    <div class="exam-q-text">${snippet}</div>
                    <a href="question.html?id=${q.docId || q.id}" class="solve-btn-link">Solve Question →</a>
                </div>
            `;
        }).join("");
    }

    // Filter Listeners
    yearSelect.addEventListener("change", renderQuestions);
    subjectSelect.addEventListener("change", () => {
        updateChapters();
        renderQuestions();
    });
    chapterSelect.addEventListener("change", renderQuestions);
});
