import {
    auth,
    signInWithEmailAndPassword
} from "./firebase.js";

const email = document.getElementById("email");
const password = document.getElementById("password");
const loginBtn = document.getElementById("loginBtn");
const error = document.getElementById("error");

loginBtn.addEventListener("click", async () => {

    error.innerHTML = "";

    try {

        await signInWithEmailAndPassword(
            auth,
            email.value,
            password.value
        );

        window.location.href = "admin.html";

    } catch (err) {

        error.innerHTML = err.message;

    }

});