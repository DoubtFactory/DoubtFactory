import { auth } from "./firebase.js";
import { signInWithRedirect, getRedirectResult, GoogleAuthProvider, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/12.1.0/firebase-auth.js";

document.addEventListener("DOMContentLoaded", async () => {
    const googleBtn = document.getElementById("googleLoginBtn");
    const errorDisplay = document.getElementById("loginError");
    
    const provider = new GoogleAuthProvider();

    // 1. Ultimate Safety Net: If a user is already logged in, redirect them immediately.
    onAuthStateChanged(auth, (user) => {
        if (user) {
            const urlParams = new URLSearchParams(window.location.search);
            const redirectUrl = urlParams.get("redirect") || "profile-dashboard.html";
            window.location.href = redirectUrl;
        }
    });

    // 2. Check for any errors that might have occurred during the redirect process
    try {
        await getRedirectResult(auth);
    } catch (error) {
        console.error("Google Sign-In Error:", error);
        if (errorDisplay) {
            errorDisplay.textContent = "Authentication failed. Please try again.";
            errorDisplay.style.display = "block";
        }
        if (googleBtn) {
            googleBtn.disabled = false;
            googleBtn.style.opacity = "1";
        }
    }

    // 3. Handle the button click to start the login process
    if (googleBtn) {
        googleBtn.addEventListener("click", () => {
            googleBtn.disabled = true;
            googleBtn.style.opacity = "0.7";
            if (errorDisplay) errorDisplay.style.display = "none";

            // Use Redirect instead of Popup for strict mobile browsers
            signInWithRedirect(auth, provider).catch((error) => {
                console.error("Redirect trigger failed:", error);
                if (errorDisplay) {
                    errorDisplay.textContent = "Could not reach Google. Check connection.";
                    errorDisplay.style.display = "block";
                }
                googleBtn.disabled = false;
                googleBtn.style.opacity = "1";
            });
        });
    }
});
