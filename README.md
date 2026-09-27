# QyrexDeobf — GitHub Pages Runtime Build

Static GitHub Pages build with:

- Recursive Base64 / URL-safe Base64 decoding
- Recursive repeating-key XOR candidates and discovered key extraction
- Hex / decimal byte / `string.char` / constant folding
- Dumper signatures for the supplied packs and common Luau obfuscators
- Calls + Environment static analysis
- Bounded **Qyrex Safe Luau Trace VM** for observable calls such as `print`, `warn`, `Instance.new`, `game:GetService`, `require` and captured `loadstring` chunks

The runtime is a **simulation for tracing**, not a live Roblox or executor environment. Browser/network/filesystem/native executor APIs are not exposed to the submitted source.

## GitHub Pages

Put the contents of this folder in the root of the repository, then enable:

`Settings → Pages → Deploy from a branch → / (root)`
