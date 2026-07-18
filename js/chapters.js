async function loadChapters(){

    const response = await fetch("data/chapters.json");

    const data = await response.json();

    const grid = document.getElementById("chapterGrid");

    data[0].chapters.forEach(chapter=>{

        grid.innerHTML += `
        <a href="search.html?chapter=${encodeURIComponent(chapter)}"
           class="chapter-card">

            ${chapter}

        </a>
        `;

    });

}

loadChapters();