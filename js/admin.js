import {
    db,
    auth
} from "./firebase.js";

import {
    collection,
    getDocs,
    getDoc,
    addDoc,
    updateDoc,
    deleteDoc,
    doc,
    query,
    orderBy,
    serverTimestamp
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-firestore.js";

import {
    signOut
} from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";

/* ============================================================
   DOUBT FACTORY ADMIN PANEL
   Version 2.0
============================================================ */

const STORAGE_KEY = "df_admin_draft";

/* ============================================================
   GLOBAL VARIABLES
============================================================ */

let editingDocId = null;
let isEditing = false;
let currentQuestions = [];

/* ============================================================
   FORM ELEMENTS
============================================================ */

const questionForm = document.getElementById("questionForm");

const saveButton = document.getElementById("saveButton");

const clearButton = document.getElementById("clearButton");

const subjectSelect = document.getElementById("subject");

const chapterSelect = document.getElementById("chapter");

const output = document.getElementById("output");

const formError = document.getElementById("formError");

const previewContainer =
    document.getElementById("preview");

const tableBody =
    document.querySelector("#questionsTable tbody");

/* ============================================================
   STATUS LABEL
============================================================ */

const statusLabel =
    document.getElementById("status");

/* ============================================================
   SAFE STATUS UPDATE
============================================================ */

function updateStatus(message){

    if(statusLabel){

        statusLabel.textContent = message;

    }

}

/* ============================================================
   TOAST
============================================================ */

function showToast(message,type="success"){

    const toast=document.createElement("div");

    toast.className=`toast ${type}`;

    toast.textContent=message;

    document.body.appendChild(toast);

    setTimeout(()=>{

        toast.classList.add("show");

    },50);

    setTimeout(()=>{

        toast.classList.remove("show");

        setTimeout(()=>{

            toast.remove();

        },300);

    },2500);

}

/* ============================================================
   SAVE BUTTON STATE
============================================================ */

function setSavingState(saving){

    if(!saveButton) return;

    saveButton.disabled=saving;

    saveButton.textContent=saving
        ? "Saving..."
        : (isEditing
            ? "Update Question"
            : "Save Question");

}

/* ============================================================
   LOAD QUESTIONS
============================================================ */

async function getQuestions(){

    const snapshot=await getDocs(
        collection(db,"questions")
    );

    const questions=[];

    snapshot.forEach(documentItem=>{

        questions.push({

            id:documentItem.id,

            ...documentItem.data()

        });

    });

    currentQuestions=questions;

    return questions;

}
/* ============================================================
   DASHBOARD
============================================================ */

async function updateDashboard(){

    try{

        const questions=await getQuestions();

        const uniqueSubjects=[
            ...new Set(
                questions
                .map(q=>q.subject)
                .filter(Boolean)
            )
        ];

        const uniqueChapters=[
            ...new Set(
                questions
                .map(q=>q.chapter)
                .filter(Boolean)
            )
        ];

        const uniqueExams=[
            ...new Set(
                questions
                .map(q=>q.exam)
                .filter(Boolean)
            )
        ];

        const totalVideos=
            questions.filter(q=>q.youtube).length;

        const totalQuestions=document.getElementById("totalQuestions");
        const chapterCount=document.getElementById("chapterCount");
        const totalVideosBox=document.getElementById("totalVideos");
        const commentCount=document.getElementById("commentCount");

        if(totalQuestions)
            totalQuestions.textContent=questions.length;

        if(chapterCount)
            chapterCount.textContent=uniqueChapters.length;

        if(totalVideosBox)
            totalVideosBox.textContent=totalVideos;

        if(commentCount)
            commentCount.textContent="0";

        renderRecentActivity(questions);

        renderAnalytics(questions);

    }catch(err){

        console.error(err);

    }

}

/* ============================================================
   RECENT ACTIVITY
============================================================ */

function renderRecentActivity(questions){

    const container=
        document.getElementById("recentActivity");

    if(!container) return;

    if(!questions.length){

        container.innerHTML=`
            <div class="empty-panel">
                No recent activity.
            </div>
        `;

        return;

    }

    const latest=
        [...questions]
        .reverse()
        .slice(0,5);

    container.innerHTML=
        latest.map(q=>`

        <div class="activity-item">

            <div>

                <strong>
                    ${(q.question||"Untitled")
                    .substring(0,60)}
                </strong>

                <p>

                    ${q.subject||"-"}

                    •

                    ${q.chapter||"-"}

                </p>

            </div>

            <span>

                ${q.exam||""}

            </span>

        </div>

    `).join("");

}

/* ============================================================
   ANALYTICS
============================================================ */

function renderAnalytics(questions){

    renderSubjectAnalytics(questions);

    renderExamAnalytics(questions);

}

/* ============================================================
   SUBJECT ANALYTICS
============================================================ */

function renderSubjectAnalytics(questions){

    const box=
        document.getElementById("subjectAnalytics");

    if(!box) return;

    const counts={};

    questions.forEach(q=>{

        if(!q.subject) return;

        counts[q.subject]=(counts[q.subject]||0)+1;

    });

    const keys=Object.keys(counts);

    if(!keys.length){

        box.innerHTML=`
        <div class="empty-panel">
            No subject data.
        </div>`;

        return;

    }

    const max=Math.max(...Object.values(counts));

    box.innerHTML=keys.map(subject=>{

        const width=
            (counts[subject]/max)*100;

        return`

        <div class="analytics-row">

            <div class="analytics-meta">

                <strong>${subject}</strong>

                <span>

                    ${counts[subject]}

                </span>

            </div>

            <div class="analytics-bar">

                <span
                    style="width:${width}%">
                </span>

            </div>

        </div>

        `;

    }).join("");

}

/* ============================================================
   EXAM ANALYTICS
============================================================ */

function renderExamAnalytics(questions){

    const box=
        document.getElementById("examAnalytics");

    if(!box) return;

    const counts={};

    questions.forEach(q=>{

        if(!q.exam) return;

        counts[q.exam]=(counts[q.exam]||0)+1;

    });

    const keys=Object.keys(counts);

    if(!keys.length){

        box.innerHTML=`
        <div class="empty-panel">
            No exam data.
        </div>`;

        return;

    }

    const max=Math.max(...Object.values(counts));

    box.innerHTML=keys.map(exam=>{

        const width=
            (counts[exam]/max)*100;

        return`

        <div class="analytics-row">

            <div class="analytics-meta">

                <strong>${exam}</strong>

                <span>

                    ${counts[exam]}

                </span>

            </div>

            <div class="analytics-bar">

                <span
                    style="width:${width}%">
                </span>

            </div>

        </div>

        `;

    }).join("");

}