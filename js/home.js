import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("latestQuestions");

    // If we aren't on the homepage, stop the script
    if (!container) return;

    try {
        // 1. Fetch all questions from your Firebase database
        const questions = await getQuestions();
        
        if (!questions || questions.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: #64748b; padding: 40px; background: #f8fafc; border-radius: 12px;">No questions available yet. Check back soon!</p>`;
            container.classList.remove("loading-stack", "aria-busy");
            return;
        }

        // 2. Sort to get the absolute newest questions
        // We reverse the array and grab the top 6 most recently added questions
        const latestQuestions = [...questions].reverse().slice(0, 6);

        // 3. Clear the skeleton loading animation
        container.innerHTML = "";
        container.classList.remove("loading-stack");

        // 4. Create a responsive CSS grid for the cards
        const grid = document.createElement("div");
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(300px, 1fr)); gap: 20px;";

        // 5. Build a beautiful card for each of the latest questions
        latestQuestions.forEach(q => {
            const qCard = document.createElement("a");
            
            // Link directly to the solving page using the question's ID
            qCard.href = `question.html?id=${q.docId || q.id}&subject=${encodeURIComponent(q.subject || 'Chemistry')}&chapter=${encodeURIComponent(q.chapter || '')}`;
            
            // Card Styling
            qCard.style.cssText = "display: flex; flex-direction: column; justify-content: space-between; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.02); height: 100%;";
            
            // Hover Effects
            qCard.onmouseover = () => {
                qCard.style.boxShadow = "0 12px 20px rgba(0,0,0,0.06)";
                qCard.style.transform = "translateY(-4px)";
                qCard.style.borderColor = "#bae6fd";
            };
            qCard.onmouseout = () => {
                qCard.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)";
                qCard.style.transform = "translateY(0)";
                qCard.style.borderColor = "#e2e8f0";
            };

            // Truncate the question text so the cards look uniform
            const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 110) + "..." : "Chemistry Question...";

            // Inject the data into the card HTML
            qCard.innerHTML = `
                <div>
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                        <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.exam || 'JEE/NEET'}</span>
                        <span style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">${q.chapter || 'Chemistry'}</span>
                        <span style="background: #fef3c7; color: #d97706; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.difficulty || 'Medium'}</span>
                    </div>
                    <h3 style="font-size: 16px; color: #0f172a; margin: 0 0 15px 0; line-height: 1.6; font-weight: 600;">${snippet}</h3>
                </div>
                <div style="margin-top: auto; font-size: 15px; color: #2563eb; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    Solve Question <span>→</span>
                </div>
            `;
            
            grid.appendChild(qCard);
        });

        // 6. Inject the finished grid into the homepage
        container.appendChild(grid);

    } catch (error) {
        console.error("Error loading latest questions:", error);
        container.innerHTML = `<p style="text-align:center; color:#ef4444; padding: 20px;">Failed to load latest questions. Please check your internet connection.</p>`;
        container.classList.remove("loading-stack");
    }
});