# Recursos de estas cuatro simulaciones

- `jstat-1.9.6.min.js`: jStat 1.9.6, licencia MIT conservada en `jstat-LICENSE`. Distribución obtenida de https://cdn.jsdelivr.net/npm/jstat@1.9.6/dist/jstat.min.js. Documentación del proyecto: https://jstat.github.io/distributions.html. Se utiliza para la masa inicial binomial, la densidad normal y la integración Simpson. Las correcciones de estabilidad están en `math-core.js`, sin modificar el archivo del proveedor.
- `lucide.min.js`: Lucide 1.8.0, procedente del runtime local; licencia ISC en `lucide-LICENSE`. Iconos de acercar, alejar y ajustar vista.
- KaTeX 0.19.1: reutilizado desde `../../../shared/katex/` (CSS, JavaScript y fuentes). No modificado ni duplicado.
- VConce: recurso existente `../../../electromagnetism/assets/electric/vconce.png`, únicamente en las cabeceras.
- Los cuatro `*-favicon.png` son recortes originales, de 64 x 64, de los canvas de estas simulaciones. No utilizan VConce. Se regeneran mediante `new-math-favicons.cjs`, fuera de la carpeta publicable.

Las páginas funcionan localmente sin peticiones de red. Los enlaces de referencia curricular son enlaces de consulta, no dependencias de ejecución.
