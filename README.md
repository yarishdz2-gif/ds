# QyrexDeobf — Roblox Runtime

Versión para GitHub Pages de QyrexDeobf con reconstrucción estática de capas comunes y un Runtime Roblox simulado y acotado.

## Cambios
- Reconstrucción final del payload antes del análisis de comportamiento.
- El editor recibe el Luau final cuando puede recuperarse de forma estática.
- Play Output muestra solo comportamiento observable del programa final: PRINT, WARN, ERROR, UI, EVENT, REMOTE, LIBRARY, SERVICE, NETWORK e INSTANCE.
- Las operaciones internas de reconstrucción (Base64, XOR, `string.char`, etc.) permanecen en Calls y no se mezclan con Play Output.
- Entorno Roblox simulado con `game`, servicios, `Players.LocalPlayer`, `PlayerGui`, `Instance.new`, `Parent`, eventos y una jerarquía DataModel.
- Sin ejecutar un cliente real de Roblox, red, filesystem ni APIs nativas externas.

## GitHub Pages
Sube `index.html` y la carpeta `lib/` manteniendo su estructura.
