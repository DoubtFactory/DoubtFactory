import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("latestQuestions");
    if (!container) return;

    try {
        const questions = await getQuestions();

        if (!questions || questions.length === 0) {
            container.innerHTML = "<p style='text-align:center; color:#64748b; padding: 40px;'>No questions available yet. Check back soon!</p>";
            container.classList.remove("loading-stack");
            return;
        }

        // 1. Bulletproof Sorting: Uses timestamp for new uploads, falls back to Exam Year for older ones
        const latestQuestions = [...questions].sort((a, b) => {
            const getTime = (q) => {
                if (q.timestamp) return Number(q.timestamp); 
                if (typeof q.id === 'number') return q.id; 
                if (q.year) return Number(q.year); // Fallback to Year (e.g. 2026) so old questions still sort logically
                return 0; 
            };
            return getTime(b) - getTime(a); // Puts newest at the top
        }).slice(0, 6);

        // 2. Clear the skeleton loaders
        container.innerHTML = "";
        container.classList.remove("loading-stack");
        
        // 3. Setup the grid layout
        container.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;";

        // 4. Draw the question cards
        latestQuestions.forEach((q) => {
            const docId = q.docId || q.id;
            
            // Strip HTML tags so the preview text looks clean
            const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 110) + "..." : "Chemistry Question...";
            
            // CREATE THE EXAM + YEAR TAG (e.g., "NEET-2026")
            const examTag = q.year ? `${q.exam || 'JEE/NEET'}-${q.year}` : (q.exam || 'JEE/NEET');

            const card = document.createElement("a");
            card.href = `question.html?id=${docId}&subject=${encodeURIComponent(q.subject || 'Chemistry')}&chapter=${encodeURIComponent(q.chapter || '')}`;
            card.className = "question-preview";
            card.style.cssText = "display: flex; flex-direction: column; justify-content: space-between; text-decoration: none; color: inherit; height: 100%; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #fff; transition: transform 0.2s ease, box-shadow 0.2s ease;";
            
            card.onmouseover = () => { 
                card.style.transform = "translateY(-4px)"; 
                card.style.boxShadow = "0 12px 24px rgba(0,0,0,0.06)"; 
                card.style.borderColor = "#bae6fd";
            };
            card.onmouseout = () => { 
                card.style.transform = "translateY(0)"; 
                card.style.boxShadow = "none"; 
                card.style.borderColor = "#e2e8f0";
            };

            card.innerHTML = `
                <div>
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                        <span style="background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${examTag}</span>
                        <span style="background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.difficulty || 'Medium'}</span>
                    </div>
                    <h3 style="font-size: 17px; color: #0f172a; margin: 0 0 15px 0; line-height: 1.5; font-weight: 600;">${snippet}</h3>
                </div>
                <div style="font-size: 13px; color: #64748b; font-weight: 600; margin-top: auto;">${q.chapter || 'Chemistry Topic'}</div>
            `;
            
            container.appendChild(card);
        });

    } catch (error) {
        console.error("Critical error loading questions:", error);
        container.innerHTML = "<p style='text-align:center; color:#ef4444; padding: 40px;'>Failed to load latest questions. Please refresh the page.</p>";
        container.classList.remove("loading-stack");
    }
});