# QyrexDeobf — GitHub Pages

Desofuscador y simulador de entorno Luau/Roblox para navegador.

## Ahora incluye

- Recuperación multi-capa de Base64, XOR, Hex, bytes, `string.char`, `utf8.char`, `table.concat`, `loadstring` y otros wrappers estáticos.
- Output tipo Roblox para `print`, `warn`, `error`, UI, Instances, eventos, remotes y llamadas de servicios.
- DataModel simulado con `game`, `workspace`, servicios comunes, `Players`, `LocalPlayer`, `PlayerGui`, `Backpack` y `PlayerScripts`.
- `Instance.new`, `Parent`, `Name`, `ClassName`, `GetChildren`, `GetDescendants`, `FindFirstChild`, `WaitForChild`, `IsA`, `Destroy`, `Clone`, atributos y señales básicas.
- Reconstrucción visual de la jerarquía creada por el script.
- El código recuperado se muestra directamente como fuente de entorno y es el código que analiza el Runtime.

## Importante

Esto no arranca el cliente real de Roblox ni ejecuta un juego de Roblox. Es un Runtime local acotado que reproduce una superficie de APIs de Roblox para reconstrucción, trazado y análisis dentro del navegador.

## Uso en GitHub Pages

1. Sube el contenido de esta carpeta al repositorio.
2. Ve a Settings → Pages.
3. Selecciona Deploy from a branch y la raíz `/ (root)`.
4. Abre la página, pega el Luau y pulsa `Run` o `Deobfuscate ALL`.

## Archivos

- `index.html` — interfaz, recuperador y Runtime Roblox simulado.
- `lib/browser-analyzer.js` — analizador estático multi-capa.
- `.nojekyll` — configuración para GitHub Pages.
- `README.md` — documentación.
