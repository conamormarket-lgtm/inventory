import { db } from './firebase-config.js';
import {
    collection,
    onSnapshot,
    doc,
    runTransaction,
    addDoc,
    query,
    orderBy,
    serverTimestamp,
    deleteDoc,
    updateDoc,
    where,
    writeBatch,
    getDocs,
    limit,
    arrayUnion,
    arrayRemove, // Import arrayRemove
    setDoc,
    getDoc
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

import { GARMENT_TYPES, COLORS, SIZES, INITIAL_USERS } from './config.js';

const COLLECTION_INVENTORY = 'inventory';
const COLLECTION_HISTORY = 'history';
const COLLECTION_METADATA = 'metadata';
const COLLECTION_USERS = 'users'; // New Users Collection

// Local cache for synchronous read requirements (chart rendering)
let localInventoryCache = [];
let localHistoryCache = [];
let localMetadataCache = null;
let localUsersCache = [];

let inventoryUnsubscribe = null;
let historyUnsubscribe = null;
let metadataUnsubscribe = null;
let usersUnsubscribe = null;

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

        // History Listener (Last 600 - Increased to show full legacy imports)
        const q = query(collection(db, COLLECTION_HISTORY), orderBy('timestamp', 'desc'), limit(600));
        historyUnsubscribe = onSnapshot(q, (snapshot) => {
            localHistoryCache = [];
            snapshot.forEach(doc => {
                localHistoryCache.push({ id: doc.id, ...doc.data() });
            });
            onUpdate({ type: 'history', data: localHistoryCache });
        }, (error) => {
            console.error("History sync error:", error);
        });

        // Metadata Listener
        const metaDocRef = doc(db, COLLECTION_METADATA, 'lists');
        metadataUnsubscribe = onSnapshot(metaDocRef, (docSnap) => {
            if (docSnap.exists()) {
                localMetadataCache = docSnap.data();
                onUpdate({ type: 'metadata', data: localMetadataCache });
            } else {
                this.seedMetadata();
            }
        });

        // Users Listener (Admin Only in real app, but here simplistic)
        usersUnsubscribe = onSnapshot(collection(db, COLLECTION_USERS), (snapshot) => {
            if (snapshot.empty) {
                this.seedUsers(); // Auto-seed if empty
            } else {
                localUsersCache = [];
                snapshot.forEach(doc => {
                    localUsersCache.push({ id: doc.id, ...doc.data() });
                });
                onUpdate({ type: 'users', data: localUsersCache });
            }
        });
    },

    async seedMetadata() {
        const metaDocRef = doc(db, COLLECTION_METADATA, 'lists');
        try {
            await setDoc(metaDocRef, {
                garments: GARMENT_TYPES,
                colors: COLORS,
                sizes: SIZES // Seed sizes
            });
        } catch (e) {
            console.error("Error seeding metadata:", e);
        }
    },

    async seedUsers() {
        if (!INITIAL_USERS || INITIAL_USERS.length === 0) return;
        try {
            const batch = writeBatch(db);
            INITIAL_USERS.forEach(user => {
                const docRef = doc(collection(db, COLLECTION_USERS));
                batch.set(docRef, user);
            });
            await batch.commit();
            console.log("Users Seeding Completed");
        } catch (e) {
            console.error("Error seeding users:", e);
        }
    },

    getInventory() {
        return localInventoryCache;
    },

    getHistory() {
        return localHistoryCache;
    },

    getMetadata() { return localMetadataCache; },

    getUsers() { return localUsersCache; }, // Getter for users

    // --- User Management Ops ---
    async addUser(userData) {
        try {
            // Check duplications locally for speed
            if (localUsersCache.some(u => u.username === userData.username)) {
                return { success: false, error: "El nombre de usuario ya existe." };
            }
            await addDoc(collection(db, COLLECTION_USERS), userData);
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    },

    async updateUserPassword(userId, newPassword) {
        try {
            const ref = doc(db, COLLECTION_USERS, userId);
            await updateDoc(ref, { password: newPassword });
            return { success: true };
        } catch (e) {
            console.error(e);
            return { success: false, error: e.message };
        }
    },

    async deleteUser(userId) {
        try {
            await deleteDoc(doc(db, COLLECTION_USERS, userId));
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // --- Dynamic Metadata Ops ---
    async addGarmentType(name) {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        if (localMetadataCache && localMetadataCache.garments.some(g => g.toLowerCase() === name.toLowerCase())) {
            return { success: false, error: "La prenda ya existe." };
        }
        try {
            await updateDoc(ref, { garments: arrayUnion(name) });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async addColor(name, hex = '#000000') {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        if (localMetadataCache && localMetadataCache.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            return { success: false, error: "El color ya existe." };
        }
        try {
            await updateDoc(ref, { colors: arrayUnion({ name, hex }) });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async removeGarmentType(name) {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        try {
            await updateDoc(ref, { garments: arrayRemove(name) });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async removeColor(colorName) {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        try {
            const docSnap = await getDoc(ref);
            if (!docSnap.exists()) return { success: false, error: "Metadata not found" };

            const data = docSnap.data();
            const newColors = data.colors.filter(c => {
                const cName = (typeof c === 'object') ? c.name : c;
                return cName.toLowerCase() !== colorName.toLowerCase();
            });

            await updateDoc(ref, { colors: newColors });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async addSize(name) {
        const ref = doc(db, COLLECTION_METADATA, 'lists');

        try {
            const docSnap = await getDoc(ref);
            // Default SIZES from config need to be imported or hardcoded if not available here. 
            // We assume SIZES are global or passed. But `inventory_data.js` doesn't import SIZES?
            // Wait, I need to check imports.
            // If I can't access SIZES, I'll use a hardcoded fallback or try to read safely.

            let currentSizes = [];
            if (docSnap.exists()) {
                const data = docSnap.data();
                if (data.sizes && Array.isArray(data.sizes)) {
                    currentSizes = data.sizes;
                }
            }

            if (currentSizes.some(s => s.toLowerCase() === name.toLowerCase())) {
                return { success: false, error: "La talla ya existe." };
            }

            // If this is the FIRST time we write sizes, and localMetadataCache was empty/default,
            // we should technically merge defaults. But here we don't have easy access to defaults inside DataManager?
            // Actually config.js renders SIZES. 
            // Lets assume if currentSizes is empty, we MIGHT be overwriting.
            // BETTER FIX: The UI passes the request. 
            // But to be safe: If currentSizes is found in DB, use it.
            // If NOT found in DB, we should probably initialize with full set.
            // But DataManager doesn't import SIZES. I need to add import or logic.

            // Quick fix: Just use arrayUnion. 
            // Logic: If docSnap.data().sizes is undefined, arrayUnion creates [name].
            // WE NEED TO PRE-FILL existing defaults if undefined.

            // Let's use a safe merged approach if I can import SIZES.
            // I'll blindly update for now but I really should import SIZES.

            if (currentSizes && currentSizes.length > 0) {
                // Dupes check done above? No, wait.
                // Re-implement dupe check just in case, or assume done?
                // The code above has a check: if (currentSizes.some...) return error.
                // So we are safe to just update.
                await updateDoc(ref, { sizes: arrayUnion(name) });
            } else {
                // Safe Backfill
                const newSizeList = [...SIZES];
                if (!newSizeList.some(s => s.toLowerCase() === name.toLowerCase())) {
                    newSizeList.push(name);
                }
                await updateDoc(ref, { sizes: newSizeList });
            }
            return { success: true };
        } catch (e) {
            // If document doesn't exist? (Should exist due to seed)
            return { success: false, error: e.message };
        }
    },

    async removeSize(name) {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        try {
            await updateDoc(ref, { sizes: arrayRemove(name) });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    // Registrar movimiento (Transacción Atómica)
    async addMovement(type, itemDetails, quantity, user) {
        // Fix: Sanitize slashes in colors (e.g. "Rosado/Negro") to prevent sub-collection errors
        const id = `${itemDetails.type}_${itemDetails.color}_${itemDetails.size}`
            .replace(/[\s\/]+/g, '-')
            .toLowerCase();

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
        const id = `${type}_${color}_${size}`.replace(/[\s\/]+/g, '-').toLowerCase();
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

    // Obtener Historial Completo por Rango (Para Reportes)
    async getHistoryByDateRange(startDate, endDate) {
        try {
            const historyRef = collection(db, COLLECTION_HISTORY);
            // Query docs within range
            const q = query(
                historyRef,
                where('timestamp', '>=', startDate.toISOString()),
                where('timestamp', '<=', endDate.toISOString())
            );

            const snapshot = await getDocs(q);
            const logs = [];
            snapshot.forEach(doc => {
                logs.push({ id: doc.id, ...doc.data() });
            });
            return logs;
        } catch (e) {
            console.error("Get history range error:", e);
            return [];
        }
    },

    // Eliminar Historial por Rango de Fechas (Query Directa)
    async deleteLogsByDateRange(startDate, endDate) {
        console.log(`[DataManager] Intentando borrar historial desde ${startDate.toISOString()} hasta ${endDate.toISOString()}`);
        try {
            const historyRef = collection(db, COLLECTION_HISTORY);
            // Query docs within range
            const q = query(
                historyRef,
                where('timestamp', '>=', startDate.toISOString()),
                where('timestamp', '<=', endDate.toISOString())
            );

            const snapshot = await getDocs(q);
            const docsToDelete = [];
            snapshot.forEach(doc => docsToDelete.push(doc.id));

            if (docsToDelete.length === 0) return { success: true, count: 0 };

            // Batch Delete
            return await this.deleteHistoryLogs(docsToDelete);

        } catch (e) {
            console.error("Delete range error:", e);
            return { success: false, error: e.message };
        }
    },

    // Eliminar por IDs (Batch Helper)
    async deleteHistoryLogs(logIds) {
        if (!logIds || logIds.length === 0) return { success: true, count: 0 };

        // Firestore batch limit is 500
        const batchSize = 450;
        let deletedCount = 0;

        for (let i = 0; i < logIds.length; i += batchSize) {
            const chunk = logIds.slice(i, i + batchSize);
            const batchInstance = writeBatch(db);

            chunk.forEach(id => {
                const docRef = doc(db, COLLECTION_HISTORY, id);
                batchInstance.delete(docRef);
            });

            await batchInstance.commit();
            deletedCount += chunk.length;
        }

        return { success: true, count: deletedCount };
    },

    // Resetear todo el stock a 0 (Inventario)
    async resetAllStock() {
        console.log(`[DataManager] Iniciando reseteo total de stock...`);
        try {
            const inventoryRef = collection(db, COLLECTION_INVENTORY);
            const snapshot = await getDocs(inventoryRef);

            if (snapshot.empty) {
                return { success: true, count: 0 };
            }

            // Sample IDs
            const sample = snapshot.docs.slice(0, 3).map(d => d.id).join(", ");
            if (!confirm(`Se encontraron ${snapshot.size} documentos en el inventario.\nEjemplos: ${sample}\n\n¿Confirmas que deseas ELIMINAR todos los productos del inventario? Esta acción es irreversible.`)) return { success: false, count: 0 };

            // Brute Force Parallel DELETE (Nuclear Option)
            // If we delete the document, the app defaults to 0. This is cleaner.
            const updates = snapshot.docs.map(doc => {
                return deleteDoc(doc.ref);
            });

            await Promise.all(updates);

            return { success: true, count: snapshot.size };

        } catch (e) {
            console.error("Reset stock error:", e);
            return { success: false, error: e.message };
        }
    },

    // Importar Logs (Batch)
    async importHistoryLogs(logs) {
        // Firestore batch limit is 500
        const batchSize = 450;
        let importedCount = 0;

        try {
            // Use static imports
            for (let i = 0; i < logs.length; i += batchSize) {
                const chunk = logs.slice(i, i + batchSize);
                const batch = writeBatch(db);
                const historyRef = collection(db, COLLECTION_HISTORY);

                chunk.forEach(logData => {
                    // Validation: Ensure no undefined values
                    Object.keys(logData).forEach(key => {
                        if (logData[key] === undefined) logData[key] = null;
                    });

                    // doc is imported statically
                    const newDocRef = doc(historyRef);
                    batch.set(newDocRef, logData);
                });

                await batch.commit();
                importedCount += chunk.length;
            }

            return { success: true, count: importedCount };
        } catch (e) {
            console.error("Import Batch Error:", e);
            alert("Error crítico importando lote: " + e.message);
            return { success: false, error: e.message };
        }
    },

    // Importar Stock Inicial desde CSV (Excel exportado)
    async importStockFromCSV(csvText, isDryRun = false) {
        alert("🟢 IMPORTANDO DESDE TABLA RESUMEN (V5.0 - MATRIX MODE)");
        try {
            const lines = csvText.split('\n');
            let matrixMode = false;
            let startLine = -1;
            let typeMapIndices = {}; // Index -> Type Name

            // 1. Detect Matrix Table
            for (let i = 0; i < lines.length; i++) {
                if (lines[i].includes('RESUMEN POR COLOR')) {
                    matrixMode = true;
                    startLine = i + 1; // Headers are next line
                    break;
                }
            }

            // --- SIMPLE CSV MODE (New) ---
            if (!matrixMode) {
                // Check if it's a simple list: TIPO,COLOR,TALLA,CANTIDAD
                const headerRow = lines.find(l => l.toUpperCase().includes('TIPO') && l.toUpperCase().includes('CANTIDAD'));

                if (headerRow) {
                    alert("🟢 IMPORTANDO DESDE LISTA SIMPLE (TIENDA VIRTUAL MODE)");
                    const simpleDocs = [];
                    // Parse Headers
                    const headers = headerRow.split(',').map(h => h.trim().toUpperCase());
                    const idxType = headers.indexOf('TIPO');
                    const idxColor = headers.indexOf('COLOR');
                    const idxSize = headers.indexOf('TALLA');
                    const idxQty = headers.indexOf('CANTIDAD');

                    if (idxType === -1 || idxSize === -1 || idxQty === -1) {
                        return { success: false, error: "Formato simple inválido. Faltan columnas requeridas (TIPO, TALLA, CANTIDAD)." };
                    }

                    // Iterate
                    for (let i = 0; i < lines.length; i++) {
                        const line = lines[i];
                        if (!line || line === headerRow || line.trim() === '') continue;

                        const cols = line.split(',');
                        if (cols.length < 3) continue;

                        const type = cols[idxType]?.trim();
                        const color = cols[idxColor]?.trim() || 'Estándar';
                        const size = cols[idxSize]?.trim();
                        const qtyStr = cols[idxQty]?.trim();

                        if (!type || !size || !qtyStr) continue;

                        const quantity = parseInt(qtyStr);
                        if (isNaN(quantity)) continue;

                        // ID Generation
                        const id = `${type}_${color}_${size}`.replace(/[\s\/]+/g, '-').toLowerCase();

                        // Add to batch
                        simpleDocs.push({
                            id: id,
                            type: type, // Preserves original case for display
                            color: color,
                            size: size,
                            quantity: quantity,
                            updatedAt: new Date().toISOString()
                        });
                    }

                    // EXECUTE BATCH (Reuse existing batch logic or call internal helper? Duplicate for safety here)
                    const batch = writeBatch(db);
                    const historyRef = collection(db, COLLECTION_HISTORY);
                    let count = 0;
                    let totalUnits = 0;

                    for (const item of simpleDocs) {
                        const ref = doc(db, COLLECTION_INVENTORY, item.id);
                        batch.set(ref, item); // Overwrite or toggle merge? Set overwrites. Good for "Initial Stock".

                        totalUnits += item.quantity;

                        // History Log
                        const logRef = doc(historyRef);
                        batch.set(logRef, {
                            action: 'Carga Masiva (CSV)',
                            user: 'Admin (System)', // Context user?
                            details: `Carga Inicial: ${item.type} - ${item.color} - ${item.size}`,
                            quantity: item.quantity,
                            timestamp: new Date().toISOString(),
                            metadata: {
                                type: item.type,
                                color: item.color,
                                size: item.size,
                                quantity: item.quantity
                            }
                        });
                        count++;
                    }

                    if (!isDryRun) await batch.commit();
                    return {
                        success: true,
                        count: count,
                        totalUnits: totalUnits,
                        // Include preview (cloned to avoid mutation if used after)
                        preview: simpleDocs,
                        message: "Carga simple exitosa."
                    };
                }
            }

            if (!matrixMode) {
                return { success: false, error: "Formato no reconocido. Usa la Tabla Matriz O una lista simple con cabeceras: TIPO, COLOR, TALLA, CANTIDAD." };
            }

            // 2. Parse Headers (Line after RESUMEN)
            // Expected: ,,,,POLERAS,CASACAS,...
            const headerLine = lines[startLine];
            const headers = headerLine.split(',').map(h => h.trim());

            // Find where types start. Based on file analysis, "POLERAS" is around index 9.
            // But let's be dynamic: find first known type.
            const KNOWN_TYPES = ['POLERAS', 'CASACAS', 'POLERAS C.R.', 'BOMBER', 'POLOS'];
            let firstTypeIndex = -1;

            for (let k = 0; k < headers.length; k++) {
                if (KNOWN_TYPES.includes(headers[k].toUpperCase())) {
                    firstTypeIndex = k;
                    break;
                }
            }

            if (firstTypeIndex === -1) {
                return { success: false, error: "No se pudieron identificar los encabezados de las prendas en la tabla." };
            }

            // Map Indices to Types
            for (let k = firstTypeIndex; k < headers.length; k++) {
                const h = headers[k];
                if (h && h !== 'TOTAL PREN.') {
                    typeMapIndices[k] = h; // Store exact name from header, normalized later if needed
                } else if (h === 'TOTAL PREN.') {
                    break; // Stop at total column
                }
            }

            // 3. Iterate Rows (Colors)
            // Color name is typically at firstTypeIndex - 1 (Column 8 based on analysis)
            const colorColIndex = firstTypeIndex - 1;

            const docsToSet = [];
            let totalQuantity = 0;
            let summaryByType = {};
            let parsedRows = [];

            for (let i = startLine + 1; i < lines.length; i++) {
                const line = lines[i];
                if (!line || line.trim() === '') continue;

                const cols = line.split(','); // Simple split should work for this section

                // Color Name check
                const colorRaw = cols[colorColIndex];
                if (!colorRaw || colorRaw.trim() === '' || colorRaw.includes('TOTAL')) {
                    // Stop if we hit end of table or empty line
                    if (colorRaw && colorRaw.includes('TOTAL')) break; // End of table
                    continue;
                }

                const colorName = colorRaw.trim().toUpperCase();

                // Iterate Types
                Object.keys(typeMapIndices).forEach(colIdx => {
                    const typeName = typeMapIndices[colIdx];
                    const qtyStr = cols[colIdx];
                    let qty = parseInt(qtyStr);

                    if (!isNaN(qty) && qty > 0) {
                        // CREATE ITEM
                        // Size is 'VARIAS' because this table aggregates sizes
                        const size = 'VARIAS';

                        // ID Construction
                        // Standardize with addMovement: Replace spaces/slashes with dashes, allow dots.
                        const id = `${typeName}_${colorName}_${size}`
                            .replace(/[\s\/]+/g, '-')
                            .toLowerCase();

                        const itemData = {
                            type: typeName, // Keep original nice name
                            color: colorName,
                            size: size,
                            quantity: qty
                        };

                        docsToSet.push({ id, data: itemData });

                        totalQuantity += qty;
                        summaryByType[typeName] = (summaryByType[typeName] || 0) + qty;
                    }
                });
            }

            // --- WRITE TO DB ---
            const batchSize = 450;
            let operationCount = 0;
            const dbRef = isDryRun ? null : writeBatch(db);

            // Optimization: If not dry run, just do it. 
            // We need to return the 'batch' object if we want to commit later, 
            // but DataManager usually commits immediately. 
            // We will use the loop pattern.

            for (let i = 0; i < docsToSet.length; i += batchSize) {
                const chunk = docsToSet.slice(i, i + batchSize);
                if (!isDryRun) {
                    const batch = writeBatch(db);
                    chunk.forEach(item => {
                        const docRef = doc(db, COLLECTION_INVENTORY, item.id);
                        batch.set(docRef, item.data);
                    });
                    await batch.commit();
                }
                operationCount += chunk.length;
            }

            return {
                success: true,
                count: operationCount,
                totalQuantity: totalQuantity,
                summaryByType: summaryByType,
                message: `✅ IMPORTACIÓN EXITOSA (MODO MATRIZ)\n\nSe usó la tabla 'RESUMEN POR COLOR'.\nTotal Unidades: ${totalQuantity}\n\nNOTA: Todas las tallas se han asignado como 'VARIAS' ya que la tabla de resumen no especifica talla.\n\n` +
                    Object.entries(summaryByType).map(([t, q]) => `- ${t}: ${q}`).join('\n'),
                debugCropTrace: [],
                debugCrTrace: []
            };

        } catch (e) {
            console.error("Matrix Import Error", e);
            return { success: false, error: e.message };
        }
    }
};
