async function loadExams() {

    const response = await fetch("data/exam.json");
    const exams = await response.json();

    const grid = document.getElementById("examGrid");

    exams.forEach(exam => {

        grid.innerHTML += `
            <a href="subject.html?exam=${encodeURIComponent(exam.name)}"
               class="chapter-card"
               style="border-top:6px solid ${exam.color};">

                <h2>${exam.icon}</h2>
                <h3>${exam.name}</h3>

            </a>
        `;

    });

}

loadExams();