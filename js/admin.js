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
    doc,
    getDoc,
    updateDoc

} from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

/* ===========================================
   UI & TAB NAVIGATION
=========================================== */
document.addEventListener("DOMContentLoaded", () => {
    const menuItems = document.querySelectorAll(".menu-item[data-target]");
    const navTriggers = document.querySelectorAll(".nav-trigger");
    const sections = document.querySelectorAll(".view-section");
    
    function switchTab(targetId) {
        sections.forEach(sec => {
            sec.style.display = sec.id === targetId ? "block" : "none";
        });
        menuItems.forEach(item => {
            if (item.dataset.target === targetId) item.classList.add("active");
            else item.classList.remove("active");
        });
    }

    menuItems.forEach(item => item.addEventListener("click", (e) => { e.preventDefault(); switchTab(item.dataset.target); }));
    navTriggers.forEach(trigger => trigger.addEventListener("click", (e) => { e.preventDefault(); switchTab(trigger.dataset.target); }));

    // Clock
    setInterval(() => {
        const now = new Date();
        const dateText = document.getElementById('dateText');
        const timeText = document.getElementById('timeText');
        if (dateText) dateText.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
        if (timeText) timeText.textContent = now.toLocaleTimeString('en-GB');
    }, 1000);
});
const STORAGE_KEY = "doubtFactoryAdminDraft";

const toast = document.getElementById("toast");
const formError = document.getElementById("formError");

const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");

const statusLabel = document.getElementById("saveStatus");

const subjectSelect = document.getElementById("subject");
const chapterSelect = document.getElementById("chapter");

const questionForm = document.getElementById("questionForm");

const output = document.getElementById("output");

/* ===========================================
   CUSTOM CHEMISTRY EDITOR ENGINE
=========================================== */
class EditorHistory {
    constructor() { this.undoStack = []; this.redoStack = []; }
    save(state) {
        if (this.undoStack.length > 0 && this.undoStack[this.undoStack.length - 1] === state) return;
        this.undoStack.push(state);
        this.redoStack = [];
    }
    undo(currentState) {
        if (this.undoStack.length === 0) return currentState;
        this.redoStack.push(currentState);
        return this.undoStack.pop();
    }
    redo(currentState) {
        if (this.redoStack.length === 0) return currentState;
        this.undoStack.push(currentState);
        return this.redoStack.pop();
    }
}

const editorHistories = {};

const toolbarConfig = [
    { name: "Format", items: [
        { label: "B", action: "wrap", args: ["<b>", "</b>"] },
        { label: "I", action: "wrap", args: ["<i>", "</i>"] },
        { label: "U", action: "wrap", args: ["<u>", "</u>"] },
        { label: "X₂", action: "wrap", args: ["<sub>", "</sub>"] },
        { label: "X²", action: "wrap", args: ["<sup>", "</sup>"] },
        { label: "Undo", action: "undo" },
        { label: "Redo", action: "redo" }
    ]},
    { name: "Arrows", items: ["→", "←", "⇌", "⇋", "↑", "↓"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Charges", items: ["+", "−", "²⁺", "³⁺", "⁻", "²⁻", "³⁻", "δ+", "δ−"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Sub/Sup", items: ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉", "⁰", "¹", "²", "³", "⁴", "⁵"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Greek", items: ["α", "β", "γ", "δ", "ε", "λ", "μ", "π", "σ", "θ", "ω", "Ω"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Symbols", items: ["Δ", "∇", "√", "∞", "≈", "≠", "≤", "≥", "±", "×", "÷", "∝", "∴", "∵", "°"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Organic", items: ["CH₃", "CH₂", "COOH", "CHO", "NH₂", "NO₂", "CN", "OR", "Ph", "Ar", "Me", "Et", "Bu", "Pr"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Ions", items: ["H⁺", "OH⁻", "NH₄⁺", "SO₄²⁻", "NO₃⁻", "CO₃²⁻", "PO₄³⁻", "Cl⁻", "Br⁻", "I⁻", "MnO₄⁻", "Cr₂O₇²⁻"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Metals", items: ["Na⁺", "K⁺", "Mg²⁺", "Ca²⁺", "Al³⁺", "Fe²⁺", "Fe³⁺", "Cu²⁺", "Ag⁺", "Zn²⁺", "Pb²⁺"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Thermo/Kinetics", items: ["ΔH", "ΔS", "ΔG", "Ea", "Kc", "Kp", "Ka", "Kb", "Kw", "pH", "pOH"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Lab", items: ["heat", "catalyst", "pressure", "aq", "l", "g", "s", "conc.", "dil."].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Templates", items: [
        { label: "Match Column", action: "insert", args: ["<table border=\"1\" style=\"width:100%;text-align:center;\">\n<tbody>\n<tr><td>(A) </td><td>(p) </td></tr>\n<tr><td>(B) </td><td>(q) </td></tr>\n<tr><td>(C) </td><td>(r) </td></tr>\n<tr><td>(D) </td><td>(s) </td></tr>\n</tbody>\n</table>"] },
        { label: "Assertion/Reason", action: "insert", args: ["<div><b>Assertion (A):</b> </div>\n<div><b>Reason (R):</b> </div>"] }
    ]}
];

function buildToolbar(textarea) {
    editorHistories[textarea.id] = new EditorHistory();
    const toolbar = document.createElement("div");
    toolbar.className = "custom-editor-toolbar";

    toolbarConfig.forEach(group => {
        const groupDiv = document.createElement("div");
        groupDiv.className = "toolbar-group";
        
        const groupLabel = document.createElement("span");
        groupLabel.className = "group-label";
        groupLabel.textContent = group.name;
        groupDiv.appendChild(groupLabel);

        group.items.forEach(item => {
            const btn = document.createElement("button");
            btn.type = "button";
            btn.className = "toolbar-btn";
            btn.textContent = item.label;
            
            btn.addEventListener("click", (e) => {
                e.preventDefault();
                textarea.focus();
                
                const history = editorHistories[textarea.id];
                const start = textarea.selectionStart;
                const end = textarea.selectionEnd;
                const text = textarea.value;
                
                if (item.action !== "undo" && item.action !== "redo") history.save(text);

                let newCursorPos = start;
                if (item.action === "insert") {
                    const insertStr = item.args[0];
                    textarea.value = text.substring(0, start) + insertStr + text.substring(end);
                    newCursorPos = start + insertStr.length;
                } else if (item.action === "wrap") {
                    textarea.value = text.substring(0, start) + item.args[0] + text.substring(start, end) + item.args[1] + text.substring(end);
                    newCursorPos = start + item.args[0].length + (end - start);
                } else if (item.action === "undo") {
                    textarea.value = history.undo(text);
                } else if (item.action === "redo") {
                    textarea.value = history.redo(text);
                }
                
                if (item.action !== "undo" && item.action !== "redo") {
                    textarea.setSelectionRange(newCursorPos, newCursorPos);
                }
                textarea.dispatchEvent(new Event('input'));
            });
            groupDiv.appendChild(btn);
        });
        toolbar.appendChild(groupDiv);
    });

    textarea.parentNode.insertBefore(toolbar, textarea);

    textarea.addEventListener("input", () => {
        clearTimeout(textarea.historyTimeout);
        textarea.historyTimeout = setTimeout(() => {
            editorHistories[textarea.id].save(textarea.value);
        }, 500);
    });
}

// Initialize all textareas after DOM is ready
document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".chem-editor").forEach(textarea => buildToolbar(textarea));
});

/* ===========================================
   EDIT MODE
=========================================== */

let editingDocId = null;

let isEditing = false;

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

    if (isSaving) {

        saveButton.textContent =
            isEditing
                ? "Updating..."
                : "Saving...";

    } else {

        saveButton.textContent =
            isEditing
                ? "Update Question"
                : "Save Question";

    }

}

function updateStatus(message) {

    const statusLabel = document.getElementById("status");

    if (statusLabel) {
        statusLabel.textContent = message;
    }

}

async function updateDashboard() {
    const questions = await getQuestions();
    
    // Update Stats Cards
    const totalQuestions = document.getElementById("totalQuestions");
    if (totalQuestions) totalQuestions.textContent = questions.length;

    const publishedQuestions = document.getElementById("publishedQuestions");
    if (publishedQuestions) publishedQuestions.textContent = questions.length;
    
    const draftsCount = document.getElementById("draftQuestions");
    if (draftsCount) {
        const localDraft = localStorage.getItem("doubtFactoryAdminDraft");
        draftsCount.textContent = localDraft ? "1" : "0";
    }
    
    const totalViewsEl = document.getElementById("totalViews");
    if (totalViewsEl) {
        const totalViews = questions.reduce((sum, q) => sum + (q.views || 0), 0);
        totalViewsEl.textContent = totalViews;
    }

    renderRecentActivity(questions);
    renderQuestionTypePieChart(questions);
}

function renderRecentActivity(questions) {
    const container = document.getElementById("recentActivityList");
    if (!container) return;

    const recent = [...questions].reverse().slice(0, 5);

    if (!recent.length) {
        container.innerHTML = '<div style="padding: 16px; color:#64748b;">No recent activity yet.</div>';
        return;
    }

    container.innerHTML = recent.map(question => {
        const qText = question.question ? question.question.replace(/<[^>]*>?/gm, '').slice(0, 60) : "Untitled question";
        return `
            <div class="activity-item">
                <div class="activity-left">
                    <div class="act-text">
                        <strong>${qText}...</strong>
                        <p>${question.subject || "Subject"} • ${question.exam || "Exam"}</p>
                    </div>
                </div>
                <div class="activity-right" style="text-align: right;">
                    <span class="act-badge published">Published</span>
                </div>
            </div>
        `;
    }).join("");
}

function renderQuestionTypePieChart(questions) {
    const chartElement = document.getElementById('typePieChart');
    const legendElement = document.getElementById('typeLegend');
    if(!chartElement || !legendElement) return;

    const types = {
        "Single Correct": { count: 0, color: "#1a56db" },
        "Multiple Correct": { count: 0, color: "#10b981" },
        "Integer Type": { count: 0, color: "#f59e0b" },
        "Match the Column": { count: 0, color: "#8b5cf6" },
        "Assertion Reason": { count: 0, color: "#0ea5e9" }
    };

    let total = 0;
    questions.forEach(q => {
        if(q.type && types[q.type] !== undefined) {
            types[q.type].count++;
            total++;
        }
    });

    if(total === 0) {
        chartElement.style.background = "#e2e8f0";
        legendElement.innerHTML = "<p>No data</p>";
        return;
    }

    let gradientString = [];
    let currentPercentage = 0;
    let legendHTML = "";

    Object.entries(types).forEach(([name, data]) => {
        if(data.count > 0) {
            const percentage = (data.count / total) * 100;
            gradientString.push(`${data.color} ${currentPercentage}% ${currentPercentage + percentage}%`);
            currentPercentage += percentage;
            
            legendHTML += `
                <div class="legend-item">
                    <div style="display:flex; align-items:center;">
                        <div class="legend-color" style="background: ${data.color}"></div>
                        <span>${name}</span>
                    </div>
                    <span class="legend-value">${data.count} (${percentage.toFixed(0)}%)</span>
                </div>
            `;
        }
    });

    chartElement.style.background = `conic-gradient(${gradientString.join(', ')})`;
    legendElement.innerHTML = legendHTML;
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

        // Question
        question: document.getElementById("question").value,

        questionImage: document.getElementById("questionImage").value,

        // Options
        options: [

            document.getElementById("optionA").value,

            document.getElementById("optionB").value,

            document.getElementById("optionC").value,

            document.getElementById("optionD").value

        ],

        optionImages: {

            A: document.getElementById("optionAImage").value,

            B: document.getElementById("optionBImage").value,

            C: document.getElementById("optionCImage").value,

            D: document.getElementById("optionDImage").value

        },

        answer: Number(document.getElementById("answer").value),

        // Solution
        solution: document.getElementById("solution").value,

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
    document.getElementById("question").value = "";
    document.getElementById("optionA").value = "";
    document.getElementById("optionB").value = "";
    document.getElementById("optionC").value = "";
    document.getElementById("optionD").value = "";
    document.getElementById("solution").value = "";

    chapterSelect.innerHTML =
        '<option value="">Select Chapter</option>';

    formError.textContent = "";

    editingDocId = null;

    isEditing = false;

    saveButton.textContent = "Save Question";

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
        if (isEditing && editingDocId) {

    await updateDoc(
        doc(db, "questions", editingDocId),
        question
    );

    showToast("Question updated successfully.", "success");

    updateStatus("Question updated");

} else {

    await addDoc(
        collection(db, "questions"),
        question
    );

    showToast("Question saved successfully.", "success");

    updateStatus("Saved to Firebase");

}

localStorage.removeItem(STORAGE_KEY);

document.getElementById("questionForm").reset();
document.getElementById("question").value = "";
document.getElementById("optionA").value = "";
document.getElementById("optionB").value = "";
document.getElementById("optionC").value = "";
document.getElementById("optionD").value = "";
document.getElementById("solution").value = "";

chapterSelect.innerHTML =
    '<option value="">Select Chapter</option>';

editingDocId = null;

isEditing = false;

saveButton.textContent = "Save Question";

try {
    updatePreview();
} catch(e) {
    console.error("updatePreview()", e);
}

try {
    await loadQuestionsTable();
} catch(e) {
    console.error("loadQuestionsTable()", e);
}

try {
    await updateDashboard();
} catch(e) {
    console.error("updateDashboard()", e);
}
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
    // Live Preview removed
    return;
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

    <button
        class="edit-btn"
        onclick="editQuestion('${documentItem.id}')">
        Edit
    </button>

    <button
        class="delete-btn"
        onclick="deleteQuestion('${documentItem.id}')">
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
window.editQuestion = async function(id) {

    try {

        const docRef = doc(db, "questions", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Question not found.");
            return;
        }

        const q = docSnap.data();

        editingDocId = id;
        isEditing = true;

        saveButton.textContent = "Update Question";

        const subject = document.getElementById("subject");
        subject.value = q.subject || "";

        subject.dispatchEvent(new Event("change"));

        setTimeout(() => {
            chapterSelect.value = q.chapter || "";
        }, 300);

        document.getElementById("exam").value = q.exam || "";
        document.getElementById("year").value = q.year || "";
        document.getElementById("difficulty").value = q.difficulty || "";
        document.getElementById("type").value = q.type || "";

        // ==========================
        // TEXTAREA EDITORS
        // ==========================

        document.getElementById("question").value = q.question || "";

        document.getElementById("optionA").value = q.options?.[0] || "";
        document.getElementById("optionB").value = q.options?.[1] || "";
        document.getElementById("optionC").value = q.options?.[2] || "";
        document.getElementById("optionD").value = q.options?.[3] || "";

        document.getElementById("solution").value = q.solution || "";

        // ==========================

        document.getElementById("questionImage").value =
            q.questionImage || "";

        document.getElementById("optionAImage").value =
            q.optionImages?.A || "";

        document.getElementById("optionBImage").value =
            q.optionImages?.B || "";

        document.getElementById("optionCImage").value =
            q.optionImages?.C || "";

        document.getElementById("optionDImage").value =
            q.optionImages?.D || "";

        document.getElementById("answer").value = q.answer;

        document.getElementById("solutionImage").value =
            q.solutionImage || "";

        document.getElementById("youtube").value =
            q.youtube || "";

        window.scrollTo({
            top: 0,
            behavior: "smooth"
        });

    } catch(err){

        console.error(err);
        alert(err.message);

    }

};