# Relatividad

Proyecto de simulaciones interactivas de relatividad para Física IB.

## Estructura principal

- `ascensor_einstein.html`: simulación independiente de relatividad general sobre el principio de equivalencia. Permite alternar entre ascensor acelerado y gravedad planetaria.
- `bicicleta_einstein.html`: simulación independiente de relatividad especial sobre suma relativista de velocidades usando la bicicleta de Einstein y la manzana.
- `dos_observadores.html`: simulacion independiente de dos marcos inerciales con Maxwell en una estacion londinense y Einstein viajando en tren.
- `lanza_granero.html`: simulacion independiente de la paradoja de la lanza y el granero con comparacion de marcos.
- `gemelos.html`: simulacion independiente de la paradoja de los gemelos con viaje espacial de ida y vuelta.
- `muon_einstein.html`: simulación independiente del muón cósmico con dos marcos: tiempo terrestre y tiempo propio del muón.
- `torre_gravitatoria.html`: simulación independiente de relatividad general sobre dilatación temporal gravitatoria en una torre con dos relojes configurables.
- `lente_gravitacional.html`: simulacion independiente de lente gravitacional con doble imagen, rayos curvados y vista del observador.
- `observador_paseando.html`: simulacion independiente de relatividad de la simultaneidad con Galileo en reposo y Einstein paseando.
- `reloj_einstein.html`: simulacion independiente del reloj de luz de Einstein, con dos viñetas asimetricas, fondo espacial, Einstein raster de espaldas, bola luminosa, rastro y contadores de toques.
- `espaguetizacion.html`: simulacion independiente de fuerzas de marea con atraccion, espaguetizacion y engullimiento del mu?eco.
- `Relatividad.html`: pagina indice principal con menu de relatividad especial/general y enlaces a todas las simulaciones independientes.
- `simulador_relatividad.html`: simulador global anterior con menú de relatividad especial/general y varias simulaciones en una sola página.
- `simulador_relatividad_ib.html`: panel IB con bloques de relatividad especial y general, tarjetas y simulaciones integradas.
- `assets/`: gráficos raster usados por las simulaciones, incluyendo bicicleta, ruedas, manzana, cara de Einstein, fondos del ascensor, árboles, sendero de tierra, muón, Tierra realista, torre gravitatoria, paisaje alpino, fondo de agujero negro, sprites del observador paseando y sprites del reloj de luz.
- `versiones/`: histórico de versiones congeladas para poder volver atrás.

## Versiones autocontenidas

Cada HTML principal tiene una copia `*_autocontenida.html`.

Estas copias sustituyen rutas como `assets/einstein-bike.png` por datos embebidos `data:image/png;base64,...`.

En `Relatividad_autocontenida.html`, los enlaces a simulaciones se reescriben automaticamente para apuntar a sus versiones `*_autocontenida.html`.

Uso recomendado:

- Editar siempre el HTML normal.
- Regenerar después su copia autocontenida.
- No editar manualmente los archivos `*_autocontenida.html`, salvo emergencia.

## Simulaciones separadas

La dirección de trabajo es mantener cada simulación como una web independiente:

- Una página para la bicicleta de Einstein.
- Una página para el ascensor de Einstein.
- Futuras páginas separadas para reloj de luz, muón, lente gravitacional, etc.

Cuando las simulaciones estén cerradas, se montará una página índice con menú visual. Ese menú abrirá cada simulación como subpágina, en vez de mezclar toda la lógica en una única página gigante.

## Estado base

La reorganización inicial queda marcada como versión `2.0`.

La raíz de `Relatividad` contiene la versión activa. Las carpetas dentro de `versiones/` contienen copias congeladas de los hitos cerrados.
