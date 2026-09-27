# QyrexDeobf — GitHub Pages

Versión estática y autocontenida para GitHub Pages. El analizador no ejecuta el script recibido.

## Incluye

- Decodificación recursiva de Base64 estándar y URL-safe.
- Decodificación recursiva de XOR con claves de 1 byte y claves detectadas en expresiones `~` / `bit32.bxor`.
- Recuperación de `\xNN`, escapes numéricos, `string.char`, `table.concat`, `string.reverse`, `string.rep` y algunas constantes simples.
- Análisis estático de llamadas, librerías, servicios, globals, filesystem/network, environment y marcadores de VM.
- El código limpio aparece en **Environment** y se puede copiar/descargar.

## GitHub Pages

1. Extrae este ZIP en tu repositorio.
2. Deja `index.html` en la raíz.
3. Ve a **Settings → Pages**.
4. Selecciona **Deploy from a branch** y la rama/directorio donde quedó `index.html`.

`index.html` contiene el analizador incrustado, por lo que no depende de rutas externas para que `QyrexBrowserAnalyzer.analyze()` exista en Pages.

> Nota: la recuperación estática puede descubrir muchas capas Base64/XOR, pero no puede reconstruir automáticamente una VM propietaria arbitraria ni ejecutar APIs de Roblox/executor desde GitHub Pages.
