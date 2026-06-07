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

`simulador_relatividad.html`

- Panel antiguo más amplio con navegación dinámica entre simulaciones.
- Mantener como referencia, no como destino principal de nuevas simulaciones.

`simulador_relatividad_ib.html`

- Panel IB compacto con tarjetas generadas desde un array `cards`.
- Contiene simulaciones integradas y usa algunos gráficos de `assets/`.
- Mantener como referencia visual y conceptual.
