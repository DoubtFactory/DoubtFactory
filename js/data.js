import { getQuestions } from "./firebase.js";

let questions = [];

export async function loadQuestions() {
    if (questions.length > 0) return questions;

    try {
        questions = await getQuestions();
        return questions;
    } catch (error) {
        console.error("Error loading questions from database:", error);
        return [];
    }
}
