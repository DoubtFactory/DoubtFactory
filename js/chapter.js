import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Check the URL to see which subject was clicked
    const urlParams = new URLSearchParams(window.location.search);
    const selectedSubject = urlParams.get('subject');
    
    const titleElement = document.getElementById("subjectTitle");
    const grid = document.getElementById("chapterGrid");

    if (!grid) return;

    // Update the page title dynamically
    if (!selectedSubject) {
        titleElement.textContent = "All Chemistry Chapters";
    } else {
        titleElement.textContent = `${selectedSubject} Chapters`;
    }

    grid.innerHTML = "<p style='text-align:center; color:#64748b; grid-column: 1 / -1;'>Loading chapters...</p>";

    try {
        // 2. Fetch live questions from your Firebase database
        const questions = await getQuestions();
        
        // 3. Filter down to ONLY the questions for the chosen subject
        let relevantQuestions = questions;
        if (selectedSubject) {
            relevantQuestions = questions.filter(q => q.subject === selectedSubject);
        }

        if (relevantQuestions.length === 0) {
            grid.innerHTML = `<p style="text-align:center; color:#64748b; grid-column: 1 / -1; background: #f8fafc; padding: 40px; border-radius: 12px;">No chapters found for this subject yet. Upload some questions!</p>`;
            return;
        }

        // 4. Extract unique chapters and count the questions inside each one
        const chapterCounts = {};
        relevantQuestions.forEach(q => {
            if (q.chapter) {
                if (!chapterCounts[q.chapter]) {
                    chapterCounts[q.chapter] = 0;
                }
                chapterCounts[q.chapter]++;
            }
        });

        // Sort chapters alphabetically
        const uniqueChapters = Object.keys(chapterCounts).sort();

        // 5. Build the visual grid
        grid.innerHTML = "";
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(280px, 1fr)); gap: 20px; margin-bottom: 60px;";

        // 6. Create a beautiful card for each chapter
        uniqueChapters.forEach(chapter => {
            const count = chapterCounts[chapter];
            const card = document.createElement("a");
            
            // Ensure clicking the chapter sends the student to the actual questions page!
            card.href = `questions.html?subject=${encodeURIComponent(selectedSubject || 'Chemistry')}&chapter=${encodeURIComponent(chapter)}`;
            
            // Styling
            card.style.cssText = `display: block; padding: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease; box-shadow: 0 2px 4px rgba(0,0,0,0.02);`;
            
            // Hover effects
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

            // Inject the HTML
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
        console.error("Error loading chapters:", error);
        grid.innerHTML = "<p style='text-align:center; color:#ef4444; grid-column: 1 / -1;'>Failed to load chapters. Please check your connection.</p>";
    }
});