let allQuestions = [];

async function loadTable() {

    const response = await fetch("data/questions.json");

    allQuestions = await response.json();

    renderTable(allQuestions);

}

function renderTable(data) {

    const body = document.getElementById("questionTableBody");

    body.innerHTML = "";

    data.forEach(q => {

        body.innerHTML += `

<tr>

<td>${q.id}</td>

<td>${q.exam}</td>

<td>${q.chapter}</td>

<td>${q.year}</td>

<td>${q.difficulty}</td>

<td>${q.question}</td>

<td>

<button
class="delete-btn"
onclick="deleteQuestion(${q.id})">

Delete

</button>

</td>

</tr>

`;

    });

}

document.getElementById("searchBox")
.addEventListener("input", function(){

    const keyword = this.value.toLowerCase();

    const filtered = allQuestions.filter(q =>

        q.question.toLowerCase().includes(keyword) ||

        q.chapter.toLowerCase().includes(keyword) ||

        q.exam.toLowerCase().includes(keyword)

    );

    renderTable(filtered);

});

loadTable();
function deleteQuestion(id){

    const confirmDelete =
        confirm("Delete this question from the table?");

    if(!confirmDelete) return;

    allQuestions =
        allQuestions.filter(q => q.id !== id);

    renderTable(allQuestions);

}