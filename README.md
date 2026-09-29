# QyrexDeobf — GitHub Pages browser build v7

Static-only deployment. Upload `index.html` and `.nojekyll` to GitHub Pages.

The browser pipeline uses aggressive static reconstruction first, then attempts a real Luau WebAssembly VM (`luau-web` 1.4.0) to execute decoder wrappers in a restricted local environment and capture strings passed to `loadstring/load`. If the external VM cannot load, it automatically falls back to the built-in local Roblox-style sandbox.

The Open/Browse control uses the browser File API with a FileReader fallback. No `server.js`, Node APIs, backend endpoints, or `/api` calls are required.
