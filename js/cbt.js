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
        const allQs = await getQuestions();
        questions = storedIds.map(id => allQs.find(q => (q.docId || q.id) === id)).filter(Boolean);

        if (questions.length === 0) {
            alert("Could not load questions. Returning to setup.");
            window.location.href = "test-setup.html";
            return;
        }

        responses = questions.map(() => ({
            state: 'unvisited',
            selectedOption: null
        }));

        initPalette();
        startTimer();
        goToQuestion(0);

    } catch (err) {
        console.error("Error loading test:", err);
        qText.textContent = "Error loading test data. Please check your connection.";
    }

    function goToQuestion(index) {
        if (index < 0 || index >= questions.length) return;

        // Mark as unanswered if skipped without interacting
        if (responses[currentIndex].state === 'unvisited') {
            responses[currentIndex].state = 'unanswered';
        }

        currentIndex = index;
        renderCurrentQuestion();
        
        // Update state to viewed
        if (responses[currentIndex].state === 'unvisited') {
            responses[currentIndex].state = 'unanswered';
        }
        updatePalette();
    }

    function renderCurrentQuestion() {
        const q = questions[currentIndex];
        qNumDisplay.textContent = `Question ${currentIndex + 1}`;
        qText.innerHTML = q.question || "No question text provided.";

        if (q.questionImage) {
            qImageContainer.innerHTML = `<img src="${q.questionImage}" alt="Question Image" style="max-width:100%; max-height:250px; border-radius:8px; margin-top:10px;">`;
        } else {
            qImageContainer.innerHTML = '';
        }

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
            
            label.querySelector('input').addEventListener('change', (e) => {
                responses[currentIndex].selectedOption = parseInt(e.target.value);
            });
            
            optionsContainer.appendChild(label);
        });
    }

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

    // Clear Response now correctly updates the state to RED (Not Answered)
    btnClear.addEventListener("click", () => {
        const radios = document.getElementsByName("cbtOption");
        radios.forEach(r => r.checked = false);
        responses[currentIndex].selectedOption = null;
        responses[currentIndex].state = 'unanswered';
        updatePalette();
    });

    function getSelectedOption() {
        const radios = document.getElementsByName("cbtOption");
        for (let r of radios) {
            if (r.checked) return parseInt(r.value);
        }
        return null;
    }

    function initPalette() {
        paletteGrid.innerHTML = '';
        questions.forEach((_, i) => {
            const btn = document.createElement("button");
            btn.className = "palette-btn state-unvisited";
            btn.textContent = i + 1;
            btn.addEventListener("click", () => {
                const selected = getSelectedOption();
                if (selected !== null) {
                    responses[currentIndex].selectedOption = selected;
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
            
            if (i === currentIndex) {
                buttons[i].classList.add("active");
            }
        }
    }

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
        
        if (timeRemaining < 300) { 
            timerDisplay.style.color = "white";
            timerDisplay.style.background = "#ef4444";
            timerDisplay.style.borderColor = "#dc2626";
        }
    }

    btnSubmitTest.addEventListener("click", () => { submitModal.style.display = "flex"; });
    cancelSubmit.addEventListener("click", () => { submitModal.style.display = "none"; });

    confirmSubmit.addEventListener("click", () => {
        submitModal.style.display = "none";
        clearInterval(timerInterval);
        executeSubmission();
    });

    function executeSubmission() {
        const finalSelected = getSelectedOption();
        if (finalSelected !== null) {
             responses[currentIndex].selectedOption = finalSelected;
             if (responses[currentIndex].state === 'unanswered' || responses[currentIndex].state === 'unvisited') {
                 responses[currentIndex].state = 'answered';
             }
        }
        const resultData = { questions: questions, responses: responses };
        sessionStorage.setItem('df_cbt_results', JSON.stringify(resultData));
        window.location.href = "test-result.html";
    }
});
