# QyrexDeobf — GitHub Pages (DE TODO)

Runtime estático para desofuscar scripts Luau/Lua. El objetivo es que **el resultado final sea código limpio**, no wrappers a medias.

## Qué desofusca
- Base64 / URL-safe Base64 (recursivo, multi-capa)
- XOR (clave de 1 byte y multi-byte descubierta)
- Hex, decimal-bytes, octal, URL percent-encoding, reverse
- `string.char` / `utf8.char` / `table.concat` folding
- Wrappers `loadstring` / `load`
- Decoders custom tipo `base64decode` + alfabeto + payload
- Detección Luraph / Prometheus / IronBrew y patrones de VM
- Multi-pass hasta estabilizar: si hay capas, las aplica hasta el payload

## Uso GitHub Pages
1. Sube el contenido de esta carpeta a la raíz del repo
2. Settings → Pages → Deploy from a branch → `/ (root)`
3. Abre la URL, pega el script ofuscado y desofusca

También puedes abrir `index.html` en el navegador sin servidor.

## Archivos
- `index.html` — UI + motor embebido
- `lib/browser-analyzer.js` — misma lógica
- `.nojekyll` — GitHub Pages
- `README.md` — este archivo
