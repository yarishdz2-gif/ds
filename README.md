# QyrexDeobf

QyrexDeobf es una interfaz local para análisis y desofuscación de scripts Lua/Luau. La versión actual combina el motor Luraph v15 disponible por npm con una capa estática multi-paso.

## Qué se añadió

- **Environment:** muestra el código desofuscado/limpio recibido del motor, junto con el resumen del entorno estático.
- **Calls + output:** enumera por línea comportamientos detectables: `require`, creación de instancias, `GetService`, eventos/remotes, red, archivos, carga dinámica, entornos, hooks, tareas, clipboard, crypto y render.
- **Dumpers estáticos:** strings, constantes numéricas, llamadas/comportamientos y marcadores de VM.
- **Detección de perfiles:** Luraph, Prometheus, IronBrew, MoonVeil, Luarmor y VM genérico; los perfiles no-Luraph pasan por limpieza estática en vez de fingir una devirtualización completa.
- **Folding seguro de constantes simples:** `string.char`, `string.reverse`, `string.rep` y `table.concat` cuando los argumentos son literales.
- **Servidor:** endpoint `/api/analyze` para inspección independiente y `/api/deobfuscate` para el pipeline completo.

## Instalación

Requiere Node.js 18+.

```bash
npm install
npm start
```

Abre `http://localhost:3000`. El motor Luraph v15 se usa cuando `node_modules/luraphv15-node` está presente.

## Nota de seguridad

Los “Calls” y “Environment” de esta capa son análisis del texto fuente y no equivalen a ejecutar el script dentro de un cliente Roblox real. El motor de desofuscación es un proceso separado y el proyecto ya limita su tiempo de ejecución.
