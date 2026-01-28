import { db } from './firebase-config.js';
import { collection, query, where, getDocs } from "https://www.gstatic.com/firebasejs/10.8.0/firebase-firestore.js";

const STORAGE_KEY_USER = 'inventory_user_session';

export const Auth = {
    // Iniciar sesión (Async)
    async login(username, password) {
        try {
            const usersRef = collection(db, 'users');
            const q = query(usersRef, where("username", "==", username), where("password", "==", password));
            const querySnapshot = await getDocs(q);

            if (!querySnapshot.empty) {
                // Should find exactly one
                const doc = querySnapshot.docs[0];
                const userData = doc.data();

                // Guardamos sesión (sin password)
                const sessionData = { username: userData.username, name: userData.name, role: userData.role };
                localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(sessionData));
                return { success: true, user: sessionData };
            } else {
                return { success: false, error: 'Credenciales inválidas' };
            }
        } catch (e) {
            console.error("Login error:", e);
            return { success: false, error: 'Error de conexión' };
        }
    },

    // Cerrar sesión
    logout() {
        localStorage.removeItem(STORAGE_KEY_USER);
    },

    // Obtener usuario actual
    getCurrentUser() {
        const data = localStorage.getItem(STORAGE_KEY_USER);
        return data ? JSON.parse(data) : null;
    },

    // Verificar si está logueado
    isLoggedIn() {
        return !!localStorage.getItem(STORAGE_KEY_USER);
    }
};
