// Configuración Global

// Usuarios iniciales (En una app real esto iría en una base de datos segura)
export const INITIAL_USERS = [
    { username: 'admin', password: '123', role: 'admin', name: 'Administrador' },
    { username: 'Jampier', password: '123', role: 'operator', name: 'Jampier' },
    { username: 'Raul', password: '123', role: 'operator', name: 'Raul' }
];

// Tipos de prendas
export const GARMENT_TYPES = [
    'Polo Básico',
    'Polo Manga Larga',
    'Polera',
    'Pantalón Buzo',
    'Short'
];

// Tallas disponibles
export const SIZES = [
    '4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'
];

// Colores disponibles (Hex para mostrar en UI si se desea)
export const COLORS = [
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Rojo', hex: '#EF4444' },
    { name: 'Azul Marino', hex: '#1E3A8A' },
    { name: 'Gris Melange', hex: '#9CA3AF' },
    { name: 'Verde Militar', hex: '#3F6212' }
];

export const APP_NAME = "Control de Inventario - Producción";
