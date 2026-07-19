let allQuestions = [];
let filteredQuestions = [];
let currentPage = 1;
let questionsPerPage = 8;
let sortKey = "question";
let sortDirection = "asc";
let pendingDeleteId = null;

async function loadTable() {
    showLoading(true);

    try {
        const response = await fetch("data/questions.json");
        allQuestions = await response.json();
        populateFilters();
        applyFilters();
        showLoading(false);
        showToast("Questions loaded", "success");
    } catch (error) {
        showLoading(false);
        showEmptyState("Unable to load questions right now.");
        showToast("Unable to load questions.", "error");
    }
}

function showLoading(isLoading) {
    const loading = document.getElementById("tableLoading");
    const table = document.querySelector(".manage-table-card .question-table");
    const empty = document.getElementById("tableEmptyState");

    if (loading) {
        loading.hidden = !isLoading;
    }

    if (table) {
        table.style.display = isLoading ? "none" : "";
    }

    if (empty) {
        empty.hidden = true;
    }
}

function showEmptyState(message) {
    const empty = document.getElementById("tableEmptyState");
    const table = document.querySelector(".manage-table-card .question-table");
    const title = empty.querySelector("h3");
    const description = empty.querySelector("p");

    if (title) {
        title.textContent = message;
    }

    if (description) {
        description.textContent = "Try changing the search or filters to see more questions.";
    }

    if (empty) {
        empty.hidden = false;
    }

    if (table) {
        table.style.display = "none";
    }
}

function populateFilters() {
    const subjectSelect = document.getElementById("filterSubject");
    const chapterSelect = document.getElementById("filterChapter");
    const examSelect = document.getElementById("filterExam");
    const typeSelect = document.getElementById("filterType");

    const subjects = [...new Set(allQuestions.map(q => q.subject).filter(Boolean))].sort();
    const chapters = [...new Set(allQuestions.map(q => q.chapter).filter(Boolean))].sort();
    const exams = [...new Set(allQuestions.map(q => q.exam).filter(Boolean))].sort();
    const types = [...new Set(allQuestions.map(q => q.type).filter(Boolean))].sort();

    subjectSelect.innerHTML = '<option value="All">All Subjects</option>' + subjects.map(subject => `<option value="${subject}">${subject}</option>`).join("");
    chapterSelect.innerHTML = '<option value="All">All Chapters</option>' + chapters.map(chapter => `<option value="${chapter}">${chapter}</option>`).join("");
    examSelect.innerHTML = '<option value="All">All Exams</option>' + exams.map(exam => `<option value="${exam}">${exam}</option>`).join("");
    typeSelect.innerHTML = '<option value="All">All Types</option>' + types.map(type => `<option value="${type}">${type}</option>`).join("");
}

function applyFilters() {
    const keyword = document.getElementById("searchBox").value.toLowerCase();
    const subjectValue = document.getElementById("filterSubject").value;
    const chapterValue = document.getElementById("filterChapter").value;
    const examValue = document.getElementById("filterExam").value;
    const typeValue = document.getElementById("filterType").value;

    filteredQuestions = allQuestions.filter(q => {
        const matchesKeyword = !keyword ||
            (q.question && q.question.toLowerCase().includes(keyword)) ||
            (q.subject && q.subject.toLowerCase().includes(keyword)) ||
            (q.chapter && q.chapter.toLowerCase().includes(keyword)) ||
            (q.exam && q.exam.toLowerCase().includes(keyword));

        const matchesSubject = subjectValue === "All" || q.subject === subjectValue;
        const matchesChapter = chapterValue === "All" || q.chapter === chapterValue;
        const matchesExam = examValue === "All" || q.exam === examValue;
        const matchesType = typeValue === "All" || q.type === typeValue;

        return matchesKeyword && matchesSubject && matchesChapter && matchesExam && matchesType;
    });

    filteredQuestions = sortQuestions(filteredQuestions);
    currentPage = 1;
    updateQuestionCount();
    renderTable(filteredQuestions);
}

function sortQuestions(items) {
    const sorted = [...items];

    sorted.sort((a, b) => {
        const aValue = a[sortKey] ?? "";
        const bValue = b[sortKey] ?? "";

        if (typeof aValue === "number" && typeof bValue === "number") {
            return sortDirection === "asc" ? aValue - bValue : bValue - aValue;
        }

        const left = String(aValue).toLowerCase();
        const right = String(bValue).toLowerCase();

        return sortDirection === "asc"
            ? left.localeCompare(right)
            : right.localeCompare(left);
    });

    return sorted;
}

function renderTable(data) {
    const body = document.getElementById("questionTableBody");
    const empty = document.getElementById("tableEmptyState");
    const table = document.querySelector(".manage-table-card .question-table");
    const status = document.getElementById("tableStatus");
    const pagination = document.getElementById("paginationControls");

    body.innerHTML = "";

    if (!data.length) {
        if (empty) {
            empty.hidden = false;
        }
        if (table) {
            table.style.display = "none";
        }
        if (status) {
            status.textContent = "No questions match the current filters";
        }
        if (pagination) {
            pagination.innerHTML = "";
        }
        return;
    }

    if (table) {
        table.style.display = "";
    }

    if (empty) {
        empty.hidden = true;
    }

    const start = (currentPage - 1) * questionsPerPage;
    const pageItems = data.slice(start, start + questionsPerPage);

    pageItems.forEach(q => {
        body.innerHTML += `
            <tr>
                <td>${q.question || "Untitled question"}</td>
                <td>${q.subject || "—"}</td>
                <td>${q.chapter || "—"}</td>
                <td>${q.exam || "—"}</td>
                <td>${q.type || "—"}</td>
                <td>${q.year || q.date || "—"}</td>
                <td>
                    <div class="manage-actions">
                        <button class="manage-action-btn preview-btn" data-action="preview" data-id="${q.id}">Preview</button>
                        <button class="manage-action-btn edit-btn" data-action="edit" data-id="${q.id}">Edit</button>
                        <button class="manage-action-btn delete-btn" data-action="delete" data-id="${q.id}">Delete</button>
                    </div>
                </td>
            </tr>
        `;
    });

    if (status) {
        const startLabel = pageItems.length ? start + 1 : 0;
        status.textContent = `Showing ${startLabel}-${Math.min(start + pageItems.length, data.length)} of ${data.length} questions`;
    }

    renderPagination(data.length);
}

function renderPagination(totalItems) {
    const pagination = document.getElementById("paginationControls");
    const totalPages = Math.max(1, Math.ceil(totalItems / questionsPerPage));

    if (totalPages <= 1) {
        pagination.innerHTML = "";
        return;
    }

    let html = `<button type="button" class="page-btn" data-page="${Math.max(1, currentPage - 1)}" ${currentPage === 1 ? "disabled" : ""}>Previous</button>`;

    for (let index = 1; index <= totalPages; index += 1) {
        html += `<button type="button" class="page-btn ${index === currentPage ? "active" : ""}" data-page="${index}">${index}</button>`;
    }

    html += `<button type="button" class="page-btn" data-page="${Math.min(totalPages, currentPage + 1)}" ${currentPage === totalPages ? "disabled" : ""}>Next</button>`;

    pagination.innerHTML = html;
}

function updateQuestionCount() {
    const count = document.getElementById("questionCount");
    if (count) {
        count.textContent = filteredQuestions.length;
    }
}

function showToast(message, type = "success") {
    const toast = document.getElementById("manageToast");
    toast.textContent = message;
    toast.className = `manage-toast show ${type}`;
    clearTimeout(showToast.timeout);
    showToast.timeout = setTimeout(() => {
        toast.className = "manage-toast";
    }, 2200);
}

function deleteQuestion(id) {
    pendingDeleteId = id;
    const modal = document.getElementById("deleteModal");
    const message = document.getElementById("deleteModalText");
    if (message) {
        message.textContent = "This action will remove the question from the current list.";
    }
    if (modal) {
        modal.hidden = false;
    }
}

function handleActionClick(event) {
    const button = event.target.closest("button[data-action]");
    if (!button) {
        return;
    }

    const action = button.getAttribute("data-action");
    const id = Number(button.getAttribute("data-id"));
    const question = allQuestions.find(item => item.id === id);

    if (!question) {
        return;
    }

    if (action === "delete") {
        deleteQuestion(id);
        return;
    }

    if (action === "preview") {
        const previewText = question.question || "No question available";
        showToast(`Preview: ${previewText}`, "success");
        return;
    }

    if (action === "edit") {
        const updatedText = window.prompt("Edit the question text", question.question || "");
        if (updatedText === null) {
            return;
        }

        const target = allQuestions.find(item => item.id === id);
        if (target) {
            target.question = updatedText;
            applyFilters();
            showToast("Question updated", "success");
        }
    }
}

document.getElementById("searchBox").addEventListener("input", applyFilters);

document.getElementById("refreshButton").addEventListener("click", () => {
    loadTable();
    showToast("Refreshed questions", "success");
});

["filterSubject", "filterChapter", "filterExam", "filterType"].forEach(id => {
    document.getElementById(id).addEventListener("change", applyFilters);
});

document.querySelector(".manage-table-card").addEventListener("click", handleActionClick);
document.querySelector(".manage-pagination").addEventListener("click", function (event) {
    const button = event.target.closest("button[data-page]");
    if (!button) {
        return;
    }

    currentPage = Number(button.getAttribute("data-page"));
    renderTable(filteredQuestions);
});

document.getElementById("cancelDeleteButton").addEventListener("click", () => {
    document.getElementById("deleteModal").hidden = true;
    pendingDeleteId = null;
});

document.getElementById("confirmDeleteButton").addEventListener("click", () => {
    if (pendingDeleteId !== null) {
        allQuestions = allQuestions.filter(item => item.id !== pendingDeleteId);
        applyFilters();
        showToast("Question deleted", "success");
    }
    document.getElementById("deleteModal").hidden = true;
    pendingDeleteId = null;
});

document.querySelector(".manage-table-card").addEventListener("click", function (event) {
    const button = event.target.closest(".sort-btn");
    if (!button) {
        return;
    }

    sortKey = button.getAttribute("data-sort") || "question";
    sortDirection = sortDirection === "asc" ? "desc" : "asc";
    filteredQuestions = sortQuestions(filteredQuestions);
    renderTable(filteredQuestions);
});

loadTable();