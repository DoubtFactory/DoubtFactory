import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Read the URL to see which exam was clicked
    const urlParams = new URLSearchParams(window.location.search);
    const selectedExam = urlParams.get('type'); 
    
    const titleElement = document.getElementById("examTitle");
    const container = document.getElementById("examQuestionsContainer");

    if (!selectedExam) {
        titleElement.textContent = "All Chemistry Exams";
    } else {
        titleElement.textContent = `${selectedExam} Previous Year Questions`;
    }

    try {
        // Fetch all questions from your Firebase database
        const questions = await getQuestions();
        
        // 2. Filter the questions
        let filteredQuestions = questions.filter(q => {
            if (!selectedExam) return true; 
            const searchableText = `${q.exam || ''} ${q.tags || ''} ${q.chapter || ''}`.toLowerCase();
            return searchableText.includes(selectedExam.toLowerCase());
        });

        if (filteredQuestions.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:40px; background:#f8fafc; border-radius:12px; color:#64748b;">No questions uploaded for this exam yet. Check back soon!</p>`;
            return;
        }

        // 3. Group the questions by Year
        const questionsByYear = {};
        
        filteredQuestions.forEach(q => {
            const combinedText = `${q.exam || ''} ${q.tags || ''} ${q.year || ''}`;
            const yearMatch = combinedText.match(/(20\d{2})/); 
            
            let year = yearMatch ? yearMatch[0] : "General Practice";
            
            if (!questionsByYear[year]) {
                questionsByYear[year] = [];
            }
            questionsByYear[year].push(q);
        });

        // 4. Sort the years from Newest to Oldest (e.g., 2026 first)
        const sortedYears = Object.keys(questionsByYear).sort((a, b) => {
            if (a === "General Practice") return 1; 
            if (b === "General Practice") return -1;
            return Number(b) - Number(a); 
        });

        container.innerHTML = ""; 
        
        // 5. Generate the HTML Cards
        sortedYears.forEach(year => {
            const yearBlock = document.createElement("div");
            yearBlock.style.marginBottom = "40px";
            
            const yearHeading = document.createElement("h2");
            yearHeading.style.cssText = "color: #1e293b; border-bottom: 2px solid #e2e8f0; padding-bottom: 10px; margin-bottom: 20px;";
            yearHeading.textContent = year === "General Practice" ? year : `${selectedExam || 'Exam'} - ${year}`;
            yearBlock.appendChild(yearHeading);

            const questionGrid = document.createElement("div");
            questionGrid.style.cssText = "display: grid; gap: 15px;";
            
            const yearQuestions = questionsByYear[year].reverse();

            yearQuestions.forEach(q => {
                const qCard = document.createElement("a");
                // Uses the proper docId to link to the question solving page
                qCard.href = `question.html?id=${q.docId || q.id}&subject=${encodeURIComponent(q.subject || 'Chemistry')}&chapter=${encodeURIComponent(q.chapter || '')}`;
                qCard.style.cssText = "display: block; padding: 20px; background: #ffffff; border: 1px solid #e2e8f0; border-radius: 12px; text-decoration: none; color: inherit; transition: box-shadow 0.2s; box-shadow: 0 2px 4px rgba(0,0,0,0.02);";
                
                qCard.onmouseover = () => qCard.style.boxShadow = "0 10px 15px rgba(0,0,0,0.05)";
                qCard.onmouseout = () => qCard.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";

                const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 120) + "..." : "Chemistry Question...";

                qCard.innerHTML = `
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <span style="background: #eff6ff; color: #2563eb; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.chapter || 'Chemistry'}</span>
                        <span style="background: #fef3c7; color: #d97706; padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.difficulty || 'Medium'}</span>
                    </div>
                    <h3 style="font-size: 16px; color: #334155; margin: 0; line-height: 1.5; font-weight: 500;">${snippet}</h3>
                    <div style="margin-top: 15px; font-size: 14px; color: #3b82f6; font-weight: 600;">Solve Question →</div>
                `;
                questionGrid.appendChild(qCard);
            });

            yearBlock.appendChild(questionGrid);
            container.appendChild(yearBlock);
        });
    } catch (error) {
        console.error("Error loading exam questions:", error);
        container.innerHTML = `<p style="text-align:center; color:red;">Failed to load questions. Please check your connection.</p>`;
    }
});