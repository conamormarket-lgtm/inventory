import { INITIAL_USERS } from './config.js';

const STORAGE_KEY_USER = 'inventory_user_session';

export const Auth = {
    // Iniciar sesión
    login(username, password) {
        // En un caso real, esto sería una llamada al backend
        const user = INITIAL_USERS.find(u => u.username === username && u.password === password);

        if (user) {
            // Guardamos sesión (sin password)
            const sessionData = { username: user.username, name: user.name, role: user.role };
            localStorage.setItem(STORAGE_KEY_USER, JSON.stringify(sessionData));
            return { success: true, user: sessionData };
        } else {
            return { success: false, error: 'Credenciales inválidas' };
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
