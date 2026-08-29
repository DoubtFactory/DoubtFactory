import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const container = document.getElementById("bookmarksContainer");

    // Retrieve saved bookmarks from localStorage
    let savedBookmarks = JSON.parse(localStorage.getItem("df_bookmarks")) || [];

    if (savedBookmarks.length === 0) {
        renderEmptyState();
        return;
    }

    try {
        const allQuestions = await getQuestions();
        
        // Filter the database to only show questions whose IDs match the saved bookmarks
        const bookmarkedQuestions = allQuestions.filter(q => {
            const currentId = q.docId || q.id;
            return savedBookmarks.includes(String(currentId));
        });

        if (bookmarkedQuestions.length === 0) {
            // Edge case: IDs are in localStorage, but deleted from the DB
            renderEmptyState();
            return;
        }

        renderBookmarks(bookmarkedQuestions);

    } catch (error) {
        console.error("Error loading bookmarks:", error);
        container.innerHTML = `<p style="color: #EF4444; text-align: center; padding: 40px 0;">Failed to load bookmarks. Please check your connection.</p>`;
    }

    // Renders the new dark theme empty state
    function renderEmptyState() {
        container.innerHTML = `
            <div class="empty-state-card">
                <span class="star-icon">⭐</span>
                <p>When you find a tricky JEE/NEET question you want to revise later, click the <strong>Bookmark</strong> button on the question page.</p>
                <a href="index.html" class="btn-start">Start Practicing</a>
            </div>
        `;
    }

    // Renders the actual dark theme cards
    function renderBookmarks(questions) {
        container.innerHTML = questions.map(q => {
            const qId = q.docId || q.id;
            const diff = (q.difficulty || "Medium");
            const diffClass = diff.toLowerCase() === "easy" ? "badge-easy" : (diff.toLowerCase() === "hard" ? "badge-hard" : "badge-medium");
            
            const snippet = q.question 
                ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 160) + (q.question.length > 160 ? "..." : "") 
                : "Question text";

            return `
                <div class="exam-q-card" id="card-${qId}">
                    <button class="remove-bookmark-btn" onclick="removeBookmark('${qId}')">Remove</button>
                    <div class="exam-badges">
                        <span class="badge badge-exam">${q.exam || "Exam"}</span>
                        <span class="badge badge-year">${q.year || "Year"}</span>
                        <span class="badge badge-subject">${q.subject || "Subject"}</span>
                        <span class="badge badge-chapter" style="max-width: 200px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;">${q.chapter || "Chapter"}</span>
                        <span class="badge ${diffClass}">${diff}</span>
                    </div>
                    <div class="exam-q-text">${snippet}</div>
                    <a href="question.html?id=${qId}" class="solve-btn-link">Solve Question →</a>
                </div>
            `;
        }).join("");
    }

    // Global function to remove bookmarks without refreshing the page
    window.removeBookmark = function(idToRemove) {
        savedBookmarks = savedBookmarks.filter(id => String(id) !== String(idToRemove));
        localStorage.setItem("df_bookmarks", JSON.stringify(savedBookmarks));

        // Visually remove the card
        const card = document.getElementById(`card-${idToRemove}`);
        if (card) {
            card.remove();
        }

        // If no bookmarks are left, show the empty state
        if (savedBookmarks.length === 0) {
            renderEmptyState();
        }
    };
});
