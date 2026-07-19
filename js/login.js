import {
    auth,
    signInWithEmailAndPassword
} from "./firebase.js";

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const error = document.getElementById("error");

loginBtn.addEventListener("click", async () => {

    error.textContent = "";

    try {

        await signInWithEmailAndPassword(
            auth,
            email.value.trim(),
            password.value
        );

        window.location.href = "admin.html";

    } catch (err) {

        console.error(err);

        error.textContent =
            "Invalid email or password.";

    }

});