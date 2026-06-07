# Guía de desarrollo

Este documento define el flujo de trabajo para modificar las simulaciones de relatividad.

## Regla de oro

Cada simulación debe poder funcionar por separado.

Evitar añadir nuevas simulaciones directamente dentro de `simulador_relatividad.html` o `simulador_relatividad_ib.html` salvo que la tarea sea explícitamente mantener esos paneles antiguos.

## Flujo antes de modificar

1. Revisar qué HTML se va a tocar.
2. Confirmar la versión activa.
3. Si la versión activa todavía no está archivada, copiar el estado actual a `versiones/<version>`.
4. Modificar solo el HTML normal.
5. Regenerar el archivo `*_autocontenida.html` correspondiente.
6. Probar sintaxis JavaScript y revisar rutas de assets.
7. Actualizar estos MD si cambia la estructura o el flujo.

## Convención de versiones

- La versión activa inicial es `2.0`.
- La raíz de `Relatividad` contiene siempre el estado actual.
- `versiones/` acumula snapshots antiguos o hitos cerrados.
- Para un cambio nuevo, usar la siguiente versión menor: `2.1`, `2.2`, `2.3`, etc.
- Si el cambio rediseña la arquitectura completa, pasar a una versión mayor: `3.0`.

Estructura esperada:

```text
Relatividad/
  ascensor_einstein.html
  ascensor_einstein_autocontenida.html
  bicicleta_einstein.html
  bicicleta_einstein_autocontenida.html
  torre_gravitatoria.html
  torre_gravitatoria_autocontenida.html
  simulador_relatividad.html
  simulador_relatividad_autocontenida.html
  simulador_relatividad_ib.html
  simulador_relatividad_ib_autocontenida.html
  assets/
  versiones/
    2.0/
```

## Regenerar autocontenidos

Las páginas autocontenidas deben incluir los gráficos como `data:` URIs.

La generación actual reemplaza todas las referencias `assets/*.png` por datos base64.

Comprobación mínima tras regenerar:

```powershell
rg -n "assets/" .\Relatividad -g "*_autocontenida.html"
```

Si el comando no devuelve resultados, las versiones autocontenidas no dependen de la carpeta `assets`.

## Pruebas mínimas

Para HTML con JavaScript inline, usar `node --check`. En este entorno, si el `node` del PATH da `Acceso denegado`, usar el runtime empaquetado:

```powershell
$node = 'C:\Users\victo\.cache\codex-runtimes\codex-primary-runtime\dependencies\node\bin\node.exe'
$html = Get-Content -Path .\Relatividad\ascensor_einstein.html -Raw
$script = [regex]::Match($html, '<script>([\s\S]*?)</script>').Groups[1].Value
Set-Content -Path .\Relatividad\__check.js -Value $script -Encoding UTF8
& $node --check .\Relatividad\__check.js
Remove-Item .\Relatividad\__check.js
```

También revisar que no queden caracteres corruptos:

```powershell
Select-String -Path .\Relatividad\*.html -Pattern 'Â|Ã|â|�' -SimpleMatch
```

## Notas por archivo

`Relatividad.html`

- Es la pagina indice principal del proyecto.
- Debe mostrar primero un menu para elegir `Relatividad especial`, `Relatividad general` o `Todas`.
- Las tarjetas principales enlazan a las ocho simulaciones independientes activas: bicicleta, muon, reloj de luz, observador paseando, ascensor, torre, lente gravitacional y espaguetizacion.
- Los paneles antiguos `simulador_relatividad.html` y `simulador_relatividad_ib.html` quedan como accesos secundarios de referencia, no como simulaciones principales.
- La autocontenida debe generarse como `Relatividad_autocontenida.html`.
- En modo autocontenido, los enlaces internos deben apuntar automaticamente a los HTML `*_autocontenida.html`.

`ascensor_einstein.html`

- Dibuja toda la escena en canvas.
- Estado principal: modo, gravedad/aceleración, velocidad constante opcional, velocidad de animación y tiempo.
- Funciones clave: fondos, cabina, persona, rayo, HUD y controles.
- Usa `assets/einstein-face-sprite.png` para sustituir la cabeza vectorial del personaje central.
- Usa `assets/elevator-space-stars.png` para el modo de ascensor en el espacio.
- Usa `assets/elevator-planet-mountains-river.png` para el modo de gravedad planetaria.
- Si `a = 0` en modo ascensor, aparece el control de velocidad constante `v`; el rayo se representa como una recta inclinada, no como una curva.

`bicicleta_einstein.html`

- Usa sprites de `assets/`.
- Los sprites de fondo son `tree-sprite-sheet.png` y `dirt-path-sprite.png`.
- Calcula suma galileana `u = vE + u'`.
- Calcula suma relativista `u = (vE + u') / (1 + vE u')`.
- La animación depende del tiempo interno y de los deslizadores.
- Las ecuaciones están debajo de la animación y se maquetan con HTML/CSS en estilo LaTeX para funcionar sin CDN externo.

`dos_observadores.html`

- Simulacion independiente de relatividad especial para dos marcos inerciales.
- Usa `assets/dos-observadores-station-bg-source.png`, `assets/dos-observadores-train-sprite.png`, `assets/dos-observadores-maxwell-sprite.png`, `assets/dos-observadores-einstein-sprite.png` y `assets/observador-clock-sprite.png`.
- Maxwell permanece en el anden; Einstein se dibuja ligado al tren y oscila suavemente para dar sensacion de movimiento.
- El tren se mueve en bucle de izquierda a derecha con velocidad visual pedagogica, separada de la velocidad fisica.
- El control de velocidad permite `m/s` y unidades de `c`; internamente usa `beta = v/c`.
- Los relojes muestran fechas completas; el reloj del tren acumula `Delta tau = Delta t / gamma`.
- La autocontenida debe generarse como `dos_observadores_autocontenida.html`.

`lanza_granero.html`

- Simulacion independiente de la paradoja de la lanza y el granero.
- Usa `assets/lanza-granero-exterior-bg.png`, `assets/lanza-granero-interior-bg.png` y `assets/lanza-granero-runner-sprite.png`.
- Compara dos paneles: marco del granero y marco del corredor.
- Calculos principales: `gamma = 1 / sqrt(1 - beta^2)`, `L_lanza = L0/gamma` en el marco del granero y `L_granero = B0/gamma` en el marco del corredor.
- Debe destacar que la paradoja se resuelve con relatividad de la simultaneidad, no solo con contraccion de longitudes.
- La autocontenida debe generarse como `lanza_granero_autocontenida.html`.

`gemelos.html`

- Simulacion independiente de la paradoja de los gemelos.
- Usa `assets/gemelos-space-bg.png`, `assets/gemelos-earth-twin-sprite.png`, `assets/gemelos-astronaut-twin-sprite.png` y `assets/gemelos-rocket-sprite.png`.
- El viaje se anima como ida y vuelta entre Tierra y exoplaneta; la velocidad visual es pedagogica.
- Calculos principales: `t_Tierra = 2D/beta` anos si `D` esta en anos luz y `beta = v/c`; `tau_viajero = t_Tierra/gamma`.
- Los relojes muestran fechas completas para que la diferencia acumulada sea visible.
- La autocontenida debe generarse como `gemelos_autocontenida.html`.

`muon_einstein.html`

- Simulación independiente de relatividad especial para muones cósmicos.
- Usa `assets/muon-character-sprite.png` para el muón con cuerpo, brazos, piernas, letra μ y reloj.
- Usa `assets/earth-blue-marble-sprite.png`, derivado de una imagen pública de NASA/Apollo 17 en Wikimedia Commons, para representar la Tierra en el marco terrestre.
- Tiene dos canvas sincronizados: marco de la Tierra y reloj del muón.
- En el canvas del muón no debe aparecer la Tierra: desde su perspectiva el muón permanece localmente en reposo y solo se muestra un balanceo visual suave.
- Cálculos principales: `gamma = 1 / sqrt(1 - beta^2)`, `t = h / (beta c)` y `tau = t / gamma`.
- La autocontenida debe generarse como `muon_einstein_autocontenida.html`.

`torre_gravitatoria.html`

- Simulación independiente de relatividad general para dilatación temporal gravitatoria en una torre.
- Usa `assets/gravity-tower-sprite.png`, generado con `image_gen` y procesado con chroma key para transparencia.
- Usa `assets/gravity-tower-alps-background.png` como fondo alpino raster del canvas.
- Usa `assets/gravity-tower-black-hole-background.png` cuando el objeto cumple `R <= r_s`, con `r_s = 2GM/c^2`.
- Tiene dos relojes analógicos independientes, ambos con altura configurable entre superficie y cima de la torre.
- Los relojes también deben poder arrastrarse directamente con ratón o puntero sobre el canvas.
- Los temporizadores principales deben aparecer a la izquierda de la escena con marcador visual de d?a, mes y a?o en subrecuadros tipo contador digital.
- La altura de la torre se controla en metros, de `0 m` a `100 km`, con valor inicial `200 m`.
- Debe incluir un botón `Torre típica` que devuelva la altura a `200 m`.
- La escala temporal debe iniciar en `1 s/s` y usa anclas calibradas: `1 s/s`, `1 h/s`, `1 d?a/s`, `1 a?o/s` y `1 d?cada/s`; las etiquetas del deslizador deben corresponder con el ritmo visible del reloj 1. En Gargant?a se compensa la dilataci?n gravitatoria convirtiendo ese ritmo visible al tiempo coordenado necesario.
- El control de masa usa estado interno en kg y permite editar, en este orden, `kg`, `M_earth` y `M_sun`: `kg` va de `10 kg` a `1 M_earth`; `M_earth` va de `0.1 M_earth` a `1 M_sun`; `M_sun` va de `0.1 M_sun` a `6.6e11 M_sun`, diez veces la masa observada citada para TON 618 (`6.6e10 M_sun`).
- Debe incluir presets para Tierra, Luna, Júpiter, Sol y Gargantúa. Gargantúa usa `10^8 M_sun`, radio efectivo de horizonte `~1.59e8 km` y espín `chi = 0.998`, aproximando las estimaciones divulgadas por Kip Thorne para Interstellar.
- El radio del planeta/estrella usa escala logarítmica desde `100 km` hasta `10^9 km`.
- En régimen de agujero negro debe aparecer un control de espín Kerr `chi`, limitado a `0 <= chi <= 0.998`, y se muestra `Omega_H`.
- En régimen de agujero negro, la diferencia temporal se muestra como extrapolación pedagógica no física usando `sqrt(abs(1 - 2GM/(c^2 r)))`, para evitar que los dos relojes colapsen al mismo mínimo numérico.
- Cuando se active esa extrapolación, debe mostrarse una advertencia sobre el horizonte de sucesos, la imposibilidad de sostener una torre/reloj estático y los problemas de fuerzas de marea.
- Controles principales: escala temporal primero, masa, radio del planeta/estrella, altura de la torre, altura del reloj 1 y altura del reloj 2.
- El radio del planeta/estrella debe permitir al menos `100 km` como valor mínimo para explorar objetos compactos.
- Visualmente, para torres de `10 km` o más, el canvas debe separar atmósfera y espacio: los primeros `10 km` quedan en atmósfera y la parte restante queda en espacio.
- Debe incluir una referencia anual de la diferencia temporal para interpretar acumulaciones pequeñas.
- Cálculo principal: `dτ/dt = sqrt(1 - 2GM/(c^2 r))`, con `r = radio + altura`.
- Esta simulación usa versionado propio dentro de `versiones/torre_gravitatoria/`, empezando por `1.0`.
- La autocontenida debe generarse como `torre_gravitatoria_autocontenida.html`.

`simulador_relatividad.html`

- Panel antiguo más amplio con navegación dinámica entre simulaciones.
- Mantener como referencia, no como destino principal de nuevas simulaciones.

`simulador_relatividad_ib.html`

- Panel IB compacto con tarjetas generadas desde un array `cards`.
- Contiene simulaciones integradas y usa algunos gráficos de `assets/`.
- Mantener como referencia visual y conceptual.

## Simulaciones nuevas y separadas

`lente_gravitacional.html`

- La version activa esta en la raiz de `Relatividad`, junto a las demas simulaciones principales.
- Usa canvas y `assets/earth-blue-marble-sprite.png` para representar al observador Tierra.
- El usuario puede arrastrar estrellas fuente, el observador y la ventana de vista del observador.
- El panel de controles debe ir en una columna derecha estrecha junto al canvas para que animacion y controles se vean de golpe.
- Solo el agujero negro central curva la luz; las estrellas pequeñas son fuentes de fondo, no lentes.
- El modelo visual usa la ecuacion de lente delgada respecto al eje observador-agujero negro: calcula `theta_+` y `theta_-`, muestra imagen secundaria cuando su magnificacion es suficiente y anillo de Einstein en alineacion cercana.
- Los rayos se dibujan como trayectorias suaves que pasan por una zona de impacto alrededor del agujero negro usando interpolacion Catmull-Rom/Bezier. Evitar unir dos cuadraticas con tangentes incompatibles porque aparecen picos artificiales.
- La autocontenida debe generarse como `lente_gravitacional_autocontenida.html`.
- La carpeta antigua `LenteGravitacional/` se conserva solo como historico inicial `1.0`.

`RelojEinstein/`

- Version inicial `1.0`. Dos marcos: reloj en reposo y reloj visto desde Einstein en reposo junto a la carretera.
- La velocidad visual del reloj esta escalada pedagogicamente para que el movimiento sea visible incluso a velocidades bajas.

`reloj_einstein.html`

- La version activa esta en la raiz de `Relatividad`; la carpeta antigua `RelojEinstein/` queda como historico inicial.
- Usa `assets/reloj-einstein-back-sprite.png` para Einstein visto de espaldas, generado como raster y recortado desde chroma key; conservar `assets/reloj-einstein-back-source.png` como fuente.
- Usa `assets/reloj-space-background.png` como fondo espacial raster detras de ambos relojes. Debe estar procesado para que el borde derecho empalme con el izquierdo; conservar `assets/reloj-space-background-source-v2.png` como fuente.
- Usa `assets/reloj-light-clock-frame.png` para el marco del reloj de luz.
- Dibuja dos viñetas separadas en canvas: a la izquierda un panel estrecho con el reloj en reposo; a la derecha un panel ancho con Einstein y mucho recorrido para el reloj movil.
- En la cabecera superior derecha debe quedar solo el deslizador de velocidad. Las lecturas de gamma, periodo observado y contadores van debajo del canvas.
- La bola verde se dibuja en canvas para poder animarla con suavidad; en la viñeta derecha deja un rastro largo que se desvanece de atras hacia delante y se reinicia en cada toque o cuando el reloj vuelve a entrar por la izquierda.
- Ambos recuadros muestran contador de toques con las placas superior/inferior. Los contadores de la cabecera deben coincidir con los del canvas.
- La dilatacion temporal usa `gamma = 1 / sqrt(1 - beta^2)` y el periodo observado se muestra como `Delta t = gamma Delta tau`.

`Espaguetizacion/`

- Version inicial `1.0`. Einstein es arrastrable; la orientacion radial y el estiramiento dependen del gradiente de marea.
- Controles de masa por `kg`, `Mearth` y `Msun`, radio editable y presets Luna/Tierra/Sol/Gargantúa.

`observador_paseando.html`

- La version activa esta en la raiz de `Relatividad`; la carpeta antigua `ObservadorPaseando/` queda como historico inicial.
- Usa `assets/observador-beach-night-background.png`, `assets/observador-galileo-sprite.png`, `assets/observador-einstein-walking-sprite.png`, `assets/observador-star-blue-real.png`, `assets/observador-star-orange-real.png` y `assets/observador-clock-sprite.png`.
- El fondo activo `observador-beach-night-background.png` debe tener mucha arena en la parte inferior y una linea de costa horizontal para que Einstein camine sobre arena. Se conserva `observador-beach-night-background-source-v2.png` como fuente generada.
- El fondo activo debe partir de `observador-beach-night-background-source-v2.png`, pero exportado como una imagen cuatro veces mas larga en `observador-beach-night-background.png`. La franja final de cada repeticion debe mezclarse con el inicio para que el desplazamiento horizontal no revele salto izquierda-derecha.
- Dos escenas sincronizadas: Galileo ve el fondo de playa estatico y explosiones simultaneas; Einstein camina en el centro mientras el fondo se desplaza segun `v`.
- El fondo de Einstein debe moverse como cinta ciclica sin cortes visibles, pero sin rotacion: la costa debe quedar horizontal.
- El boton visible `Reiniciar` y el deslizador de velocidad van en una tarjeta flotante centrada dentro del canvas, entre los dos recuadros. No debe quedar un bloque inferior separado para esos controles.
- El control de velocidad usa un deslizador logaritmico desde `1 m/s` hasta `0.99 c`. Debe incluir textbox manual y selector de unidades `c` / `m/s`; el textbox debe aceptar coma o punto decimal.
- El estado inicial debe ser `1 m/s`, `10 anos luz` entre estrellas y selector de velocidad en `m/s`. Con esos valores el desfase fisico debe ser aproximadamente `1.05 s`.
- La tarjeta flotante central incluye el deslizador `Distancia entre las estrellas`, medido en anos luz. Este control no modifica la posicion grafica de las estrellas: solo cambia el calculo fisico del desfase.
- Debajo del deslizador de distancia debe mostrarse `Distancia a los observadores`, tambien en anos luz. Es una lectura calculada a partir de la separacion grafica aparente de las estrellas y de la distancia real elegida entre ellas.
- El cronometro `Desfase medido por Einstein` debe ir dentro de esa misma tarjeta flotante, debajo del deslizador, para no tapar las estrellas de la viñeta derecha.
- Las estrellas principales usan `assets/observador-star-blue-real.png` y `assets/observador-star-orange-real.png`; deben verse mas pequeñas que las primeras versiones y con aspecto de estrella tipo Sol.
- Las lecturas de gamma, desfase y estado van debajo del canvas.
- El desfase fisico usa `Delta t' = gamma beta L/c`; si `L` se introduce en anos luz, el resultado queda directamente en anos. La animacion reescala este valor para que el retardo visual sea util en clase.
- El retardo visual entre explosiones se limita a `5 s`, aunque las lecturas muestran el desfase fisico real. Cuando el desfase fisico supera ese limite debe aparecer un reloj raster con manecillas aceleradas entre la primera y la segunda explosion.
- La cuenta atras dura 3 s. Al estallar las dos estrellas, la animacion se detiene y aparece el boton `Reiniciar`; no debe reiniciarse sola.
- La autocontenida debe generarse como `observador_paseando_autocontenida.html`.

- `fmtDelta(sec)` debe escalar automáticamente: hasta `1000 s` muestra segundos; después minutos hasta `1000 min`; horas hasta `100 h`; días hasta `500 días`; años hasta `300 años`; y a partir de ahí siglos.

`espaguetizacion.html`

- La version activa esta en la raiz de `Relatividad`; la carpeta antigua `Espaguetizacion/` queda como historico inicial.
- Einstein es arrastrable; al soltarlo cae progresivamente hacia el cuerpo masivo, se alinea radialmente, se estira por el gradiente de marea y puede ser engullido.
- Usa `assets/observador-einstein-walking-sprite.png` como caricatura de Einstein y los sprites `espaguetizacion-moon-sprite.png`, `earth-blue-marble-sprite.png`, `espaguetizacion-sun-sprite.png`, `espaguetizacion-gargantua-sprite.png`.
- El fondo activo es `assets/espaguetizacion-space-background.png`.
- Controles de masa por `kg`, `Mearth` y `Msun`, radio editable y presets Luna/Tierra/Sol/Gargant?a.
- La autocontenida debe generarse como `espaguetizacion_autocontenida.html`.
