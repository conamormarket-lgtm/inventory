
const LEGACY_DATA = [
    // --- ENTRADAS ---
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 154, details: "Polera - Negro - S (Cant: 154)", metadata: { imported: true, type: "Polera", color: "Negro", size: "S" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 92, details: "Polera - Negro/Rosado - S (Cant: 92)", metadata: { imported: true, type: "Polera", color: "Negro/Rosado", size: "S" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 69, details: "Polera - Guinda - L (Cant: 69)", metadata: { imported: true, type: "Polera", color: "Guinda", size: "L" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 61, details: "Polera - RosadoFuerte - M (Cant: 61)", metadata: { imported: true, type: "Polera", color: "RosadoFuerte", size: "M" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 57, details: "Polera - Blanco - M (Cant: 57)", metadata: { imported: true, type: "Polera", color: "Blanco", size: "M" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 53, details: "Polera - RosadoFuerte - S (Cant: 53)", metadata: { imported: true, type: "Polera", color: "RosadoFuerte", size: "S" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 43, details: "Polera - RosadoFuerte - L (Cant: 43)", metadata: { imported: true, type: "Polera", color: "RosadoFuerte", size: "L" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 42, details: "Polera - Negro/Blanco - M (Cant: 42)", metadata: { imported: true, type: "Polera", color: "Negro/Blanco", size: "M" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 41, details: "Polera - Blanco - L (Cant: 41)", metadata: { imported: true, type: "Polera", color: "Blanco", size: "L" } },
    { timestamp: "2026-01-26T10:00:00Z", action: "entry", user: "Importado", quantity: 39, details: "Polera - Beige - M (Cant: 39)", metadata: { imported: true, type: "Polera", color: "Beige", size: "M" } },
    // Truncated for brevity manually, but I will include a script to parse instead?
    // Writing 500 items manually in this tool call is risky and error prone.
    // BETTER IDEA: Write a JS function in `legacy_data.js` that contains the RAW CSV string and parses it on the fly.
];

const RAW_ENTRADAS = `CATEGORÍA,DETALLE (SKU),CANTIDAD,FECHA GENERACIÓN
Polera,Negro - S,154,26/01/2026
Polera,Negro/Rosado - S,92,26/01/2026
Polera,Guinda - L,69,26/01/2026
Polera,RosadoFuerte - M,61,26/01/2026
Polera,Blanco - M,57,26/01/2026
Polera,RosadoFuerte - S,53,26/01/2026
Polera,RosadoFuerte - L,43,26/01/2026
Polera,Negro/Blanco - M,42,26/01/2026
Polera,Blanco - L,41,26/01/2026
Polera,Beige - M,39,26/01/2026
Polera,Lilabb - L,38,26/01/2026
Polera,Panda - XL,38,26/01/2026
Polera,Beige - S,31,26/01/2026
Polera,Azulino - 16,27,26/01/2026
Polera,AceroPal - M,27,26/01/2026
Polera,Melange3% - L,25,26/01/2026
Polera,Negro/Blanco - L,24,26/01/2026
Polera,VerdePerico - S,24,26/01/2026
Polera,Azulino - L,23,26/01/2026
Polera,Negro/Blanco - XL,21,26/01/2026
Polera,Guinda - M,21,26/01/2026
Polera,Beige - 8,21,26/01/2026
Polera,Negro - M,20,26/01/2026
Polera,Beige - XL,20,26/01/2026
Polera,Beige - 6,20,26/01/2026
Polera,Perla - XXL,20,26/01/2026
Polera,Blanco - 16,18,26/01/2026
Polera,Blanco - XXL,18,26/01/2026
Polera,Beige - 12,16,26/01/2026
Polera,Blanco - 12,16,26/01/2026
Polera,Celeste - L,15,26/01/2026
Polera,AceroPal - L,15,26/01/2026
Polera,Melange3% - M,14,26/01/2026
Polera,Negro - L,14,26/01/2026
Polera,Blanco/Negro - L,13,26/01/2026
Polera,Blanco - S,13,26/01/2026
Polera,Rosado/Celeste - XL,13,26/01/2026
Polera,Melange3% - XL,12,26/01/2026
Polera,Blanco - 8,12,26/01/2026
Polera,VerdePerico - XL,12,26/01/2026
Polera,Rojo - S,10,26/01/2026
Polera,Lilabb - 16,10,26/01/2026
Polera,Negro - 4,8,26/01/2026
Polera,Negro - 6,8,26/01/2026
Polera,Melange3% - S,8,26/01/2026
Polera,AceroPal - S,7,26/01/2026
Polera,Celeste - S,7,26/01/2026
Polera,Rosado/Negro - S,7,26/01/2026
Polera,Perla - M,7,26/01/2026
Polera,Blanco/Negro - XXL,7,26/01/2026
Polera,Celeste/Rosado - M,6,26/01/2026
Polera,Lilabb - M,6,26/01/2026
Polera,AceroPal - XL,6,26/01/2026
Polera,Perla - 8,6,26/01/2026
Polera,Blanco - XL,6,26/01/2026
Polera,Azulino - M,6,26/01/2026
Polera,Celeste - XL,6,26/01/2026
Polera,Azulino - XL,6,26/01/2026
Polera,Negro/Blanco - S,5,26/01/2026
Polera,Blanco/Negro - M,5,26/01/2026
Polera,Rosado/Negro - XL,5,26/01/2026
Polera,Beige - 16,4,26/01/2026
Polera,Negro - XXL,4,26/01/2026
Polera,Negro/Blanco - 14,4,26/01/2026
Polera,Rojo - M,4,26/01/2026
Polera,AmarilloOro - L,3,26/01/2026
Polera,Beige - L,3,26/01/2026
Polera,Azulino - S,3,26/01/2026
Polera,Celeste - M,3,26/01/2026
Polera,Blanco/Negro - S,3,26/01/2026
Polera,Perla - 16,3,26/01/2026
Polera,VerdeMilitar - S,2,26/01/2026
Polera,VerdePerico - M,2,26/01/2026
Polera,Anaranjado - M,2,26/01/2026
Polera,Negro - XL,2,26/01/2026
Polera,VerdeMilitar - XL,2,26/01/2026
Polera,Melange3% - 16,2,26/01/2026
Polera,AmarilloOro - S,2,26/01/2026
Polera,Rojo - L,2,26/01/2026
Polera,Panda - S,1,26/01/2026
Polera,Lilabb - S,1,26/01/2026
Polera,Perla - S,1,26/01/2026
Polera,Rosado/Negro - M,1,26/01/2026
Polera,AzulMarino - M,1,26/01/2026
Polera,Guinda - XL,1,26/01/2026
Polera,Rosado/Negro - L,1,26/01/2026
Polera,Beige - 10,1,26/01/2026
Polera,Celeste/Rosado - 10,1,26/01/2026
Polera,Morado - S,1,26/01/2026
Polera,VerdeMilitar - M,1,26/01/2026
Polera,VerdePerico - L,1,26/01/2026
Polera,VerdeBotella - L,1,26/01/2026
Polera,FucsiaBrillante - L,1,26/01/2026
Polera,Anaranjado - L,1,26/01/2026
Polera,AmarilloBrasil - M,1,26/01/2026
Polera,Blanco/Negro - XL,1,26/01/2026
Polera,RosadoFuerte - XXL,1,26/01/2026
Polo,Blanco - L,103,26/01/2026
Polo,Blanco - M,96,26/01/2026
Polo,Negro - M,71,26/01/2026
Polo,Blanco - S,60,26/01/2026
Polo,Negro - S,48,26/01/2026
Polo,Blanco - XL,35,26/01/2026
Polo,Blanco - 10,30,26/01/2026
Polo,Celeste - 16,30,26/01/2026
Polo,Blanco - 12,20,26/01/2026
Polo,Negro - 10,15,26/01/2026
Polo,RosadoFuerte - M,15,26/01/2026
Polo,Blanco - 16,14,26/01/2026
Polo,Rosadobb - L,12,26/01/2026
Polo,AzulMarino - M,11,26/01/2026
Polo,Negro - L,8,26/01/2026
Polo,Celeste - M,5,26/01/2026
Polo,Rosadobb - 4,2,26/01/2026
Polo,Rosadobb - 10,1,26/01/2026
Polo,Rojo - 10,1,26/01/2026
Polo,RosadoFuerte - 4,1,26/01/2026
Polo,Negro - 8,1,26/01/2026
Polo,Negro - 4,1,26/01/2026
Polo,AceroPal - XL,1,26/01/2026
Polo,Rojo - M,1,26/01/2026
Polo,Beige - M,1,26/01/2026
Casaca,Negro - M,46,26/01/2026
Casaca,Perla - M,38,26/01/2026
Casaca,Negro - L,37,26/01/2026
Casaca,RosadoFuerte - L,37,26/01/2026
Casaca,Blanco - XXL,24,26/01/2026
Casaca,AceroPal - M,23,26/01/2026
Casaca,Blanco - M,18,26/01/2026
Casaca,Negro - 10,18,26/01/2026
Casaca,AzulMarino - M,17,26/01/2026
Casaca,Guinda - M,12,26/01/2026
Casaca,Perla - XXL,11,26/01/2026
Casaca,Perla - L,11,26/01/2026
Casaca,Anaranjado - L,11,26/01/2026
Casaca,Celeste - M,9,26/01/2026
Casaca,Lilabb - XL,9,26/01/2026
Casaca,Azulino - M,8,26/01/2026
Casaca,Melange3% - XL,8,26/01/2026
Casaca,Celeste - 10,8,26/01/2026
Casaca,Lilabb - S,6,26/01/2026
Casaca,AceroPal - L,6,26/01/2026
Casaca,Blanco - S,5,26/01/2026
Casaca,RosadoFuerte - S,5,26/01/2026
Casaca,RosadoFuerte - XL,5,26/01/2026
Casaca,Anaranjado - M,5,26/01/2026
Casaca,Anaranjado - XL,4,26/01/2026
Casaca,Lilabb - M,4,26/01/2026
Casaca,Blanco - XL,4,26/01/2026
Casaca,Melange3% - 16,4,26/01/2026
Casaca,VerdePerico - L,3,26/01/2026
Casaca,Beige - XL,3,26/01/2026
Casaca,RosadoFuerte - 14,3,26/01/2026
Casaca,Lilabb - L,2,26/01/2026
Casaca,AceroPal - XL,2,26/01/2026
Casaca,Blanco - 10,2,26/01/2026
Casaca,Celeste - S,1,26/01/2026
Casaca,Azulino - 12,1,26/01/2026
Casaca,Negro - S,1,26/01/2026
Casaca,Negro - 14,1,26/01/2026
Casaca,Melange3% - 10,1,26/01/2026
Casaca,Anaranjado - 16,1,26/01/2026
Casaca,Blanco - 8,1,26/01/2026
Casaca,Perla - 10,1,26/01/2026
Casaca,Perla - 6,1,26/01/2026
Jogger,Negro - M,61,26/01/2026
Jogger,Negro - S,52,26/01/2026
Jogger,Negro - L,45,26/01/2026
Jogger,Blanco - S,14,26/01/2026
Jogger,Negro - XL,12,26/01/2026
Jogger,Celeste - L,2,26/01/2026
Jogger,Blanco - L,2,26/01/2026
Jogger,Blanco - M,2,26/01/2026
Jogger,Azulino - M,1,26/01/2026
Jogger,Celeste - M,1,26/01/2026
Jogger,Negro - 14,1,26/01/2026
Jogger,Negro - 8,1,26/01/2026
Jogger,Lilabb - L,1,26/01/2026
Jogger,Lilabb - 10,1,26/01/2026
Jogger,Negro - XXL,1,26/01/2026
Crop,Blanco - M,42,26/01/2026
Crop,Beige - S,40,26/01/2026
Crop,beige - S,23,26/01/2026
Crop,Beige - M,20,26/01/2026
Crop,RosadoFuerte - M,6,26/01/2026
Crop,Negro - S,4,26/01/2026
Crop,Blanco - S,3,26/01/2026
PijamaJersey,Grinch - S,33,26/01/2026
PijamaJersey,Grinch - 10,1,26/01/2026
CuelloR,Perla - S,7,26/01/2026
CuelloR,Negro - M,7,26/01/2026
CuelloR,Negro - L,5,26/01/2026
CuelloR,Negro - S,2,26/01/2026
CuelloR,Blanco - M,1,26/01/2026
CuelloR,Celeste - S,1,26/01/2026
CuelloR,Lila bb - S,1,26/01/2026
CuelloR,Perla - M,1,26/01/2026
CuelloR,Melange 3% - 16,1,26/01/2026
Bomber,Negro/Blanco - S,14,26/01/2026
Bomber,Negro/Blanco - M,7,26/01/2026
PijamaFelpa,Grinch - 16,1,26/01/2026`;

const RAW_SALIDAS = `CATEGORÍA,DETALLE (SKU),CANTIDAD,FECHA GENERACIÓN
Polera,Negro - S,132,26/01/2026
Polera,Negro - M,93,26/01/2026
Polera,Negro/Rosado - S,93,26/01/2026
Polera,Lilabb - L,45,26/01/2026
Polera,Negro/Blanco - M,39,26/01/2026
Polera,Negro - L,38,26/01/2026
Polera,Negro/Blanco - L,34,26/01/2026
Polera,Panda - XL,30,26/01/2026
Polera,VerdePerico - S,28,26/01/2026
Polera,Negro - XL,26,26/01/2026
Polera,Blanco - S,25,26/01/2026
Polera,Guinda - L,24,26/01/2026
Polera,Beige - XL,22,26/01/2026
Polera,Lilabb - M,19,26/01/2026
Polera,Celeste - L,18,26/01/2026
Polera,Azulino - 16,18,26/01/2026
Polera,Blanco - XXL,18,26/01/2026
Polera,Rojo - S,17,26/01/2026
Polera,AceroPal - S,17,26/01/2026
Polera,Rojo - M,17,26/01/2026
Polera,Negro/Blanco - XL,17,26/01/2026
Polera,Blanco - M,17,26/01/2026
Polera,Lilabb - S,16,26/01/2026
Polera,VerdePerico - XL,14,26/01/2026
Polera,Perla - S,13,26/01/2026
Polera,Celeste - S,13,26/01/2026
Polera,Rosado/Celeste - XL,13,26/01/2026
Polera,Azulino - S,12,26/01/2026
Polera,Melange3% - M,12,26/01/2026
Polera,Melange3% - S,11,26/01/2026
Polera,Rojo - L,11,26/01/2026
Polera,VerdePerico - M,10,26/01/2026
Polera,Guinda - M,9,26/01/2026
Polera,Rosado/Negro - S,9,26/01/2026
Polera,Azulino - L,9,26/01/2026
Polera,Blanco - XL,9,26/01/2026
Polera,Perla - 16,9,26/01/2026
Polera,Blanco/Negro - S,8,26/01/2026
Polera,Celeste - M,8,26/01/2026
Polera,Azulino - M,8,26/01/2026
Polera,Guinda - S,7,26/01/2026
Polera,VerdePerico - L,7,26/01/2026
Polera,Perla - M,7,26/01/2026
Polera,Panda - M,7,26/01/2026
Polera,Celeste - XL,7,26/01/2026
Polera,Blanco - L,7,26/01/2026
Polera,Blanco/Negro - XXL,7,26/01/2026
Polera,Celeste/Rosado - M,6,26/01/2026
Polera,AceroPal - L,6,26/01/2026
Polera,Blanco/Negro - XL,6,26/01/2026
Polera,Negro - XXL,6,26/01/2026
Polera,Melange3% - L,6,26/01/2026
Polera,RosadoFuerte - M,5,26/01/2026
Polera,AmarilloOro - L,5,26/01/2026
Polera,RosadoFuerte - S,5,26/01/2026
Polera,Beige - L,5,26/01/2026
Polera,Celeste - 16,5,26/01/2026
Polera,AzulMarino - XL,4,26/01/2026
Polera,Beige - M,4,26/01/2026
Polera,Rosado/Celeste - M,4,26/01/2026
Polera,Beige - 16,4,26/01/2026
Polera,Negro/Rosado - XL,4,26/01/2026
Polera,Celeste/Rosado - S,3,26/01/2026
Polera,AceroPal - M,3,26/01/2026
Polera,Guinda - XL,3,26/01/2026
Polera,Rojo - 16,3,26/01/2026
Polera,Perla - L,3,26/01/2026
Polera,Negro/Blanco - S,3,26/01/2026
Polera,Rojo - XL,3,26/01/2026
Polera,Anaranjado - S,2,26/01/2026
Polera,VerdeMilitar - S,2,26/01/2026
Polera,Lilabb - XL,2,26/01/2026
Polera,Beige - S,2,26/01/2026
Polera,Negro - 4,2,26/01/2026
Polera,Blanco/Negro - L,2,26/01/2026
Polera,Panda - S,2,26/01/2026
Polera,Azulino - XL,2,26/01/2026
Polera,Melange3% - 12,2,26/01/2026
Polera,AmarilloBrasil - M,2,26/01/2026
Polera,VerdePerico - 16,2,26/01/2026
Polera,Blanco/Negro - M,2,26/01/2026
Polera,Celeste - 4,2,26/01/2026
Polera,Morado - S,2,26/01/2026
Polera,AzulMarino - M,2,26/01/2026
Polera,Negro/Rosado - M,2,26/01/2026
Polera,VerdeMilitar - M,2,26/01/2026
Polera,Anaranjado - L,2,26/01/2026
Polera,AceroPal - XL,2,26/01/2026
Polera,VerdeMilitar - XL,2,26/01/2026
Polera,Chicle - XL,2,26/01/2026
Polera,RosadoFuerte - 16,2,26/01/2026
Polera,RosadoFuerte - XL,1,26/01/2026
Polera,Perla - XL,1,26/01/2026
Polera,Lilabb - 6,1,26/01/2026
Polera,Negro - 8,1,26/01/2026
Polera,Celeste - 14,1,26/01/2026
Polera,Lilabb - 4,1,26/01/2026
Polera,Beige - 10,1,26/01/2026
Polera,Rosado/Celeste - S,1,26/01/2026
Polera,Celeste/Rosado - 10,1,26/01/2026
Polera,Celeste/Rosado - L,1,26/01/2026
Polera,Guinda - 14,1,26/01/2026
Polera,Guinda - 12,1,26/01/2026
Polera,Melange3% - XL,1,26/01/2026
Polera,VerdePerico - 14,1,26/01/2026
Polera,Negro - 14,1,26/01/2026
Polera,RosadoFuerte - XXL,1,26/01/2026
Polera,Guinda - 16,1,26/01/2026
Polera,Negro - 16,1,26/01/2026
Polera,Negro - 6,1,26/01/2026
Polera,BijouBlue - S,1,26/01/2026
Polera,AmarilloBrasil - S,1,26/01/2026
Polera,Mostaza - M,1,26/01/2026
Polera,Rosado/Negro - L,1,26/01/2026
Polera,FucsiaBrillante - L,1,26/01/2026
Polera,VerdeBotella - L,1,26/01/2026
Polera,AzulCielo - L,1,26/01/2026
Polera,Rosado/Negro - XL,1,26/01/2026
Polera,Panda - 16,1,26/01/2026
Polera,Negro/Rosado - 16,1,26/01/2026
Polo,Blanco - M,113,26/01/2026
Polo,Blanco - L,103,26/01/2026
Polo,Negro - S,84,26/01/2026
Polo,Negro - M,70,26/01/2026
Polo,Blanco - S,62,26/01/2026
Polo,AzulMarino - S,52,26/01/2026
Polo,Negro - L,36,26/01/2026
Polo,Melange3% - L,34,26/01/2026
Polo,Blanco - XL,26,26/01/2026
Polo,Negro - XL,19,26/01/2026
Polo,AceroPal - M,11,26/01/2026
Polo,AceroPal - XL,10,26/01/2026
Polo,Blanco - XXL,9,26/01/2026
Polo,Blanco - 16,9,26/01/2026
Polo,Negro - XXL,8,26/01/2026
Polo,Azulino - M,7,26/01/2026
Polo,Guinda - L,6,26/01/2026
Polo,Beige - S,6,26/01/2026
Polo,Rojo - M,5,26/01/2026
Polo,RosadoFuerte - M,5,26/01/2026
Polo,AceroPal - S,5,26/01/2026
Polo,Guinda - M,5,26/01/2026
Polo,Azulino - S,4,26/01/2026
Polo,AceroPal - L,3,26/01/2026
Polo,Beige - L,3,26/01/2026
Polo,Melange3% - M,3,26/01/2026
Polo,Blanco - 12,3,26/01/2026
Polo,Blanco - 4,3,26/01/2026
Polo,Blanco - 14,3,26/01/2026
Polo,Rojo - L,3,26/01/2026
Polo,Melange3% - S,3,26/01/2026
Polo,Celeste - S,3,26/01/2026
Polo,Blanco - 10,3,26/01/2026
Polo,Guinda - S,3,26/01/2026
Polo,Celeste - XL,2,26/01/2026
Polo,Guinda - XL,2,26/01/2026
Polo,Blanco - 8,2,26/01/2026
Polo,Rojo - S,2,26/01/2026
Polo,Celeste - M,2,26/01/2026
Polo,Celeste - 16,2,26/01/2026
Polo,Rosadobb - 16,2,26/01/2026
Polo,Negro - 6,2,26/01/2026
Polo,Lilabb - S,2,26/01/2026
Polo,Rosadobb - 14,1,26/01/2026
Polo,RosadoFuerte - S,1,26/01/2026
Polo,RosadoFuerte - 4,1,26/01/2026
Polo,Rojo - 10,1,26/01/2026
Polo,Negro - 14,1,26/01/2026
Polo,Melange3% - XL,1,26/01/2026
Polo,Lilabb - 10,1,26/01/2026
Polo,Negro - 10,1,26/01/2026
Polo,Lilabb - M,1,26/01/2026
Polo,Negro - 8,1,26/01/2026
Polo,RosadoFuerte - 6,1,26/01/2026
Polo,Beige - M,1,26/01/2026
Polo,Guinda - 14,1,26/01/2026
Polo,Negro - 12,1,26/01/2026
Polo,AceroPal - XXL,1,26/01/2026
Polo,Rosadobb - S,1,26/01/2026
Polo,VerdePerico - S,1,26/01/2026
Casaca,Negro - M,46,26/01/2026
Casaca,Perla - M,38,26/01/2026
Casaca,Negro - L,37,26/01/2026
Casaca,RosadoFuerte - L,37,26/01/2026
Casaca,Blanco - XXL,24,26/01/2026
Casaca,AceroPal - M,23,26/01/2026
Casaca,Blanco - M,18,26/01/2026
Casaca,Negro - 10,18,26/01/2026
Casaca,AzulMarino - M,17,26/01/2026
Casaca,Guinda - M,12,26/01/2026
Casaca,Perla - XXL,11,26/01/2026
Casaca,Perla - L,11,26/01/2026
Casaca,Anaranjado - L,11,26/01/2026
Casaca,Celeste - M,9,26/01/2026
Casaca,Lilabb - XL,9,26/01/2026
Casaca,Azulino - M,8,26/01/2026
Casaca,Melange3% - XL,8,26/01/2026
Casaca,Celeste - 10,8,26/01/2026
Casaca,Lilabb - S,6,26/01/2026
Casaca,AceroPal - L,6,26/01/2026
Casaca,Blanco - S,5,26/01/2026
Casaca,RosadoFuerte - S,5,26/01/2026
Casaca,RosadoFuerte - XL,5,26/01/2026
Casaca,Anaranjado - M,5,26/01/2026
Casaca,Anaranjado - XL,4,26/01/2026
Casaca,Lilabb - M,4,26/01/2026
Casaca,Blanco - XL,4,26/01/2026
Casaca,Melange3% - 16,4,26/01/2026
Casaca,VerdePerico - L,3,26/01/2026
Casaca,Beige - XL,3,26/01/2026
Casaca,RosadoFuerte - 14,3,26/01/2026
Casaca,Lilabb - L,2,26/01/2026
Casaca,AceroPal - XL,2,26/01/2026
Casaca,Blanco - 10,2,26/01/2026
Casaca,Celeste - S,1,26/01/2026
Casaca,Azulino - 12,1,26/01/2026
Casaca,Negro - S,1,26/01/2026
Casaca,Negro - 14,1,26/01/2026
Casaca,Melange3% - 10,1,26/01/2026
Casaca,Anaranjado - 16,1,26/01/2026
Casaca,Blanco - 8,1,26/01/2026
Casaca,Perla - 10,1,26/01/2026
Casaca,Perla - 6,1,26/01/2026
Jogger,Negro - M,61,26/01/2026
Jogger,Negro - S,52,26/01/2026
Jogger,Negro - L,45,26/01/2026
Jogger,Blanco - S,14,26/01/2026
Jogger,Negro - XL,12,26/01/2026
Jogger,Celeste - L,2,26/01/2026
Jogger,Blanco - L,2,26/01/2026
Jogger,Blanco - M,2,26/01/2026
Jogger,Azulino - M,1,26/01/2026
Jogger,Celeste - M,1,26/01/2026
Jogger,Negro - 14,1,26/01/2026
Jogger,Negro - 8,1,26/01/2026
Jogger,Lilabb - L,1,26/01/2026
Jogger,Lilabb - 10,1,26/01/2026
Jogger,Negro - XXL,1,26/01/2026
Crop,Blanco - M,42,26/01/2026
Crop,Beige - S,40,26/01/2026
Crop,beige - S,23,26/01/2026
Crop,Beige - M,20,26/01/2026
Crop,RosadoFuerte - M,6,26/01/2026
Crop,Negro - S,4,26/01/2026
Crop,Blanco - S,3,26/01/2026
PijamaJersey,Grinch - S,33,26/01/2026
PijamaJersey,Grinch - 10,1,26/01/2026
CuelloR,Perla - S,7,26/01/2026
CuelloR,Negro - M,7,26/01/2026
CuelloR,Negro - L,5,26/01/2026
CuelloR,Negro - S,2,26/01/2026
CuelloR,Blanco - M,1,26/01/2026
CuelloR,Celeste - S,1,26/01/2026
CuelloR,Lila bb - S,1,26/01/2026
CuelloR,Perla - M,1,26/01/2026
CuelloR,Melange 3% - 16,1,26/01/2026
Bomber,Negro/Blanco - S,14,26/01/2026
Bomber,Negro/Blanco - M,7,26/01/2026
PijamaFelpa,Grinch - 16,1,26/01/2026`;

function parseLegacyCSV(csv, action, timeOffsetMs = 0) {
    const lines = csv.split('\n');
    const logs = [];
    const baseDate = new Date();
    baseDate.setMilliseconds(baseDate.getMilliseconds() + timeOffsetMs);
    const timestamp = baseDate.toISOString();

    // Skip header (i=1)
    for (let i = 1; i < lines.length; i++) {
        const line = lines[i].trim();
        if (!line) continue;

        // Categoría, Detalle (Color - Talla), Cantidad, Fecha
        // Use careful regex split because numbers are simple, detail might have spaces
        const parts = line.split(',');
        if (parts.length < 3) continue;

        const type = parts[0].trim();
        const sku = parts[1].trim(); // "Color - Talla"
        const qty = parseInt(parts[2]);
        if (!qty) continue;

        // Split SKU: Color - Talla
        // "Negro - S" -> Color: Negro, Talla: S
        // "Negro/Rosado - S" -> Color: Negro/Rosado, Talla: S
        // Last hyphen usually separates size? Or first?
        // Usually, Size is at the end. "Color - Size".
        // Let's use lastIndexOf '-'
        const hyphenIdx = sku.lastIndexOf('-');
        let color = "SinColor";
        let size = "U";

        if (hyphenIdx > 0) {
            color = sku.substring(0, hyphenIdx).trim();
            size = sku.substring(hyphenIdx + 1).trim();
        } else {
            color = sku; // No size?
        }

        const details = `${type} - ${color} - ${size} (Cant: ${qty})`;

        logs.push({
            timestamp: timestamp,
            user: "Sistema (Importado)",
            action: action,
            quantity: qty,
            details: details,
            metadata: {
                imported: true,
                originalFile: "Reporte Legacy",
                type: type,
                color: color,
                size: size,
                quantity: qty
            }
        });
    }
    return logs;
}

// Module Accessor
export function getLegacyData() {
    // Offset entries by 1 minute behind exits to ensure order? 
    // Or just distinct.
    const entries = parseLegacyCSV(RAW_ENTRADAS, 'Entrada', 0);
    const exits = parseLegacyCSV(RAW_SALIDAS, 'Salida', 1000); // 1 sec later

    return [...entries, ...exits];
};
