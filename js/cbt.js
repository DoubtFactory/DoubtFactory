import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    // 1. Retrieve Test Setup Data
    const storedIds = JSON.parse(sessionStorage.getItem('df_cbt_test'));
    let durationMinutes = parseInt(sessionStorage.getItem('df_cbt_duration'));

    if (!storedIds || !storedIds.length) {
        window.location.href = "test-setup.html";
        return;
    }

    let questions = [];
    let responses = [];
    let currentIndex = 0;
    let timeRemaining = durationMinutes * 60;
    let timerInterval;

    // 2. DOM Elements
    const timerDisplay = document.getElementById("timerDisplay");
    const qNumDisplay = document.getElementById("qNumDisplay");
    const qText = document.getElementById("qText");
    const qImageContainer = document.getElementById("qImageContainer");
    const optionsContainer = document.getElementById("optionsContainer");
    const btnClear = document.getElementById("btnClear");
    const btnReview = document.getElementById("btnReview");
    const btnSaveNext = document.getElementById("btnSaveNext");
    const paletteGrid = document.getElementById("paletteGrid");
    const btnSubmitTest = document.getElementById("btnSubmitTest");
    const submitModal = document.getElementById("submitModal");
    const cancelSubmit = document.getElementById("cancelSubmit");
    const confirmSubmit = document.getElementById("confirmSubmit");

    try {
        // Fetch and filter questions based on the IDs saved during Test Setup
        const allQs = await getQuestions();
        questions = storedIds.map(id => allQs.find(q => (q.docId || q.id) === id)).filter(Boolean);

        if (questions.length === 0) {
            alert("Could not load questions. Returning to setup.");
            window.location.href = "test-setup.html";
            return;
        }

        // Initialize state for each question
        responses = questions.map(() => ({
            state: 'unvisited',
            selectedOption: null
        }));

        // Start Test Environment
        initPalette();
        startTimer();
        goToQuestion(0);

    } catch (err) {
        console.error("Error loading test:", err);
        qText.textContent = "Error loading test data. Please check your connection.";
    }

    // --- Core Navigation & Rendering ---

    function goToQuestion(index) {
        if (index < 0 || index >= questions.length) return;

        // If leaving a question without interacting, and it was unvisited, mark it unanswered
        if (responses[currentIndex].state === 'unvisited') {
            responses[currentIndex].state = 'unanswered';
            updatePalette();
        }

        currentIndex = index;
        renderCurrentQuestion();
        
        // When landing on a new question, if it's unvisited, update palette to show it's currently being viewed (unanswered)
        if (responses[currentIndex].state === 'unvisited') {
            responses[currentIndex].state = 'unanswered';
        }
        updatePalette();
    }

    function renderCurrentQuestion() {
        const q = questions[currentIndex];
        qNumDisplay.textContent = `Question ${currentIndex + 1}`;
        qText.innerHTML = q.question || "No question text provided.";

        // Handle Question Image
        if (q.questionImage) {
            qImageContainer.innerHTML = `<img src="${q.questionImage}" alt="Question Image" style="max-width:100%; max-height:250px; border-radius:8px; margin-top:10px;">`;
        } else {
            qImageContainer.innerHTML = '';
        }

        // Handle Options
        optionsContainer.innerHTML = '';
        q.options.forEach((optText, i) => {
            const isChecked = responses[currentIndex].selectedOption === i ? 'checked' : '';
            const label = document.createElement('label');
            label.className = 'cbt-option-label';
            
            let optionHTML = `
                <input type="radio" name="cbtOption" value="${i}" ${isChecked}>
                <span style="flex: 1;">${optText}</span>
            `;
            
            const optLetter = ['A', 'B', 'C', 'D'][i];
            if (q.optionImages && q.optionImages[optLetter]) {
                optionHTML += `<img src="${q.optionImages[optLetter]}" style="max-height:80px; margin-left:10px; border-radius:4px;">`;
            }
            
            label.innerHTML = optionHTML;
            
            // Listen for selection changes directly
            label.querySelector('input').addEventListener('change', (e) => {
                responses[currentIndex].selectedOption = parseInt(e.target.value);
            });
            
            optionsContainer.appendChild(label);
        });
    }

    // --- Action Buttons Logic ---

    btnSaveNext.addEventListener("click", () => {
        const selected = getSelectedOption();
        responses[currentIndex].selectedOption = selected;
        
        if (selected !== null) {
            responses[currentIndex].state = 'answered';
        } else {
            responses[currentIndex].state = 'unanswered';
        }
        
        goToQuestion(currentIndex + 1 < questions.length ? currentIndex + 1 : 0);
    });

    btnReview.addEventListener("click", () => {
        const selected = getSelectedOption();
        responses[currentIndex].selectedOption = selected;
        
        if (selected !== null) {
            responses[currentIndex].state = 'review-ans';
        } else {
            responses[currentIndex].state = 'review';
        }
        
        goToQuestion(currentIndex + 1 < questions.length ? currentIndex + 1 : 0);
    });

    btnClear.addEventListener("click", () => {
        const radios = document.getElementsByName("cbtOption");
        radios.forEach(r => r.checked = false);
        responses[currentIndex].selectedOption = null;
    });

    function getSelectedOption() {
        const radios = document.getElementsByName("cbtOption");
        for (let r of radios) {
            if (r.checked) return parseInt(r.value);
        }
        return null;
    }

    // --- Palette Logic ---

    function initPalette() {
        paletteGrid.innerHTML = '';
        questions.forEach((_, i) => {
            const btn = document.createElement("button");
            btn.className = "palette-btn state-unvisited";
            btn.textContent = i + 1;
            btn.addEventListener("click", () => {
                // Ensure current selection is captured before jumping
                const selected = getSelectedOption();
                if (selected !== null) {
                    responses[currentIndex].selectedOption = selected;
                    // Auto-save behavior if they select something and just click another number
                    if (responses[currentIndex].state === 'unanswered' || responses[currentIndex].state === 'unvisited') {
                        responses[currentIndex].state = 'answered';
                    }
                }
                goToQuestion(i);
            });
            paletteGrid.appendChild(btn);
        });
    }

    function updatePalette() {
        const buttons = paletteGrid.children;
        for (let i = 0; i < buttons.length; i++) {
            const state = responses[i].state;
            buttons[i].className = `palette-btn state-${state}`;
            
            // Highlight current active question
            if (i === currentIndex) {
                buttons[i].classList.add("active");
            }
        }
    }

    // --- Timer Logic ---

    function startTimer() {
        updateTimerDisplay();
        timerInterval = setInterval(() => {
            timeRemaining--;
            updateTimerDisplay();
            if (timeRemaining <= 0) {
                clearInterval(timerInterval);
                executeSubmission();
            }
        }, 1000);
    }

    function updateTimerDisplay() {
        const h = Math.floor(timeRemaining / 3600);
        const m = Math.floor((timeRemaining % 3600) / 60);
        const s = timeRemaining % 60;
        
        const format = num => num.toString().padStart(2, '0');
        timerDisplay.innerHTML = `⏱ ${format(h)}:${format(m)}:${format(s)}`;
        
        if (timeRemaining < 300) { // Under 5 minutes turns red
            timerDisplay.style.color = "white";
            timerDisplay.style.background = "#ef4444";
            timerDisplay.style.borderColor = "#dc2626";
        }
    }

    // --- Submission Logic ---

    btnSubmitTest.addEventListener("click", () => {
        submitModal.style.display = "flex";
    });

    cancelSubmit.addEventListener("click", () => {
        submitModal.style.display = "none";
    });

    confirmSubmit.addEventListener("click", () => {
        submitModal.style.display = "none";
        clearInterval(timerInterval);
        executeSubmission();
    });

    function executeSubmission() {
        // Save final responses exactly as they are currently selected
        const finalSelected = getSelectedOption();
        if (finalSelected !== null) {
             responses[currentIndex].selectedOption = finalSelected;
             if (responses[currentIndex].state === 'unanswered' || responses[currentIndex].state === 'unvisited') {
                 responses[currentIndex].state = 'answered';
             }
        }

        // Package and send to result screen
        const resultData = {
            questions: questions,
            responses: responses
        };
        sessionStorage.setItem('df_cbt_results', JSON.stringify(resultData));
        window.location.href = "test-result.html";
    }
});
