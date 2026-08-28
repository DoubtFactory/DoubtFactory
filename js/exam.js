import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const selectedExam = urlParams.get('type'); 
    
    const titleElement = document.getElementById("examTitle");
    const container = document.getElementById("examQuestionsContainer");
    const yearFiltersContainer = document.getElementById("yearFilters"); 

    if (!selectedExam) {
        titleElement.textContent = "All Exams";
    } else {
        titleElement.textContent = `${selectedExam} Previous Year Questions`;
    }

    try {
        const questions = await getQuestions();
        
        let filteredQuestions = questions.filter(q => {
            if (!selectedExam) return true; 
            const searchableText = `${q.exam || ''} ${q.tags || ''} ${q.chapter || ''}`.toLowerCase();
            return searchableText.includes(selectedExam.toLowerCase());
        });

        if (filteredQuestions.length === 0) {
            container.innerHTML = `<p style="text-align:center; padding:40px; background: var(--bg-card); border: 1px dashed var(--border-color); border-radius:12px; color: var(--text-secondary);">No questions uploaded for this exam yet. Check back soon!</p>`;
            if (yearFiltersContainer) yearFiltersContainer.innerHTML = "<p style='color: var(--text-secondary);'>No years available</p>";
            return;
        }

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

        const sortedYears = Object.keys(questionsByYear).sort((a, b) => {
            if (a === "General Practice") return 1; 
            if (b === "General Practice") return -1;
            return Number(b) - Number(a); 
        });

        container.innerHTML = ""; 
        if (yearFiltersContainer) yearFiltersContainer.innerHTML = "";
        
        // Build the Sidebar Buttons
        const allBtn = document.createElement("button");
        allBtn.textContent = "All Years";
        // Default "All Years" to blue (active)
        allBtn.style.cssText = "display: block; width: 100%; text-align: left; padding: 10px 15px; border: 1px solid var(--accent-blue); background: var(--accent-blue); color: white; border-radius: 8px; cursor: pointer; font-weight: 600; margin-bottom: 8px; transition: all 0.2s;";
        allBtn.onclick = () => filterByYear("All", allBtn);
        if (yearFiltersContainer) yearFiltersContainer.appendChild(allBtn);

        // Build HTML Cards & Year Filter Buttons
        sortedYears.forEach(year => {
            
            if (yearFiltersContainer) {
                const btn = document.createElement("button");
                btn.textContent = year;
                btn.className = "year-filter-btn";
                // Default specific years to transparent/dark (inactive)
                btn.style.cssText = "display: block; width: 100%; text-align: left; padding: 10px 15px; border: 1px solid var(--border-color); background: transparent; color: var(--text-primary); border-radius: 8px; cursor: pointer; font-weight: 500; margin-bottom: 8px; transition: all 0.2s;";
                btn.onclick = () => filterByYear(year, btn);
                yearFiltersContainer.appendChild(btn);
            }

            const yearBlock = document.createElement("div");
            yearBlock.className = "year-section-block"; 
            yearBlock.dataset.year = year; 
            yearBlock.style.marginBottom = "40px";
            
            const yearHeading = document.createElement("h2");
            yearHeading.style.cssText = "color: var(--text-primary); border-bottom: 2px solid var(--border-color); padding-bottom: 10px; margin-bottom: 20px;";
            yearHeading.textContent = year === "General Practice" ? year : `${selectedExam || 'Exam'} - ${year}`;
            yearBlock.appendChild(yearHeading);

            const questionGrid = document.createElement("div");
            questionGrid.style.cssText = "display: grid; gap: 15px;";
            
            const yearQuestions = questionsByYear[year].reverse();

            yearQuestions.forEach(q => {
                const qCard = document.createElement("a");
                qCard.href = `question.html?id=${q.docId || q.id}&subject=${encodeURIComponent(q.subject || 'General')}&chapter=${encodeURIComponent(q.chapter || '')}`;
                qCard.style.cssText = "display: block; padding: 20px; background: var(--bg-card); border: 1px solid var(--border-color); border-radius: 12px; text-decoration: none; color: inherit; transition: all 0.2s;";
                
                qCard.onmouseover = () => {
                    qCard.style.background = "var(--bg-card-hover)";
                    qCard.style.borderColor = "var(--accent-blue)";
                    qCard.style.transform = "translateY(-2px)";
                };
                qCard.onmouseout = () => {
                    qCard.style.background = "var(--bg-card)";
                    qCard.style.borderColor = "var(--border-color)";
                    qCard.style.transform = "translateY(0)";
                };

                const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 120) + "..." : "Practice Question...";

                qCard.innerHTML = `
                    <div style="display: flex; gap: 10px; margin-bottom: 10px;">
                        <span style="background: rgba(59, 130, 246, 0.15); color: var(--accent-light-blue); border: 1px solid rgba(59, 130, 246, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.chapter || q.subject || 'Topic'}</span>
                        <span style="background: rgba(245, 158, 11, 0.15); color: #FBBF24; border: 1px solid rgba(245, 158, 11, 0.3); padding: 4px 10px; border-radius: 6px; font-size: 12px; font-weight: 600;">${q.difficulty || 'Medium'}</span>
                    </div>
                    <h3 style="font-size: 16px; color: var(--text-primary); margin: 0; line-height: 1.5; font-weight: 500;">${snippet}</h3>
                    <div style="margin-top: 15px; font-size: 14px; color: var(--accent-blue); font-weight: 600;">Solve Question →</div>
                `;
                questionGrid.appendChild(qCard);
            });

            yearBlock.appendChild(questionGrid);
            container.appendChild(yearBlock);
        });

        // The Filtering Magic
        function filterByYear(targetYear, activeBtn) {
            // Reset all buttons to transparent dark theme
            const allButtons = yearFiltersContainer.querySelectorAll("button");
            allButtons.forEach(b => {
                b.style.background = "transparent";
                b.style.color = "var(--text-primary)";
                b.style.border = "1px solid var(--border-color)";
                b.style.fontWeight = "500";
            });
            
            // Turn the clicked button Solid Blue
            activeBtn.style.background = "var(--accent-blue)";
            activeBtn.style.color = "white";
            activeBtn.style.border = "1px solid var(--accent-blue)";
            activeBtn.style.fontWeight = "600";

            // Hide/Show the corresponding year blocks
            const allBlocks = container.querySelectorAll(".year-section-block");
            allBlocks.forEach(block => {
                if (targetYear === "All" || block.dataset.year === targetYear) {
                    block.style.display = "block";
                } else {
                    block.style.display = "none";
                }
            });
        }
    } catch (error) {
        console.error("Error loading exam questions:", error);
        container.innerHTML = `<p style="text-align:center; color: #ef4444;">Failed to load questions. Please check your connection.</p>`;
    }
});
