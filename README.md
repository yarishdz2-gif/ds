QyrexDeobf v8 - GitHub Pages

Static build: only index.html is required.
No server.js or Node backend is required for the browser UI.

The browser-side engine performs layered static reconstruction where possible and keeps runtime diagnostics separate from decoder traces.

Important: arbitrary proprietary VM obfuscators (for example unknown/custom Luraph/Monsec variants) cannot be guaranteed to fully recover source code without their exact runtime/transform semantics. The app should report unsupported/unrecovered layers rather than pretend the original source was recovered.
