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

        const latestQuestions = [...questions].sort((a, b) => {
            const aTime = Number(a.timestamp || a.year || 0);
            const bTime = Number(b.timestamp || b.year || 0);
            return bTime - aTime;
        }).slice(0, 6);

        container.innerHTML = "";
        container.classList.remove("loading-stack");
        container.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 20px;";

        latestQuestions.forEach((q) => {
            const docId = q.docId || q.id;
            let snippet = "Practice Question...";
            if (q.question) {
                snippet = String(q.question).replace(/<[^>]*>?/gm, '').substring(0, 110) + "...";
            }
            
            const examTag = q.year ? `${q.exam || 'JEE/NEET'}-${q.year}` : (q.exam || 'JEE/NEET');
            const videoBadge = q.youtube ? `
                <span style="background: #fee2e2; color: #dc2626; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 700; display: inline-flex; align-items: center; gap: 4px; border: 1px solid #fecaca;">
                    <svg viewBox="0 0 24 24" width="12" height="12" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                    Video
                </span>
            ` : '';

            const card = document.createElement("a");
            card.href = `question.html?id=${docId}&subject=${encodeURIComponent(q.subject || 'General')}&chapter=${encodeURIComponent(q.chapter || '')}`;
            card.className = "question-preview";
            card.style.cssText = "display: flex; flex-direction: column; justify-content: space-between; text-decoration: none; color: inherit; height: 100%; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; background: #fff; transition: transform 0.2s ease, box-shadow 0.2s ease;";

            card.innerHTML = `
                <div>
                    <div style="display: flex; gap: 8px; margin-bottom: 12px; flex-wrap: wrap;">
                        <span style="background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${examTag}</span>
                        <span style="background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.difficulty || 'Medium'}</span>
                        ${videoBadge}
                    </div>
                    <h3 style="font-size: 17px; color: #0f172a; margin: 0 0 15px 0; line-height: 1.5; font-weight: 600;">${snippet}</h3>
                </div>
                <div style="font-size: 13px; color: #64748b; font-weight: 600; margin-top: auto;">${q.chapter || q.subject || 'Topic'}</div>
            `;
            container.appendChild(card);
        });

    } catch (error) {
        container.innerHTML = `<p style='text-align:center; color:#ef4444; padding: 40px;'>Failed to load questions.</p>`;
        container.classList.remove("loading-stack");
    }
});
