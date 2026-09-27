const express = require("express");
const fs = require("fs");
const os = require("os");
const path = require("path");
const { spawn } = require("child_process");
const { analyze, cleanSource } = require("./lib/analyzer");

const app = express();
const PORT = Number(process.env.PORT || 3000);
const ROOT = __dirname;
const ENGINE_ROOT = path.join(ROOT, "node_modules", "luraphv15-node");
const ENGINE = path.join(ENGINE_ROOT, "deob.js");
const MAX_BODY = process.env.MAX_BODY || "10mb";
const HARD_TIMEOUT_MS = Number(process.env.DEOB_TIMEOUT_MS || 180000);

app.disable("x-powered-by");
app.use(express.json({ limit: MAX_BODY }));
app.use(express.urlencoded({ extended: false, limit: MAX_BODY }));
app.use(express.static(path.join(ROOT, "public"), { extensions: ["html"] }));

function safeBaseName(name) {
  return path.basename(String(name || "script.lua")).replace(/[^a-zA-Z0-9._-]/g, "_") || "script.lua";
}

function engineAvailable() {
  return fs.existsSync(ENGINE);
}

function runEngine(source, filename, options = {}) {
  return new Promise((resolve, reject) => {
    const work = fs.mkdtempSync(path.join(os.tmpdir(), "qyrexdeobf-"));
    const inputName = safeBaseName(filename);
    const inputPath = path.join(work, inputName);
    const outputPath = path.join(work, inputName.replace(/\.(lua|luau|txt)$/i, "") + ".deobf.luau");
    fs.writeFileSync(inputPath, source, "utf8");

    const full = options.mode !== "trace";
    const args = [
      ENGINE,
      inputPath,
      "--output", outputPath,
      "--timeout", String(Math.ceil(HARD_TIMEOUT_MS / 1000)),
      "--budget", String(Math.max(30, Math.floor(HARD_TIMEOUT_MS / 1000) - 15)),
      "--max-runs", "12",
      "--devirt-rounds", "200"
    ];
    if (!full) args.push("--no-devirt");

    const child = spawn(process.execPath, args, {
      cwd: ENGINE_ROOT,
      env: { ...process.env, PYTHON_BIN: process.env.PYTHON_BIN || "python3" },
      stdio: ["ignore", "pipe", "pipe"]
    });

    let stdout = "";
    let stderr = "";
    let killed = false;
    child.stdout.on("data", chunk => { stdout += chunk.toString(); });
    child.stderr.on("data", chunk => { stderr += chunk.toString(); });

    const timer = setTimeout(() => {
      killed = true;
      child.kill("SIGKILL");
    }, HARD_TIMEOUT_MS);

    child.on("error", error => {
      clearTimeout(timer);
      try { fs.rmSync(work, { recursive: true, force: true }); } catch {}
      reject(error);
    });

    child.on("close", code => {
      clearTimeout(timer);
      const output = fs.existsSync(outputPath) ? fs.readFileSync(outputPath, "utf8") : "";
      const report = {
        exitCode: code,
        killed,
        mode: full ? "full" : "trace",
        stdout: stdout.slice(-12000),
        stderr: stderr.slice(-20000)
      };
      try { fs.rmSync(work, { recursive: true, force: true }); } catch {}

      if (killed) return reject(new Error("Deobfuscation timed out."));
      if (code !== 0 || !output.trim()) {
        const detail = (stderr || stdout || `engine exited with code ${code}`).trim();
        return reject(new Error(detail.slice(-4000)));
      }
      resolve({ output, report });
    });
  });
}

function quickDetect(source) {
  const versionMatch = source.match(/This file was protected using Luraph Obfuscator v([\d.]+)/i);
  const detected = Boolean(
    versionMatch ||
      (/return\s+setmetatable\s*\(\s*\{/i.test(source) &&
        /\.YA\s*\(\s*\)/i.test(source) &&
        /\bbuffer\.(readu8|writeu32|fromstring|tostring|len)\b/i.test(source))
  );
  return {
    detected,
    version: versionMatch ? versionMatch[1] : detected ? "15.x" : null,
    bytes: Buffer.byteLength(source, "utf8"),
    functions: (source.match(/\bfunction\b/g) || []).length
  };
}

app.get("/api/health", (_req, res) => {
  res.json({
    ok: true,
    service: "QyrexDeobf",
    engine: engineAvailable() ? "luraphv15-node" : null,
    analyzers: ["strings", "constants", "calls", "environment", "vm"]
  });
});

app.post("/api/analyze", (req, res) => {
  const source = typeof req.body?.source === "string" ? req.body.source : "";
  const filename = safeBaseName(req.body?.filename || "script.lua");
  if (!source.trim()) return res.status(400).json({ ok: false, error: "Source is empty." });
  const result = analyze(source, filename);
  res.json({ ok: true, ...result });
});

app.post("/api/deobfuscate", async (req, res) => {
  const source = typeof req.body?.source === "string" ? req.body.source : "";
  const filename = safeBaseName(req.body?.filename || "script.lua");
  const mode = req.body?.mode === "trace" ? "trace" : "full";
  if (!source.trim()) return res.status(400).json({ ok: false, error: "Source is empty." });

  const detected = quickDetect(source);
  const staticAnalysis = analyze(source, filename);

  if (!engineAvailable()) {
    return res.status(503).json({
      ok: false,
      error: "Luraph v15 engine is not installed. Run npm install.",
      detected,
      analysis: staticAnalysis,
      output: cleanSource(source),
      engine: "static"
    });
  }

  try {
    const started = Date.now();
    const result = await runEngine(source, filename, { mode });
    res.json({
      ok: true,
      engine: "luraphv15-node",
      detected,
      elapsedMs: Date.now() - started,
      output: result.output,
      report: result.report,
      analysis: staticAnalysis
    });
  } catch (error) {
    res.status(500).json({
      ok: false,
      error: String(error?.message || error),
      detected,
      analysis: staticAnalysis,
      output: cleanSource(source),
      engine: "static-fallback"
    });
  }
});

app.get(/.*/, (_req, res) => {
  res.sendFile(path.join(ROOT, "public", "index.html"));
});

app.listen(PORT, () => {
  console.log(`[QyrexDeobf] http://localhost:${PORT}`);
  console.log(`[QyrexDeobf] Luraph engine: ${engineAvailable() ? "ready" : "missing"}`);
});
