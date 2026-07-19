import {
    getQuestionById,
    getQuestions,
    getComments,
    addComment
} from "./firebase.js";

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
    const params = new URLSearchParams(window.location.search);
    const id = params.get("id");
    const question = await getQuestionById(id);
    questions = await getQuestions();

    if (!question) {
        const target = document.getElementById("questionText");
        if (target) target.textContent = "Question not found.";
        return;
    }

    currentIndex = questions.findIndex(q => q.docId === id);

    if (currentIndex === -1) {
        const target = document.getElementById("questionText");
        if (target) target.textContent = "Question not found.";
        return;
    }

    showQuestion();
}

function showQuestion() {
    const q = questions[currentIndex];
    const options = document.getElementById("optionsContainer");

    if (!q || !options) return;

    document.getElementById("examTag").textContent = q.exam || "Exam";
    document.getElementById("chapterTag").textContent = q.chapter || "Chapter";
    document.getElementById("difficultyTag").textContent = q.difficulty || "Medium";
    document.getElementById("typeTag").textContent = q.type || "Question";
    document.getElementById("questionText").textContent = q.question || "No question available";
const questionImageContainer = document.getElementById("questionImageContainer");

if (questionImageContainer) {

    questionImageContainer.innerHTML = "";

    if (q.questionImage) {

        questionImageContainer.innerHTML = `
            <img
                src="${q.questionImage}"
                class="question-image"
                alt="Question Image">
        `;

    }

}
    document.getElementById("breadcrumb").innerHTML = `Home > ${q.subject || "Subject"} > ${q.chapter || "Chapter"}`;
    document.getElementById("questionCounter").textContent = `Question ${currentIndex + 1} of ${questions.length}`;

    options.innerHTML = "";

    q.options.forEach((option, index) => {

    const key = ["A", "B", "C", "D"][index];

    const image =
    q.optionImages && q.optionImages[key]
        ? q.optionImages[key]
        : "";

    const label = document.createElement("label");

    label.className = "option-card";

    label.innerHTML = `

        <input type="radio" name="answer" value="${index}">

        <div>

            <span>${option}</span>

            ${
                image
                ? `<br><img src="${image}" class="option-image" alt="Option ${key}">`
                : ""
            }

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

    const solutionBox = document.getElementById("solutionBox");
    const resultMessage = document.getElementById("resultMessage");
    if (solutionBox) solutionBox.style.display = "none";
    if (resultMessage) {
        resultMessage.textContent = "";
        resultMessage.className = "result-message";
    }

    document.getElementById("views").textContent = q.views ?? 0;
    document.getElementById("likes").textContent = q.likes ?? 0;
    document.getElementById("comments").textContent = 0;

    const video = document.getElementById("videoContainer");
    if (q.youtube) {
        video.innerHTML = `<iframe loading="lazy" title="Video solution" width="100%" height="300" src="https://www.youtube.com/embed/${q.youtube}" allowfullscreen></iframe>`;
    } else {
        video.innerHTML = "<p class='empty-state'>No video available.</p>";
    }

    const prevButton = document.getElementById("prevQuestion");
    const nextButton = document.getElementById("nextQuestion");
    if (prevButton) prevButton.disabled = currentIndex === 0;
    if (nextButton) nextButton.disabled = currentIndex === questions.length - 1;

    loadComments();
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

if (solution)
    solution.textContent =
        q.solution || "No solution available.";

const solutionImageContainer =
    document.getElementById("solutionImageContainer");

if (solutionImageContainer) {

    solutionImageContainer.innerHTML = "";

    if (q.solutionImage) {

        solutionImageContainer.innerHTML = `
            <img
                src="${q.solutionImage}"
                class="solution-image"
                alt="Solution Image">
        `;

    }

}

const solutionBox =
    document.getElementById("solutionBox");

if (solutionBox)
    solutionBox.style.display = "block";
});

document.getElementById("prevQuestion").addEventListener("click", () => {
    if (currentIndex > 0) {
        const prevQuestion = questions[currentIndex - 1];
        window.location.href = `question.html?id=${prevQuestion.docId}&subject=${encodeURIComponent(prevQuestion.subject)}&chapter=${encodeURIComponent(prevQuestion.chapter)}`;
    }
});

document.getElementById("nextQuestion").addEventListener("click", () => {
    if (currentIndex < questions.length - 1) {
        const nextQuestion = questions[currentIndex + 1];
        window.location.href = `question.html?id=${nextQuestion.docId}&subject=${encodeURIComponent(nextQuestion.subject)}&chapter=${encodeURIComponent(nextQuestion.chapter)}`;
    }
});

async function loadComments() {
    const q = questions[currentIndex];
    const comments = await getComments(q.docId);
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
        questionId: q.docId,
        name,
        comment,
        time: new Date()
    });

    document.getElementById("commentText").value = "";
    setCommentFeedback("Comment posted.", "success");
    loadComments();
});

loadQuestion();
