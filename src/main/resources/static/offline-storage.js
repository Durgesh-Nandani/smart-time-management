
const DB_VERSION = 1;
const STORE_NAME = "tasks";
const ACCOUNT_KEY = "smartTimeAccountEmail";

function getAccountDBName() {
    const email = localStorage.getItem(ACCOUNT_KEY);

    if (!email) {
        throw new Error("Please login to access offline tasks.");
    }

    return "SmartTimeDB_" + email.trim().toLowerCase();
}

function openOfflineDB() {
    return new Promise((resolve, reject) => {
        const request = indexedDB.open(getAccountDBName(), DB_VERSION);

        request.onupgradeneeded = (event) => {
            const db = event.target.result;

            if (!db.objectStoreNames.contains(STORE_NAME)) {
                db.createObjectStore(STORE_NAME, {
                    keyPath: "id"
                });
            }
        };

        request.onsuccess = () => resolve(request.result);
        request.onerror = () => reject(request.error);
    });
}

async function saveTasksOffline(tasks) {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readwrite");
        const store = transaction.objectStore(STORE_NAME);

        // Purane records hatao
        store.clear();

        // Updated complete list save karo
        tasks.forEach(task => store.put(task));

        transaction.oncomplete = () => {
            db.close();
            resolve();
        };

        transaction.onerror = () => {
            db.close();
            reject(transaction.error);
        };
    });
}
async function getOfflineTasks() {
    const db = await openOfflineDB();

    return new Promise((resolve, reject) => {
        const transaction = db.transaction(STORE_NAME, "readonly");
        const request = transaction.objectStore(STORE_NAME).getAll();

        request.onsuccess = () => {
            db.close();
            resolve(request.result);
        };

        request.onerror = () => {
            db.close();
            reject(request.error);
        };
    });
}
