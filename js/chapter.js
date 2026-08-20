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
            titleElement.textContent = "All Chemistry Chapters";
        } else {
            titleElement.textContent = `${selectedSubject} Chapters`;
        }

        grid.innerHTML = "<p style='text-align:center; color:#64748b; grid-column: 1 / -1;'>Loading chapters from database...</p>";

        // 3. Fetch Data
        const questions = await getQuestions();
        
        // 4. Filter safely
        let relevantQuestions = questions;
        if (selectedSubject) {
            relevantQuestions = questions.filter(q => q.subject === selectedSubject);
        }

        if (relevantQuestions.length === 0) {
            grid.innerHTML = `<div style="text-align:center; grid-column: 1 / -1; background: #f8fafc; padding: 40px; border-radius: 12px; border: 1px dashed #cbd5e1;">
                <h3 style="color:#334155; margin-bottom:10px;">No Questions Found</h3>
                <p style="color:#64748b; margin:0;">You haven't uploaded any ${selectedSubject || 'questions'} yet. Once you add them, the chapters will appear here automatically!</p>
            </div>`;
            return;
        }

        // 5. Count Chapters
        const chapterCounts = {};
        relevantQuestions.forEach(q => {
            if (q.chapter) {
                // Remove weird whitespace that might break the object keys
                const cleanChapter = q.chapter.trim(); 
                if (!chapterCounts[cleanChapter]) {
                    chapterCounts[cleanChapter] = 0;
                }
                chapterCounts[cleanChapter]++;
            }
        });

        const uniqueChapters = Object.keys(chapterCounts).sort();

        // 6. Render Grid
        grid.innerHTML = "";
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 60px;";

        uniqueChapters.forEach(chapter => {
            const count = chapterCounts[chapter];
            const card = document.createElement("a");
            
            card.href = `questions.html?subject=${encodeURIComponent(selectedSubject || 'Chemistry')}&chapter=${encodeURIComponent(chapter)}`;
            card.style.cssText = `display: block; padding: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
            
            card.onmouseover = () => {
                card.style.transform = "translateY(-4px)";
                card.style.boxShadow = "0 10px 15px rgba(0,0,0,0.05)";
                card.style.borderColor = "#3b82f6";
            };
            card.onmouseout = () => {
                card.style.transform = "translateY(0)";
                card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";
                card.style.borderColor = "#e2e8f0";
            };

            card.innerHTML = `
                <h3 style="font-size: 18px; color: #1e293b; margin: 0 0 10px 0; line-height: 1.4; font-weight: 600;">${chapter}</h3>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: 15px;">
                    <span style="font-size: 13px; font-weight: 600; color: #64748b; background: #f1f5f9; padding: 4px 10px; border-radius: 6px;">${count} Questions</span>
                    <span style="font-size: 14px; font-weight: 600; color: #3b82f6;">Practice →</span>
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