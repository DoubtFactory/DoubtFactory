import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const listContainer = document.getElementById("bookmarksList");
    if (!listContainer) return;

    // 1. Read the student's saved bookmarks from their browser's memory
    let savedBookmarks = JSON.parse(localStorage.getItem('df_bookmarks')) || [];

    if (savedBookmarks.length === 0) {
        renderEmptyState(listContainer);
        return;
    }

    try {
        // 2. Fetch all questions from the database
        const questions = await getQuestions();
        
        // 3. Filter down to ONLY the questions the student has starred
        const bookmarkedQuestions = questions.filter(q => savedBookmarks.includes(q.docId || q.id));

        if (bookmarkedQuestions.length === 0) {
            renderEmptyState(listContainer);
            // Cleanup their browser memory if the questions were deleted from the database
            localStorage.removeItem('df_bookmarks');
            return;
        }

        renderBookmarks(bookmarkedQuestions, listContainer);

    } catch (error) {
        console.error("Error loading bookmarks:", error);
        listContainer.innerHTML = "<p style='color:red;'>Failed to load bookmarked questions. Check your connection.</p>";
    }
});

// UI for when they have 0 bookmarks
function renderEmptyState(container) {
    container.innerHTML = `
        <div style="text-align:center; padding: 60px 20px; background: #f8fafc; border-radius: 12px; border: 2px dashed #cbd5e1;">
            <div style="font-size: 40px; margin-bottom: 15px;">⭐</div>
            <h2 style="color: #1e293b; margin-bottom: 10px;">No bookmarks yet</h2>
            <p style="color: #64748b; margin-bottom: 25px; line-height: 1.6;">When you find a tricky JEE/NEET chemistry question you want to revise later, click the <b>Bookmark</b> button on the question page.</p>
            <a href="exam.html" style="background: #1565C0; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold; transition: background 0.2s;">Start Practicing</a>
        </div>
    `;
}

// UI for rendering the saved questions list
function renderBookmarks(questions, container) {
    container.innerHTML = "";
    
    const flexList = document.createElement("div");
    flexList.style.cssText = "display: flex; flex-direction: column; gap: 15px;";

    questions.forEach(q => {
        const qId = q.docId || q.id;
        const card = document.createElement("div");
        card.className = "bookmark-card";
        
        // Inline styling for the horizontal list item
        card.style.cssText = "display: flex; justify-content: space-between; align-items: center; flex-wrap: wrap; gap: 15px; padding: 24px; background: white; border: 1px solid #e2e8f0; border-radius: 12px; box-shadow: 0 2px 4px rgba(0,0,0,0.02); transition: box-shadow 0.2s;";
        card.onmouseover = () => card.style.boxShadow = "0 8px 16px rgba(0,0,0,0.06)";
        card.onmouseout = () => card.style.boxShadow = "0 2px 4px rgba(0,0,0,0.02)";

        const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 110) + "..." : "Chemistry Question...";

        card.innerHTML = `
            <div style="flex: 1 1 300px;">
                <div style="display: flex; gap: 8px; margin-bottom: 12px;">
                    <span style="font-size: 12px; font-weight: 600; color: #475569; background: #f1f5f9; padding: 4px 8px; border-radius: 4px; border: 1px solid #e2e8f0;">${q.chapter || 'Chemistry'}</span>
                    <span style="font-size: 12px; font-weight: 600; color: #2563eb; background: #eff6ff; padding: 4px 8px; border-radius: 4px; border: 1px solid #bfdbfe;">${q.exam || 'JEE/NEET'}</span>
                </div>
                <h3 style="margin: 0; font-size: 16px; color: #1e293b; line-height: 1.5; font-weight: 600;">${snippet}</h3>
            </div>
            <div style="display: flex; gap: 10px; flex-shrink: 0; align-items: center;">
                <a href="question.html?id=${qId}&subject=${encodeURIComponent(q.subject || 'Chemistry')}&chapter=${encodeURIComponent(q.chapter || '')}" 
                   style="background: #1565C0; color: white; padding: 10px 20px; border-radius: 8px; text-decoration: none; font-weight: bold; font-size: 14px; text-align: center;">Revise Now</a>
                <button class="remove-bookmark-btn" data-id="${qId}" style="background: #fee2e2; color: #b91c1c; border: 1px solid #fecaca; padding: 10px 16px; border-radius: 8px; cursor: pointer; font-weight: bold; font-size: 14px; transition: background 0.2s;">Remove</button>
            </div>
        `;
        flexList.appendChild(card);
    });

    container.appendChild(flexList);

    // 4. Make the "Remove" buttons functional
    document.querySelectorAll('.remove-bookmark-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idToRemove = e.target.getAttribute('data-id');
            
            // Delete it from the browser's memory
            let savedBookmarks = JSON.parse(localStorage.getItem('df_bookmarks')) || [];
            savedBookmarks = savedBookmarks.filter(id => id !== idToRemove);
            localStorage.setItem('df_bookmarks', JSON.stringify(savedBookmarks));
            
            // Re-render the UI instantly without refreshing the page
            const updatedQuestions = questions.filter(q => savedBookmarks.includes(q.docId || q.id));
            if (updatedQuestions.length === 0) {
                renderEmptyState(container);
            } else {
                renderBookmarks(updatedQuestions, container);
            }
        });
    });
}