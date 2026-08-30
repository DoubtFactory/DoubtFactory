import { auth } from "./firebase.js";
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const googleBtn = document.getElementById("googleLoginBtn");
    const errorDisplay = document.getElementById("loginError");
    
    const provider = new GoogleAuthProvider();

    // 1. Check if the user just returned from the Google Login page
    try {
        const result = await getRedirectResult(auth);
        if (result) {
            // Success! Send them to their destination
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get("redirect") || "explore-quizzes.html";
            window.location.href = redirectUrl;
            return;
        }
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        errorDisplay.textContent = "Authentication failed. Please try again.";
        errorDisplay.style.display = "block";
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.style.opacity = "1";
        }
    }

    // 2. Handle the button click to start the login process
    if (googleBtn) {
        googleBtn.addEventListener("click", () => {
            googleBtn.disabled = true;
            googleBtn.style.opacity = "0.7";
            errorDisplay.style.display = "none";

            // Use Redirect instead of Popup for strict mobile browsers
            signInWithRedirect(auth, provider).catch((error) => {
                console.error("Redirect trigger failed:", error);
                errorDisplay.textContent = "Could not reach Google. Check connection.";
                errorDisplay.style.display = "block";
                googleBtn.disabled = false;
                googleBtn.style.opacity = "1";
            });
        });
    }
});
