import { auth } from "./firebase.js";
import { signInWithPopup, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", () => {
    const googleBtn = document.getElementById("googleLoginBtn");
    const errorDisplay = document.getElementById("loginError");
    
    // Initialize the Google Auth Provider
    const provider = new GoogleAuthProvider();

    googleBtn.addEventListener("click", async () => {
        try {
            // Disable button to prevent multiple clicks
            googleBtn.disabled = true;
            googleBtn.style.opacity = "0.7";
            errorDisplay.style.display = "none";

            // Trigger the Google Login Popup
            await signInWithPopup(auth, provider);

            // Check if the user was redirected here from a specific page
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get("redirect") || "explore-quizzes.html";
            
            // Send them to their destination
            window.location.href = redirectUrl;

        } catch (error) {
            console.error("Google Sign-In Error:", error);
            
            // Display error to the user
            errorDisplay.textContent = "Failed to sign in. Please try again.";
            errorDisplay.style.display = "block";
            
            // Re-enable the button
            googleBtn.disabled = false;
            googleBtn.style.opacity = "1";
        }
    });
});
