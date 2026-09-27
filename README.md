# QyrexDeobf — GitHub Pages

Versión estática para GitHub Pages. No necesita Node.js, npm ni `server.js`.

## Dumpers integrados

El paquete usa una implementación propia de navegador basada en las capacidades observables de los proyectos aportados:

- 25ms: decodificación de strings y patrones de runtime.
- FlameCoder / HookOp: marcadores de dispatcher y operaciones instrumentadas.
- Mimic: análisis de entorno, librerías, servicios, eventos y llamadas por línea.
- Larry / Zala: constantes, referencias de strings, llamadas y marcadores de call graph.
- The Big Unveilr: patrones de `ExecEnv`, `ExpressionHooks`, `hookOp` y recuperación estática de constantes.
- Prometheus: `ConstantArray`, `ProxifyLocals`, `EncryptStrings`, `SplitStrings`, `Vmify`, `WatermarkCheck`.
- Luraph / IronBrew / MoonVeil / Luarmor / Junkie: detección y heurísticas de VM.

Además incluye decodificación estática de:

- escapes Lua (`\xNN`, escapes numéricos y `\u{...}`)
- strings `[[...]]` / `[=[...]=]`
- `string.char`, `utf8.char`, `string.reverse`, `string.rep`, `string.sub`
- `table.concat` literal
- concatenación literal `..`
- `bit32.bxor`, `bit32.bor`, `bit32.band` con constantes
- candidatos Base64, hex y listas de bytes
- asignaciones constantes simples y un resumen del entorno

## Environment

Muestra el fuente limpiado y el entorno estático recuperado: globals, libraries, services y constantes.

## Calls

Muestra por línea operaciones detectables como `require`, `GetService`, `Instance.new`, `Connect`, `FireServer`, `InvokeServer`, HTTP, WebSocket, filesystem, `loadstring`, `getgenv`, hooks, tasks, coroutines y APIs de executor.

## Importante

GitHub Pages no ejecuta Lune, Roblox ni el script analizado. Por eso los dumpers que en el ZIP original dependen de ejecución dinámica se representan aquí mediante análisis estático seguro y transformaciones de código. Eso permite que la página sea autónoma, pero no garantiza reconstrucción completa de una VM desconocida.

## Publicar

1. Sube `index.html` y la carpeta `lib/` al repositorio.
2. Ve a **Settings → Pages**.
3. Selecciona **Deploy from a branch**.
4. Elige la rama y `/ (root)`.
