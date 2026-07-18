import {
    getQuestionById,
    getQuestions,
    getComments,
    addComment
} from "./firebase.js";

let questions = [];
let currentIndex = 0;
let selectedAnswer = -1;

async function loadQuestion() {

    const params = new URLSearchParams(window.location.search);

    const id = params.get("id");
    console.log("URL id:", id);

    const question = await getQuestionById(id);
    console.log("Question from Firebase:", question);

    questions = await getQuestions();
    console.log("All questions:", questions);

    if (!question) {

        document.getElementById("questionText").textContent =
            "Question not found.";

        throw new Error("Question not found");
    }

    const subject = params.get("subject");
    const chapter = params.get("chapter");

questions = await getQuestions();

    currentIndex = questions.findIndex(q => q.docId === id);
console.log("Current Index:", currentIndex);

    if (currentIndex === -1) {
        document.getElementById("questionText").textContent =
            "Question not found.";
        return;
    }

    showQuestion();
}

function showQuestion() {

    const q = questions[currentIndex];

    document.getElementById("examTag").textContent = q.exam;
    document.getElementById("chapterTag").textContent = q.chapter;
    document.getElementById("difficultyTag").textContent = q.difficulty;
    document.getElementById("typeTag").textContent = q.type;

    document.getElementById("questionText").textContent = q.question;
document.getElementById("breadcrumb").innerHTML =
    `Home > ${q.subject} > ${q.chapter}`;

    document.getElementById("questionCounter").textContent =
        `Question ${currentIndex + 1} of ${questions.length}`;

    const options = document.getElementById("optionsContainer");

    options.innerHTML = "";

    q.options.forEach((option, index) => {

        options.innerHTML += `
            <label class="option">
                <input
                    type="radio"
                    name="answer"
                    value="${index}"
                >
                ${option}
            </label>
            <br>
        `;

    });

    document
        .querySelectorAll('input[name="answer"]')
        .forEach(radio => {

            radio.addEventListener("change", () => {
                selectedAnswer = Number(radio.value);
            });

        });

    document.getElementById("solutionBox").style.display = "none";
    document.getElementById("resultMessage").textContent = "";

    document.getElementById("views").textContent = q.views ?? 0;
    document.getElementById("likes").textContent = q.likes ?? 0;

    const video = document.getElementById("videoContainer");

    if (q.youtube) {

        video.innerHTML = `
            <iframe
                width="100%"
                height="400"
                src="https://www.youtube.com/embed/${q.youtube}"
                frameborder="0"
                allowfullscreen>
            </iframe>
        `;

    } else {

        video.innerHTML = "<p>No video available.</p>";

    }

    document.getElementById("prevQuestion").disabled =
        currentIndex === 0;

    document.getElementById("nextQuestion").disabled =
        currentIndex === questions.length - 1;

loadComments();
}

document
.getElementById("submitAnswer")
.addEventListener("click", () => {

    const q = questions[currentIndex];

    if (selectedAnswer === -1) {

        alert("Please select an option.");
        return;

    }

    const result = document.getElementById("resultMessage");

    if (selectedAnswer === q.answer) {

        result.innerHTML =
            "✅ Correct Answer!";

    } else {

        result.innerHTML =
            `❌ Wrong Answer. Correct option is ${q.answer + 1}.`;

    }

    document.getElementById("solutionText").textContent =
        q.solution;

    document.getElementById("solutionBox").style.display =
        "block";

});

document
document
.getElementById("prevQuestion")
.addEventListener("click", () => {

    if (currentIndex > 0) {

        const prevQuestion = questions[currentIndex - 1];

        window.location.href =
            `question.html?id=${prevQuestion.docId}&subject=${encodeURIComponent(prevQuestion.subject)}&chapter=${encodeURIComponent(prevQuestion.chapter)}`;

    }

});

document
.getElementById("nextQuestion")
.addEventListener("click", () => {

    if (currentIndex < questions.length - 1) {

        const nextQuestion = questions[currentIndex + 1];

        window.location.href =
            `question.html?id=${nextQuestion.docId}&subject=${encodeURIComponent(nextQuestion.subject)}&chapter=${encodeURIComponent(nextQuestion.chapter)}`;

    }

});

async function loadComments() {

    const q = questions[currentIndex];

    const comments = await getComments(q.docId);

    const list = document.getElementById("commentsList");

    list.innerHTML = "";

    comments.forEach(c => {

        list.innerHTML += `
            <div class="comment">
                <strong>${c.name}</strong><br>
                ${c.comment}
                <hr>
            </div>
        `;

    });

}

document
.getElementById("postComment")
.addEventListener("click", async () => {

    const q = questions[currentIndex];

    const name =
        document.getElementById("commentName").value.trim() ||
        "Anonymous";

    const comment =
        document.getElementById("commentText").value.trim();

    if(comment===""){
        alert("Write a comment.");
        return;
    }

    await addComment({

        questionId: q.docId,
        name,
        comment,
        time: new Date()

    });

    document.getElementById("commentText").value = "";

    loadComments();

});
loadQuestion();