import { getQuestions } from "./firebase.js";

document.addEventListener("DOMContentLoaded", async () => {
    const grid = document.getElementById("subjectGrid");
    
    // Stop the script if we aren't on the subjects page
    if (!grid) return;

    grid.innerHTML = "<p style='text-align:center; color:#64748b; grid-column: 1 / -1;'>Loading subjects...</p>";

    try {
        // 1. Fetch all questions to calculate live question counts
        const questions = await getQuestions();

        // 2. Tally up how many questions exist for each subject
        const counts = {
            "Physics": 0,
            "Physical Chemistry": 0,
            "Organic Chemistry": 0,
            "Inorganic Chemistry": 0,
            "Maths": 0,
            "Botany": 0,
            "Zoology": 0
        };

        questions.forEach(q => {
            if (q.subject && counts[q.subject] !== undefined) {
                counts[q.subject]++;
            } else if (q.subject) {
                counts[q.subject] = 1; // Catches any custom subjects you might add later
            }
        });

        // 3. Define the UI and descriptions for all subjects
        const subjects = [
            {
                name: "Physics",
                icon: "🧲",
                desc: "Master mechanics, electrostatics, optics, and modern physics for JEE & NEET.",
                color: "#ef4444", // Red
                bg: "#fef2f2"
            },
            {
                name: "Physical Chemistry",
                icon: "⚗️",
                desc: "Master thermodynamics, equilibrium, chemical kinetics, and numerical problem-solving for JEE & NEET.",
                color: "#3b82f6", // Blue
                bg: "#eff6ff"
            },
            {
                name: "Organic Chemistry",
                icon: "🧬",
                desc: "Excel in reaction mechanisms, IUPAC nomenclature, isomerism, and practical organic chemistry.",
                color: "#10b981", // Green
                bg: "#ecfdf5"
            },
            {
                name: "Inorganic Chemistry",
                icon: "📊",
                desc: "Conquer periodic trends, chemical bonding, coordination compounds, and s/p/d/f block elements.",
                color: "#8b5cf6", // Purple
                bg: "#f5f3ff"
            },
            {
                name: "Maths",
                icon: "📐",
                desc: "Conquer calculus, algebra, coordinate geometry, and vectors for JEE Main & Advanced.",
                color: "#f59e0b", // Amber
                bg: "#fffbeb"
            },
            {
                name: "Botany",
                icon: "🌿",
                desc: "Master plant physiology, genetics, ecology, and cell biology for NEET preparation.",
                color: "#059669", // Emerald
                bg: "#ecfdf5"
            },
            {
                name: "Zoology",
                icon: "🔬",
                desc: "Excel in human physiology, human reproduction, animal kingdom, and evolution for NEET.",
                color: "#06b6d4", // Cyan
                bg: "#ecfeff"
            }
        ];

        // 4. Set up the grid layout
        grid.innerHTML = "";
        grid.style.cssText = "display: grid; grid-template-columns: repeat(auto-fit, minmax(320px, 1fr)); gap: 30px; padding: 20px 0; margin-bottom: 60px;";

        // 5. Generate a beautiful card for each subject
        subjects.forEach(sub => {
            const count = counts[sub.name] || 0;
            
            const card = document.createElement("a");
            // Links to the chapter selection page for that specific subject
            card.href = `chapter.html?subject=${encodeURIComponent(sub.name)}`;
            card.style.cssText = `display: flex; flex-direction: column; padding: 30px; background: white; border: 1px solid #e2e8f0; border-radius: 16px; text-decoration: none; color: inherit; transition: all 0.3s ease; box-shadow: 0 4px 6px rgba(0,0,0,0.02); position: relative; overflow: hidden;`;
            
            // Interactive Hover Effects
            card.onmouseover = () => {
                card.style.transform = "translateY(-5px)";
                card.style.boxShadow = "0 15px 30px rgba(0,0,0,0.08)";
                card.style.borderColor = sub.color;
            };
            card.onmouseout = () => {
                card.style.transform = "translateY(0)";
                card.style.boxShadow = "0 4px 6px rgba(0,0,0,0.02)";
                card.style.borderColor = "#e2e8f0";
            };

            // Build the card's HTML
            card.innerHTML = `
                <div style="width: 60px; height: 60px; background: ${sub.bg}; color: ${sub.color}; border-radius: 12px; display: flex; align-items: center; justify-content: center; font-size: 28px; margin-bottom: 20px;">
                    ${sub.icon}
                </div>
                <h2 style="font-size: 24px; color: #0f172a; margin: 0 0 10px 0; font-weight: 700;">${sub.name}</h2>
                <p style="color: #64748b; line-height: 1.6; margin: 0 0 20px 0; flex-grow: 1; font-size: 15px;">${sub.desc}</p>
                <div style="display: flex; justify-content: space-between; align-items: center; margin-top: auto; padding-top: 20px; border-top: 1px solid #f1f5f9;">
                    <span style="font-size: 14px; font-weight: 600; color: #64748b; background: #f8fafc; padding: 4px 10px; border-radius: 6px;">${count} Questions</span>
                    <span style="font-size: 15px; font-weight: 700; color: ${sub.color};">Explore Chapters →</span>
                </div>
            `;
            
            grid.appendChild(card);
        });

    } catch (error) {
        console.error("Error loading subjects:", error);
        grid.innerHTML = "<p style='text-align:center; color:#ef4444; grid-column: 1 / -1;'>Failed to load subjects. Please check your connection.</p>";
    }
});
