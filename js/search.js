import { getQuestions } from "./firebase.js";

const searchBox = document.getElementById("searchBox");
const results = document.getElementById("searchResults");

let questions = [];

async function load() {

    questions = await getQuestions();
console.log("Questions:", questions);
console.log("Total:", questions.length);

}

searchBox.addEventListener("input", () => {

    const keyword = searchBox.value.toLowerCase().trim();

    results.innerHTML = "";

    if (keyword === "") return;

  const filtered = questions.filter(q => {

    const question = (q.question || "").toLowerCase();
    const chapter = (q.chapter || "").toLowerCase();
    const subject = (q.subject || "").toLowerCase();
    const exam = (q.exam || "").toLowerCase();

    return (
        question.includes(keyword) ||
        chapter.includes(keyword) ||
        subject.includes(keyword) ||
        exam.includes(keyword)
    );

});

    filtered.forEach(q => {

        results.innerHTML += `

        <div class="question-preview">

            <h3>${q.chapter}</h3>

            <p>${q.question}</p>

           <a href="question.html?id=${q.docId}&subject=${encodeURIComponent(q.subject)}&chapter=${encodeURIComponent(q.chapter)}">
                Solve Question →
            </a>

        </div>

        `;

    });

});

load();