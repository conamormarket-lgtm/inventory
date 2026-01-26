import { db } from './firebase-config.js';
import {
    collection,
    onSnapshot,
    doc,
    runTransaction,
    addDoc,
    query,
    orderBy,
    limit,
    getDocs,
    serverTimestamp,
    deleteDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLLECTION_INVENTORY = 'inventory';
const COLLECTION_HISTORY = 'history';

// Local cache for synchronous read requirements (chart rendering)
let localInventoryCache = [];
let localHistoryCache = [];
let inventoryUnsubscribe = null;
let historyUnsubscribe = null;

export const DataManager = {
    // Inicializar suscripción en tiempo real
    initListener(onUpdate) {
        // Inventory Listener
        inventoryUnsubscribe = onSnapshot(collection(db, COLLECTION_INVENTORY), (snapshot) => {
            localInventoryCache = [];
            snapshot.forEach(doc => {
                localInventoryCache.push({ id: doc.id, ...doc.data() });
            });
            onUpdate({ type: 'inventory', data: localInventoryCache });
        });

        // History Listener (Last 100)
        const q = query(collection(db, COLLECTION_HISTORY), orderBy('timestamp', 'desc'), limit(100));
        historyUnsubscribe = onSnapshot(q, (snapshot) => {
            localHistoryCache = [];
            snapshot.forEach(doc => {
                localHistoryCache.push({ id: doc.id, ...doc.data() });
            });
            onUpdate({ type: 'history', data: localHistoryCache });
        }, (error) => {
            console.error("Error fetching history:", error);
        });
    },

    getInventory() {
        return localInventoryCache;
    },

    getHistory() {
        return localHistoryCache;
    },

    // Registrar movimiento (Transacción Atómica)
    async addMovement(type, itemDetails, quantity, user) {
        const id = `${itemDetails.type}_${itemDetails.color}_${itemDetails.size}`.replace(/\s+/g, '-').toLowerCase();
        const itemRef = doc(db, COLLECTION_INVENTORY, id);
        const historyRef = collection(db, COLLECTION_HISTORY);

        try {
            let newStock = 0;

            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(itemRef);

                let currentQty = 0;
                if (sfDoc.exists()) {
                    currentQty = sfDoc.data().quantity;
                }

                if (type === 'exit') {
                    if (currentQty < quantity) {
                        throw new Error(`Stock insuficiente. Disponible: ${currentQty}`);
                    }
                    currentQty -= quantity;
                } else {
                    currentQty += quantity;
                }
                newStock = currentQty;

                // Update Inventory
                transaction.set(itemRef, {
                    type: itemDetails.type,
                    color: itemDetails.color,
                    size: itemDetails.size,
                    quantity: currentQty
                });

                // Add History Log
                const metadata = {
                    type: itemDetails.type,
                    color: itemDetails.color,
                    size: itemDetails.size,
                    quantity: quantity,
                    originalActionType: type
                };

                const newLog = {
                    timestamp: new Date().toISOString(), // Use client string for Sort, or create separate serverTimestamp
                    serverTime: serverTimestamp(),
                    user: user.name || user.username,
                    action: type === 'entry' ? 'Entrada' : 'Salida',
                    details: `${itemDetails.type} - ${itemDetails.color} - Talla ${itemDetails.size} (Cant: ${quantity})`,
                    metadata: metadata
                };

                // Transaction can't create doc with auto-id directly in set(), so we use a new ref
                // Actually transaction.set() needs a ref. For collections.add() logic inside transaction:
                // We can just separate the history add, it's not strictly critical to be in the SAME atomic write if we accept eventual consistency, 
                // but for undo logs it is better.
                // Firestore transactions require all reads before writes. 
                // We will just do the inventory update in transaction, and history add after.
                // Ideally they are batched, but `addDoc` generates ID. 
            });

            // Log History (Best effort, immediately after)
            const metadata = {
                type: itemDetails.type,
                color: itemDetails.color,
                size: itemDetails.size,
                quantity: quantity,
                originalActionType: type
            };

            await addDoc(historyRef, {
                timestamp: new Date().toISOString(),
                user: user.name || user.username,
                action: type === 'entry' ? 'Entrada' : 'Salida',
                details: `${itemDetails.type} - ${itemDetails.color} - Talla ${itemDetails.size} (Cant: ${quantity})`,
                quantity: quantity, // Explicit root field for reports
                metadata: metadata
            });

            return { success: true, newStock: newStock };

        } catch (e) {
            console.error("Transaction failed: ", e);
            return { success: false, error: e.message };
        }
    },

    // Deshacer última acción (Transaction)
    async undoLastAction(user) {
        const history = this.getHistory();
        const currentUser = user.name || user.username;
        // Find local first matches current user
        // Note: history is sorted desc.
        const log = history.find(l => l.user === currentUser);

        if (!log || !log.metadata) {
            return { success: false, error: 'No se encontró acción reciente para deshacer.' };
        }

        const { type, color, size, quantity, originalActionType } = log.metadata;
        const id = `${type}_${color}_${size}`.replace(/\s+/g, '-').toLowerCase();
        const itemRef = doc(db, COLLECTION_INVENTORY, id);
        const logRef = doc(db, COLLECTION_HISTORY, log.id);

        try {
            let newStock = 0;
            await runTransaction(db, async (transaction) => {
                const sfDoc = await transaction.get(itemRef);
                if (!sfDoc.exists()) throw new Error("Producto no encontrado.");

                let currentQty = sfDoc.data().quantity;

                if (originalActionType === 'entry') {
                    // Reversal: Subtract
                    if (currentQty < quantity) {
                        throw new Error(`Stock insuficiente para revertir.`);
                    }
                    currentQty -= quantity;
                } else {
                    currentQty += quantity;
                }
                newStock = currentQty;

                transaction.update(itemRef, { quantity: currentQty });
                transaction.delete(logRef);
            });
            return { success: true, message: 'Acción deshecha correctamente.', newStock: newStock };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // --- Admin Tools ---

    // Eliminar Historial por Lote (Max 500 por lote)
    async deleteHistoryLogs(logIds) {
        if (!logIds || logIds.length === 0) return { success: true, count: 0 };

        const batchLine = 500;
        let deletedCount = 0;

        // Chunking
        for (let i = 0; i < logIds.length; i += batchLine) {
            const chunk = logIds.slice(i, i + batchLine);
            const batch = import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")
                .then(mod => mod.writeBatch(db));

            const batchInstance = await (await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")).writeBatch(db);

            chunk.forEach(id => {
                const docRef = doc(db, COLLECTION_HISTORY, id);
                batchInstance.delete(docRef);
            });

            await batchInstance.commit();
            deletedCount += chunk.length;
        }

        return { success: true, count: deletedCount };
    },

    // Importar Logs (Batch)
    async importHistoryLogs(logs) {
        const batchLine = 500;
        let importedCount = 0;

        // We use batch set (with new IDs) or addDoc in parallel?
        // writeBatch.set() needs a ref with ID.
        // collection(db, 'history') needs addDoc.
        // Batching inserts via writeBatch requires doc(collection(), id).

        for (let i = 0; i < logs.length; i += batchLine) {
            const chunk = logs.slice(i, i + batchLine);
            const batchInstance = await (await import("https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js")).writeBatch(db);
            const historyRef = collection(db, COLLECTION_HISTORY);

            chunk.forEach(logData => {
                // Generate a new ID manually for batching
                const newDocRef = doc(historyRef);
                // Ensure timestamp is valid Date string or serverTimestamp
                // For import, we keep original timestamp string
                batchInstance.set(newDocRef, logData);
            });

            await batchInstance.commit();
            importedCount += chunk.length;
        }

        return { success: true, count: importedCount };
    }
};

