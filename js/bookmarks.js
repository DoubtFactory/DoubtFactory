import { getQuestions } from "./firebase.js";

async function loadBookmarks() {
    const bookmarksList = document.getElementById("bookmarksList");
    
    // 1. Get the saved IDs from the browser's local storage
    const savedBookmarks = JSON.parse(localStorage.getItem('df_bookmarks')) || [];

    // 2. If they have no bookmarks, show a friendly message
    if (savedBookmarks.length === 0) {
        bookmarksList.innerHTML = `
            <div style="text-align: center; padding: 40px; background: #f8fafc; border-radius: 8px;">
                <h3 style="color: #64748b;">No bookmarks yet!</h3>
                <p>When you find a difficult question, click the <strong>☆ Bookmark for Revision</strong> button to save it here.</p>
                <a href="exam.html" class="solve-btn">Start Practicing</a>
            </div>
        `;
        return;
    }

    try {
        // 3. Fetch all questions from Firebase to match the IDs
        const allQuestions = await getQuestions();
        
        // Filter out only the questions the student bookmarked
        const bookmarkedQuestions = allQuestions.filter(q => {
            const id = q.docId || q.id;
            return savedBookmarks.includes(id);
        });

        bookmarksList.innerHTML = ""; // Clear the loading text

        // 4. Render each bookmarked question as a card
        bookmarkedQuestions.forEach(q => {
            const id = q.docId || q.id;
            
            // Clean HTML out of the question for the preview snippet
            const cleanText = (q.question || "").replace(/<[^>]*>?/gm, '').trim();
            const previewText = cleanText.length > 80 ? cleanText.substring(0, 80) + "..." : cleanText;

            const card = document.createElement("div");
            card.className = "bookmark-card";
            card.innerHTML = `
                <h3>${q.chapter || "Chemistry"} - ${q.difficulty || "Medium"}</h3>
                <p><strong>Preview:</strong> ${previewText}</p>
                <div style="margin-top: 15px;">
                    <a href="question.html?id=${id}&subject=${encodeURIComponent(q.subject || "")}&chapter=${encodeURIComponent(q.chapter || "")}" class="solve-btn">Solve Again</a>
                    <button class="remove-btn" data-id="${id}">Remove</button>
                </div>
            `;
            bookmarksList.appendChild(card);
        });

        // 5. Add logic to the "Remove" buttons
        document.querySelectorAll('.remove-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const idToRemove = e.target.getAttribute('data-id');
                let updatedBookmarks = JSON.parse(localStorage.getItem('df_bookmarks')) || [];
                updatedBookmarks = updatedBookmarks.filter(id => id !== idToRemove);
                localStorage.setItem('df_bookmarks', JSON.stringify(updatedBookmarks));
                
                // Reload the list to remove the card from the screen instantly
                loadBookmarks();
            });
        });

    } catch (error) {
        console.error("Error loading bookmarks:", error);
        bookmarksList.innerHTML = "<p>Error loading your bookmarks. Please check your internet connection.</p>";
    }
}

// Run the function when the page loads
document.addEventListener("DOMContentLoaded", loadBookmarks);