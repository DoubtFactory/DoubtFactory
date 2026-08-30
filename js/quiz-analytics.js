import { auth, onAuthStateChanged, db } from "./firebase.js";
import { collection, query, where, getDocs, orderBy } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-firestore.js";

document.addEventListener("DOMContentLoaded", () => {
    
    onAuthStateChanged(auth, async (user) => {
        if (!user) {
            window.location.href = "login.html?redirect=quiz-results.html";
            return;
        }
        
        await loadQuizData(user);
    });

    async function loadQuizData(user) {
        const emptyState = document.getElementById('emptyState');
        const dashboard = document.getElementById('dashboardContent');
        
        try {
            // Query Firebase for the user's completed quizzes
            const q = query(
                collection(db, "quiz_attempts"), 
                where("userId", "==", user.uid),
                orderBy("timestamp", "desc")
            );
            
            const snapshot = await getDocs(q);

            // If the user has never attempted a quiz, show the empty state
            if (snapshot.empty) {
                emptyState.style.display = 'flex';
                dashboard.style.display = 'none';
                return;
            }

            // If data exists, hide empty state and render dashboard
            emptyState.style.display = 'none';
            dashboard.style.display = 'block';

            // Extract data (This processes the real data if it exists)
            const attempts = snapshot.docs.map(doc => doc.data());
            const latest = attempts[0]; // Most recent attempt

            populateDashboard(latest, attempts);

        } catch (error) {
            console.error("Error fetching quiz data:", error);
            // Fallback to empty state if index error or missing collection occurs
            emptyState.style.display = 'flex';
            dashboard.style.display = 'none';
        }
    }

    function populateDashboard(latest, historyArr) {
        // Shared Chart.js Defaults
        Chart.defaults.color = '#94A3B8';
        Chart.defaults.font.family = 'Inter, sans-serif';

        // Extract metrics safely
        const total = latest.totalQuestions || 0;
        const correct = latest.correct || 0;
        const incorrect = latest.incorrect || 0;
        const skipped = latest.skipped || (total - correct - incorrect);
        const attempted = correct + incorrect;
        
        const accuracy = attempted > 0 ? ((correct / attempted) * 100).toFixed(1) : 0;
        const completion = total > 0 ? ((attempted / total) * 100).toFixed(1) : 0;

        // Populate Text Fields
        document.getElementById('latestQuizTitle').textContent = latest.topic || "General Quiz";
        document.getElementById('statAttempted').textContent = attempted;
        document.getElementById('statAccuracy').textContent = `${accuracy}%`;
        document.getElementById('statTotal').textContent = total;
        document.getElementById('statCompletion').textContent = `${completion}%`;

        // Populate Metrics Grid
        document.getElementById('mCorrect').textContent = correct;
        document.getElementById('mPartial').textContent = "0"; // Assuming no partial marks in this schema
        document.getElementById('mIncorrect').textContent = incorrect;
        document.getElementById('mSkipped').textContent = skipped;

        // Populate Progress Bars
        document.getElementById('barAccText').textContent = `${accuracy}%`;
        document.getElementById('barAccFill').style.width = `${accuracy}%`;
        document.getElementById('barAccSub').textContent = `${correct} correct out of ${attempted} attempted`;

        document.getElementById('barCompText').textContent = `${completion}%`;
        document.getElementById('barCompFill').style.width = `${completion}%`;
        document.getElementById('barCompSub').textContent = `${attempted} answered out of ${total} total`;

        // Render Donut Chart
        const pieCtx = document.getElementById('pieChart').getContext('2d');
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Partial', 'Incorrect', 'Skipped'],
                datasets: [{
                    data: [correct, 0, incorrect, skipped],
                    backgroundColor: ['#A7F3D0', '#FDE68A', '#FECDD3', '#BAE6FD'], 
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, cutout: '75%', plugins: { legend: { position: 'bottom', labels: { padding: 20, usePointStyle: true, boxWidth: 8 } } } }
        });

        // Render Line Chart
        const lineCtx = document.getElementById('lineChart').getContext('2d');
        let gradient = lineCtx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
        gradient.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

        // Prepare data from history array (Reverse to go oldest -> newest for the chart)
        const chartHistory = [...historyArr].reverse();
        const dates = chartHistory.map(h => new Date(h.timestamp).toLocaleDateString('en-GB', {day: 'numeric', month: 'short'}));
        const accuracies = chartHistory.map(h => {
            const att = h.correct + h.incorrect;
            return att > 0 ? ((h.correct / att) * 100).toFixed(1) : 0;
        });

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: dates,
                datasets: [{
                    label: 'Accuracy (%)',
                    data: accuracies,
                    borderColor: '#34D399',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4,
                    pointBackgroundColor: '#1E293B',
                    pointBorderColor: '#34D399',
                    pointBorderWidth: 2,
                    pointRadius: 4
                }]
            },
            options: { responsive: true, maintainAspectRatio: false, scales: { y: { beginAtZero: true, max: 100, grid: { color: 'rgba(255, 255, 255, 0.05)' }, title: { display: true, text: 'Accuracy (%)' } }, x: { grid: { display: false }, title: { display: true, text: 'Quiz Attempts' } } }, plugins: { legend: { display: false } } }
        });

        // Render History List
        const historyList = document.getElementById('historyList');
        historyList.innerHTML = historyArr.map(h => {
            const dt = new Date(h.timestamp);
            const dateStr = dt.toLocaleDateString('en-GB', {day: 'numeric', month: 'short', year: 'numeric'});
            const timeStr = dt.toLocaleTimeString('en-US', {hour: '2-digit', minute:'2-digit'});
            
            const att = h.correct + h.incorrect;
            const acc = att > 0 ? Math.round((h.correct / att) * 100) : 0;
            const skp = h.totalQuestions - att;
            
            return `
                <div class="history-item">
                    <div>
                        <div class="hist-date">${h.topic || "Quiz"}</div>
                        <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${dateStr} ${timeStr} • ${att}/${h.totalQuestions} Att / ${h.correct} Corr / ${h.incorrect} Wrng / ${skp} Skp</div>
                    </div>
                    <div style="text-align: right;">
                        <div class="hist-acc" style="color: ${acc === 0 ? '#FB7185' : '#34D399'};">${acc}%</div>
                        <div style="font-size: 11px; color: var(--text-secondary);">Accuracy</div>
                    </div>
                </div>
            `;
        }).join('');
    }
});
