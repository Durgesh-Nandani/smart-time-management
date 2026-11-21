
const API_URL = "/api/tasks";
let allTasks = [];

// Page load hote hi tasks dikhao
document.addEventListener("DOMContentLoaded", () => {

    const taskList = document.getElementById("taskList");

    // Sirf My Tasks page par task functions chalao
    if (taskList) {

        if (navigator.onLine) {
            syncOfflineTasks().then(() => loadTasks());
        } else {
            loadTasks();
        }

        const taskForm = document.getElementById("taskForm");
        const searchInput = document.getElementById("searchInput");
        const priorityFilter = document.getElementById("priorityFilter");
        const statusFilter = document.getElementById("statusFilter");
        const sortTasks = document.getElementById("sortTasks");

        if (taskForm) {
            taskForm.addEventListener("submit", addTask);
        }

        if (searchInput) {
            searchInput.addEventListener("input", applyFilters);
        }

        if (priorityFilter) {
            priorityFilter.addEventListener("change", applyFilters);
        }

        if (statusFilter) {
            statusFilter.addEventListener("change", applyFilters);
        }

        if (sortTasks) {
            sortTasks.addEventListener("change", applyFilters);
        }
    }
});
function applyFilters() {
    const searchText = document.getElementById("searchInput").value.toLowerCase();
    const priority = document.getElementById("priorityFilter").value;
    const status = document.getElementById("statusFilter").value;
    const sortBy = document.getElementById("sortTasks").value;

    const params = new URLSearchParams(window.location.search);
    const category = params.get("filter");

    let filteredTasks = allTasks.filter(task => {
        const matchesSearch =
            (task.title || "").toLowerCase().includes(searchText) ||
            (task.description || "").toLowerCase().includes(searchText);

        const matchesPriority =
            priority === "All" || (task.priority || "Medium") === priority;

        const matchesStatus =
            status === "All" || (task.status || "Pending") === status;

        const matchesCategory =
            category === "pending"
                ? !task.completed
                : category === "completed"
                    ? task.completed
                    : true;

        return matchesSearch && matchesPriority &&
               matchesStatus && matchesCategory;
    });
    if (sortBy === "dueDate") {
        filteredTasks.sort((a, b) => {
            if (!a.dueDate) return 1;
            if (!b.dueDate) return -1;
            return new Date(a.dueDate) - new Date(b.dueDate);
        });
    }

    else if (sortBy === "priority") {
        const order = {High: 1, Medium: 2, Low: 3};
        filteredTasks.sort((a, b) =>
            (order[a.priority] || 2) - (order[b.priority] || 2)
        );
    }

    else if (sortBy === "latest") {
        filteredTasks.sort((a, b) => b.id - a.id);
    }

    displayTasks(filteredTasks);
}

// Database se saare tasks lana
async function loadTasks() {
    try {
        const response = await fetch(API_URL);

        if (!response.ok) {
            throw new Error("Tasks load nahi hue");
        }

        const tasks = await response.json();

        allTasks = tasks;

        await saveTasksOffline(tasks);

        if (document.getElementById("taskList")) {
            applyFilters();
        }       
        updateSummary(tasks);

    } catch (error) {
        console.log("Server available nahi hai. Offline tasks load ho rahe hain.");

        try {
            const tasks = await getOfflineTasks();

            allTasks = tasks;

            if (document.getElementById("taskList")) {
                applyFilters();
            }
            updateSummary(tasks);

        } catch (offlineError) {
            console.error("Offline tasks bhi load nahi hue:", offlineError);
        }
    }
}

// Naya task add karna
async function addTask(event) {
    event.preventDefault();

    const dateValue = document.getElementById("dueDate").value;

    const task = {
        title: document.getElementById("title").value,
        description: document.getElementById("description").value,
        dueDate: dateValue ? dateValue + ":00" : null,
        priority: document.getElementById("priority").value,
        status: "Pending",
        completed: false
    };

    // Internet available hai to server par save karo
    if (navigator.onLine) {
        try {
            const response = await fetch(API_URL, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify(task)
            });

            if (!response.ok) {
                throw new Error("Task save nahi hua");
            }

            document.getElementById("taskForm").reset();
            alert("Task successfully added!");
            loadTasks();

        } catch (error) {
            alert("Task save nahi hua. Please try again.");
            console.error(error);
        }

    } else {
        // Internet nahi hai to IndexedDB mein save karo
        try {
            const offlineTasks = await getOfflineTasks();

            task.id = "offline-" + Date.now();
            task.pendingSync = true;

            offlineTasks.push(task);

            await saveTasksOffline(offlineTasks);

            allTasks = offlineTasks;
            displayTasks(allTasks);
            updateSummary(allTasks);

            document.getElementById("taskForm").reset();

            alert("Task saved offline! It will sync when internet is available.");

        } catch (error) {
            alert("Offline task save nahi hua.");
            console.error(error);
        }
    }
}
// Tasks ko website par dikhana
function displayTasks(tasks) {
    const taskList = document.getElementById("taskList");

    taskList.innerHTML = "";

    if (tasks.length === 0) {
        taskList.innerHTML =
            "<p>No tasks available. Add your first task!</p>";
        return;
    }

    tasks.forEach(task => {

        const taskItem = document.createElement("div");
        taskItem.className = "task-item";

        const title = document.createElement("h3");
        title.textContent = task.title;

        const description = document.createElement("p");
        description.textContent = task.description || "";

        // Due Date display
        const dueDate = document.createElement("p");

        dueDate.textContent = task.dueDate
            ? "Due Date: " + task.dueDate.replace("T", " ")
            : "No Due Date";

        const details = document.createElement("p");

        details.textContent =
            "Priority: " + (task.priority || "Medium") +
            " | Status: " + (task.status || "Pending");

        // Edit button
        const editButton = document.createElement("button");
        editButton.textContent = "Edit";

        editButton.addEventListener("click", () => {
            editTask(task);
        });

        // Complete button
        const completeButton = document.createElement("button");

        completeButton.textContent = task.completed
            ? "Mark as Pending"
            : "Mark as Completed";

        completeButton.addEventListener("click", () => {
            completeTask(task);
        });

        // Delete button
        const deleteButton = document.createElement("button");
        deleteButton.textContent = "Delete";

        deleteButton.addEventListener("click", () => {
    alert("Delete button clicked!");
    deleteTask(task.id);
});

        taskItem.append(
            title,
            description,
            dueDate,
            details,
            editButton,
            completeButton,
            deleteButton
        );

        taskList.appendChild(taskItem);
    });
}

// Task ko complete karna

async function completeTask(task) {

    const isNowCompleted = !task.completed;

    const updatedTask = {
        ...task,
        completed: isNowCompleted,
        status: isNowCompleted ? "Completed" : "Pending"
    };

    // Offline mode
    if (!navigator.onLine) {
        try {
            const offlineTasks = await getOfflineTasks();

            const updatedTasks = offlineTasks.map(item =>
                String(item.id) === String(task.id)
                    ? { ...updatedTask, pendingSync: true }
                    : item
            );

            await saveTasksOffline(updatedTasks);

            allTasks = updatedTasks;
            displayTasks(allTasks);
            updateSummary(allTasks);

            alert(isNowCompleted
                ? "Task completed offline!"
                : "Task moved to Pending offline!");

        } catch (error) {
            alert("Task status update nahi hua.");
            console.error(error);
        }

        return;
    }

    // Online mode: unsynced task
    if (task.pendingSync || String(task.id).startsWith("offline-")) {
        try {
            const offlineTasks = await getOfflineTasks();

            const updatedTasks = offlineTasks.map(item =>
                String(item.id) === String(task.id)
                    ? { ...updatedTask, pendingSync: true }
                    : item
            );

            await saveTasksOffline(updatedTasks);

            await syncOfflineTasks();
            await loadTasks();

            alert("Task status updated successfully!");

        } catch (error) {
            alert("Task status update nahi hua.");
            console.error(error);
        }

        return;
    }

    // Normal online task
    try {
        const response = await fetch(`${API_URL}/${task.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedTask)
        });

        if (!response.ok) {
            throw new Error("Task update nahi hua");
        }

        await loadTasks();

        alert("Task status updated successfully!");

    } catch (error) {
        alert("Task status update nahi hua.");
        console.error(error);
    }
}

// Task edit karna
async function editTask(task) {

    const newTitle = prompt(
        "Enter new task title:",
        task.title
    );

    if (newTitle === null || newTitle.trim() === "") return;

    const newDescription = prompt(
        "Enter new description:",
        task.description || ""
    );

    if (newDescription === null) return;

const newDueDate = await new Promise(resolve => {
    const overlay = document.createElement("div");

    overlay.style.cssText = `
        position: fixed;
        inset: 0;
        background: rgba(0,0,0,0.6);
        display: flex;
        align-items: center;
        justify-content: center;
        z-index: 99999;
    `;

    const box = document.createElement("div");
    box.style.cssText = `
        background: white;
        padding: 24px;
        border-radius: 12px;
        display: grid;
        gap: 15px;
        width: min(320px, 90%);
    `;

    const heading = document.createElement("h3");
    heading.textContent = "Select Due Date & Time";

    const dateInput = document.createElement("input");
    dateInput.type = "datetime-local";
    dateInput.value = task.dueDate
        ? task.dueDate.slice(0, 16)
        : "";
    dateInput.style.padding = "10px";

    const saveButton = document.createElement("button");
    saveButton.textContent = "Save Date";

    const clearButton = document.createElement("button");
clearButton.textContent = "Clear Date";

const cancelButton = document.createElement("button");
cancelButton.textContent = "Cancel";
    function close(value) {
        overlay.remove();
        resolve(value);
    }

    saveButton.onclick = () => close(dateInput.value);
    cancelButton.onclick = () => close(null);
    clearButton.onclick = () => close("");

    box.append(heading, dateInput, saveButton, clearButton, cancelButton);
    overlay.appendChild(box);
    document.body.appendChild(overlay);
});

if (newDueDate === null) return;
    const newPriority = prompt(
        "Enter priority (High, Medium, Low):",
        task.priority || "Medium"
    );

    if (newPriority === null) return;

    const updatedTask = {
        ...task,
        title: newTitle.trim(),
        description: newDescription,
        dueDate: newDueDate.trim()
            ? newDueDate.trim() + (newDueDate.trim().length === 16 ? ":00" : "")
            : null,
        priority: newPriority.trim()
    };

    // Offline editing
    if (!navigator.onLine) {
        try {
            const offlineTasks = await getOfflineTasks();

            const updatedTasks = offlineTasks.map(item =>
                item.id === task.id
                    ? { ...updatedTask, pendingSync: true }
                    : item
            );

            await saveTasksOffline(updatedTasks);

            allTasks = updatedTasks;
            displayTasks(allTasks);
            updateSummary(allTasks);

            alert("Task updated offline!");

        } catch (error) {
            alert("Offline task update nahi hua.");
            console.error(error);
        }

        return;
    }

    // Online editing
    try {
        if (task.pendingSync || String(task.id).startsWith("offline-")) {
            const offlineTasks = await getOfflineTasks();

            const updatedTasks = offlineTasks.map(item =>
                item.id === task.id
                    ? { ...updatedTask, pendingSync: true }
                    : item
            );

            await saveTasksOffline(updatedTasks);

            allTasks = updatedTasks;
            displayTasks(allTasks);
            updateSummary(allTasks);

            await syncOfflineTasks();
            await loadTasks();

            alert("Task updated and synced successfully!");
            return;
        }

        const response = await fetch(`${API_URL}/${task.id}`, {
            method: "PUT",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(updatedTask)
        });

        if (!response.ok) {
            throw new Error("Task update failed");
        }

        alert("Task updated successfully!");
        loadTasks();

    } catch (error) {
        alert("Task could not be updated.");
        console.error(error);
    }
}

// Dashboard ke numbers update karna
function updateSummary(tasks) {
    const total = tasks.length;

    const completed = tasks.filter(
        task => task.completed
    ).length;

    const pending = total - completed;

    const totalElement = document.getElementById("totalTasks");
    const pendingElement = document.getElementById("pendingTasks");
    const completedElement = document.getElementById("completedTasks");

    if (totalElement) totalElement.textContent = total;
    if (pendingElement) pendingElement.textContent = pending;
    if (completedElement) completedElement.textContent = completed;
}

// Task delete karna
async function syncOfflineTasks() {
    if (!navigator.onLine) return;

    const tasks = await getOfflineTasks();

    for (const task of tasks) {
        if (!task.pendingSync) continue;

        try {
            // Offline delete ko server par sync karo
            if (task.action === "DELETE") {
                const response = await fetch(
                    `${API_URL}/${task.deleteId}`,
                    { method: "DELETE" }
                );

                if (!response.ok) {
                    console.error("Delete sync nahi hua:", task.deleteId);
                    continue;
                }

                const latestTasks = await getOfflineTasks();

                await saveTasksOffline(
                    latestTasks.filter(item => item.id !== task.id)
                );

                console.log("Delete synced:", task.deleteId);
                continue;
            }

            const isNewTask = String(task.id).startsWith("offline-");

            const { id, pendingSync, ...taskData } = task;

            const response = await fetch(
                isNewTask ? API_URL : `${API_URL}/${id}`,
                {
                    method: isNewTask ? "POST" : "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(taskData)
                }
            );

            if (!response.ok) {
                console.error("Task sync nahi hua:", task.title);
                continue;
            }

            const latestTasks = await getOfflineTasks();
            let updatedTasks;

            if (isNewTask) {
                const savedTask = await response.json();

                updatedTasks = latestTasks.filter(item => item.id !== id);
                updatedTasks.push(savedTask);
            } else {
                updatedTasks = latestTasks.map(item => {
                    if (item.id === id) {
                        const { pendingSync, ...cleanTask } = item;
                        return cleanTask;
                    }
                    return item;
                });
            }

            await saveTasksOffline(updatedTasks);

            console.log("Task synced:", task.title);

        } catch (error) {
            console.error("Sync error:", error);
        }
    }
}
async function deleteTask(taskId) {
    const confirmDelete = confirm("Do you want to delete your task?");

    if (!confirmDelete) return;

    try {
        const task = allTasks.find(item => String(item.id) === String(taskId));

        if (!task) {
            alert("Task not found.");
            return;
        }

        // Internet OFF hone par
        if (!navigator.onLine) {
            const offlineTasks = await getOfflineTasks();

            let updatedTasks;

            if (String(taskId).startsWith("offline-")) {
                updatedTasks = offlineTasks.filter(
                    item => String(item.id) !== String(taskId)
                );
            } else {
                updatedTasks = offlineTasks.filter(
                    item => String(item.id) !== String(taskId)
                );

                updatedTasks.push({
                    id: "delete-" + taskId + "-" + Date.now(),
                    action: "DELETE",
                    deleteId: taskId,
                    pendingSync: true
                });
            }

            await saveTasksOffline(updatedTasks);

            allTasks = allTasks.filter(
                item => String(item.id) !== String(taskId)
            );

            displayTasks(allTasks);
            updateSummary(allTasks);
            return;
        }

        // Internet ON hone par
        const response = await fetch(`${API_URL}/${taskId}`, {
            method: "DELETE",
            credentials: "same-origin"
        });

        if (!response.ok) {
            throw new Error("Task delete nahi hua.");
        }

        allTasks = allTasks.filter(
            item => String(item.id) !== String(taskId)
        );

        await saveTasksOffline(allTasks);

        displayTasks(allTasks);
        updateSummary(allTasks);

    } catch (error) {
        console.error("Delete error:", error);
        alert("Task delete nahi hua. Please try again.");
    }
}
async function syncOfflineTasks() {
    if (!navigator.onLine) return;

    const tasks = await getOfflineTasks();

    for (const task of tasks) {
        if (!task.pendingSync) continue;

        try {
            const isNewTask = String(task.id).startsWith("offline-");

            const { id, pendingSync, ...taskData } = task;

            const response = await fetch(
                isNewTask ? API_URL : `${API_URL}/${id}`,
                {
                    method: isNewTask ? "POST" : "PUT",
                    headers: {
                        "Content-Type": "application/json"
                    },
                    body: JSON.stringify(taskData)
                }
            );

            if (!response.ok) {
                console.error("Task sync nahi hua:", task.title);
                continue;
            }

            const latestTasks = await getOfflineTasks();

            let updatedTasks;

            if (isNewTask) {
                const savedTask = await response.json();

                updatedTasks = latestTasks.filter(item => item.id !== id);
                updatedTasks.push(savedTask);
            } else {
                updatedTasks = latestTasks.map(item => {
                    if (item.id === id) {
                        const { pendingSync, ...cleanTask } = item;
                        return cleanTask;
                    }
                    return item;
                });
            }

            await saveTasksOffline(updatedTasks);

            console.log("Task synced:", task.title);

        } catch (error) {
            console.error("Sync error:", error);
        }
    }
}

function checkTaskReminders() {
    if (!("Notification" in window) ||
        Notification.permission !== "granted") {
        return;
    }

    if (!Array.isArray(allTasks)) return;

    const notifiedTasks = JSON.parse(
        localStorage.getItem("notifiedTaskIds") || "[]"
    );

    const now = new Date();

    allTasks.forEach(task => {
        if (!task.id || !task.dueDate || task.completed ||
            task.status === "Completed") {
            return;
        }

        const dueTime = new Date(task.dueDate);

        if (isNaN(dueTime.getTime())) return;

        if (now >= dueTime && !notifiedTasks.includes(String(task.id))) {
            new Notification("Task Reminder", {
                body: `Your task "${task.title}" is due!`
            });

            notifiedTasks.push(String(task.id));
        }
    });

    localStorage.setItem(
        "notifiedTaskIds",
        JSON.stringify(notifiedTasks)
    );
}

document.addEventListener("DOMContentLoaded", () => {
    if (document.getElementById("taskList")) {
        setInterval(checkTaskReminders, 30000);
        setTimeout(checkTaskReminders, 3000);
    }
});
document.addEventListener("DOMContentLoaded", async () => {

    const dashboardSearch = document.getElementById("dashboardSearch");
    const resultsBox = document.getElementById("dashboardSearchResults");

    // Sirf Dashboard par chalega
    if (!dashboardSearch || !resultsBox) return;

    if (navigator.onLine) {
        await syncOfflineTasks();
    }

    await loadTasks();

    dashboardSearch.addEventListener("input", () => {

        const searchText = dashboardSearch.value.trim().toLowerCase();

        resultsBox.innerHTML = "";

        if (!searchText) return;

        const matchedTasks = allTasks.filter(task =>
            (task.title || "").toLowerCase().includes(searchText) ||
            (task.description || "").toLowerCase().includes(searchText)
        );

        if (matchedTasks.length === 0) {
            resultsBox.textContent = "No matching tasks found.";
            return;
        }

        matchedTasks.forEach(task => {
            const item = document.createElement("p");
            item.textContent = task.title + " - " +
                (task.completed ? "Completed" : "Pending");

            resultsBox.appendChild(item);
        });
    });
});
// Dashboard Task Panel
function openTaskPanel(type) {
    const modal = document.getElementById("taskModal");
    const title = document.getElementById("taskPanelTitle");
    const list = document.getElementById("taskPanelList");

    if (!modal || !title || !list) return;

    let tasks = allTasks || [];

    if (type === "pending") {
        tasks = tasks.filter(task => !task.completed);
        title.textContent = "Pending Tasks";
    } else if (type === "completed") {
        tasks = tasks.filter(task => task.completed);
        title.textContent = "Completed Tasks";
    } else {
        title.textContent = "All Tasks";
    }

    list.innerHTML = "";

    if (tasks.length === 0) {
        list.textContent = "No tasks available.";
    } else {
        tasks.forEach(task => {
            const item = document.createElement("div");
            item.className = "task-item";

            const heading = document.createElement("h3");
            heading.textContent = task.title || "Untitled Task";

            const description = document.createElement("p");
            description.textContent = task.description || "No description";

            const status = document.createElement("p");
            status.textContent = task.completed ? "Completed" : "Pending";

            item.append(heading, description, status);
            list.appendChild(item);
        });
    }

    modal.style.display = "flex";
}

function closeTaskPanel() {
    const modal = document.getElementById("taskModal");
    if (modal) modal.style.display = "none";
}
// Load tasks on Dashboard
window.addEventListener("pageshow", async () => {
    if (!document.getElementById("totalTasks")) return;

    try {
        if (navigator.onLine) {
            await syncOfflineTasks();
        }
        await loadTasks();
    } catch (error) {
        console.error("Dashboard tasks load error:", error);
    }
});