# QyrexDeobf — Roblox Runtime v5

Versión GitHub Pages del desofuscador con reconstrucción estática multicapa.

## Flujo

`source ofuscado -> recuperación de constantes -> constructores estáticos -> Base64/XOR/Hex/URL/decimal/reverse/string.char -> unwrap load/loadstring -> Luau limpio -> Runtime Roblox simulado`

## Capas cubiertas

- Base64 estándar, URL-safe y capas anidadas.
- XOR de byte único y bucles estáticos comunes.
- Hex, bytes decimales, escapes octales y URL percent-encoded.
- `string.char`, `utf8.char`, `table.concat`, concatenación y constantes.
- Variables constantes que terminan en `loadstring()` / `load()`.
- Constructores `out .. string.char(string.byte(data,i) ~ key)` y variantes aritméticas comunes.
- Extracción del payload final para evitar mostrar el wrapper como si fuera el código recuperado.

El Output del Runtime está separado del trace interno del decoder.

> Nota: un desofuscador estático no puede garantizar recuperar protecciones arbitrarias o una VM totalmente customizada. Esta versión prioriza recuperar código estático cuando el payload es reconstruible sin ejecutar código arbitrario.
