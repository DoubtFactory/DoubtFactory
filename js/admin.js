import { uploadImage } from "./cloudinary.js";
import { getQuestions } from "./firebase.js";
import {
    auth,
    onAuthStateChanged,
    signOut
} from "./firebase.js";

onAuthStateChanged(auth, (user) => {

    if (!user) {
        window.location.href = "login.html";
    }

});
import { db } from "./firebase.js";

import {
    collection,
    addDoc,
    getDocs,
    deleteDoc,
    doc
} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

const STORAGE_KEY = "doubtFactoryAdminDraft";
const toast = document.getElementById("toast");
const formError = document.getElementById("formError");
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const statusLabel = document.getElementById("saveStatus");

function extractVideoId(url) {

    if (!url || url.trim() === "") return "";

    const match = url.match(
        /(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/
    );

    return match ? match[1] : url;

}

function showToast(message, type = "success") {
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

function setSavingState(isSaving) {
    saveButton.disabled = isSaving;
    saveButton.textContent = isSaving ? "Saving..." : "Save Question";
}

function updateStatus(message) {
    statusLabel.textContent = message;
}

async function updateDashboard() {

    const questions = await getQuestions();

    const uniqueSubjects = [...new Set(questions.map(q => q.subject).filter(Boolean))];
    const uniqueChapters = [...new Set(questions.map(q => q.chapter).filter(Boolean))];
    const uniqueExams = [...new Set(questions.map(q => q.exam).filter(Boolean))];
    const totalVideos = questions.filter(q => q.youtube && q.youtube.trim() !== "").length;

    document.getElementById("totalQuestions").textContent = questions.length;
    document.getElementById("subjectCount").textContent = uniqueSubjects.length;
    document.getElementById("chapterCount").textContent = uniqueChapters.length;
    document.getElementById("examCount").textContent = uniqueExams.length;
    document.getElementById("totalVideos").textContent = totalVideos;
    document.getElementById("commentCount").textContent = questions.length > 0 ? Math.max(1, Math.round(questions.length / 3)) : 0;

    renderRecentActivity(questions);
    renderAnalytics(questions);

}

function renderRecentActivity(questions) {
    const container = document.getElementById("recentActivity");

    if (!container) return;

    const recent = [...questions]
        .sort((a, b) => (b.id || 0) - (a.id || 0))
        .slice(0, 4);

    if (!recent.length) {
        container.innerHTML = '<div class="empty-panel">No recent activity yet.</div>';
        return;
    }

    container.innerHTML = recent.map(question => {
        const timestamp = question.year ? `${question.year}` : "Recently added";
        return `
            <div class="activity-item">
                <div>
                    <strong>${question.question ? question.question.slice(0, 70) : "Untitled question"}</strong>
                    <p>${question.subject || "Subject"} • ${question.exam || "Exam"}</p>
                </div>
                <span>${timestamp}</span>
            </div>
        `;
    }).join("");
}

function renderAnalytics(questions) {
    const subjectContainer = document.getElementById("subjectAnalytics");
    const examContainer = document.getElementById("examAnalytics");

    if (!subjectContainer || !examContainer) return;

    const subjectGroups = groupCounts(questions, "subject");
    const examGroups = groupCounts(questions, "exam");

    if (!subjectGroups.length && !examGroups.length) {
        subjectContainer.innerHTML = '<div class="empty-panel">No analytics available yet.</div>';
        examContainer.innerHTML = '<div class="empty-panel">No analytics available yet.</div>';
        return;
    }

    subjectContainer.innerHTML = subjectGroups.length
        ? subjectGroups.map(item => renderBar(item.label, item.count)).join("")
        : '<div class="empty-panel">No analytics available yet.</div>';

    examContainer.innerHTML = examGroups.length
        ? examGroups.map(item => renderBar(item.label, item.count)).join("")
        : '<div class="empty-panel">No analytics available yet.</div>';
}

function groupCounts(items, key) {
    const grouped = items.reduce((accumulator, item) => {
        const label = item[key] || "Unknown";
        accumulator[label] = (accumulator[label] || 0) + 1;
        return accumulator;
    }, {});

    return Object.entries(grouped)
        .sort((a, b) => b[1] - a[1])
        .map(([label, count]) => ({ label, count }));
}

function renderBar(label, count) {
    return `
        <div class="analytics-row">
            <div class="analytics-meta">
                <strong>${label}</strong>
                <span>${count} questions</span>
            </div>
            <div class="analytics-bar"><span style="width:${Math.max(16, count * 20)}%"></span></div>
        </div>
    `;
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

    chapterSelect.innerHTML = '<option value="">Select Chapter</option>';

    const list = chapters[subjectSelect.value];

    if (!list) return;

    list.forEach(chapter => {
        const option = document.createElement("option");
        option.value = chapter;
        option.textContent = chapter;
        chapterSelect.appendChild(option);
    });

});

function collectFormData() {

    return {

        id: Date.now(),

        subject: document.getElementById("subject").value,

        chapter: document.getElementById("chapter").value,

        exam: document.getElementById("exam").value,

        year: Number(document.getElementById("year").value),

        difficulty: document.getElementById("difficulty").value,

        type: document.getElementById("type").value,

        question: document.getElementById("question").value,

        // NEW
        questionImage: document.getElementById("questionImage").value,

        options: [
            document.getElementById("optionA").value,
            document.getElementById("optionB").value,
            document.getElementById("optionC").value,
            document.getElementById("optionD").value
        ],

        // NEW
        optionImages: {

            A: document.getElementById("optionAImage").value,

            B: document.getElementById("optionBImage").value,

            C: document.getElementById("optionCImage").value,

            D: document.getElementById("optionDImage").value

        },

        answer: Number(document.getElementById("answer").value),

        solution: document.getElementById("solution").value,

        // NEW
        solutionImage: document.getElementById("solutionImage").value,

        youtube: extractVideoId(document.getElementById("youtube").value),

        views: 0,

        likes: 0

    };

}

function validateForm() {
    const formValues = collectFormData();
    const errors = [];

    if (!formValues.subject) errors.push("Please select a subject.");
    if (!formValues.chapter) errors.push("Please select a chapter.");
    if (!formValues.exam) errors.push("Please select an exam.");
    if (!formValues.year || Number.isNaN(formValues.year)) errors.push("Please enter a valid year.");
    if (!formValues.difficulty) errors.push("Please select a difficulty.");
    if (!formValues.type) errors.push("Please select a question type.");
    if (!formValues.question.trim()) errors.push("Please enter the question text.");
    if (formValues.answer < 0 || formValues.answer > 3) errors.push("Correct option index should be between 0 and 3.");

    formError.textContent = errors.join(" ");
    return errors.length === 0;
}

function saveDraft() {
    const draft = {
        subject: document.getElementById("subject").value,
        chapter: document.getElementById("chapter").value,
        exam: document.getElementById("exam").value,
        year: document.getElementById("year").value,
        difficulty: document.getElementById("difficulty").value,
        type: document.getElementById("type").value,
        question: document.getElementById("question").value,
        optionA: document.getElementById("optionA").value,
        optionB: document.getElementById("optionB").value,
        optionC: document.getElementById("optionC").value,
        optionD: document.getElementById("optionD").value,
        answer: document.getElementById("answer").value,
        solution: document.getElementById("solution").value,
        youtube: document.getElementById("youtube").value
    };
    localStorage.setItem(STORAGE_KEY, JSON.stringify(draft));
    updateStatus("Draft saved");
}

function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const draft = JSON.parse(raw);
        document.getElementById("subject").value = draft.subject || "";
        document.getElementById("chapter").value = draft.chapter || "";
        document.getElementById("exam").value = draft.exam || "";
        document.getElementById("year").value = draft.year || "";
        document.getElementById("difficulty").value = draft.difficulty || "";
        document.getElementById("type").value = draft.type || "";
        document.getElementById("question").value = draft.question || "";
        document.getElementById("optionA").value = draft.optionA || "";
        document.getElementById("optionB").value = draft.optionB || "";
        document.getElementById("optionC").value = draft.optionC || "";
        document.getElementById("optionD").value = draft.optionD || "";
        document.getElementById("answer").value = draft.answer || "";
        document.getElementById("solution").value = draft.solution || "";
        document.getElementById("youtube").value = draft.youtube || "";
        updatePreview();
    } catch (error) {
        console.error(error);
    }
}

function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
    document.getElementById("questionForm").reset();
    chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
    formError.textContent = "";
    updatePreview();
    updateStatus("Form cleared");
}

document.getElementById("questionForm").addEventListener("submit", async function(e) {

    e.preventDefault();

    formError.textContent = "";

    if (!validateForm()) {
        showToast("Please fix the highlighted issues.", "error");
        return;
    }

    const question = collectFormData();

    setSavingState(true);
    updateStatus("Saving question...");

    try {
        await addDoc(collection(db, "questions"), question);
        localStorage.removeItem(STORAGE_KEY);
        showToast("Question saved successfully.", "success");
        updateStatus("Saved to Firebase");
        document.getElementById("questionForm").reset();
        chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
        updatePreview();
        loadQuestionsTable();
        updateDashboard();
    } catch (error) {
        console.error(error);
        showToast("Error saving question.", "error");
        updateStatus("Save failed");
    } finally {
        setSavingState(false);
    }

    document.getElementById("output").textContent = JSON.stringify(question, null, 2);

});

const fields = [
    "exam",
    "chapter",
    "difficulty",
    "question",
    "subject",
    "year",
    "type",
    "optionA",
    "optionB",
    "optionC",
    "optionD",
    "answer",
    "solution",
    "youtube"
];

fields.forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener("input", () => {
        saveDraft();
        updatePreview();
    });
    element.addEventListener("change", () => {
        saveDraft();
        updatePreview();
    });
});

function updatePreview() {

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
                    <button class="delete-btn" onclick="deleteQuestion('${documentItem.id}')">
                        Delete
                    </button>
                </td>
            </tr>
        `;
    });

}

window.deleteQuestion = async function(id) {

    const confirmed = confirm("Delete this question?");
    if (!confirmed) return;

    try {
        await deleteDoc(doc(db, "questions", id));
        showToast("Question deleted.", "success");
        loadQuestionsTable();
        updateDashboard();
    } catch (error) {
        console.error(error);
        showToast("Unable to delete question.", "error");
    }

}

clearButton.addEventListener("click", clearDraft);

loadDraft();
updateDashboard();
loadQuestionsTable();

console.log("admin.js loaded");
const logoutBtn = document.getElementById("logoutBtn");

if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        try {
            await signOut(auth);
            window.location.href = "login.html";
        } catch (err) {
            console.error(err);
            alert(err.message);
        }
    });
}
function connectUploader(buttonId, inputId) {

    const button = document.getElementById(buttonId);
    const input = document.getElementById(inputId);

    if (!button || !input) return;

    button.addEventListener("click", () => {

        uploadImage((url) => {

            input.value = url;

        });

    });

}

connectUploader("uploadQuestionImage", "questionImage");

connectUploader("uploadOptionAImage", "optionAImage");
connectUploader("uploadOptionBImage", "optionBImage");
connectUploader("uploadOptionCImage", "optionCImage");
connectUploader("uploadOptionDImage", "optionDImage");

connectUploader("uploadSolutionImage", "solutionImage");