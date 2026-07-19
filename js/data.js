let questions = [];

async function loadQuestions() {

    if (questions.length > 0) return;

    import { getQuestions } from "./firebase.js";

const questions = await getQuestions();

    questions = await response.json();

}