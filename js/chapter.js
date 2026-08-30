import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    try {
        // 1. Read URL safely
        const urlParams = new URLSearchParams(window.location.search);
        const selectedSubject = urlParams.get('subject');
        
        const titleElement = document.getElementById("subjectTitle");
        const grid = document.getElementById("chapterGrid");

        if (!grid || !titleElement) {
            console.error("Missing HTML elements!");
            return; 
        }

        // 2. Instantly update the title
        if (!selectedSubject) {
            titleElement.textContent = "All Chapters";
        } else {
            titleElement.textContent = `${selectedSubject} Chapters`;
        }

        // Updated to dark theme text color
        grid.innerHTML = "<p style='text-align:center; color: var(--text-secondary); grid-column: 1 / -1;'>Loading chapters from database...</p>";

        // 3. Fetch Data
        const questions = await getQuestions();
        
        // 4. Filter safely
        let relevantQuestions = questions;
        if (selectedSubject) {
            relevantQuestions = questions.filter(q => q.subject === selectedSubject);
        }

        if (relevantQuestions.length === 0) {
            // Updated Empty State to dark theme
            grid.innerHTML = `<div style="text-align:center; grid-column: 1 / -1; background: var(--bg-card); padding: 40px; border-radius: var(--radius-lg); border: 1px dashed var(--border-color);">
                <h3 style="color: var(--text-primary); margin-bottom:10px;">No Questions Found</h3>
                <p style="color: var(--text-secondary); margin:0;">You haven't uploaded any ${selectedSubject || 'questions'} yet. Once you add them, the chapters will appear here automatically!</p>
            </div>`;
            return;
        }

        // 5. Count Chapters and map subjects per chapter
        const chapterCounts = {};
        const chapterSubjects = {};
        relevantQuestions.forEach(q => {
            if (q.chapter) {
                const cleanChapter = q.chapter.trim(); 
                if (!chapterCounts[cleanChapter]) {
                    chapterCounts[cleanChapter] = 0;
                    chapterSubjects[cleanChapter] = q.subject || selectedSubject || '';
                }
                chapterCounts[cleanChapter]++;
            }
        });

        const uniqueChapters = Object.keys(chapterCounts).sort();

        // 6. Render Grid
        grid.innerHTML = "";
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 60px;";

        uniqueChapters.forEach((chapter, index) => {
            const count = chapterCounts[chapter];
            const cardSubject = chapterSubjects[chapter];
            const card = document.createElement("a");
            
            // IMPORTANT: Changed link to point to our new launchpad and renamed parameter to 'topic'
            card.href = `topic-details.html?subject=${encodeURIComponent(cardSubject)}&topic=${encodeURIComponent(chapter)}`;
            
            // Updated styles to match Doubt Factory Dark Theme
            card.style.cssText = `background: var(--bg-card); border: 1px solid var(--border-color); border-radius: var(--radius-lg); padding: 24px; display: flex; flex-direction: column; justify-content: space-between; text-decoration: none; transition: transform 0.2s, border-color 0.2s;`;
            
            card.onmouseover = () => {
                card.style.transform = "translateY(-4px)";
                card.style.borderColor = "var(--accent-blue)";
            };
            card.onmouseout = () => {
                card.style.transform = "translateY(0)";
                card.style.borderColor = "var(--border-color)";
            };

            card.innerHTML = `
                <div>
                    <p style="color: var(--text-secondary); font-size: 13px; margin: 0 0 6px 0; font-weight: 600; text-transform: uppercase; letter-spacing: 0.5px;">Chapter ${index + 1}</p>
                    <h3 style="color: var(--text-primary); font-size: 18px; margin: 0; font-weight: 700;">${chapter}</h3>
                </div>
                
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 20px;">
                    <span style="font-size: 12px; font-weight: 700; color: var(--accent-blue); background: rgba(59, 130, 246, 0.1); padding: 4px 10px; border-radius: 4px;">${count} Qs</span>
                    <span style="color: var(--accent-blue); font-weight: bold; font-size: 20px;">→</span>
                </div>
            `;
            
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Critical error in chapter.js:", error);
        const grid = document.getElementById("chapterGrid");
        if (grid) {
            grid.innerHTML = `<p style='text-align:center; color:#ef4444; grid-column: 1 / -1;'>Failed to load chapters. Please try refreshing the page.</p>`;
        }
    }
});
