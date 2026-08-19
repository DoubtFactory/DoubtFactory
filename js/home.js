import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("latestQuestions");

    // If we aren't on the homepage, stop the script
    if (!container) return;

    // 1. Widen the parent container specifically for this section to remove the empty side spaces
    const parentSection = container.closest('.container');
    if (parentSection) {
        parentSection.style.maxWidth = '1400px'; 
        parentSection.style.width = '95%';
    }

    try {
        const questions = await getQuestions();
        
        if (!questions || questions.length === 0) {
            container.innerHTML = `<p style="text-align: center; color: #64748b; padding: 40px; background: #f8fafc; border-radius: 12px;">No questions available yet. Check back soon!</p>`;
            container.classList.remove("loading-stack", "aria-busy");
            return;
        }

        // Sort to get the absolute newest questions
        const latestQuestions = [...questions].reverse().slice(0, 6);

        container.innerHTML = "";
        container.classList.remove("loading-stack");

        // 2. Adjust the grid layout to comfortably fit 3 cards across the wider screen
        const grid = document.createElement("div");
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(350px, 1fr)); gap: 25px;";

        latestQuestions.forEach(q => {
            const qCard = document.createElement("a");
            
            qCard.href = `question.html?id=${q.docId || q.id}&subject=${encodeURIComponent(q.subject || 'Chemistry')}&chapter=${encodeURIComponent(q.chapter || '')}`;
            
            qCard.style.cssText = "display: flex; flex-direction: column; justify-content: space-between; padding: 24px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.02); height: 100%;";
            
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

            const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 110) + "..." : "Chemistry Question...";

            // 3. Inject the Year into the Blue Tag (e.g., "NEET 2026")
            qCard.innerHTML = `
                <div>
                    <div style="display: flex; gap: 8px; margin-bottom: 15px; flex-wrap: wrap;">
                        <span style="background: #eff6ff; color: #2563eb; border: 1px solid #bfdbfe; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                            ${q.exam || 'Exam'} ${q.year || ''}
                        </span>
                        <span style="background: #f8fafc; color: #475569; border: 1px solid #e2e8f0; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 500;">
                            ${q.chapter || 'Chemistry'}
                        </span>
                        <span style="background: #fef3c7; color: #d97706; border: 1px solid #fde68a; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">
                            ${q.difficulty || 'Medium'}
                        </span>
                    </div>
                    <h3 style="font-size: 16px; color: #0f172a; margin: 0 0 15px 0; line-height: 1.6; font-weight: 600;">${snippet}</h3>
                </div>
                <div style="margin-top: auto; font-size: 15px; color: #2563eb; font-weight: 600; display: flex; align-items: center; gap: 6px;">
                    Solve Question <span>→</span>
                </div>
            `;
            
            grid.appendChild(qCard);
        });

        container.appendChild(grid);

    } catch (error) {
        console.error("Error loading latest questions:", error);
        container.innerHTML = `<p style="text-align:center; color:#ef4444; padding: 20px;">Failed to load latest questions. Please check your internet connection.</p>`;
        container.classList.remove("loading-stack");
    }
});