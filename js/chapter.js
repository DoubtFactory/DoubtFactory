const chapters = {

    "Physical Chemistry": [
    "Some Basic Concepts of Chemistry (Mole Concept)",
    "Atomic Structure",
    "States of Matter (Gaseous State)",
    "Thermodynamics",
    "Thermochemistry",
    "Chemical Equilibrium",
    "Ionic Equilibrium",
    "Redox Reactions",
    "Electrochemistry",
    "Chemical Kinetics",
    "Solutions",
    "Surface Chemistry",
    "Solid State"
],

   "Organic Chemistry": [
    "General Organic Chemistry (GOC)",
    "Nomenclature",
    "Isomerism",
    "Hydrocarbons",
    "Haloalkanes and Haloarenes",
    "Alcohols, Phenols and Ethers",
    "Aldehydes and Ketones",
    "Carboxylic Acids and Derivatives",
    "Amines",
    "Biomolecules",
    "Polymers",
    "Chemistry in Everyday Life",
    "Practical Organic Chemistry"
],

   "Inorganic Chemistry": [
    "Periodic Table",
    "Chemical Bonding",
    "Hydrogen",
    "s-Block Elements",
    "p-Block Elements",
    "d-Block Elements",
    "f-Block Elements",
    "Coordination Compounds",
    "Metallurgy",
    "Qualitative Analysis",
    "Environmental Chemistry"
],

};

const params = new URLSearchParams(window.location.search);

const subject = params.get("subject");

document.getElementById("subjectTitle").textContent = subject;

const grid = document.getElementById("chapterGrid");

chapters[subject].forEach(chapter => {

   grid.innerHTML += `
    <a href="questions.html?subject=${encodeURIComponent(subject)}&chapter=${encodeURIComponent(chapter)}"
       class="chapter-card">
        ${chapter}
    </a>
`;

});