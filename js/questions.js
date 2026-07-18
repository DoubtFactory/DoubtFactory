import { getQuestions } from "./firebase.js";
let allQuestions = [];

async function loadQuestions() {

    const params = new URLSearchParams(window.location.search);

    const subject = params.get("subject");
    const chapter = params.get("chapter");

    document.getElementById("chapterTitle").textContent = chapter;

    allQuestions = await getQuestions();

    // Only questions from this subject & chapter
    allQuestions = allQuestions.filter(q =>
        q.subject === subject &&
        q.chapter === chapter
    );

    populateYearFilter();

    renderQuestions();
}

function populateYearFilter() {

    const yearFilter = document.getElementById("yearFilter");

    const years = [...new Set(allQuestions.map(q => q.year))]
        .sort((a,b)=>b-a);

    years.forEach(year => {

        yearFilter.innerHTML +=
            `<option value="${year}">${year}</option>`;

    });

}

function renderQuestions() {

    const exam = document.getElementById("examFilter").value;
    const year = document.getElementById("yearFilter").value;
    const difficulty = document.getElementById("difficultyFilter").value;
const keyword = document
    .getElementById("searchQuestion")
    .value
    .toLowerCase()
    .trim();

    let questions = allQuestions;

    if(exam !== "All"){

        questions = questions.filter(q=>q.exam===exam);

    }

    if(year !== "All"){

        questions = questions.filter(q=>String(q.year)===year);

    }

    if(difficulty !== "All"){

        questions = questions.filter(q=>q.difficulty===difficulty);

    }
if (keyword !== "") {

    questions = questions.filter(q =>
        q.question.toLowerCase().includes(keyword)
    );

}

    const list = document.getElementById("questionList");

    list.innerHTML = "";

    if(questions.length===0){

        list.innerHTML = `
        <h3>No questions found.</h3>
        `;

        return;

    }

   questions.forEach((q,index)=>{

    list.innerHTML += `

    <div class="question-preview">

        <div class="question-header">

            <span class="exam-tag">
                ${q.exam}
            </span>

            <span class="chapter-tag">
                ${q.chapter}
            </span>

            <span class="${q.difficulty.toLowerCase()} difficulty">
                ${q.difficulty}
            </span>

        </div>

        <h3>
            Question ${index+1}
        </h3>

        <p>

            ${q.question}

        </p>

        <div class="question-meta">

            <span>📅 ${q.year}</span>

            <span>👁 ${q.views}</span>

            <span>👍 ${q.likes}</span>

        </div>

        <a href="question.html?id=${q.docId}&subject=${encodeURIComponent(q.subject)}&chapter=${encodeURIComponent(q.chapter)}"
           class="primary-btn">

           Solve Question →

        </a>

    </div>

    `;

});

}

document.getElementById("examFilter")
.addEventListener("change",renderQuestions);

document.getElementById("yearFilter")
.addEventListener("change",renderQuestions);

document.getElementById("difficultyFilter")
.addEventListener("change",renderQuestions);

document.getElementById("searchQuestion")
.addEventListener("input", renderQuestions);

loadQuestions();