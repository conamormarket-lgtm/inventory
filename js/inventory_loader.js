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
    limit
} from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const COLLECTION_INVENTORY = 'inventory';
const COLLECTION_HISTORY = 'history';
const COLLECTION_METADATA = 'metadata'; // New collection

// Local cache
let localInventoryCache = [];
let localHistoryCache = [];
let localMetadataCache = null; // Store lists here

let inventoryUnsubscribe = null;
let historyUnsubscribe = null;
let metadataUnsubscribe = null;

import { GARMENT_TYPES, COLORS } from './config.js'; // Import default for seeding
import { arrayUnion, setDoc, getDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

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

        // History Listener
        const q = query(collection(db, COLLECTION_HISTORY), orderBy('timestamp', 'desc'), limit(600));
        historyUnsubscribe = onSnapshot(q, (snapshot) => {
            localHistoryCache = [];
            snapshot.forEach(doc => {
                localHistoryCache.push({ id: doc.id, ...doc.data() });
            });
            onUpdate({ type: 'history', data: localHistoryCache });
        }, (error) => console.error("History sync error:", error));

        // Metadata Listener (Dynamic Lists)
        const metaDocRef = doc(db, COLLECTION_METADATA, 'lists');
        metadataUnsubscribe = onSnapshot(metaDocRef, (docSnap) => {
            if (docSnap.exists()) {
                localMetadataCache = docSnap.data();
                onUpdate({ type: 'metadata', data: localMetadataCache });
            } else {
                // If missing, seed it
                this.seedMetadata();
            }
        });
    },

    async seedMetadata() {
        console.log("Seeding metadata...");
        const metaDocRef = doc(db, COLLECTION_METADATA, 'lists');
        try {
            await setDoc(metaDocRef, {
                garments: GARMENT_TYPES,
                colors: COLORS
            });
        } catch (e) {
            console.error("Error seeding metadata:", e);
        }
    },

    getInventory() { return localInventoryCache; },
    getHistory() { return localHistoryCache; },
    getMetadata() { return localMetadataCache; },

    // --- Dynamic Metadata Ops ---
    async addGarmentType(name) {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        // Check duplicate in cache first
        if (localMetadataCache && localMetadataCache.garments.some(g => g.toLowerCase() === name.toLowerCase())) {
            return { success: false, error: "La prenda ya existe." };
        }
        try {
            await updateDoc(ref, {
                garments: arrayUnion(name)
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
    },

    async addColor(name, hex = '#000000') {
        const ref = doc(db, COLLECTION_METADATA, 'lists');
        // Simple duplicate check by name
        if (localMetadataCache && localMetadataCache.colors.some(c => c.name.toLowerCase() === name.toLowerCase())) {
            return { success: false, error: "El color ya existe." };
        }
        try {
            await updateDoc(ref, {
                colors: arrayUnion({ name, hex })
            });
            return { success: true };
        } catch (e) {
            return { success: false, error: e.message };
        }
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
        try {
            const lines = csvText.split('\n');
            const docsToSet = [];
            let skippedLog = [];
            let duplicateLog = [];
            let summaryByType = {
                'POLERAS CROP': 0,
                'POLERAS C.R.': 0,
                'PIJAMA JERSEY': 0
            };
            let totalQuantity = 0;

            // Debug Log Container
            let parseDebug = [];

            // Size Breakdown Container
            let sizeBreakdown = {
                'PIJAMA JERSEY': {},
                'POLERAS C.R.': {},
                'POLERAS CROP': {}
            };

            // Start parsing from line 3 (index 3) based on file structure
            for (let i = 3; i < lines.length; i++) {
                const line = lines[i].trim();
                // Skip completely empty lines
                if (!line) continue;
                // Skip lines that look like TOTALS or headers only
                if (line.startsWith(',,') || line.startsWith('TOTALES')) continue;

                // Robust Split: Handle quotes if necessary, but simple split for now
                // Using regex to handle potential comma issues if fields are clean
                const cols = line.split(',');

                // We need at least 6 columns for the main data
                if (cols.length < 6) {
                    continue;
                }

                let rawPrenda = cols[1]?.trim();
                let rawQty = cols[5]?.trim();

                // Clean quotes just in case
                if (rawPrenda) rawPrenda = rawPrenda.replace(/^"|"$/g, '');
                if (rawQty) rawQty = rawQty.replace(/^"|"$/g, '');

                if (!rawPrenda) {
                    // Likely an empty row or sidebar data row
                    continue;
                }

                // If Qty is missing, assume 0? Or skip?
                // If it's a valid product line, it should have a number (even 0).
                // If empty string, let's treat as 0 IF Prenda looks valid.
                if (rawQty === "" || rawQty === undefined) rawQty = "0";

                let qty = parseInt(rawQty);
                if (isNaN(qty)) qty = 0;
                // SANITIZATION: No negative initial stock
                if (qty < 0) qty = 0;

                // --- DEBUG CAPTURE ---
                // Trace anything with "Crop" to see if it's Polera Crop or CR
                const isDebugRow = rawPrenda.toLowerCase().includes('crop');

                // Flexible Part Splitting
                // Split by hyphen with at least one surrounding space (handles " - ", "- ", " -")
                // This protects internal hyphens like "T-Shirt" but catches separators
                let parts = rawPrenda.split(/\s+-\s*|\s*-\s+/);

                // Trim parts
                parts = parts.map(p => p.trim()).filter(p => p.length > 0);

                if (isDebugRow && parseDebug.length < 50) {
                    // Temporary placeholder, updated after assignment
                    parseDebug.push(`Row ${i + 1}: "${rawPrenda}"`);
                }

                if (parts.length < 3) {
                    skippedLog.push(`Fila ${i + 1} (${rawPrenda}): Formato inválido (Se esperan 3 partes: Tipo - Color - Talla)`);
                    continue;
                }

                let type = parts[0];
                let color = parts[1];
                let size = parts.slice(2).join('-'); // Join remaining as size (e.g. "XXL-Extra")

                // --- TYPE NORMALIZATION ---
                // Mapeo estricto basado en la imagen del usuario
                const typeMap = {
                    // CROPCR - Eliminado por petición del usuario
                    // 'CropCR': 'CropCR', 'CROPCR': 'CropCR',

                    // POLERAS
                    'POLERA': 'POLERAS', 'Polera': 'POLERAS',

                    // CASACAS
                    'CASACA': 'CASACAS', 'Casaca': 'CASACAS',

                    // POLERAS C.R. - Asegurar todas las variantes
                    'POLERA C.R': 'POLERAS C.R.', 'POLERA C.R.': 'POLERAS C.R.', 'Polera C.R.': 'POLERAS C.R.',
                    'C.R.': 'POLERAS C.R.', 'C.R': 'POLERAS C.R.', 'CR': 'POLERAS C.R.',
                    'Poleras C.R.': 'POLERAS C.R.', 'Polera CR': 'POLERAS C.R.',

                    // CROP -> POLERAS CROP (La única verdadera categoría para "Crop")
                    'Crop': 'POLERAS CROP', 'CROP': 'POLERAS CROP',

                    // RE-MAPPING: "Polera Crop" -> POLERAS C.R. (Filtrado de impostores)
                    // El usuario indica que solo "Crop" son las 42 unidades reales.
                    // Las filas que dicen "Polera Crop" se suman a C.R.
                    'Polera Crop': 'POLERAS C.R.', 'POLERA CROP': 'POLERAS C.R.',
                    'Poleras Crop': 'POLERAS C.R.',

                    // CUELLO R -> POLERAS C.R.
                    'CUELLO R': 'POLERAS C.R.', 'Cuello R': 'POLERAS C.R.', 'CUELLOR': 'POLERAS C.R.',
                    'Cuellor': 'POLERAS C.R.', 'CUELLO-R': 'POLERAS C.R.',

                    // POLERAS T.
                    'Polera T.': 'POLERAS T.', 'POLERA T': 'POLERAS T.', 'POLERA T.': 'POLERAS T.',
                    'POLERAST.': 'POLERAS T.', 'Poleras T': 'POLERAS T.',

                    // POLERAS CROP
                    'Polera Crop': 'POLERAS CROP', 'POLERA CROP': 'POLERAS CROP',
                    'Poleras Crop': 'POLERAS CROP',

                    // PIJAMAS
                    'Pijama Jersey': 'PIJAMA JERSEY', 'PIJAMA JERSEY': 'PIJAMA JERSEY', 'Jersey': 'PIJAMA JERSEY',
                    'PIJAMA JERSY': 'PIJAMA JERSEY', 'Pijama Jersy': 'PIJAMA JERSEY',
                    'PijamaJersey': 'PIJAMA JERSEY', // Fix para "PijamaJersey" pegado

                    'Pijama Felpa': 'PIJAMA FELPA', 'PIJAMA FELPA': 'PIJAMA FELPA', 'Felpa': 'PIJAMA FELPA',
                    'Pijama Tem.': 'PIJAMAS TEM.', 'PIJAMAS TEM.': 'PIJAMAS TEM.', 'Tem.': 'PIJAMAS TEM.',
                    'PIJAMA ITEM': 'PIJAMAS TEM.', 'PIJAMA TEM': 'PIJAMAS TEM.',

                    // BOMBER
                    'BOMBER': 'BOMBER', 'Bomber': 'BOMBER',

                    // JOGGERS
                    'JOGGER': 'JOGGERS', 'Jogger': 'JOGGERS', 'Joggers': 'JOGGERS',

                    // PANTALON PIJAMA
                    'Pan. Pijam': 'PAN. PIJAM', 'PAN. PIJAM': 'PAN. PIJAM', 'Pantalon Pijama': 'PAN. PIJAM',
                    'PAN PIJAM': 'PAN. PIJAM',

                    // POLOS
                    'POLO': 'POLOS', 'Polo': 'POLOS', 'Polos': 'POLOS'
                };

                // Normalize: Trim
                let normalizedType = type.trim();

                // 1. Try exact match from map
                if (typeMap[normalizedType]) {
                    normalizedType = typeMap[normalizedType];
                }
                // 2. Try Upper Case match
                else if (typeMap[normalizedType.toUpperCase()]) {
                    normalizedType = typeMap[normalizedType.toUpperCase()];
                }
                // 3. Fallback: Si no está en el mapa, lo dejamos como está (Upper) para identificarlo
                // Eliminamos las heurísticas 'includes' que estaban "robando" items a otras categorías.
                else {
                    // normalizedType = normalizedType.toUpperCase(); // Optional: estandarizar a mayúsculas
                }

                type = normalizedType;

                // Update Debug with decision
                if (isDebugRow && parseDebug.length <= 50) {
                    const logIdx = parseDebug.findIndex(l => l.startsWith(`Row ${i + 1}:`));
                    if (logIdx !== -1) {
                        parseDebug[logIdx] += ` -> Assigned: ${type}`;
                    }
                }

                // Fallback Heuristics (Restore "includes" for broad categories if strict map failed)
                // If type is still the raw part (or uppercase version of it) and not a recognized category
                const knownCategories = Object.values(typeMap);
                if (!knownCategories.includes(type)) {
                    const upperRaw = parts[0].toUpperCase();
                    if (upperRaw.includes('CASACA')) type = 'CASACAS';
                    else if (upperRaw.includes('POLO')) type = 'POLOS';
                    else if (upperRaw.includes('JOGGER')) type = 'JOGGERS';
                    else if (upperRaw.includes('BOMBER')) type = 'BOMBER';
                }

                // Capture Size Breakdown
                const debugTargets = ['PIJAMA JERSEY', 'POLERAS C.R.', 'POLERAS CROP'];
                if (debugTargets.includes(type)) {
                    if (!sizeBreakdown[type]) sizeBreakdown[type] = {}; // safety
                    if (!sizeBreakdown[type][size]) sizeBreakdown[type][size] = 0;
                    sizeBreakdown[type][size] += qty;
                }

                totalQuantity += qty;
                summaryByType[type] = (summaryByType[type] || 0) + qty;

                // --- NORMALIZATION HEURISTICS ---
                const colorMap = {
                    'VerdeFosforecente': 'Verde Fosforecente',
                    'VerdePerico': 'Verde Perico',
                    'VerdeBotella': 'Verde Botella',
                    'VerdeMilitar': 'Verde Militar',
                    'AceroPal': 'Acero Pal',
                    'AzulMarino': 'Azul Marino',
                    'AzulCielo': 'Azul Cielo',
                    'BijouBlue': 'Bijou Blue',
                    'Mentabb': 'Menta Bb',
                    'Lilabb': 'Lila Bb',
                    'Rosadobb': 'Rosado Bb',
                    'PaloRosa': 'Palo Rosa',
                    'PaloRosaFuerte': 'Palo Rosa Fuerte',
                    'RosadoFuerte': 'Rosado Fuerte',
                    'FucsiaBrillante': 'Fucsia Brillante',
                    'Anaranjado': 'Naranja',
                    'AmarilloBrasil': 'Amarillo Brazil',
                    'AmarilloOro': 'Amarillo Oro',
                    'Melange3%': 'Melange 3%',
                    'Melange10%': 'Melange 10%',
                    'RataOscuro': 'Rata Oscuro'
                };

                // Normalize Color Key (remove spaces/special chars to match map keys if messy)
                let normalizedColor = color.trim();
                const sanitizedColor = normalizedColor.replace(/\s+/g, '');
                if (colorMap[sanitizedColor]) {
                    normalizedColor = colorMap[sanitizedColor];
                }

                // Sanitize color
                normalizedColor = normalizedColor.toUpperCase();

                // ID Generation (Sanitize slashes for Firestore Paths)
                const safeColor = color.replace(/\//g, '-');
                const id = `${type}_${safeColor}_${size}`.replace(/\s+/g, '-').toLowerCase();

                // Check for duplicates
                if (docsToSet.some(d => d.id === id)) {
                    duplicateLog.push(`Fila ${i + 1}: ${id} (Duplicado)`);
                }

                docsToSet.push({
                    id: id,
                    data: { type, color, size, quantity: qty }
                });
            }

            // Batch Process
            const batchSize = 450;
            let operationCount = 0;

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

            // Return success with skip info
            let warnings = "";
            if (skippedLog.length > 0) {
                // Show first 5 errors to avoid spamming
                const preview = skippedLog.slice(0, 5).join('\n');
                const extra = skippedLog.length > 5 ? `\n...y ${skippedLog.length - 5} más.` : "";
                warnings += `\n\n⚠️ ${skippedLog.length} alertas de formato/calidad:\n${preview}${extra}`;
            }

            if (duplicateLog.length > 0) {
                const preview = duplicateLog.slice(0, 5).join('\n');
                const extra = duplicateLog.length > 5 ? `\n...y ${duplicateLog.length - 5} más.` : "";
                warnings += `\n\n⚠️ ${duplicateLog.length} CÓDIGOS DUPLICADOS detectados (se sumaron al total, pero se sobreescribirán):\n${preview}${extra}`;
            }

            // Special Debug Counts for User Verification
            let pijamaJerseyCount = 0;
            let cropCrCount = 0;
            if (summaryByType['PIJAMA JERSEY']) pijamaJerseyCount = summaryByType['PIJAMA JERSEY'];
            if (summaryByType['CropCR']) cropCrCount = summaryByType['CropCR'];

            // Format Breakdown Message
            let breakdownMsg = "\n\n📏 DESGLOSE POR TALLAS (Items Clave):";
            ['PIJAMA JERSEY', 'POLERAS C.R.', 'POLERAS CROP'].forEach(t => {
                breakdownMsg += `\n>> ${t}:`;
                const sizes = sizeBreakdown[t] || {};
                if (Object.keys(sizes).length === 0) {
                    breakdownMsg += " (Sin datos)";
                } else {
                    Object.keys(sizes).sort().forEach(sz => {
                        breakdownMsg += `\n   - Talla ${sz}: ${sizes[sz]}`;
                    });
                }
            });

            let debugMsg = `\n\n🔍 VERIFICACIÓN FINAL:\n- PIJAMA JERSEY encontrados: ${pijamaJerseyCount}\n- CropCR encontrados: ${cropCrCount}\n\n[FIX V5.1 - RAW INSPECTOR]`;
            debugMsg += breakdownMsg;

            // Add RAW FILE PREVIEW
            const rawPreview = lines.slice(0, 8).map((l, idx) => `Ln ${idx}: ${l.substring(0, 80)}...`).join('\n');
            debugMsg += `\n\n📄 VISTA PREVIA DEL ARCHIVO (Primeras 8 líneas):\n${rawPreview}`;

            if (parseDebug.length > 0) {
                // Show trace if it exists
                debugMsg += `\n\n🐞 RASTREO "CROP" (Muestra 50):\n` + parseDebug.join('\n');
            } else {
                debugMsg += `\n\n🐞 RASTREO: No se encontró la palabra "crop" en ninguna fila.`;
            }

            // FORCE SHOW DEBUG
            if (isDryRun) {
                alert("🔍 INSPECTOR DE ARCHIVO (V5.2 - CACHE BUSTER):\n" + debugMsg);
            }

            return {
                success: true,
                count: operationCount,
                totalQuantity: totalQuantity,
                summaryByType: summaryByType,
                message: warnings + debugMsg,
                debugCropTrace: [],
                debugCrTrace: []
            };

        } catch (e) {
            console.error("CSV Import Error", e);
            return { success: false, error: e.message };
        }
    }
};
