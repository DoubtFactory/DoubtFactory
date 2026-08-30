import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const urlParams = new URLSearchParams(window.location.search);
    const subjectParam = urlParams.get("subject");
    const chapterParam = urlParams.get("chapter");

    const titleEl = document.getElementById("chapterTitle");
    if (titleEl) {
        titleEl.textContent = chapterParam ? `${chapterParam} Questions` : "Chapter Questions";
        document.title = `${chapterParam || "Chapter"} | Doubt Factory`;
    }

    const examFilterContainer = document.getElementById("examFilterContainer");
    const examFilter = document.getElementById("examFilter");
    const yearFilter = document.getElementById("yearFilter");
    const diffFilter = document.getElementById("difficultyFilter");
    const searchInput = document.getElementById("searchQuestion");
    const qList = document.getElementById("questionList");

    if (examFilterContainer && examFilter) {
        if (subjectParam === "Botany" || subjectParam === "Zoology") {
            examFilterContainer.style.display = "none";
        } else if (subjectParam === "Maths") {
            examFilter.innerHTML = `
                <option value="All">All Exams</option>
                <option value="JEE Main">JEE Main</option>
                <option value="JEE Advanced">JEE Advanced</option>
            `;
        } else {
            examFilter.innerHTML = `
                <option value="All">All Exams</option>
                <option value="JEE Main">JEE Main</option>
                <option value="JEE Advanced">JEE Advanced</option>
                <option value="NEET">NEET</option>
            `;
        }
    }

    let allQuestions = [];

    try {
        const rawQuestions = await getQuestions();
        
        allQuestions = rawQuestions.filter(q => {
            let match = true;
            if (subjectParam && q.subject !== subjectParam) match = false;
            if (chapterParam && q.chapter !== chapterParam) match = false;
            return match;
        });

        if (yearFilter) {
            const years = [...new Set(allQuestions.map(q => q.year).filter(Boolean))].sort((a, b) => b - a);
            yearFilter.innerHTML = '<option value="All">All Years</option>';
            years.forEach(y => {
                const opt = document.createElement("option");
                opt.value = y;
                opt.textContent = y;
                yearFilter.appendChild(opt);
            });
        }

        renderQuestions();

    } catch (err) {
        console.error("Error loading chapter questions:", err);
        if(qList) qList.innerHTML = `<p style="color: #EF4444; text-align: center; padding: 40px 0;">Failed to load questions. Please check your connection.</p>`;
    }

    function renderQuestions() {
        if(!qList) return;

        try {
            const examVal = examFilter ? examFilter.value : "All";
            const yearVal = yearFilter ? yearFilter.value : "All";
            const diffVal = diffFilter ? diffFilter.value : "All";
            const searchVal = searchInput ? StringA few quick steps can usually resolve a website failing to load specific interactive elements like question banks. 

**Quick Browser Fixes**
* **Hard Refresh:** Force the browser to bypass the cache and load a fresh version of the page (Ctrl + F5 on Windows, Cmd + Shift + R on Mac).
* **Incognito Mode:** Open the page in a private window. If the questions load, the issue is likely tied to your stored browser data or active extensions.
* **Disable Ad-Blockers:** Privacy extensions or ad-blockers frequently block the background scripts responsible for fetching educational quiz modules. Try pausing them for that specific site.
* **Clear Cache & Cookies:** Corrupted local data can stall page scripts. Clearing your recent browsing data often clears the logjam.
* **Switch Networks:** Temporarily connect to a mobile hotspot to rule out a network-level block or DNS issue with your current ISP.

**If You Manage the Website**
* **Inspect the Console:** Right-click the page, select "Inspect", and check the "Console" tab. Red error messages will instantly tell you if the JavaScript is breaking or if the API calls fetching your chemistry problems are failing.
* **Database Connection:** Verify that your backend database or hosting service serving the JEE/NEET questions is active, properly connected, and not experiencing a temporary timeout.

Which specific website or platform are you trying to load right now?
