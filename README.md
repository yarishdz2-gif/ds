# QyrexDeobf — Roblox Client Runtime

Versión estática para GitHub Pages que reconstruye capas comunes de ofuscación y después pasa el Luau final por un compilador/interprete local con una superficie amplia de APIs habituales de Roblox.

## Flujo

`Código ofuscado → recuperación de payload → Luau final → compilación/diagnóstico → Roblox Client Runtime local → Play Output`

El Output muestra el comportamiento producido por el código final. Las operaciones internas de Base64/XOR/hex/char usadas para recuperar ese código no se mezclan con el Output.

## Runtime

El entorno expone un DataModel `game`, `workspace`, servicios frecuentes (`Players`, `Workspace`, `ReplicatedStorage`, `ReplicatedFirst`, `StarterGui`, `RunService`, `UserInputService`, `ContextActionService`, `TweenService`, `HttpService`, `SoundService`, `CoreGui`, `Debris`, `CollectionService`, etc.), `Players.LocalPlayer`, `PlayerGui`, `PlayerScripts`, `Backpack`, `Character`, `Instance.new`, jerarquía `Parent`, búsqueda de hijos, atributos, `RBXScriptSignal`, `Connect`, `Once`, `Fire`, `RemoteEvent`, `RemoteFunction`, `BindableEvent`, `require`, `loadstring`, `task`, `Enum`, `Vector2`, `Vector3`, `Color3`, `UDim`, `UDim2`, `NumberRange`, `print`, `warn`, `error`, `pcall`, `assert`, `pairs`, `ipairs`, `string`, `table`, `math` y `bit32` en un subconjunto acotado.

También ejecuta funciones Lua recuperadas, callbacks de eventos, bucles `for`/`while`/`repeat`, condiciones `if/elseif/else`, retornos y llamadas encadenadas como `loadstring("print('x')")()`.

## Output

La clasificación se deriva del runtime: `UI`, `PRINT`, `LIBRARY`, `REMOTE`, `EVENT`, `NETWORK` o `SCRIPT`. El árbol muestra la jerarquía de Instances creada durante la sesión y el código final recibido por el runtime.

## Seguridad

No inicia el proceso real de Roblox, no inyecta código en el cliente de Roblox y no expone filesystem, red o APIs nativas del sistema. El runtime local está acotado para análisis y reconstrucción de comportamiento.

## GitHub Pages

Sube `index.html` y `lib/` manteniendo la estructura del ZIP.


## Runtime v4

This build uses a local, bounded Luau interpreter with a Roblox-like DataModel. It reconstructs final source first, then evaluates the supported Luau subset inside `game`, `Players.LocalPlayer`, `PlayerGui`, `Workspace`, services, Instances, RBXScriptSignals, remotes, task scheduling and common library/UI shims. The Output is generated from runtime events rather than regex-only static matches.

It remains a local simulation: it does not inject into or execute code inside the real Roblox client.
