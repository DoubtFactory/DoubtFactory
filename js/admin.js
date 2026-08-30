import { uploadImage } from "./cloudinary.js";
import { getQuestions, auth, onAuthStateChanged, signOut, db } from "./firebase.js";
import { collection, addDoc, getDocs, deleteDoc, doc, getDoc, updateDoc, writeBatch, query, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

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
    setupCloudinaryUploaders();

    // Bind filters for Manage Questions
    const manageExamFilter = document.getElementById("manageExamFilter");
    const manageYearFilter = document.getElementById("manageYearFilter");
    const manageSubjectFilter = document.getElementById("manageSubjectFilter");
    const manageChapterFilter = document.getElementById("manageChapterFilter");
    const manageSearchFilter = document.getElementById("manageSearchFilter");

    if (manageExamFilter) manageExamFilter.addEventListener("change", window.renderManageQuestions);
    if (manageYearFilter) manageYearFilter.addEventListener("change", window.renderManageQuestions);
    if (manageSearchFilter) manageSearchFilter.addEventListener("input", window.renderManageQuestions); // Bind search
    
    if (manageSubjectFilter) {
        manageSubjectFilter.addEventListener("change", () => {
            const sub = manageSubjectFilter.value;
            let chapters = [];
            if (sub === "All") {
                chapters = [...new Set(window.manageQuestionsList.map(q => q.chapter).filter(Boolean))].sort();
            } else {
                chapters = [...new Set(window.manageQuestionsList.filter(q => q.subject === sub).map(q => q.chapter).filter(Boolean))].sort();
            }
            manageChapterFilter.innerHTML = '<option value="All">All Chapters</option>' + chapters.map(c => `<option value="${c}">${c}</option>`).join('');
            window.renderManageQuestions();
        });
    }
    if (manageChapterFilter) manageChapterFilter.addEventListener("change", window.renderManageQuestions);
    
    // Core Execution Loader
    loadQuestionsTable();
    updateDashboard();
    loadFeedback();
    loadComments();
});

/* ===========================================
   CLEAN CLOUDINARY UPLOADER BINDINGS
=========================================== */
function setupCloudinaryUploaders() {
    const uploadMappings = [
        { btnId: "uploadQuestionImage", inputId: "questionImage" },
        { btnId: "uploadOptionAImage", inputId: "optionAImage" },
        { btnId: "uploadOptionBImage", inputId: "optionBImage" },
        { btnId: "uploadOptionCImage", inputId: "optionCImage" },
        { btnId: "uploadOptionDImage", inputId: "optionDImage" },
        { btnId: "uploadSolutionImage", inputId: "solutionImage" }
    ];

    uploadMappings.forEach(mapping => {
        const btn = document.getElementById(mapping.btnId);
        const input = document.getElementById(mapping.inputId);
        
        if (btn && input) {
            btn.addEventListener("click", async (e) => {
                e.preventDefault();
                const originalText = btn.textContent;
                btn.textContent = "Processing...";
                
                try {
                    const url = await uploadImage();
                    
                    if (url && typeof url === 'string') {
                        input.value = url;
                        btn.textContent = "Uploaded ✓";
                        btn.style.color = "#10B981"; 
                        btn.style.borderColor = "rgba(16, 185, 129, 0.4)";
                        btn.style.background = "rgba(16, 185, 129, 0.1)";
                    } else {
                        btn.textContent = originalText;
                    }
                } catch (err) {
                    console.error("Cloudinary Error:", err);
                    btn.textContent = "Error";
                    setTimeout(() => { btn.textContent = originalText; }, 2000);
                }
            });
        }
    });
}

/* ===========================================
   CHAPTERS, SUBJECTS & EXAM MAPPING
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
const examSelectForm = document.getElementById("exam");
const typeSelectForm = document.getElementById("type");

if(subjectSelect) {
    subjectSelect.addEventListener("change", () => {
        if(chapterSelect) {
            chapterSelect.innerHTML = '<option value="">Select Chapter</option>';
            const list = chapters[subjectSelect.value];
            if (list) {
                list.forEach(chapter => {
                    const option = document.createElement("option");
                    option.value = chapter;
                    option.textContent = chapter;
                    chapterSelect.appendChild(option);
                });
            }
        }
        
        if(examSelectForm) {
            const selectedSubject = subjectSelect.value;
            let allowedExams = ["JEE Main", "JEE Advanced", "NEET"]; 
            
            if (selectedSubject === "Maths") {
                allowedExams = ["JEE Main", "JEE Advanced"];
            } else if (selectedSubject === "Botany" || selectedSubject === "Zoology") {
                allowedExams = ["NEET"];
            }
            
            const currentExam = examSelectForm.value;
            examSelectForm.innerHTML = "";
            
            allowedExams.forEach(ex => {
                const opt = document.createElement("option");
                opt.value = ex;
                opt.textContent = ex;
                examSelectForm.appendChild(opt);
            });
            
            if (allowedExams.includes(currentExam)) {
                examSelectForm.value = currentExam;
            } else {
                examSelectForm.value = allowedExams[0];
            }
            
            examSelectForm.dispatchEvent(new Event("change"));
        }
    });
}

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
        
        if (allowedTypes.includes(currentType)) {
            typeSelectForm.value = currentType;
        } else {
            typeSelectForm.value = allowedTypes[0];
        }
    });

    setTimeout(() => {
        if(subjectSelect) subjectSelect.dispatchEvent(new Event("change"));
    }, 100);
}

/* ===========================================
   FIREBASE LOGIC & DASHBOARD
=========================================== */
const saveButton = document.getElementById("saveButton");
const questionForm = document.getElementById("questionForm");

let editingDocId = null;
let isEditing = false;
window.manageQuestionsList = []; 

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
        window.manageQuestionsList = snapshot.docs.map(doc => ({ docId: doc.id, ...doc.data() }));
        window.manageQuestionsList.sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0));

        window.populateManageFilters();
        window.renderManageQuestions();
    } catch(err) {
        console.error("Failed to load table", err);
    }
}

window.populateManageFilters = function() {
    const manageExamFilter = document.getElementById("manageExamFilter");
    const manageYearFilter = document.getElementById("manageYearFilter");
    const manageSubjectFilter = document.getElementById("manageSubjectFilter");
    const manageChapterFilter = document.getElementById("manageChapterFilter");

    if(!manageExamFilter) return;

    const exams = [...new Set(window.manageQuestionsList.map(q => q.exam).filter(Boolean))].sort();
    const years = [...new Set(window.manageQuestionsList.map(q => q.year).filter(Boolean))].sort((a,b)=>b-a);
    const subjects = [...new Set(window.manageQuestionsList.map(q => q.subject).filter(Boolean))].sort();
    const chapters = [...new Set(window.manageQuestionsList.map(q => q.chapter).filter(Boolean))].sort();

    const currEx = manageExamFilter.value;
    const currYr = manageYearFilter.value;
    const currSub = manageSubjectFilter.value;
    const currCh = manageChapterFilter.value;

    manageExamFilter.innerHTML = '<option value="All">All Exams</option>' + exams.map(e => `<option value="${e}">${e}</option>`).join('');
    manageYearFilter.innerHTML = '<option value="All">All Years</option>' + years.map(y => `<option value="${y}">${y}</option>`).join('');
    manageSubjectFilter.innerHTML = '<option value="All">All Subjects</option>' + subjects.map(s => `<option value="${s}">${s}</option>`).join('');
    manageChapterFilter.innerHTML = '<option value="All">All Chapters</option>' + chapters.map(c => `<option value="${c}">${c}</option>`).join('');

    manageExamFilter.value = exams.includes(currEx) ? currEx : "All";
    manageYearFilter.value = years.includes(Number(currYr)) || years.includes(String(currYr)) ? currYr : "All";
    manageSubjectFilter.value = subjects.includes(currSub) ? currSub : "All";
    manageChapterFilter.value = chapters.includes(currCh) ? currCh : "All";
};

window.renderManageQuestions = function() {
    const tbody = document.getElementById("questionsTableBody");
    const manageExamFilter = document.getElementById("manageExamFilter");
    const manageYearFilter = document.getElementById("manageYearFilter");
    const manageSubjectFilter = document.getElementById("manageSubjectFilter");
    const manageChapterFilter = document.getElementById("manageChapterFilter");
    const manageSearchFilter = document.getElementById("manageSearchFilter");

    if(!tbody || !manageExamFilter) return;

    const ex = manageExamFilter.value;
    const yr = manageYearFilter.value;
    const sub = manageSubjectFilter.value;
    const ch = manageChapterFilter.value;
    const term = manageSearchFilter ? manageSearchFilter.value.toLowerCase().trim() : "";

    const filtered = window.manageQuestionsList.filter(q => {
        // Dropdown Filters
        if (ex !== "All" && q.exam !== ex) return false;
        if (yr !== "All" && String(q.year) !== String(yr)) return false;
        if (sub !== "All" && q.subject !== sub) return false;
        if (ch !== "All" && q.chapter !== ch) return false;
        
        // Search Keyword Filter
        if (term) {
            const qText = String(q.question || "").toLowerCase();
            const qChap = String(q.chapter || "").toLowerCase();
            if (!qText.includes(term) && !qChap.includes(term)) {
                return false;
            }
        }
        
        return true;
    });

    tbody.innerHTML = filtered.map(q => {
        let snippet = "No text provided";
        if (q.question) {
            snippet = String(q.question).replace(/<[^>]*>?/gm, '').substring(0, 55).trim();
            if (String(q.question).replace(/<[^>]*>?/gm, '').length > 55) snippet += "...";
        }
        return `
            <tr style="border-bottom: 1px solid var(--border-color);">
                <td style="vertical-align: top; padding: 15px; color: var(--text-primary); font-weight: 600;">${q.exam || ""}</td>
                <td style="vertical-align: top; padding: 15px; min-width: 200px;">
                    <div style="font-size: 11px; font-weight: 700; color: var(--accent-blue); text-transform: uppercase; margin-bottom: 4px; letter-spacing: 0.5px;">${q.subject || "Subject"}</div>
                    <div style="font-weight: 600; color: var(--text-primary); margin-bottom: 6px;">${q.chapter || ""}</div>
                    <div style="font-size: 13px; color: var(--text-secondary); line-height: 1.4;">${snippet}</div>
                </td>
                <td style="vertical-align: top; padding: 15px; color: var(--text-primary); font-weight: 500;">${q.year || ""}</td>
                <td style="vertical-align: top; padding: 15px;">
                    <div style="display: flex; flex-direction: column; gap: 8px;">
                        <button onclick="editQuestion('${q.docId}')" style="width: 100%; border: 1px solid var(--border-color); background: var(--bg-card-hover); color: var(--text-primary); padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s;">Edit</button>
                        <button onclick="deleteQuestion('${q.docId}')" style="width: 100%; border: 1px solid rgba(239, 68, 68, 0.3); background: rgba(239, 68, 68, 0.1); color: #ef4444; padding: 8px 12px; border-radius: 6px; font-weight: 600; cursor: pointer; transition: 0.2s;">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    }).join("");
};

async function updateDashboard() {
    try {
        const questions = await getQuestions();
        
        const total = document.getElementById("totalQuestions");
        const drafts = document.getElementById("draftQuestions");
        if (total) total.textContent = questions.length;
        if (drafts) drafts.textContent = "0";

        const recentActivityList = document.getElementById("recentActivityList");
        if (recentActivityList) {
            recentActivityList.innerHTML = "";
            const recentQs = [...questions].sort((a, b) => (b.timestamp || 0) - (a.timestamp || 0)).slice(0, 5);
            
            if (recentQs.length === 0) {
                recentActivityList.innerHTML = "<p style='color: var(--text-secondary); padding:15px;'>No recent activity.</p>";
            } else {
                recentQs.forEach(q => {
                    const snippet = q.question ? q.question.replace(/<[^>]*>?/gm, '').substring(0, 50) + "..." : "No text provided";
                    recentActivityList.innerHTML += `
                        <div style="padding: 15px; border-bottom: 1px solid var(--border-color); display:flex; justify-content: space-between; align-items:flex-start;">
                            <div>
                                <div style="font-weight:700; color: var(--text-primary); font-size:14px; margin-bottom:4px;">${q.subject || 'Subject'} - ${q.chapter || 'Chapter'}</div>
                                <div style="font-size:13px; color: var(--text-secondary);">${snippet}</div>
                            </div>
                            <span style="font-size:12px; font-weight:700; background: rgba(59, 130, 246, 0.15); color: var(--accent-light-blue); border: 1px solid rgba(59, 130, 246, 0.3); padding:4px 8px; border-radius:6px; flex-shrink:0;">${q.exam || 'Exam'}</span>
                        </div>
                    `;
                });
            }
        }

        const examStatsList = document.getElementById("examStatsList");
        if (examStatsList) {
            const examCounts = {};
            questions.forEach(q => {
                const ex = q.exam || "Unspecified";
                examCounts[ex] = (examCounts[ex] || 0) + 1;
            });
            
            examStatsList.innerHTML = "";
            if (Object.keys(examCounts).length === 0) {
                examStatsList.innerHTML = "<p style='color: var(--text-secondary);'>No exams data.</p>";
            } else {
                Object.keys(examCounts).sort().forEach(ex => {
                    examStatsList.innerHTML += `
                        <div style="display:flex; justify-content:space-between; align-items:center; padding:12px 0; border-bottom: 1px dashed var(--border-color);">
                            <span style="color: var(--text-secondary); font-weight:600; font-size:14px;">${ex}</span>
                            <span style="background: var(--bg-main); padding:4px 10px; border-radius:6px; font-weight:700; color: var(--text-primary); border: 1px solid var(--border-color);">${examCounts[ex]}</span>
                        </div>
                    `;
                });
            }
        }

        const typePieChart = document.getElementById("typePieChart");
        const typeLegend = document.getElementById("typeLegend");
        if (typePieChart && typeLegend) {
            const typeCounts = {};
            questions.forEach(q => {
                const t = q.type || "Unspecified";
                typeCounts[t] = (typeCounts[t] || 0) + 1;
            });

            const colors = ["#3b82f6", "#10b981", "#f59e0b", "#8b5cf6", "#ef4444", "#06b6d4"];
            let conicGradientArgs = [];
            let currentPercentage = 0;
            const totalQs = questions.length || 1; 
            let colorIndex = 0;

            typeLegend.innerHTML = "";
            
            if (questions.length === 0) {
                typePieChart.style.background = "var(--bg-main)";
                typeLegend.innerHTML = "<p style='color: var(--text-secondary); font-size:13px;'>No data available</p>";
            } else {
                Object.keys(typeCounts).forEach(type => {
                    const percentage = (typeCounts[type] / totalQs) * 100;
                    const color = colors[colorIndex % colors.length];
                    
                    conicGradientArgs.push(`${color} ${currentPercentage}% ${currentPercentage + percentage}%`);
                    currentPercentage += percentage;

                    typeLegend.innerHTML += `
                        <div style="display:flex; align-items:center; gap:10px; font-size:14px; color: var(--text-secondary); margin-bottom:8px; font-weight:500;">
                            <span style="display:inline-block; width:14px; height:14px; background:${color}; border-radius:4px;"></span>
                            ${type} <span style="font-size:12px;">(${typeCounts[type]})</span>
                        </div>
                    `;
                    colorIndex++;
                });

                typePieChart.style.background = `conic-gradient(${conicGradientArgs.join(", ")})`;
                typePieChart.style.borderRadius = "50%";
                typePieChart.style.width = "180px";
                typePieChart.style.height = "180px";
                typePieChart.style.margin = "20px auto";
                typePieChart.style.boxShadow = "0 4px 6px rgba(0,0,0,0.05)";
            }
        }

    } catch (e) {
        console.error("Dashboard fetch error:", e);
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
        }

        setTimeout(() => { 
            if (chapterSelect) chapterSelect.value = q.chapter || ""; 
            
            if (examSelectForm) {
                examSelectForm.value = q.exam || "";
                examSelectForm.dispatchEvent(new Event("change"));
            }
            
            document.getElementById("year").value = q.year || "";
            document.getElementById("difficulty").value = q.difficulty || "";

            setTimeout(() => {
                if (typeSelectForm) typeSelectForm.value = q.type || "Single Correct";
            }, 50);

        }, 100);

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
            if (subjectSelect) subjectSelect.dispatchEvent(new Event("change"));
            
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

const logoutBtn = document.getElementById("logoutBtn");
if (logoutBtn) {
    logoutBtn.addEventListener("click", async () => {
        await signOut(auth);
        window.location.href = "login.html";
    });
}

/* ===========================================
   FEEDBACK AND COMMENTS
=========================================== */
async function loadFeedback() {
    const inbox = document.getElementById('messagesInbox');
    if (!inbox) return;
    try {
        const q = query(collection(db, "messages"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        inbox.innerHTML = snapshot.empty ? '<p style="color: var(--text-secondary);">No messages yet.</p>' : '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const date = new Date(data.timestamp).toLocaleString('en-IN');
            inbox.innerHTML += `
                <div style="background: rgba(59, 130, 246, 0.05); border-left: 4px solid var(--accent-blue); padding: 15px; border-radius: 8px; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; margin-bottom: 8px;">
                        <strong style="color: var(--accent-blue);">${data.name}</strong>
                        <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600;">${date}</span>
                    </div>
                    <div style="color: var(--text-primary); font-size: 14px; white-space: pre-wrap; line-height: 1.5;">${data.message}</div>
                </div>`;
        });
    } catch (e) {
        console.error("Feedback fetch error:", e);
        inbox.innerHTML = '<p style="color: #ef4444;">Failed to load messages.</p>';
    }
}

async function loadComments() {
    const inbox = document.getElementById('commentsInbox');
    if (!inbox) return;
    try {
        const q = query(collection(db, "comments"), orderBy("timestamp", "desc"));
        const snapshot = await getDocs(q);
        inbox.innerHTML = snapshot.empty ? '<p style="color: var(--text-secondary);">No comments yet.</p>' : '';
        snapshot.forEach((docSnap) => {
            const data = docSnap.data();
            const timeVal = data.timestamp?.seconds ? data.timestamp.seconds * 1000 : (data.timestamp || Date.now());
            const date = new Date(timeVal).toLocaleString('en-IN');
            inbox.innerHTML += `
                <div style="background: rgba(245, 158, 11, 0.05); border-left: 4px solid #F59E0B; padding: 15px; border-radius: 8px; border-top: 1px solid var(--border-color); border-right: 1px solid var(--border-color); border-bottom: 1px solid var(--border-color);">
                    <div style="display: flex; justify-content: space-between; align-items: flex-start;">
                        <div>
                            <strong style="color: #FBBF24; font-size: 15px;">${data.name || data.author || 'Student'}</strong>
                            <span style="font-size: 12px; color: var(--text-secondary); font-weight: 600; margin-left: 8px;">${date}</span>
                        </div>
                        <button onclick="deleteStudentComment('${docSnap.id}')" style="background: rgba(239, 68, 68, 0.1); color: #ef4444; border: 1px solid rgba(239, 68, 68, 0.3); padding: 6px 12px; border-radius: 6px; cursor: pointer; font-size: 12px; font-weight: bold; transition: all 0.2s;">Delete</button>
                    </div>
                    <div style="color: var(--text-primary); font-size: 14px; white-space: pre-wrap; margin-top: 8px;">${data.text || data.comment || ''}</div>
                </div>`;
        });
    } catch (e) {
        console.error("Comments fetch error:", e);
        inbox.innerHTML = '<p style="color: #ef4444;">Failed to load comments.</p>';
    }
}

window.deleteStudentComment = async function(id) {
    if(confirm("Permanently delete this comment?")) {
        try {
            await deleteDoc(doc(db, "comments", id));
            loadComments();
        } catch(e) {
            alert("Failed to delete comment.");
        }
    }
};
