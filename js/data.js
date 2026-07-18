let questions = [];

async function loadQuestions() {

    if (questions.length > 0) return;

    const response = await fetch("data/questions.json");

    questions = await response.json();

}