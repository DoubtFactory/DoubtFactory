import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";
function extractVideoId(url){

    if(url.trim()==="") return "";

    const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/
    );

    return match ? match[1] : url;

}
async function updateDashboard() {

    const response = await fetch("data/questions.json");
    const questions = await response.json();

    // Total Questions
    document.getElementById("totalQuestions").textContent =
        questions.length;

    // Total Video Solutions
    const totalVideos = questions.filter(q =>
        q.youtube && q.youtube.trim() !== ""
    ).length;

    document.getElementById("totalVideos").textContent =
        totalVideos;

}
const chapters = {

    "Physical Chemistry": [

        "Some Basic Concepts of Chemistry (Mole Concept)",
        "Atomic Structure",
        "States of Matter (Gaseous State)",
        "Thermodynamics",
        "Thermochemistry",
        "Chemical Equilibrium",
        "Ionic Equilibrium",
        "Redox Reactions",
        "Electrochemistry",
        "Chemical Kinetics",
        "Solutions",
        "Surface Chemistry",
        "Solid State"

    ],

    "Organic Chemistry": [

        "General Organic Chemistry (GOC)",
        "Nomenclature",
        "Isomerism",
        "Hydrocarbons",
        "Haloalkanes and Haloarenes",
        "Alcohols, Phenols and Ethers",
        "Aldehydes and Ketones",
        "Carboxylic Acids and Derivatives",
        "Amines",
        "Biomolecules",
        "Polymers",
        "Chemistry in Everyday Life",
        "Practical Organic Chemistry"

    ],

    "Inorganic Chemistry": [

        "Periodic Table",
        "Chemical Bonding",
        "Hydrogen",
        "s-Block Elements",
        "p-Block Elements",
        "d-Block Elements",
        "f-Block Elements",
        "Coordination Compounds",
        "Metallurgy",
        "Qualitative Analysis",
        "Environmental Chemistry"

    ]

};
const subjectSelect = document.getElementById("subject");
const chapterSelect = document.getElementById("chapter");

subjectSelect.addEventListener("change", () => {

    chapterSelect.innerHTML =
        '<option value="">Select Chapter</option>';

    const list = chapters[subjectSelect.value];

    if (!list) return;

    list.forEach(chapter => {

        const option = document.createElement("option");

        option.value = chapter;
        option.textContent = chapter;

        chapterSelect.appendChild(option);

    });

});
document.getElementById("questionForm").addEventListener("submit", async function(e){

    e.preventDefault();

    const question = {

        id: Date.now(),

        subject: document.getElementById("subject").value,

        chapter: document.getElementById("chapter").value,

        exam: document.getElementById("exam").value,

        year: Number(document.getElementById("year").value),

        difficulty: document.getElementById("difficulty").value,

        type: document.getElementById("type").value,

        question: document.getElementById("question").value,

        options: [

            document.getElementById("optionA").value,

            document.getElementById("optionB").value,

            document.getElementById("optionC").value,

            document.getElementById("optionD").value

        ],

        answer: Number(document.getElementById("answer").value),

        solution: document.getElementById("solution").value,

        youtube: extractVideoId(
    document.getElementById("youtube").value
),

        views: 0,

        likes: 0

    };
try {

    await addDoc(collection(db, "questions"), question);

    alert("✅ Question saved to Firebase successfully!");

} catch (error) {

    console.error(error);

    alert("❌ Error saving question.");

}

    document.getElementById("output").textContent =
        JSON.stringify(question, null, 2);

});
const fields = [
    "exam",
    "chapter",
    "difficulty",
    "question"
];

fields.forEach(id => {

    document.getElementById(id).addEventListener("input", updatePreview);
    document.getElementById(id).addEventListener("change", updatePreview);

});

function updatePreview(){

    document.getElementById("previewExam").textContent =
        document.getElementById("exam").value || "Exam";

    document.getElementById("previewChapter").textContent =
        document.getElementById("chapter").value || "Chapter";

    const difficulty =
        document.getElementById("difficulty").value || "Difficulty";

    const tag = document.getElementById("previewDifficulty");

    tag.textContent = difficulty;

    tag.className = "difficulty " + difficulty.toLowerCase();

    document.getElementById("previewQuestion").textContent =
        document.getElementById("question").value ||
        "Your question will appear here...";
}
updateDashboard();
async function loadQuestionsTable() {

    const snapshot = await getDocs(collection(db, "questions"));

    const tbody = document.getElementById("questionsTableBody");

    tbody.innerHTML = "";

    snapshot.forEach(documentItem => {

        const q = documentItem.data();

        tbody.innerHTML += `
            <tr>
                <td>${q.exam || ""}</td>
                <td>${q.chapter || ""}</td>
                <td>${q.year || ""}</td>
                <td>
                    <button onclick="deleteQuestion('${documentItem.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;

    });

}

window.deleteQuestion = async function(id) {

    if (!confirm("Delete this question?")) return;

    await deleteDoc(doc(db, "questions", id));

    alert("Question deleted.");

    loadQuestionsTable();

}

loadQuestionsTable();