const toggle = document.getElementById("themeToggle");

if(localStorage.getItem("theme") === "dark"){
    document.body.classList.add("dark");

    if(toggle){
        toggle.textContent="☀️";
    }
}

toggle?.addEventListener("click",()=>{

    document.body.classList.toggle("dark");

    if(document.body.classList.contains("dark")){

        localStorage.setItem("theme","dark");

        toggle.textContent="☀️";

    }else{

        localStorage.setItem("theme","light");

        toggle.textContent="🌙";

    }

});