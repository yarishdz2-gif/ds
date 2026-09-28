# QyrexDeobf — GitHub Pages (DE TODO)

Runtime estático para desofuscar scripts Luau/Lua ofuscados.

## Capas que maneja
- Base64 / URL-safe Base64 (recursivo, hasta 8 capas)
- XOR con clave repetida + extracción automática de claves
- Hex, decimal-bytes, octal escapes
- URL percent-encoding
- Reverse + combinaciones
- string.char / utf8.char / table.concat folding
- Detección Luraph v14/v15, Prometheus, IronBrew, Moonsec, etc.
- Trace seguro (Qyrex Safe Luau Trace VM) sin ejecutar código peligroso

## Uso en GitHub Pages
1. Sube **todo el contenido de esta carpeta** a la raíz de un repositorio
2. Settings → Pages → Deploy from a branch → `/ (root)`
3. Abre la URL y pega el script ofuscado

O abre `index.html` localmente en el navegador.

## Archivos
- `index.html` — UI + analizador embebido (self-contained)
- `lib/browser-analyzer.js` — misma lógica (opcional, por si se carga externo)
- `.nojekyll` — necesario para GitHub Pages
- `README.md` — este archivo
