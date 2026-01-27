// Configuración Global

// Usuarios iniciales (En una app real esto iría en una base de datos segura)
export const INITIAL_USERS = [
    { username: 'admin', password: '123', role: 'admin', name: 'Administrador' },
    { username: 'Jampier', password: '123', role: 'operator', name: 'Jampier' },
    { username: 'Raul', password: '123', role: 'operator', name: 'Raul' }
];

// Tipos de prendas
export const GARMENT_TYPES = [
    'Polera',
    'Casaca',
    'Polo',
    'Jogger',
    'Crop',
    'Cuellor',
    'Pijama Jersey',
    'Polera Temática',
    'Bomber',
    'Pijama Felpa',
    'Pijama',
    'Pantalón P',
    'Cropcr'
];

// Tallas disponibles
export const SIZES = [
    '4', '6', '8', '10', '12', '14', '16', 'S', 'M', 'L', 'XL', 'XXL'
];

// Colores disponibles (Hex para mostrar en UI si se desea)
export const COLORS = [
    { name: 'Negro', hex: '#000000' },
    { name: 'Blanco', hex: '#FFFFFF' },
    { name: 'Melange 3%', hex: '#E0E0E0' },
    { name: 'Melange 10%', hex: '#9E9E9E' },
    { name: 'Rata Oscuro', hex: '#424242' },
    { name: 'Verde Fosforecente', hex: '#39FF14' },
    { name: 'Verde Perico', hex: '#76FF03' },
    { name: 'Verde Botella', hex: '#1B5E20' },
    { name: 'Verde Militar', hex: '#556B2F' },
    { name: 'Acero Pal', hex: '#B0C4DE' },
    { name: 'Azul Marino', hex: '#0D47A1' },
    { name: 'Azulino', hex: '#2962FF' },
    { name: 'Azul Cielo', hex: '#4FC3F7' },
    { name: 'Bijou Blue', hex: '#4682B4' },
    { name: 'Menta Bb', hex: '#B9F6CA' },
    { name: 'Celeste', hex: '#81D4FA' },
    { name: 'Morado', hex: '#9C27B0' },
    { name: 'Lila Bb', hex: '#E1BEE7' },
    { name: 'Rosado Bb', hex: '#F8BBD0' },
    { name: 'Palo Rosa', hex: '#D8A1A1' },
    { name: 'Palo Rosa Fuerte', hex: '#C27474' },
    { name: 'Rosado Fuerte', hex: '#F06292' },
    { name: 'Chicle', hex: '#FF80AB' },
    { name: 'Fucsia Brillante', hex: '#D500F9' },
    { name: 'Rojo', hex: '#D32F2F' },
    { name: 'Guinda', hex: '#880E4F' },
    { name: 'Naranja', hex: '#FF9800' },
    { name: 'Amarillo Brazil', hex: '#FFEB3B' },
    { name: 'Amarillo Oro', hex: '#FFC107' },
    { name: 'Mostaza', hex: '#FBC02D' },
    { name: 'Camello', hex: '#C19A6B' },
    { name: 'Kaki', hex: '#F0E68C' },
    { name: 'Beige', hex: '#F5F5DC' },
    { name: 'Perla', hex: '#FAFAFA' },

    // Especiales (Círculo Blanco por defecto)
    { name: 'Panda', hex: '#FFFFFF' },
    { name: 'Negro/Blanco', hex: '#FFFFFF' },
    { name: 'Blanco/Negro', hex: '#FFFFFF' },
    { name: 'Negro/Rosado', hex: '#FFFFFF' },
    { name: 'Rosado/Negro', hex: '#FFFFFF' }, // Corregido typo "negp"
    { name: 'Rosado/Celeste', hex: '#FFFFFF' },
    { name: 'Celeste/Rosado', hex: '#FFFFFF' },
    { name: 'Grinch', hex: '#FFFFFF' }
];

export const APP_NAME = "Control de Inventario - Producción";
