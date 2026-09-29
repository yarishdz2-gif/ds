# QyrexDeobf v9 — GitHub Pages

Build estático: solo `index.html`. No usa `server.js`, Node ni `/api`.

## Motor de recuperación

- reconstrucción recursiva por capas
- Base64 / URL-safe Base64
- Hex / bytes decimales / octal
- `string.char` / `utf8.char` / concatenaciones constantes
- XOR de una clave / candidatos XOR de un byte
- builders y constantes estáticas
- `loadstring` / `load` cuando el payload es recuperable sin ejecutar código arbitrario
- Python wrappers comunes reducidos de forma estática
- reconocimiento de proveedores/patrones: Luraph, Monsec, IronBrew, MoonVeil, Luarmor, Prometheus y 77fuscator
- límite de entrada pensado para scripts grandes (hasta ~25 MB por sesión)

## Browse

El botón Browse usa `File.text()` con respaldo `FileReader`, por lo que funciona directamente en GitHub Pages.

## Importante

Un ofuscador VM personalizado no puede tener una recuperación universal de 100% con reglas genéricas: para cada VM real hay que conocer su bytecode, dispatcher, handlers y transformaciones. QyrexDeobf no ejecuta código arbitrario del archivo para “adivinar” una salida.

El Runtime Roblox local se usa después de recuperar un programa Luau final y no sustituye al cliente real de Roblox.
