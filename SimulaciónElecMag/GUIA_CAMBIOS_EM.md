# Guia de cambios y versionado

## Objetivo

Este documento fija el flujo de trabajo para continuar el simulador electromagnetico desde la version Antigravity sin perder una base estable.

## Version activa

Base Codex inicial:

- `EM_Codex_3.3.html`

No editar `simulador_campo_electrico_compacto_Antigravity.html` salvo que el usuario lo pida explicitamente. Ese archivo queda como referencia externa. La version activa debe estar directamente en `SimulaciónElecMag`, no dentro de `Versiones`, para que `assets/electric/...` resuelva correctamente.

## Regla de versionado

Para cada cambio funcional:

1. Identificar la version activa en `SimulaciónElecMag`.
2. Mover o copiar la version activa anterior a `Versiones`.
3. Crear una copia nueva activa en `SimulaciónElecMag` con el siguiente numero:
   - `EM_Codex_3.1.html`
   - `EM_Codex_3.2.html`
   - `EM_Codex_3.3.html`
4. Hacer los cambios solo en la nueva copia activa.
5. Generar tambien la copia compacta correspondiente, por ejemplo `EM_Codex_2.8_compacto.html`, incrustando los assets locales en base64.
6. Validar sintaxis y comportamiento basico.
7. Documentar en la respuesta que version queda como activa y que compacto queda listo.

La rama 3.x queda iniciada en `EM_Codex_3.0.html`; los cambios siguientes continuan con `3.1`, `3.2`, etc.

Las versiones dentro de `Versiones` pueden no tener rutas de assets funcionales si conservan `assets/electric/...`; la version que debe abrirse y probarse es siempre la activa del directorio principal.

La copia compacta debe vivir junto a la version activa en `SimulaciónElecMag`. Su objetivo es poder enviar un solo HTML con los PNG locales incrustados. Si MathJax sigue cargando desde CDN, indicarlo claramente porque las formulas LaTeX dependen de esa libreria externa.

## Antes de cambiar codigo

Revisar siempre:

- `ARQUITECTURA_EM.md`.
- La version activa HTML directamente dentro de `SimulaciónElecMag`.
- Si el cambio afecta a campos, revisar `fieldAt`, `bAt`, `magneticVectorAt`, `dielectricResponse`, `electricShieldFactor` y `render`.
- Si el cambio afecta a seleccion/menus, revisar `objectsAt`, `objectAt`, `showContextSelector`, `openMenu`, `placeMenuRightOfPoint` y listeners de `pointerdown`, `pointermove`, `pointerup`, `contextmenu`.
- Si el cambio afecta a visuales, revisar los PNG en `assets/electric`.

## Criterios visuales

- Mantener los graficos personalizados tipo Antigravity.
- Priorizar PNG/canvas frente a arte vectorial.
- No introducir nuevos SVG salvo necesidad temporal y dejarlo documentado.
- Mantener contraste claro:
  - Campo electrico: turquesa/azul verdoso.
  - Campo electrico variable: dorado.
  - Campo magnetico: verde.
  - Potencial: mapa escalar sin vectores.
- Los objetos esfericos deben verse circulares/esfericos, no deformados.
- La papelera debe mantenerse fija en pantalla al hacer zoom.

## Criterios fisicos/didacticos

- Sin fuentes electricas, no debe aparecer campo electrico.
- Cargas puntuales, esferas, planos estaticos y jaulas no deben generar campo oscilante por defecto.
- Solo corrientes/cables/lineas configuradas como variables deben introducir oscilacion.
- El potencial es escalar: se representa con color, no con flechas.
- Dentro/fuera de jaula de Faraday:
  - Fuente dentro de jaula: no debe crear campo electrico fuera.
  - Fuente fuera de jaula: no debe crear campo electrico dentro.
- El dielectrico debe alterar el campo dentro de su region con dependencia visible de `epsilon_r`.
- El campo magnetico debe verse en verde y ser coherente para:
  - Corriente perpendicular: lineas circulares.
  - Iman: lineas saliendo de un polo y entrando en el otro, con lectura clara en vista 3D.
  - VConce: monopolo magnetico ficticio, radial y claramente identificado como broma didactica.
  - Corrientes alternas/variables: efecto temporal continuo, sin saltos discretos visibles.

## Validacion minima

Despues de cada cambio:

1. Comprobar que el HTML existe y conserva assets relativos correctos.
2. Extraer scripts inline y validar sintaxis con Node.
3. Buscar errores obvios:
   - funciones duplicadas accidentales,
   - referencias a ids inexistentes,
   - assets faltantes,
   - variables globales mal escritas.
4. Si se cambia interaccion, probar mentalmente y con inspeccion de codigo:
   - arrastrar y soltar desde menu izquierdo,
   - clic derecho sobre objeto unico,
   - clic derecho sobre objetos superpuestos,
   - clic en fondo cierra menus,
   - rueda hace zoom,
   - arrastre de fondo hace pan u orbita 3D,
   - papelera borra y mantiene tamano.

Si el navegador local esta disponible, abrir la version activa y probar manualmente los recorridos afectados.

## Comandos utiles

Listar versiones:

```powershell
Get-ChildItem -Path "C:\Users\victo\Documents\New project\SimulaciónElecMag\Versiones" | Sort-Object Name
```

Listar assets:

```powershell
Get-ChildItem -Path "C:\Users\victo\Documents\New project\SimulaciónElecMag\assets\electric"
```

Buscar funciones relevantes:

```powershell
rg -n "function fieldAt|function bAt|function magneticVectorAt|function render|function openMenu|function showContextSelector" "C:\Users\victo\Documents\New project\SimulaciónElecMag\Versiones\EM_Codex_2.0.html"
```

## Notas para futuras iteraciones

- El archivo es grande pero no minificado; aplicar cambios con parches pequenos y localizados.
- No mezclar refactor amplio con cambio funcional si el usuario pide una correccion concreta.
- Si se toca `render()`, comprobar que no se vuelve a dibujar ningun objeto desde funciones de campo. Las funciones de campo deben calcular, no pintar.
- Si se toca vista 3D, comprobar que `worldToScreen`, `screenToWorldWithView`, `applyView` y los handles siguen usando el mismo sistema de coordenadas.
- Si se toca el iman, mantenerlo como cuboide/ortoedro proyectado; no volver a separarlo en dos objetos independientes en 3D.
- En vista 3D, el iman debe dibujarse como solido opaco con caras ordenadas por profundidad; no dibujar siempre la cara frontal encima porque produce efecto de interior visible.
- El solenoide se crea por defecto con `20 mA`, `10` espiras; si `variable` esta activo, el menu debe mostrar amplitud, frecuencia y fase.
- El campo magnetico del solenoide debe ser fuerte dentro y casi despreciable fuera; usar `solenoidFieldProfile` como perfil comun para `bAt` y `magneticVectorAt`.
- El solenoide debe poder hacerse muy largo y de gran radio; no reintroducir topes pequenos como `400 px` o `150 px` en sus handles.
- La linea de carga y el plano deben poder hacerse muy largos; no reintroducir topes pequenos como `560 px` o `360 px` en sus handles.
- Si se toca VConce, mantenerlo como prisma con laterales siguiendo la silueta de la V; no usar caja rectangular ni simular profundidad repitiendo muchas copias del logo.
- Si se toca la corriente, mantenerla como conductor solido con rotacion 2D y `tilt`; cuando `tilt` la deja en el plano debe contribuir a `bAt` para desviar particulas.
- La regla de signos de `bAt` para una corriente hacia la derecha debe ser: por encima sale del papel (`Bz > 0`) y por debajo entra (`Bz < 0`).
- Mantener la interaccion de modificadores: `Ctrl` + arrastre rota en el plano; `Alt` + arrastre ajusta `tilt`.
- La sonda es un objeto colocable desde el menu izquierdo; no debe aparecer por defecto al cargar la escena.
- El campo magnetico debe representarse con flechas doradas/amarillas usando `arrowVariable` o un asset raster equivalente.
- En el iman, las lineas de campo magnetico exteriores deben salir visualmente del polo N y entrar en el polo S; mantener flechas explicitas cerca de ambos extremos.
- Si se toca el menu contextual, recordar que los `output` de los deslizadores son editables manualmente.
- Si se toca MathJax/teoria, mantener formulas en LaTeX y evitar que los paneles oculten texto.
- Si se sustituyen assets, conservar nombres o actualizar `spritePaths` y los botones del panel izquierdo juntos.
