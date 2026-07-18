async function loadSubjects() {

    const response = await fetch("data/subjects.json");
    const subjects = await response.json();

    const grid = document.getElementById("subjectGrid");

    grid.innerHTML = "";

    subjects.forEach(subject => {

        grid.innerHTML += `
        <a href="chapter.html?subject=${encodeURIComponent(subject.name)}"
           class="chapter-card"
           style="border-top:6px solid ${subject.color};">

            <h2>${subject.icon}</h2>
            <h3>${subject.name}</h3>

        </a>
        `;

    });

}

loadSubjects();