import { auth } from "./firebase.js";
import { signInWithPopup, GoogleAuthProvider, onAuthStateChanged, setPersistence, browserLocalPersistence } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleLoginBtn");
    const errorDisplay = document.getElementById("loginError");
    
    const provider = new GoogleAuthProvider();

    // 1. Instantly redirect if the browser detects an active session
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get("redirect") || "profile-dashboard.html";
            window.location.href = redirectUrl;
        }
    });

    // 2. Handle the button click
    if (googleBtn) {
        googleBtn.addEventListener("click", async () => {
            try {
                // UI update
                googleBtn.disabled = true;
                googleBtn.style.opacity = "0.7";
                if (errorDisplay) errorDisplay.style.display = "none";

                // Step A: Force the browser to remember this login permanently
                await setPersistence(auth, browserLocalPersistence);
                
                // Step B: Use Popup triggered by a DIRECT click (bypasses Safari tracking blocks)
                await signInWithPopup(auth, provider);
                
                // Note: We don't need a redirect code here because the onAuthStateChanged 
                // listener at the top will automatically fire and move the user!

            } catch (error) {
                console.error("Google Sign-In Error:", error);
                
                if (errorDisplay) {
                    // Catch popup blockers or closed windows
                    if (error.code === 'auth/popup-closed-by-user') {
                        errorDisplay.textContent = "Sign-in cancelled. Please try again.";
                    } else {
                        errorDisplay.textContent = "Login blocked by browser. Please try again.";
                    }
                    errorDisplay.style.display = "block";
                }
                
                // Reset button
                googleBtn.disabled = false;
                googleBtn.style.opacity = "1";
            }
        });
    }
});
