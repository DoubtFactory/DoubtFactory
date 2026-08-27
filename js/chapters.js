async function loadChapters() {
    try {
        const response = await fetch("data/chapters.json");
        const data = await response.json();
        const grid = document.getElementById("chapterGrid");
        
        if (!grid) return;

        const urlParams = new URLSearchParams(window.location.search);
        const selectedSubject = urlParams.get('subject');

        grid.innerHTML = "";

        // Filter data if a subject is selected
        const targetSubjects = selectedSubject 
            ? data.filter(s => s.subject.toLowerCase() === selectedSubject.toLowerCase())
            : data;

        if (targetSubjects.length === 0) {
            grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #64748b;'>No chapters found for this subject.</p>";
            return;
        }

        targetSubjects.forEach(section => {
            // If showing multiple subjects, add a section heading
            if (!selectedSubject && data.length > 1) {
                const heading = document.createElement("h3");
                heading.textContent = section.subject;
                heading.style.cssText = "grid-column: 1 / -1; margin-top: 25px; margin-bottom: 10px; color: #1565C0; font-size: 22px; font-weight: 700;";
                grid.appendChild(heading);
            }

            section.chapters.forEach(chapter => {
                const card = document.createElement("a");
                card.href = `questions.html?subject=${encodeURIComponent(section.subject)}&chapter=${encodeURIComponent(chapter)}`;
                card.className = "chapter-card";
                card.textContent = chapter;
                grid.appendChild(card);
            });
        });

    } catch (error) {
        console.error("Error loading chapters:", error);
        const grid = document.getElementById("chapterGrid");
        if (grid) {
            grid.innerHTML = "<p style='grid-column: 1/-1; text-align: center; color: #ef4444;'>Failed to load chapters.</p>";
        }
    }
}

loadChapters();
