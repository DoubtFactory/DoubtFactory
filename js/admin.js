import { uploadImage } from "./cloudinary.js";
import { getQuestions, auth, onAuthStateChanged, signOut, db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
    }
});

/* ===========================================
   UI & TAB NAVIGATION (BULLETPROOF)
=========================================== */
window.switchTab = function(targetId) {
    // Hide all sections
    document.querySelectorAll('.view-section').forEach(sec => {
        sec.style.display = 'none';
    });
    
    // Show target section
    const targetSection = document.getElementById(targetId);
    if (targetSection) {
        targetSection.style.display = 'block';
    }

    // Update sidebar highlights
    document.querySelectorAll('.menu-item').forEach(item => {
        item.classList.remove('active');
        if (item.getAttribute('data-target') === targetId) {
            item.classList.add('active');
        }
    });
};

document.addEventListener('click', function(e) {
    const trigger = e.target.closest('[data-target]');
    if (trigger) {
        e.preventDefault(); 
        const targetId = trigger.getAttribute('data-target');
        window.switchTab(targetId);
        window.scrollTo({ top: 0, behavior: 'smooth' }); 
        
        // Close mobile menu if it is open
        const appSidebar = document.getElementById("appSidebar");
        if(appSidebar && appSidebar.classList.contains("open")) {
            appSidebar.classList.remove("open");
        }
    }
});

// Live Clock
setInterval(() => {
    const now = new Date();
    const dateText = document.getElementById('dateText');
    const timeText = document.getElementById('timeText');
    if (dateText) dateText.textContent = now.toLocaleDateString('en-GB', { weekday: 'long', day: 'numeric', month: 'short', year: 'numeric' });
    if (timeText) timeText.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
}, 1000);

// Mobile Sidebar Toggle
const menuToggle = document.getElementById("menuToggle");
const appSidebar = document.getElementById("appSidebar");
if(menuToggle && appSidebar) {
    menuToggle.addEventListener("click", () => {
        appSidebar.classList.toggle("open");
    });
}

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

// PERFECTLY LEAN TOOLBAR: Only the exact requested symbols
const toolbarConfig = [
    { name: "Sub (Neutral)", items: ["₀", "₁", "₂", "₃", "₄", "₅", "₆", "₇", "₈", "₉"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Sub (+)", items: ["₊", "⁰₊", "₁₊", "₂₊", "₃₊", "₄₊", "₅₊", "₆₊", "₇₊", "₈₊", "₉₊"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Sub (-)", items: ["₋", "⁰₋", "₁₋", "₂₋", "₃₋", "₄₋", "₅₋", "₆₋", "₇₋", "₈₋", "₉₋"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Sup (Neutral)", items: ["⁰", "¹", "²", "³", "⁴", "⁵", "⁶", "⁷", "⁸", "⁹"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Sup (+)", items: ["⁺", "⁰⁺", "¹⁺", "²⁺", "³⁺", "⁴⁺", "⁵⁺", "⁶⁺", "⁷⁺", "⁸⁺", "⁹⁺"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Sup (-)", items: ["⁻", "⁰⁻", "¹⁻", "²⁻", "³⁻", "⁴⁻", "⁵⁻", "⁶⁻", "⁷⁻", "⁸⁻", "⁹⁻"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Arrows & Misc", items: ["→", "←", "⇌", "⇋", "°", "↑", "↓", "δ+", "δ−"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Greek", items: ["α", "β", "γ", "δ", "ε", "λ", "μ", "π", "σ", "θ", "ω", "Ω"].map(s => ({ label: s, action: "insert", args: [s] })) },
    { name: "Math", items: ["Δ", "∇", "√", "∞", "≈", "≠", "≤", "≥", "±", "×", "÷", "∝", "∴", "∵"].map(s => ({ label: s, action: "insert", args: [s] })) }
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
                const beforeText = text.substring(0, start);
                const selectedText = text.substring(start, end);
                const afterText = text.substring(end);
                
                if (item.action !== "undo" && item.action !== "redo") history.save(text);

                let newCursorPos = start;
                if (item.action === "insert") {
                    const insertStr = item.args[0];
                    textarea.value = beforeText + insertStr + afterText;
                    newCursorPos = start + insertStr.length;
                } else if (item.action === "wrap") {
                    const prefix = item.args[0];
                    const suffix = item.args[1];
                    textarea.value = beforeText + prefix + selectedText + suffix + afterText;
                    newCursorPos = start + prefix.length + selectedText.length;
                } else if (item.action === "clear") {
                    const cleanText = selectedText.replace(/<[^>]*>?/gm, '');
                    textarea.value = beforeText + cleanText + afterText;
                    newCursorPos = start + cleanText.length;
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

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".chem-editor").forEach(textarea => buildToolbar(textarea));
});

/* ===========================================
   FIREBASE LOGIC & DASHBOARD
=========================================== */

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

let editingDocId = null;
let isEditing = false;

function extractVideoId(url) {
    if (!url || url.trim() === "") return "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/);
    return match ? match[1] : url;
}

function showToast(message, type = "success") {
    if(!toast) return;
    toast.textContent = message;
    toast.className = `toast show ${type}`;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
        toast.className = "toast";
    }, 2800);
}

function setSavingState(isSaving) {
    if(saveButton) {
        saveButton.disabled = isSaving;
        saveButton.textContent = isSaving ? (isEditing ? "Updating..." : "Saving...") : (isEditing ? "Update Question" : "Save Question");
    }
}

function updateStatus(message) {
    if (statusLabel) statusLabel.textContent = message;
}

async function updateDashboard() {
    try {
        const questions = await getQuestions();
        
        const totalQuestions = document.getElementById("totalQuestions");
        if (totalQuestions) totalQuestions.textContent = questions.length;

        const publishedQuestions = document.getElementById("publishedQuestions");
        if (publishedQuestions) publishedQuestions.textContent = questions.length;
        
        const draftsCount = document.getElementById("draftQuestions");
        if (draftsCount) {
            const localDraft = localStorage.getItem(STORAGE_KEY);
            draftsCount.textContent = localDraft ? "1" : "0";
        }

        renderRecentActivity(questions);
        renderQuestionTypePieChart(questions);
	renderExamStats(questions);
    } catch (e) {
        console.error("Error updating dashboard:", e);
    }
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
                    <div class="act-icon"><svg viewBox="0 0 24 24" width="18" height="18" stroke="currentColor" stroke-width="2" fill="none"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg></div>
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
function renderExamStats(questions) {
    const container = document.getElementById("examStatsList");
    if (!container) return;

    // Set up our counters
    const counts = { "NEET": 0, "JEE Main": 0, "JEE Advanced": 0 };
    let maxCount = 0;

    // Tally up the questions
    questions.forEach(q => {
        if (q.exam && counts[q.exam] !== undefined) {
            counts[q.exam]++;
        } else if (q.exam) {
            counts[q.exam] = 1; 
        }
    });

    // Find the highest count to scale the progress bars properly
    Object.values(counts).forEach(count => {
        if (count > maxCount) maxCount = count;
    });

    if (questions.length === 0) {
        container.innerHTML = '<div style="color:#64748b; font-size: 13px;">No data available.</div>';
        return;
    }

    // Build the visual progress bars
    let html = "";
    Object.entries(counts).forEach(([exam, count]) => {
        // Ensure even empty bars have a tiny sliver of width so they look nice
        const percentage = maxCount === 0 ? 0 : Math.max(3, (count / maxCount) * 100);
        
        html += `
            <div style="margin-bottom: 16px;">
                <div style="display: flex; justify-content: space-between; font-size: 13px; margin-bottom: 6px;">
                    <strong style="color: #0f172a;">${exam}</strong>
                    <span style="color: #64748b; font-weight: 600;">${count}</span>
                </div>
                <div style="width: 100%; height: 8px; background: #e2e8f0; border-radius: 999px; overflow: hidden;">
                    <span style="display: block; height: 100%; width: ${percentage}%; background: linear-gradient(90deg, #10b981 0%, #34d399 100%); border-radius: 999px;"></span>
                </div>
            </div>
        `;
    });

    container.innerHTML = html;
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

if(subjectSelect) {
    subjectSelect.addEventListener("change", () => {
        if(chapterSelect) {
            chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
            const list = chapters[subjectSelect.value];
            if (!list) return;
            list.forEach(chapter => {
                const option = document.createElement("option");
                option.value = chapter;
                option.textContent = chapter;
                chapterSelect.appendChild(option);
            });
        }
    });
}

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
        questionImage: document.getElementById("questionImage").value,
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

    if(formError) formError.textContent = errors.join(" ");
    return errors.length === 0;
}

function saveDraft() {
    if(!document.getElementById("subject")) return;
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
    updateDashboard(); 
}

function loadDraft() {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return;
    try {
        const draft = JSON.parse(raw);
        if(document.getElementById("subject")) {
            document.getElementById("subject").value = draft.subject || "";
            subjectSelect.dispatchEvent(new Event("change"));
            setTimeout(() => { if(chapterSelect) chapterSelect.value = draft.chapter || ""; }, 100);
            if(document.getElementById("exam")) document.getElementById("exam").value = draft.exam || "";
            if(document.getElementById("year")) document.getElementById("year").value = draft.year || "";
            if(document.getElementById("difficulty")) document.getElementById("difficulty").value = draft.difficulty || "";
            if(document.getElementById("type")) document.getElementById("type").value = draft.type || "";
            if(document.getElementById("question")) document.getElementById("question").value = draft.question || "";
            if(document.getElementById("optionA")) document.getElementById("optionA").value = draft.optionA || "";
            if(document.getElementById("optionB")) document.getElementById("optionB").value = draft.optionB || "";
            if(document.getElementById("optionC")) document.getElementById("optionC").value = draft.optionC || "";
            if(document.getElementById("optionD")) document.getElementById("optionD").value = draft.optionD || "";
            if(document.getElementById("answer")) document.getElementById("answer").value = draft.answer || "";
            if(document.getElementById("solution")) document.getElementById("solution").value = draft.solution || "";
            if(document.getElementById("youtube")) document.getElementById("youtube").value = draft.youtube || "";
        }
    } catch (error) {
        console.error(error);
    }
}

function clearDraft() {
    localStorage.removeItem(STORAGE_KEY);
    if(questionForm) {
        questionForm.reset();
        if(document.getElementById("question")) document.getElementById("question").value = "";
        if(document.getElementById("optionA")) document.getElementById("optionA").value = "";
        if(document.getElementById("optionB")) document.getElementById("optionB").value = "";
        if(document.getElementById("optionC")) document.getElementById("optionC").value = "";
        if(document.getElementById("optionD")) document.getElementById("optionD").value = "";
        if(document.getElementById("solution")) document.getElementById("solution").value = "";
        if(chapterSelect) chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
        if(formError) formError.textContent = "";
    }
    editingDocId = null;
    isEditing = false;
    if(saveButton) saveButton.textContent = "Save Question";
    updateStatus("Form cleared");
    updateDashboard();
}

if(questionForm) {
    questionForm.addEventListener("submit", async function(e) {
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
                await updateDoc(doc(db, "questions", editingDocId), question);
                showToast("Question updated successfully.", "success");
                updateStatus("Question updated");
            } else {
                await addDoc(collection(db, "questions"), question);
                showToast("Question saved successfully.", "success");
                updateStatus("Saved to Firebase");
            }

            clearDraft();

            try { await loadQuestionsTable(); } catch(e) { console.error("loadQuestionsTable()", e); }
            try { await updateDashboard(); } catch(e) { console.error("updateDashboard()", e); }
        } catch (error) {
            console.error(error);
            showToast("Error saving question.", "error");
            updateStatus("Save failed");
        } finally {
            setSavingState(false);
        }
        if(output) output.textContent = JSON.stringify(question, null, 2);
    });
}

const fields = [
    "exam", "chapter", "difficulty", "question", "subject", "year", "type",
    "optionA", "optionB", "optionC", "optionD", "answer", "solution", "youtube"
];

fields.forEach(id => {
    const element = document.getElementById(id);
    if (!element) return;
    element.addEventListener("input", saveDraft);
    element.addEventListener("change", saveDraft);
});

async function loadQuestionsTable() {
    try {
        const snapshot = await getDocs(collection(db, "questions"));
        const tbody = document.getElementById("questionsTableBody");
        if(!tbody) return;
        tbody.innerHTML = "";

        snapshot.forEach(documentItem => {
            const q = documentItem.data();
            tbody.innerHTML += `
                <tr>
                    <td>${q.exam || ""}</td>
                    <td>${q.chapter || ""}</td>
                    <td>${q.year || ""}</td>
                    <td>
                        <button class="edit-btn" onclick="editQuestion('${documentItem.id}')">Edit</button>
                        <button class="delete-btn" onclick="deleteQuestion('${documentItem.id}')">Delete</button>
                    </td>
                </tr>
            `;
        });
    } catch(err) {
        console.error("Failed to load table", err);
    }
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

if(clearButton) clearButton.addEventListener("click", clearDraft);

// Initialize data
loadDraft();
updateDashboard();
loadQuestionsTable();

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
        if (window.switchTab) {
            window.switchTab("formSection");
        }

        const docRef = doc(db, "questions", id);
        const docSnap = await getDoc(docRef);

        if (!docSnap.exists()) {
            alert("Question not found.");
            return;
        }

        const q = docSnap.data();
        editingDocId = id;
        isEditing = true;
        if(saveButton) saveButton.textContent = "Update Question";

        const subject = document.getElementById("subject");
        if(subject) {
            subject.value = q.subject || "";
            subject.dispatchEvent(new Event("change"));

            setTimeout(() => {
                if(chapterSelect) chapterSelect.value = q.chapter || "";
            }, 300);
        }

        if(document.getElementById("exam")) document.getElementById("exam").value = q.exam || "";
        if(document.getElementById("year")) document.getElementById("year").value = q.year || "";
        if(document.getElementById("difficulty")) document.getElementById("difficulty").value = q.difficulty || "";
        if(document.getElementById("type")) document.getElementById("type").value = q.type || "";

        if(document.getElementById("question")) document.getElementById("question").value = q.question || "";
        if(document.getElementById("optionA")) document.getElementById("optionA").value = q.options?.[0] || "";
        if(document.getElementById("optionB")) document.getElementById("optionB").value = q.options?.[1] || "";
        if(document.getElementById("optionC")) document.getElementById("optionC").value = q.options?.[2] || "";
        if(document.getElementById("optionD")) document.getElementById("optionD").value = q.options?.[3] || "";
        if(document.getElementById("solution")) document.getElementById("solution").value = q.solution || "";

        if(document.getElementById("questionImage")) document.getElementById("questionImage").value = q.questionImage || "";
        if(document.getElementById("optionAImage")) document.getElementById("optionAImage").value = q.optionImages?.A || "";
        if(document.getElementById("optionBImage")) document.getElementById("optionBImage").value = q.optionImages?.B || "";
        if(document.getElementById("optionCImage")) document.getElementById("optionCImage").value = q.optionImages?.C || "";
        if(document.getElementById("optionDImage")) document.getElementById("optionDImage").value = q.optionImages?.D || "";
        if(document.getElementById("answer")) document.getElementById("answer").value = q.answer;
        if(document.getElementById("solutionImage")) document.getElementById("solutionImage").value = q.solutionImage || "";
        if(document.getElementById("youtube")) {
            let ytValue = q.youtube || "";
            // If the database only saved the ID, convert it back to a full URL for the text box
            if (ytValue && !ytValue.includes("http")) {
                ytValue = "https://www.youtube.com/watch?v=" + ytValue;
            }
            document.getElementById("youtube").value = ytValue;
        }

        window.scrollTo({ top: 0, behavior: "smooth" });

    } catch(err){
        console.error(err);
        alert(err.message);
    }
};