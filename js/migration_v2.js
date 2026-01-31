import { db } from './firebase-config.js';
import { collection, getDocs, doc, setDoc } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

// Migration: Consolidate 'inventory' collection -> 'metadata/inventory_stats'
export async function runMigrationToSingleDoc() {
    console.log("Starting Migration to Single Doc...");
    try {
        const inventoryRef = collection(db, 'inventory');
        const snapshot = await getDocs(inventoryRef);

        let items = [];
        snapshot.forEach(doc => {
            const data = doc.data();
            // Map to compact format if desired, or keep full
            // Keeping full properties (type, color, size, quantity)
            // ID can be reconstructed or stored.
            items.push({
                id: doc.id,
                type: data.type,
                color: data.color,
                size: data.size,
                quantity: Number(data.quantity)
            });
        });

        console.log(`Read ${items.length} items. Writing to metadata/inventory_stats...`);

        // Write to single doc
        // Store as { items: [...] }
        await setDoc(doc(db, 'metadata', 'inventory_stats'), {
            items: items,
            lastUpdated: new Date().toISOString()
        });

        alert(`Migración Completa. ${items.length} prendas consolidadas.`);
        console.log("Migration Success.");

    } catch (e) {
        console.error("Migration Failed:", e);
        alert("Error en migración: " + e.message);
    }
}
