import { auth, onAuthStateChanged, db } from "./firebase.js";

document.addEventListener("DOMContentLoaded", () => {
    
    // 1. Auth Guard
    onAuthStateChanged(auth, (user) => {
        if (!user) {
            window.location.href = "login.html?redirect=quiz-results.html";
            return;
        }
        renderDashboard();
    });

    function renderDashboard() {
        // Shared Chart.js Defaults for Dark Theme
        Chart.defaults.color = '#94A3B8';
        Chart.defaults.font.family = 'Inter, sans-serif';

        // 2. Render Donut Chart (Answer Breakdown)
        const pieCtx = document.getElementById('pieChart').getContext('2d');
        new Chart(pieCtx, {
            type: 'doughnut',
            data: {
                labels: ['Correct', 'Partial', 'Incorrect', 'Skipped'],
                datasets: [{
                    data: [4, 0, 1, 3], // Replace with dynamic Firebase data
                    backgroundColor: ['#A7F3D0', '#FDE68A', '#FECDD3', '#BAE6FD'], // Pastel matching ref
                    borderWidth: 0,
                    hoverOffset: 4
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                cutout: '75%',
                plugins: {
                    legend: {
                        position: 'bottom',
                        labels: { padding: 20, usePointStyle: true, boxWidth: 8 }
                    }
                }
            }
        });

        // 3. Render Line Chart (Attempt Trend)
        const lineCtx = document.getElementById('lineChart').getContext('2d');
        
        // Create Gradient for Line Chart
        let gradient = lineCtx.createLinearGradient(0, 0, 0, 400);
        gradient.addColorStop(0, 'rgba(52, 211, 153, 0.4)');
        gradient.addColorStop(1, 'rgba(52, 211, 153, 0.0)');

        new Chart(lineCtx, {
            type: 'line',
            data: {
                labels: ['Oct 24', 'Nov 12', 'Jan 05', 'Mar 15', 'Apr 11'], // Historic Dates
                datasets: [{
                    label: 'Accuracy (%)',
                    data: [0, 15, 28.6, 60, 80],
                    borderColor: '#34D399',
                    backgroundColor: gradient,
                    borderWidth: 3,
                    fill: true,
                    tension: 0.4, // Smooth curves
                    pointBackgroundColor: '#1E293B',
                    pointBorderColor: '#34D399',
                    pointBorderWidth: 2,
                    pointRadius: 4,
                    pointHoverRadius: 6
                }]
            },
            options: {
                responsive: true,
                maintainAspectRatio: false,
                scales: {
                    y: {
                        beginAtZero: true,
                        max: 100,
                        grid: { color: 'rgba(255, 255, 255, 0.05)' },
                        title: { display: true, text: 'Accuracy (%)' }
                    },
                    x: {
                        grid: { display: false },
                        title: { display: true, text: 'Quiz Attempts' }
                    }
                },
                plugins: { legend: { display: false } }
            }
        });

        // 4. Render History List
        const historyList = document.getElementById('historyList');
        const mockHistory = [
            { date: "Apr 11, 2026", time: "12:23 PM", acc: "80%", detail: "5/8 Attempted / 4 Correct / 1 Wrong / 3 Skipped" },
            { date: "Mar 15, 2026", time: "09:14 AM", acc: "60%", detail: "8/8 Attempted / 5 Correct / 3 Wrong / 0 Skipped" },
            { date: "Oct 24, 2025", time: "05:29 PM", acc: "0%", detail: "0/8 Attempted / 0 Correct / 0 Wrong / 8 Skipped" }
        ];

        historyList.innerHTML = mockHistory.map(h => `
            <div class="history-item">
                <div>
                    <div class="hist-date">${h.date} <span class="hist-time">${h.time}</span></div>
                    <div style="font-size: 12px; color: var(--text-secondary); margin-top: 4px;">${h.detail}</div>
                </div>
                <div style="text-align: right;">
                    <div class="hist-acc" style="color: ${h.acc === '0%' ? '#FB7185' : '#34D399'};">${h.acc}</div>
                    <div style="font-size: 11px; color: var(--text-secondary);">Accuracy</div>
                </div>
            </div>
        `).join('');
    }
});
