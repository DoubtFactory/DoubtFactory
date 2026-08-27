import {
    getQuestionById,
    getQuestions,
    getComments,
    addComment,
    db
} from "./firebase.js";
import { doc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

let questions = [];
let currentIndex = 0;
let selectedAnswer = -1;

function setFeedback(text, type = "") {
    const result = document.getElementById("resultMessage");
    if (!result) return;
    result.textContent = text;
    result.className = `result-message${type ? ` ${type}` : ""}`;
}

function setCommentFeedback(text, type = "") {
    const feedback = document.getElementById("commentFeedback");
    if (!feedback) return;
    feedback.textContent = text;
    feedback.className = `inline-feedback${type ? ` ${type}` : ""}`;
}

async function loadQuestion() {
    try {
        const params = new URLSearchParams(window.location.search);
        const id = params.get("id");
        
        if (!id) {
            document.getElementById("questionText").textContent = "No question ID provided.";
            return;
        }

        const question = await getQuestionById(id);
        questions = await getQuestions();

        if (!question) {
            document.getElementById("questionText").textContent = "Question not found.";
            return;
        }

        currentIndex = questions.findIndex(q => q.docId === id || q.id === id);

        if (currentIndex === -1) {
            document.getElementById("questionText").textContent = "Question not found in database.";
            return;
        }

        showQuestion();
        
    } catch (err) {
        console.error("Critical error in loadQuestion:", err);
        const target = document.getElementById("questionText");
        if (target) target.textContent = "Error loading question. Please try again.";
    }
}

function showQuestion() {
    const q = questions[currentIndex];
    const options = document.getElementById("optionsContainer");

    if (!q || !options) return;

    // Combined Exam and Year Tag
    document.getElementById("examTag").textContent = (q.exam || "Exam") + (q.year ? " " + q.year : "");
    document.getElementById("chapterTag").textContent = q.chapter || "Chapter";
    document.getElementById("difficultyTag").textContent = q.difficulty || "Medium";
    document.getElementById("typeTag").textContent = q.type || "Question";
    
    // Render clean text
    document.getElementById("questionText").innerHTML = q.question || "";
    
    const questionImageContainer = document.getElementById("questionImageContainer");

    if (questionImageContainer) {
        questionImageContainer.innerHTML = "";
        if (q.questionImage) {
            questionImageContainer.innerHTML = `
                <img
                    src="${q.questionImage}"
                    class="question-image"
                    alt="Question Image"
                    style="max-width: 100%; border-radius: 8px; margin-top: 10px;">
            `;
        }
    }
    
    document.getElementById("breadcrumb").innerHTML = `
        <a href="index.html" style="color: inherit; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">Home</a> > 
        <a href="subject.html" style="color: inherit; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${q.subject || "Subject"}</a> > 
        <a href="search.html?q=${encodeURIComponent(q.chapter || "")}" style="color: inherit; text-decoration: none;" onmouseover="this.style.textDecoration='underline'" onmouseout="this.style.textDecoration='none'">${q.chapter || "Chapter"}</a>
    `;

    options.innerHTML = "";

    if (q.options && Array.isArray(q.options)) {
        q.options.forEach((option, index) => {
            const key = ["A","B","C","D"][index];
            const image = q.optionImages?.[key] || "";

            const label = document.createElement("label");
            label.className = "option-card";

            label.innerHTML = `
                <input type="radio" name="answer" value="${index}">
                <div class="option-content">
                    ${image ? `
                        <img
                            src="${image}"
                            class="option-image"
                            alt="Option ${key}"
                            style="max-width: 100%; border-radius: 8px; margin-bottom: 10px;">
                    ` : ""}
                   <div class="option-text">${option}</div>
                </div>
            `;

            options.appendChild(label);
        });

        document.querySelectorAll('input[name="answer"]').forEach(radio => {
            radio.addEventListener("change", () => {
                selectedAnswer = Number(radio.value);
                document.querySelectorAll('.option-card').forEach(card => card.classList.remove('selected'));
                radio.closest('.option-card').classList.add('selected');
            });
        });
    }

    const solutionBox = document.getElementById("solutionBox");
    const resultMessage = document.getElementById("resultMessage");
    if (solutionBox) solutionBox.style.display = "none";
    if (resultMessage) {
        resultMessage.textContent = "";
        resultMessage.className = "result-message";
    }

    const views = document.getElementById("views");
    const likes = document.getElementById("likes");
    const comments = document.getElementById("comments");

    if (views) views.textContent = q.views ?? 0;
    if (likes) likes.textContent = q.likes ?? 0;
    if (comments) comments.textContent = 0;

    const video = document.getElementById("videoContainer");

    if (video) {
        let videoId = "";
        if (q.youtube) {
            const url = q.youtube.trim();
            if (url.includes("watch?v=")) {
                videoId = url.split("watch?v=")[1].split("&")[0];
            } else if (url.includes("youtu.be/")) {
                videoId = url.split("youtu.be/")[1].split("?")[0];
            } else {
                videoId = url;
            }
        }

        if (videoId) {
            // Flawless 16:9 Widescreen wrapper
            video.innerHTML = `
                <div style="width: 100%; max-width: 800px; margin: 0 auto; padding: 15px 0;">
                    <div style="position: relative; width: 100%; padding-bottom: 56.25%; height: 0; border-radius: 16px; overflow: hidden; box-shadow: 0 10px 30px rgba(0,0,0,0.15);">
                        <iframe
                            style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: 0;"
                            src="https://www.youtube.com/embed/${videoId}"
                            title="Video Solution"
                            allowfullscreen>
                        </iframe>
                    </div>
                </div>
            `;
        } else {
            video.innerHTML = `<p class="empty-state">No video available.</p>`;
        }
    }

    const prevButton = document.getElementById("prevQuestion");
    const nextButton = document.getElementById("nextQuestion");
    if (prevButton) prevButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === questions.length - 1;

    loadComments();

    // --- 1. DYNAMIC SEO UPDATE & Q&A SCHEMA ---
    const cleanQText = (q.question || "").replace(/<[^>]*>?/gm, '').trim();
    const shortTitleSnippet = cleanQText.length > 40 ? cleanQText.substring(0, 40) + "..." : cleanQText;
    const subjectLabel = q.subject || "General";

    // Automatically update the Browser Tab & Google Search Title
    document.title = `${shortTitleSnippet} | ${q.chapter || subjectLabel} for JEE/NEET`;

    // Automatically update the Meta Description for Google Search Results
    let metaDescription = document.querySelector('meta[name="description"]');
    if (!metaDescription) {
        metaDescription = document.createElement('meta');
        metaDescription.name = "description";
        document.head.appendChild(metaDescription);
    }
    metaDescription.content = `Practice this ${q.difficulty || "Medium"} ${q.chapter || subjectLabel} question for JEE/NEET on Doubt Factory. ${cleanQText.substring(0, 120)}...`;

    // Remove old schema if the student clicked "Next Question"
    const existingSchema = document.getElementById("qa-schema");
    if (existingSchema) existingSchema.remove();

    // Find correct text for schema answer
    let correctOptionText = "Answer provided in detailed video/text solution.";
    if (q.options && q.options[q.answer]) {
        correctOptionText = q.options[q.answer].replace(/<[^>]*>?/gm, '').trim();
    }
    let fullSolution = q.solution ? q.solution.replace(/<[^>]*>?/gm, '').trim() : correctOptionText;

    // Build & Inject structured data JSON for Google
    const schemaData = {
        "@context": "https://schema.org",
        "@type": "QAPage",
        "mainEntity": {
            "@type": "Question",
            "name": shortTitleSnippet,
            "text": cleanQText,
            "answerCount": 1,
            "acceptedAnswer": {
                "@type": "Answer",
                "text": fullSolution
            }
        }
    };
    const scriptSchema = document.createElement("script");
    scriptSchema.id = "qa-schema";
    scriptSchema.type = "application/ld+json";
    scriptSchema.text = JSON.stringify(schemaData);
    document.head.appendChild(scriptSchema);

    // --- 2. DYNAMIC IMAGE ALT TEXT ---
    setTimeout(() => {
        const contentImages = document.querySelectorAll('.question-content img, .solution-content img, #questionContainer img');
        contentImages.forEach((img, index) => {
            if (!img.alt || img.alt.toLowerCase().includes('image') || img.alt.trim() === '') {
                img.alt = `${q.chapter || subjectLabel} technical diagram for JEE/NEET - Figure ${index + 1}`;
            }
            img.style.maxWidth = "100%";
            img.style.height = "auto";
        });
    }, 100);

    // --- 3. DYNAMIC SOCIAL META TAGS ---
    const setOpenGraphTag = (property, content) => {
        let tag = document.querySelector(`meta[property="${property}"]`);
        if (!tag) {
            tag = document.createElement('meta');
            tag.setAttribute('property', property);
            document.head.appendChild(tag);
        }
        tag.setAttribute('content', content);
    };

    setOpenGraphTag('og:title', `${shortTitleSnippet} | ${q.chapter || subjectLabel} for JEE/NEET`);
    setOpenGraphTag('og:description', `Practice this ${q.difficulty || "Medium"} ${q.chapter || subjectLabel} question on Doubt Factory. Check out the step-by-step solution!`);
    setOpenGraphTag('og:url', window.location.href);
    setOpenGraphTag('og:type', 'website');

    // --- 4. DYNAMIC CANONICAL TAG ---
    let canonicalTag = document.querySelector("link[rel='canonical']");
    if (!canonicalTag) {
        canonicalTag = document.createElement("link");
        canonicalTag.setAttribute("rel", "canonical");
        document.head.appendChild(canonicalTag);
    }
    const currentUrlId = q.docId || q.id || new URLSearchParams(window.location.search).get('id');
    canonicalTag.setAttribute("href", `https://doubtfactory.github.io/DoubtFactory/question.html?id=${currentUrlId}&subject=${encodeURIComponent(q.subject || "")}&chapter=${encodeURIComponent(q.chapter || "")}`);

    // --- 5. BOOKMARK FOR REVISION SYSTEM ---
    const bookmarkBtn = document.getElementById('bookmarkBtn');
    if (bookmarkBtn) {
        const urlParams = new URLSearchParams(window.location.search);
        const currentQuestionId = urlParams.get('id');
        let savedBookmarks = JSON.parse(localStorage.getItem('df_bookmarks')) || [];

        if (savedBookmarks.includes(currentQuestionId)) {
            bookmarkBtn.innerHTML = '⭐ Bookmarked';
            bookmarkBtn.style.background = '#e0f2fe';
            bookmarkBtn.style.borderColor = '#0284c7';
            bookmarkBtn.style.color = '#0369a1';
        }

        // Must remove old listener before adding a new one to prevent double-firing on "Next Question" clicks
        const newBookmarkBtn = bookmarkBtn.cloneNode(true);
        bookmarkBtn.parentNode.replaceChild(newBookmarkBtn, bookmarkBtn);
        
        newBookmarkBtn.addEventListener('click', () => {
            savedBookmarks = JSON.parse(localStorage.getItem('df_bookmarks')) || [];
            if (savedBookmarks.includes(currentQuestionId)) {
                savedBookmarks = savedBookmarks.filter(id => id !== currentQuestionId);
                newBookmarkBtn.innerHTML = '☆ Bookmark for Revision';
                newBookmarkBtn.style.background = '#f1f5f9';
                newBookmarkBtn.style.borderColor = '#cbd5e1';
                newBookmarkBtn.style.color = '#334155';
            } else {
                savedBookmarks.push(currentQuestionId);
                newBookmarkBtn.innerHTML = '⭐ Bookmarked';
                newBookmarkBtn.style.background = '#e0f2fe';
                newBookmarkBtn.style.borderColor = '#0284c7';
                newBookmarkBtn.style.color = '#0369a1';
            }
            localStorage.setItem('df_bookmarks', JSON.stringify(savedBookmarks));
        });
    }
}

document.getElementById("submitAnswer").addEventListener("click", () => {
    const q = questions[currentIndex];

    if (selectedAnswer === -1) {
        setFeedback("Please select an option.", "error");
        return;
    }

    if (selectedAnswer === q.answer) {
        setFeedback("✅ Correct Answer!", "success");
    } else {
        setFeedback(`❌ Wrong Answer. Correct option is ${q.answer + 1}.`, "error");
    }

    const solution = document.getElementById("solutionText");

    if (solution) {
        if (q.solution && q.solution.trim() !== "") {
            solution.innerHTML = q.solution || "";
        } else if (!q.solutionImage || q.solutionImage.trim() === "") {
            solution.textContent = "No solution available.";
        } else {
            solution.textContent = "";
        }
    }

    const solutionImageContainer = document.getElementById("solutionImageContainer");

    if (solutionImageContainer) {
        solutionImageContainer.innerHTML = "";
        if (q.solutionImage) {
            solutionImageContainer.innerHTML = `
                <img
                    src="${q.solutionImage}"
                    class="solution-image"
                    alt="Solution Image"
                    style="max-width: 100%; border-radius: 8px; margin-top: 10px;">
            `;
        }
    }

    const solutionBox = document.getElementById("solutionBox");
    if (solutionBox) solutionBox.style.display = "block";
});

document.getElementById("prevQuestion").addEventListener("click", () => {
    if (currentIndex > 0) {
        const prevQuestion = questions[currentIndex - 1];
        window.location.href = `question.html?id=${prevQuestion.docId || prevQuestion.id}&subject=${encodeURIComponent(prevQuestion.subject)}&chapter=${encodeURIComponent(prevQuestion.chapter)}`;
    }
});

document.getElementById("nextQuestion").addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
        const nextQuestion = questions[currentIndex + 1];
        window.location.href = `question.html?id=${nextQuestion.docId || nextQuestion.id}&subject=${encodeURIComponent(nextQuestion.subject)}&chapter=${encodeURIComponent(nextQuestion.chapter)}`;
    }
});

async function loadComments() {
    const q = questions[currentIndex];
    const comments = await getComments(q.docId || q.id);
    const list = document.getElementById("commentsList");

    if (!list) return;
    list.innerHTML = "";

    comments.forEach(c => {
        const item = document.createElement("div");
        item.className = "comment";
        item.innerHTML = `<strong>${c.name || "Anonymous"}</strong><br>${c.comment}`;
        list.appendChild(item);
    });
}

document.getElementById("postComment").addEventListener("click", async () => {
    const q = questions[currentIndex];
    const name = document.getElementById("commentName").value.trim() || "Anonymous";
    const comment = document.getElementById("commentText").value.trim();

    if (!comment) {
        setCommentFeedback("Write a comment before posting.", "error");
        return;
    }

    await addComment({
        questionId: q.docId || q.id,
        name,
        comment,
        time: new Date()
    });

    document.getElementById("commentText").value = "";
    setCommentFeedback("Comment posted.", "success");
    loadComments();
});

loadQuestion();
