import { uploadImage } from "./cloudinary.js";
import { getQuestions, auth, onAuthStateChanged, signOut, db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, writeBatch } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

// --- AUTHENTICATION CHECK ---
onAuthStateChanged(auth, (user) => {
    if (!user) {
        window.location.href = "login.html";
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
   CUSTOM TEXT EDITOR ENGINE
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
                const afterText = text.substring(end);
                
                history.save(text);
                const insertStr = item.args[0];
                textarea.value = beforeText + insertStr + afterText;
                const newCursorPos = start + insertStr.length;
                textarea.setSelectionRange(newCursorPos, newCursorPos);
                textarea.dispatchEvent(new Event('input'));
            });
            groupDiv.appendChild(btn);
        });
        toolbar.appendChild(groupDiv);
    });

    textarea.parentNode.insertBefore(toolbar, textarea);
}

document.addEventListener("DOMContentLoaded", () => {
    document.querySelectorAll(".chem-editor").forEach(textarea => buildToolbar(textarea));
});

/* ===========================================
   CHAPTERS & SUBJECT MAPPING
=========================================== */
const chapters = {
    "Physics": [
        "Physical World and Measurement", "Kinematics", "Laws of Motion", "Work, Energy and Power", 
        "Rotational Motion", "Gravitation", "Properties of Bulk Matter", "Thermodynamics", 
        "Kinetic Theory of Gases", "Oscillations and Waves", "Electrostatics", "Current Electricity", 
        "Magnetic Effects of Current", "Electromagnetic Induction", "Alternating Current", 
        "Electromagnetic Waves", "Ray Optics and Optical Instruments", "Wave Optics", 
        "Dual Nature of Radiation and Matter", "Atoms and Nuclei", "Electronic Devices"
    ],
    "Physical Chemistry": [
        "Some Basic Concepts of Chemistry (Mole Concept)", "Atomic Structure", "States of Matter (Gaseous State)",
        "Thermodynamics", "Thermochemistry", "Chemical Equilibrium", "Ionic Equilibrium", "Redox Reactions",
        "Electrochemistry", "Chemical Kinetics", "Solutions", "Surface Chemistry", "Solid State"
    ],
    "Organic Chemistry": [
        "General Organic Chemistry (GOC)", "Nomenclature", "Isomerism", "Hydrocarbons", "Haloalkanes and Haloarenes",
        "Alcohols, Phenols and Ethers", "Aldehydes, Ketones and Carboxylic Acids", "Amines", "Biomolecules", 
        "Polymers", "Chemistry in Everyday Life", "Practical Organic Chemistry"
    ],
    "Inorganic Chemistry": [
        "Periodic Table", "Chemical Bonding", "Hydrogen", "s-Block Elements", "p-Block Elements", 
        "d-Block Elements", "f-Block Elements", "Coordination Compounds", "Metallurgy", 
        "Qualitative Analysis", "Environmental Chemistry"
    ],
    "Maths": [
        "Sets, Relations and Functions", "Complex Numbers", "Matrices and Determinants", "Quadratic Equations", 
        "Permutations and Combinations", "Binomial Theorem", "Sequence and Series", "Calculus", 
        "Coordinate Geometry", "Vector Algebra", "3D Geometry", "Probability", "Trigonometry"
    ],
    "Botany": [
        "Diversity in Living World", "Structural Organisation in Plants", "Cell Structure and Function", 
        "Plant Physiology", "Reproduction in Plants", "Genetics and Evolution", "Biology and Human Welfare", 
        "Biotechnology", "Ecology and Environment"
    ],
    "Zoology": [
        "Animal Kingdom", "Structural Organisation in Animals", "Human Physiology", "Human Reproduction", 
        "Evolution", "Human Health and Disease", "Biotechnology"
    ]
};

const subjectSelect = document.getElementById("subject");
const chapterSelect = document.getElementById("chapter");

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

/* ===========================================
   EXAM & QUESTION TYPE MAPPING
=========================================== */
const examSelectForm = document.getElementById("exam");
const typeSelectForm = document.getElementById("type");

if (examSelectForm && typeSelectForm) {
    const typeOptions = {
        "NEET": ["Single Correct"],
        "JEE Main": ["Single Correct", "Integer Based"],
        "JEE Advanced": ["Single Correct", "Multiple Correct", "Integer Based", "Comprehension", "Matrix Match"]
    };

    examSelectForm.addEventListener("change", () => {
        const selectedExam = examSelectForm.value;
        const allowedTypes = typeOptions[selectedExam] || typeOptions["JEE Advanced"]; 
        
        const currentType = typeSelectForm.value;
        typeSelectForm.innerHTML = "";
        
        allowedTypes.forEach(t => {
            const opt = document.createElement("option");
            opt.value = t;
            opt.textContent = t;
            typeSelectForm.appendChild(opt);
        });
        
        // Retain selection if valid, otherwise fallback to the first available option (e.g. Single Correct)
        if (allowedTypes.includes(currentType)) {
            typeSelectForm.value = currentType;
        } else {
            typeSelectForm.value = allowedTypes[0];
        }
    });

    // Trigger on page load to set defaults correctly
    setTimeout(() => examSelectForm.dispatchEvent(new Event("change")), 100);
}

/* ===========================================
   FIREBASE LOGIC & DASHBOARD
=========================================== */
const STORAGE_KEY = "doubtFactoryAdminDraft";
const saveButton = document.getElementById("saveButton");
const clearButton = document.getElementById("clearButton");
const questionForm = document.getElementById("questionForm");

let editingDocId = null;
let isEditing = false;

function extractVideoId(url) {
    if (!url || url.trim() === "") return "";
    const match = url.match(/(?:youtu\.be\/|youtube\.com\/(?:watch\?v=|embed\/|shorts\/))([^&?/]+)/);
    return match ? match[1] : url;
}

function collectFormData() {
    return {
        id: Date.now(),
        timestamp: Date.now(),
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

async function loadQuestionsTable() {
    try {
        const snapshot = await getDocs(collection(db, "questions"));
        const tbody = document.getElementById("questionsTableBody");
        if(!tbody) return;
        tbody.innerHTML = "";

        const sortedDocs = snapshot.docs.sort((a, b) => {
            const aTime = a.data().timestamp || 0;
            const bTime = b.data().timestamp || 0;
            return bTime - aTime;
        });

        sortedDocs.forEach(documentItem => {
            const q = documentItem.data();
            let snippet = "No text provided";
            if (q.question) {
                snippet = String(q.question).replace(/<[^>]*>?/gm, '').substring(0, 55).trim();
                if (String(q.question).replace(/<[^>]*>?/gm, '').length > 55) snippet += "...";
            }

            tbody.innerHTML += `
                <tr>
                    <td style="vertical-align: top; padding-top: 15px;">${q.exam || ""}</td>
                    <td style="vertical-align: top; padding-top: 15px; min-width: 150px;">
                        <div style="font-weight: 600; color: #0f172a; margin-bottom: 6px;">${q.chapter || ""}</div>
                        <div style="font-size: 13px; color: #64748b; line-height: 1.4;">${snippet}</div>
                    </td>
                    <td style="vertical-align: top; padding-top: 15px;">${q.year || ""}</td>
                    <td style="vertical-align: top; padding-top: 15px;">
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

async function updateDashboard() {
    try {
        const questions = await getQuestions();
        const total = document.getElementById("totalQuestions");
        const published = document.getElementById("publishedQuestions");
        if (total) total.textContent = questions.length;
        if (published) published.textContent = questions.length;
    } catch (e) {
        console.error(e);
    }
}

window.deleteQuestion = async function(id) {
    if (confirm("Delete this question?")) {
        try {
            await deleteDoc(doc(db, "questions", id));
            loadQuestionsTable();
            updateDashboard();
        } catch (error) {
            alert("Unable to delete question.");
        }
    }
};

window.editQuestion = async function(id) {
    try {
        if (window.switchTab) window.switchTab("formSection");
        const docSnap = await getDoc(doc(db, "questions", id));
        if (!docSnap.exists()) return;

        const q = docSnap.data();
        editingDocId = id;
        isEditing = true;
        if (saveButton) saveButton.textContent = "Update Question";

        if (subjectSelect) {
            subjectSelect.value = q.subject || "";
            subjectSelect.dispatchEvent(new Event("change"));
            setTimeout(() => { if (chapterSelect) chapterSelect.value = q.chapter || ""; }, 200);
        }

        const examField = document.getElementById("exam");
        examField.value = q.exam || "";
        examField.dispatchEvent(new Event("change")); // Force dropdown to regenerate types based on the saved exam

        document.getElementById("year").value = q.year || "";
        document.getElementById("difficulty").value = q.difficulty || "";
        
        // Wait briefly for the type dropdown to rebuild itself before setting its value
        setTimeout(() => {
            document.getElementById("type").value = q.type || "Single Correct";
        }, 50);

        document.getElementById("question").value = q.question || "";
        document.getElementById("optionA").value = q.options?.[0] || "";
        document.getElementById("optionB").value = q.options?.[1] || "";
        document.getElementById("optionC").value = q.options?.[2] || "";
        document.getElementById("optionD").value = q.options?.[3] || "";
        document.getElementById("solution").value = q.solution || "";
        document.getElementById("answer").value = q.answer || 0;
        document.getElementById("youtube").value = q.youtube ? `https://youtube.com/watch?v=${q.youtube}` : "";

        window.scrollTo({ top: 0, behavior: "smooth" });
    } catch(err) {
        console.error(err);
    }
};

if(questionForm) {
    questionForm.addEventListener("submit", async function(e) {
        e.preventDefault();
        const question = collectFormData();
        try {
            if (isEditing && editingDocId) {
                await updateDoc(doc(db, "questions", editingDocId), question);
            } else {
                await addDoc(collection(db, "questions"), question);
            }
            questionForm.reset();
            // Reset types back to default
            if (examSelectForm) examSelectForm.dispatchEvent(new Event("change"));
            
            editingDocId = null;
            isEditing = false;
            if (saveButton) saveButton.textContent = "Save Question";
            loadQuestionsTable();
            updateDashboard();
            alert("Question saved successfully!");
        } catch(error) {
            alert("Error saving question.");
        }
    });
}

/* ===========================================
   BULK JSON IMPORTER
=========================================== */
const bulkUploadBtn = document.getElementById("startBulkUploadBtn");
const bulkJsonInput = document.getElementById("bulkJsonInput");
const clearBulkBtn = document.getElementById("clearBulkBtn");
const bulkStatus = document.getElementById("bulkStatusText");
const bulkProgressContainer = document.getElementById("bulkProgressBarContainer");
const bulkProgressBar = document.getElementById("bulkProgressBar");

if (clearBulkBtn && bulkJsonInput) {
    clearBulkBtn.addEventListener("click", () => {
        bulkJsonInput.value = "";
        if (bulkStatus) bulkStatus.textContent = "";
        if (bulkProgressContainer) bulkProgressContainer.style.display = "none";
    });
}

if (bulkUploadBtn && bulkJsonInput) {
    bulkUploadBtn.addEventListener("click", async () => {
        const rawText = bulkJsonInput.value.trim();
        if (!rawText) {
            alert("Please paste a JSON array first.");
            return;
        }

        let parsedData;
        try {
            parsedData = JSON.parse(rawText);
            if (!Array.isArray(parsedData)) throw new Error("Root must be an array.");
        } catch (err) {
            alert("Invalid JSON: " + err.message);
            return;
        }

        if (!confirm(`Upload ${parsedData.length} questions to Firebase?`)) return;

        bulkUploadBtn.disabled = true;
        if (bulkProgressContainer) bulkProgressContainer.style.display = "block";

        try {
            const batchSize = 400;
            let uploadedCount = 0;

            for (let i = 0; i < parsedData.length; i += batchSize) {
                const chunk = parsedData.slice(i, i + batchSize);
                const batch = writeBatch(db);

                chunk.forEach((item, idx) => {
                    const docRef = doc(collection(db, "questions"));
                    const docData = {
                        id: Date.now() + (i + idx),
                        timestamp: Date.now() + (i + idx),
                        subject: item.subject || "Physics",
                        chapter: item.chapter || "General",
                        exam: item.exam || "NEET",
                        year: Number(item.year) || 2026,
                        difficulty: item.difficulty || "Medium",
                        type: item.type || "Single Correct",
                        question: item.question || "",
                        questionImage: item.questionImage || "",
                        options: Array.isArray(item.options) ? item.options : ["", "", "", ""],
                        optionImages: item.optionImages || { A: "", B: "", C: "", D: "" },
                        answer: typeof item.answer === "number" ? item.answer : 0,
                        solution: item.solution || "",
                        solutionImage: item.solutionImage || "",
                        youtube: item.youtube ? extractVideoId(item.youtube) : "",
                        views: 0,
                        likes: 0
                    };
                    batch.set(docRef, docData);
                });

                await batch.commit();
                uploadedCount += chunk.length;
                const percent = Math.round((uploadedCount / parsedData.length) * 100);
                if (bulkProgressBar) bulkProgressBar.style.width = `${percent}%`;
                if (bulkStatus) bulkStatus.textContent = `Uploaded ${uploadedCount} / ${parsedData.length}...`;
            }

            if (bulkStatus) bulkStatus.textContent = `✅ Successfully imported ${parsedData.length} questions!`;
            bulkJsonInput.value = "";
            loadQuestionsTable();
            updateDashboard();
        } catch (error) {
            alert("Bulk upload failed: " + error.message);
        } finally {
            bulkUploadBtn.disabled = false;
        }
    });
}

// Initial Calls
loadQuestionsTable();
updateDashboard();

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
    });
}
