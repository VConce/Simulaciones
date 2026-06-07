# Arquitectura del simulador EM

## Base activa

La base de trabajo de Codex queda fijada en:

- `LaboratorioEM.html`

Esta copia procede de `EM_Codex_3.2.html`, que a su vez procede de `simulador_campo_electrico_compacto_Antigravity.html`. La version activa debe vivir directamente en `SimulaciÃ³nElecMag` para que las rutas relativas `assets/electric/...` funcionen. Las versiones anteriores se guardan en `Versiones`.

## Estructura de la carpeta

- `simulador_campo_electrico_compacto_Antigravity.html`: version recibida de Antigravity. Es el origen de `EM_Codex_2.0`.
- `LaboratorioEM.html`: version activa actual.
- `LaboratorioEM_compacto.html`: copia de envio con PNG locales incrustados en base64.
- `Versiones/`: historial de versiones Codex. La version archivada inicial es `EM_Codex_2.0.html`.
- `assets/electric/`: graficos raster personalizados usados por el simulador.
- `simulador_campo_electrico.html`, `simulador_campo_electrico_compacto.html`, `simulador_campo_electrico_v2.html`: versiones anteriores o alternativas. No son la base activa salvo peticion expresa.

## Graficos y estilo visual

La version Antigravity usa principalmente imagenes PNG personalizadas:

- `charge-positive.png`, `charge-negative.png`: cargas puntuales.
- `arrow-electric.png`, `arrow-variable.png`: flechas de campo.
- `probe.png`: sonda.
- `current-wire.png`, `magnetic-dot.png`, `magnetic-cross.png`: corrientes.
- `solenoid.png`: solenoide rasterizado para el menu de herramientas.
- `charged-plane.png`, `charged-sphere.png`, `sphere-volume.png`, `sphere-shell.png`: distribuciones cargadas.
- `foam.png`: dielectrico.
- `faraday-cage.png`: jaula de Faraday.
- `bar-magnet.png`: iman.
- `vconce.png`: logo VConce usado como monopolo magnetico ficticio.
- `trash.png`: papelera.
- `electric-spritesheet-transparent.png`: spritesheet grande de apoyo.

Regla para futuras modificaciones: mantener esta linea visual rasterizada. No introducir nuevos iconos SVG si se puede resolver con PNG/canvas o con un asset raster nuevo.

## Estructura del HTML

El archivo es autocontenido salvo por:

- MathJax remoto: `https://cdn.jsdelivr.net/npm/mathjax@3/es5/tex-svg.js`.
- Assets PNG bajo `assets/electric/`.

Bloques principales:

- `<style>`: layout completo, panel lateral, mesa, menus flotantes, acordeones de teoria, modo pantalla completa y adaptacion responsive.
- Panel izquierdo: herramientas arrastrables, modos de vista, controles de lineas/flechas de campo, forma gaussiana y controles de escena.
- Panel central: `canvas#world`, controles de zoom/3D/escala temporal/dinamica, menus contextuales y lecturas.
- Panel derecho: teoria en desplegables con formulas LaTeX.
- `<script>` principal: estado, fisica aproximada, renderizado, menus e interaccion.

## Estado global

El objeto `state` concentra el estado de la simulacion:

- Herramienta y vista: `tool`, `mode`.
- Parametros globales: `eps`, `variable`, `freq`, `current`, `sphereCharge`, `showFieldLines`, `arrowDensity`, `timeScale`.
- Tiempo y bucle: `t`, `running`.
- Interaccion: `drag`, `selected`, `hover`, `hoverStack`, `hoverMenuPinned`, `objectMenuPinned`, `dragTool`.
- Vista: `view.zoom`, `view.cx`, `view.cy`, `view.orbit3d`, `view.yaw`, `view.tilt`.
- Sonda: `probe`.
- Superficie gaussiana: `gauss`.
- Papelera: `trash`.
- Objetos colocados: `objects`.

La escena inicial real tiene `objects: []`, por lo que arranca sin objetos ni sonda. La sonda se coloca desde el menu izquierdo. El boton `Escena base` llama a `seed()` y crea una escena de ejemplo.

## Tipos de objeto

Objetos creados por `addAt(x, y)`:

- `charge`: carga puntual con `q`, `unit`/prefijo SI, `size`, `showTrail`, posicion y posibles velocidades.
- `probe`: sonda colocable desde el menu; si no hay sonda, las lecturas de campo y potencial indican `sin sonda`.
- `current`: corriente en el plano, con `i`, `angle`, `len`, y campo electrico variable opcional.
- `currentPerp`: corriente como conductor solido con `i`, `len`, `angle`, `tilt` y campo electrico variable opcional; cuando esta en el plano aporta `Bz` y puede desviar particulas.
- `magnet`: iman como cuboide proyectado con polos integrados en una sola pieza, con `strength`, `len`, `angle`, `tilt` y velocidad por lanzamiento.
- `vconce`: monopolo magnetico ficticio con logo propio extruido como prisma de silueta en V, `strength`, `strengthUnit`, `angle`, `tilt` y `r`.
- `solenoid`: solenoide con `i`, `iPrefix`, `iAmp`, `n`, `mu`, `len`, `r`, `angle`, `tilt`, alterna opcional; se crea por defecto con `20 mA` y `10` espiras.
- `lineCharge`: linea de carga con `lambda`, `len`, `angle`, y corriente alterna opcional `ac`.
- `plane`: plano cargado con `sigma`, `w`, `h`, `angle`, `vertical`.
- `sphereVolume`: esfera maciza con `rho` y `r`.
- `sphereShell`: corteza esferica con `rho` y `r`.
- `foam`: zona dielectrica con `eps`, `w`, `h`.
- `faraday`: jaula con `w`, `h`, `d`.

## Modelo de campos

Funciones clave:

- `fieldAt(x, y)`: calcula `ex`, `ey`, `ez` y `v`.
- `dielectricResponse(...)`: modifica el campo dentro de la espuma en funcion de `epsilon_r`.
- `electricShieldFactor(x, y, source)`: simula apantallamiento de jaula de Faraday; una fuente dentro de una jaula no contribuye fuera y una fuente fuera no contribuye dentro.
- `bAt(x, y)`: componente magnetica perpendicular al canvas.
- `magneticVectorAt(x, y)`: campo magnetico en el plano para corrientes, solenoide e iman.
- `solenoidFieldProfile(o, x, y)`: perfil didactico del solenoide; campo fuerte dentro y fuga exterior muy pequena, suavizada en los extremos.
- `gaussCharge()`: estima la carga encerrada por la superficie gaussiana.
- `updateChargePhysics(dt)`: dinamica de cargas libres con fuerza electrica y efecto magnetico aproximado.

Importante: el modelo es didactico y cualitativo, no un solver numerico riguroso. Los factores numericos estan escalados para visualizacion.

## Renderizado

La funcion `render()` limpia el canvas, aplica la vista y dibuja en este orden:

1. Fondo y rejilla.
2. Potencial, si esta activo.
3. Dielectrico y jaulas.
4. Campo magnetico o campo electrico segun modo.
5. Superficie gaussiana.
6. Rastros de cargas, si estan activos.
7. Objetos.
8. Lineas magneticas frontales.
9. Borrado contextual, nivel superior, sonda.
10. Leyenda de potencial y papelera en coordenadas de pantalla.
11. Lecturas numericas.

El zoom/pan/3D se aplican a la escena con `applyView()`. Elementos de interfaz como papelera y leyenda se dibujan despues de restaurar el canvas para mantener tamano fijo.

## Interaccion

- La colocacion de objetos se hace arrastrando desde el panel izquierdo y soltando sobre la mesa.
- Clic derecho sobre un objeto abre menu de propiedades. Si hay varios objetos superpuestos, aparece selector contextual.
- Clic sobre fondo cierra menus y permite desplazamiento de la vista.
- Rueda del raton sobre la mesa hace zoom centrado en el cursor.
- Boton `3D` activa orbita de la mesa; arrastrar el fondo rota la vista.
- Con `Ctrl` pulsado mientras se arrastra un objeto, rota en el plano de la mesa. Con `Alt`, cambia su inclinacion 3D (`tilt`).
- La sonda es un objeto colocable y mide en `probePoint()`, situado en la bolita inferior.
- Objetos arrastrados a la papelera se eliminan.
- Las cargas pueden dejar rastro y el boton `Borrar rastro` limpia todos los rastros.
- Los valores numericos de deslizadores pueden editarse haciendo clic sobre el numero mostrado.
- Algunos objetos tienen handles: espuma, linea, plano, jaula, solenoide y superficie gaussiana.

## Teoria

El panel derecho usa `details/summary` y formulas LaTeX procesadas por MathJax. Temas incluidos:

- Carga puntual y ley de Coulomb.
- Linea de carga y plano cargado.
- Ley de Gauss.
- Esferas cargadas.
- Dielectricos y permitividad.
- Jaula de Faraday.
- Corrientes y campo magnetico.
- Nivel superior: `D`, Faraday y Maxwell.

Al editar teoria, mantener LaTeX entre `\(...\)` o `\[...\]` y evitar texto plano para ecuaciones.

## Riesgos conocidos

- Hay mojibake visible en algunas lecturas de PowerShell, pero el archivo contiene textos UTF-8 en muchas zonas. Verificar visualmente si se edita texto con acentos.
- MathJax depende de red si se abre el HTML sin cache.
- El icono del solenoide es un SVG embebido, distinto del criterio raster del resto.
- Las funciones de campo estan acopladas al render. Un cambio fisico puede afectar potencial, lineas, lecturas, Gauss y dinamica.
- Los menus flotantes dependen de coordenadas canvas/world/screen; cualquier cambio de vista debe probar menu, zoom, pan y 3D.


