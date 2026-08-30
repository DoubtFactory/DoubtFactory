import { auth, onAuthStateChanged, db } from "./firebase.js";
import { collection, query, where, getDocs, addDoc } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // UI Elements
    const loader = document.getElementById('loader');
    const qText = document.getElementById('qText');
    const qImage = document.getElementById('qImage');
    const optionsContainer = document.getElementById('optionsContainer');
    const qCounter = document.getElementById('qCounter');
    const paletteGrid = document.getElementById('paletteGrid');
    const btnPrev = document.getElementById('btnPrev');
    const btnNext = document.getElementById('btnNext');
    const btnClear = document.getElementById('clearSelectionBtn');
    const btnSubmit = document.getElementById('submitQuizBtn');
    const displayTopic = document.getElementById('displayTopic');
    const timerDisplay = document.getElementById('timerDisplay');

    // State Variables
    let currentUser = null;
    let questions = [];
    let currentIdx = 0;
    let answers = {}; // Maps question index to selected option (e.g., { 0: 'A', 1: 'C' })
    let startTime = Date.now();
    let timerInterval;
    let quizTopic = "General Quiz";

    // 1. Auth Guard
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.html?redirect=" + encodeURIComponent(window.location.href);
            return;
        }
        currentUser = user;
        
        // Extract topic/subject from URL (e.g., ?topic=Laws of Motion or ?subject=Physics)
        const urlParams = new URLSearchParams(window.location.search);
        quizTopic = urlParams.get("topic") || urlParams.get("subject") || "Practice Quiz";
        displayTopic.textContent = quizTopic;

        await fetchQuestions(quizTopic);
    });

    // 2. Fetch Questions from Firebase
    async function fetchQuestions(topic) {
        try {
            // Adjust this query based on how you structured your database
            const q = query(collection(db, "questions"), where("subject", "==", topic));
            const snapshot = await getDocs(q);
            
            if (snapshot.empty) {
                // Fallback / Demo data if collection is empty or topic doesn't match
                questions = [
                    { text: "What is the primary function of a catalyst in a chemical reaction?", options: { A: "Increases yield", B: "Lowers activation energy", C: "Raises temperature", D: "Consumes reactants" }, correct: "B" },
                    { text: "Which of the following is a noble gas?", options: { A: "Nitrogen", B: "Oxygen", C: "Argon", D: "Chlorine" }, correct: "C" },
                    { text: "Calculate the molar mass of H2O.", options: { A: "16 g/mol", B: "18 g/mol", C: "20 g/mol", D: "22 g/mol" }, correct: "B" }
                ];
            } else {
                questions = snapshot.docs.map(doc => doc.data());
            }

            initQuiz();

        } catch (error) {
            console.error("Error fetching questions:", error);
            alert("Failed to load questions. Please try again later.");
            window.location.href = "explore-quizzes.html";
        }
    }

    // 3. Initialize Quiz Interface
    function initQuiz() {
        buildPalette();
        renderQuestion(currentIdx);
        startTimer();
        loader.style.display = 'none'; // Hide loader
    }

    function buildPalette() {
        paletteGrid.innerHTML = '';
        questions.forEach((_, idx) => {
            const btn = document.createElement('button');
            btn.className = `palette-btn ${idx === currentIdx ? 'current' : ''}`;
            btn.textContent = idx + 1;
            btn.onclick = () => renderQuestion(idx);
            paletteGrid.appendChild(btn);
        });
    }

    // 4. Render Active Question
    function renderQuestion(idx) {
        currentIdx = idx;
        const q = questions[idx];
        
        qCounter.textContent = `Question ${idx + 1} of ${questions.length}`;
        qText.textContent = q.text || q.question;
        
        // Handle optional images
        if (q.image_url || q.image) {
            qImage.src = q.image_url || q.image;
            qImage.style.display = 'block';
        } else {
            qImage.style.display = 'none';
        }

        // Render Options safely
        optionsContainer.innerHTML = '';
        const opts = q.options || { A: q.optionA, B: q.optionB, C: q.optionC, D: q.optionD };
        
        for (const [key, val] of Object.entries(opts)) {
            if(!val) continue; // Skip empty options
            
            const btn = document.createElement('div');
            btn.className = `option-btn ${answers[idx] === key ? 'selected' : ''}`;
            btn.innerHTML = `<div class="opt-label">${key}</div> <span>${val}</span>`;
            
            btn.onclick = () => {
                answers[idx] = key;
                renderQuestion(idx); // Re-render to update UI
                updatePaletteUI();
            };
            optionsContainer.appendChild(btn);
        }

        // Update Nav Buttons
        btnPrev.disabled = idx === 0;
        btnNext.textContent = idx === questions.length - 1 ? "Finish" : "Next →";
        
        updatePaletteUI();
    }

    function updatePaletteUI() {
        const btns = paletteGrid.children;
        for (let i = 0; i < btns.length; i++) {
            btns[i].className = 'palette-btn';
            if (answers[i]) btns[i].classList.add('answered');
            if (i === currentIdx) btns[i].classList.add('current');
        }
    }

    // 5. Button Listeners
    btnNext.onclick = () => {
        if (currentIdx < questions.length - 1) {
            renderQuestion(currentIdx + 1);
        } else {
            submitQuiz();
        }
    };

    btnPrev.onclick = () => {
        if (currentIdx > 0) renderQuestion(currentIdx - 1);
    };

    btnClear.onclick = () => {
        delete answers[currentIdx];
        renderQuestion(currentIdx);
    };

    btnSubmit.onclick = () => {
        const unans = questions.length - Object.keys(answers).length;
        const msg = unans > 0 ? `You have ${unans} unanswered questions. Submit anyway?` : "Are you sure you want to submit?";
        if(confirm(msg)) submitQuiz();
    };

    // 6. Timer Logic
    function startTimer() {
        timerInterval = setInterval(() => {
            const diff = Math.floor((Date.now() - startTime) / 1000);
            const m = String(Math.floor(diff / 60)).padStart(2, '0');
            const s = String(diff % 60).padStart(2, '0');
            timerDisplay.textContent = `${m}:${s}`;
        }, 1000);
    }

    // 7. Grade and Submit to Firebase
    async function submitQuiz() {
        clearInterval(timerInterval);
        loader.innerHTML = `<h2 style="margin-bottom: 10px;">Submitting Quiz...</h2><p style="color: var(--text-secondary);">Calculating your score</p>`;
        loader.style.display = 'flex';

        let correct = 0;
        let incorrect = 0;

        questions.forEach((q, idx) => {
            const userAns = answers[idx];
            if (userAns) {
                // Ensure comparison logic matches your database's correct answer format
                if (userAns === q.correct || userAns === q.correctAnswer) {
                    correct++;
                } else {
                    incorrect++;
                }
            }
        });

        const skipped = questions.length - (correct + incorrect);

        const attemptData = {
            userId: currentUser.uid,
            topic: quizTopic,
            totalQuestions: questions.length,
            correct: correct,
            incorrect: incorrect,
            skipped: skipped,
            timeTakenSeconds: Math.floor((Date.now() - startTime) / 1000),
            timestamp: Date.now()
        };

        try {
            // Push directly to the collection our analytics dashboard reads from
            await addDoc(collection(db, "quiz_attempts"), attemptData);
            window.location.href = "quiz-results.html"; // Send them to see their updated charts
        } catch (error) {
            console.error("Submission failed:", error);
            alert("Error submitting quiz. Check your connection.");
            loader.style.display = 'none';
        }
    }
});
