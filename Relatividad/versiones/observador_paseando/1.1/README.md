# Relatividad

Proyecto de simulaciones interactivas de relatividad para Física IB.

## Estructura principal

- `ascensor_einstein.html`: simulación independiente de relatividad general sobre el principio de equivalencia. Permite alternar entre ascensor acelerado y gravedad planetaria.
- `bicicleta_einstein.html`: simulación independiente de relatividad especial sobre suma relativista de velocidades usando la bicicleta de Einstein y la manzana.
- `muon_einstein.html`: simulación independiente del muón cósmico con dos marcos: tiempo terrestre y tiempo propio del muón.
- `torre_gravitatoria.html`: simulación independiente de relatividad general sobre dilatación temporal gravitatoria en una torre con dos relojes configurables.
- `lente_gravitacional.html`: simulacion independiente de lente gravitacional con doble imagen, rayos curvados y vista del observador.
- `observador_paseando.html`: simulacion independiente de relatividad de la simultaneidad con Galileo en reposo y Einstein paseando.
- `simulador_relatividad.html`: simulador global anterior con menú de relatividad especial/general y varias simulaciones en una sola página.
- `simulador_relatividad_ib.html`: panel IB con bloques de relatividad especial y general, tarjetas y simulaciones integradas.
- `assets/`: gráficos raster usados por las simulaciones, incluyendo la bicicleta, ruedas, manzana, cara de Einstein, fondos del ascensor, árboles, sendero de tierra, muón, Tierra realista, torre gravitatoria, paisaje alpino y fondo de agujero negro.
- `versiones/`: histórico de versiones congeladas para poder volver atrás.

## Versiones autocontenidas

Cada HTML principal tiene una copia `*_autocontenida.html`.

Estas copias sustituyen rutas como `assets/einstein-bike.png` por datos embebidos `data:image/png;base64,...`.

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
