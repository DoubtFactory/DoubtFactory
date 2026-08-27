import { getQuestions } from "./firebase.js";

let allQuestions = [];

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Read the subject and chapter from the URL
    const urlParams = new URLSearchParams(window.location.search);
    const subject = urlParams.get("subject");
    const chapter = urlParams.get("chapter");

    const titleEl = document.getElementById("chapterTitle");
    if (titleEl) {
        titleEl.textContent = chapter ? `${chapter} Questions` : "All Practice Questions";
    }

    const list = document.getElementById("questionList");
    if (!list) return;

    list.innerHTML = "<p style='text-align:center; color:#64748b; padding:40px;'>Loading questions from database...</p>";

    try {
        const questions = await getQuestions();
        
        // 2. Filter down strictly to the chosen Subject & Chapter
        allQuestions = questions.filter(q => {
            const matchSubject = !subject || q.subject === subject;
            const matchChapter = !chapter || q.chapter === chapter;
            return matchSubject && matchChapter;
        });

        populateYearFilter();
        renderQuestions();

        // 3. Connect the Dropdowns & Search Bar to the filter function
        document.getElementById("examFilter")?.addEventListener("change", renderQuestions);
        document.getElementById("yearFilter")?.addEventListener("change", renderQuestions);
        document.getElementById("difficultyFilter")?.addEventListener("change", renderQuestions);
        document.getElementById("searchQuestion")?.addEventListener("input", renderQuestions);

    } catch (err) {
        console.error("Error loading questions:", err);
        list.innerHTML = "<p style='text-align:center; color:#ef4444;'>Failed to load questions. Check your connection.</p>";
    }
});

function populateYearFilter() {
    const yearFilter = document.getElementById("yearFilter");
    if (!yearFilter) return;

    // Extract unique years from the questions
    const years = [...new Set(allQuestions.map(q => {
        const combined = `${q.exam || ''} ${q.tags || ''} ${q.year || ''}`;
        const match = combined.match(/(20\d{2})/);
        return match ? match[0] : (q.year || "Practice");
    }))].filter(y => y !== "Practice").sort((a,b) => b - a);

    years.forEach(year => {
        yearFilter.innerHTML += `<option value="${year}">${year}</option>`;
    });
}

function renderQuestions() {
    // Read the current state of all dropdowns
    const examVal = document.getElementById("examFilter")?.value || "All";
    const yearVal = document.getElementById("yearFilter")?.value || "All";
    const diffVal = document.getElementById("difficultyFilter")?.value || "All";
    const searchVal = document.getElementById("searchQuestion")?.value.toLowerCase().trim() || "";

    // Filter the questions dynamically
    let result = allQuestions.filter(q => {
        const combinedYear = `${q.exam || ''} ${q.tags || ''} ${q.year || ''}`;
        const extractedYear = (combinedYear.match(/(20\d{2})/) || [])[0] || "Practice";

        const matchExam = examVal === "All" || (q.exam && q.exam.includes(examVal));
        const matchYear = yearVal === "All" || extractedYear === yearVal || String(q.year) === yearVal;
        const matchDiff = diffVal === "All" || q.difficulty === diffVal;
        const matchSearch = searchVal === "" || (q.question && q.question.toLowerCase().includes(searchVal));

        return matchExam && matchYear && matchDiff && matchSearch;
    });

    const list = document.getElementById("questionList");
    list.innerHTML = "";

    if (result.length === 0) {
        list.innerHTML = `<div style="text-align:center; padding:40px; background:#f8fafc; border-radius:12px; border: 1px dashed #cbd5e1; margin-top:20px;">
            <h3 style="color:#334155; margin-bottom:10px;">No matches found</h3>
            <p style="color:#64748b; margin:0;">Try adjusting your filters or search term to see more questions.</p>
        </div>`;
        return;
    }

    // Generate the CSS Grid for the beautiful cards
    const grid = document.createElement("div");
    grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px; margin-top:20px; margin-bottom: 40px;";

    result.forEach((q, index) => {
        const qCard = document.createElement("a");
        qCard.href = `question.html?id=${q.docId || q.id}&subject=${encodeURIComponent(q.subject || 'General')}&chapter=${encodeURIComponent(q.chapter || '')}`;
        qCard.style.cssText = "display: flex; flex-direction: column; justify-content: space-between; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.02); height: 100%;";
        
        qCard.onmouseover = () => { qCard.style.boxShadow = "0 10px 15px rgba(0,0,0,0.05)"; qCard.style.transform = "translateY(-4px)"; qCard.style.borderColor = "#bae6fd"; };
        qCard.onmouseout = () => { qCard.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)"; qCard.style.transform = "translateY(0)"; qCard.style.borderColor = "#e2e8f0"; };

        const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 110) + "..." : "Practice Question...";

        qCard.innerHTML = `
            <div>
                <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                    <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.exam || 'JEE/NEET'} ${q.year || ''}</span>
                    <span style="background: #fef3c7; color: #d97706; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.difficulty || 'Medium'}</span>
                </div>
                <h3 style="font-size: 16px; color: #0f172a; margin: 0 0 15px 0; line-height: 1.6; font-weight: 600;">Q${index + 1}: ${snippet}</h3>
            </div>
            <div style="margin-top: auto; font-size: 14px; color: #2563eb; font-weight: 600;">Solve Question →</div>
        `;
        grid.appendChild(qCard);
    });

    list.appendChild(grid);
}
