"use strict";

const IDENT = /^[A-Za-z_][A-Za-z0-9_]*$/;

function lineOf(source, index) {
  return source.slice(0, index).split("\n").length;
}

function addUnique(arr, value) {
  if (value && !arr.includes(value)) arr.push(value);
}

function extractStrings(source) {
  const out = [];
  const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
  let m;
  while ((m = re.exec(source))) {
    const raw = m[1];
    out.push({ value: raw, line: lineOf(source, m.index), length: raw.length });
  }
  return out;
}

function decodeQuoted(raw) {
  if (!raw || raw.length < 2) return raw;
  const q = raw[0];
  if (raw[raw.length - 1] !== q) return raw;
  let body = raw.slice(1, -1);
  body = body
    .replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)))
    .replace(/\\([0-9]{1,3})/g, (_, d) => {
      const n = Number(d);
      return Number.isFinite(n) && n <= 255 ? String.fromCharCode(n) : _;
    })
    .replace(/\\n/g, "\n")
    .replace(/\\r/g, "\r")
    .replace(/\\t/g, "\t")
    .replace(/\\"/g, '"')
    .replace(/\\'/g, "'")
    .replace(/\\\\/g, "\\");
  return body;
}

function staticDumpers(source) {
  const strings = extractStrings(source);
  const decodedStrings = [];
  for (const item of strings) {
    const decoded = decodeQuoted(item.value);
    if (decoded !== item.value.slice(1, -1) && decoded.length <= 8192) {
      decodedStrings.push({ line: item.line, raw: item.value, decoded });
    }
  }

  const numbers = [];
  const numRe = /(?<![A-Za-z0-9_])(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|\d+(?:\.\d+)?)(?![A-Za-z0-9_])/g;
  let nm;
  while ((nm = numRe.exec(source))) {
    numbers.push({ value: nm[0], line: lineOf(source, nm.index) });
  }

  return {
    strings: {
      count: strings.length,
      largest: strings.slice().sort((a, b) => b.length - a.length).slice(0, 20),
      decoded: decodedStrings.slice(0, 100)
    },
    constants: {
      numbers: numbers.slice(0, 1000),
      numberCount: numbers.length
    }
  };
}

const PATTERNS = [
  { type: "library", label: "require/library", re: /\brequire\s*\(/i, detail: "require(...) / module load" },
  { type: "instance", label: "Instance.new", re: /\bInstance\s*\.\s*new\s*\(/i, detail: "Instance.new(...)" },
  { type: "service", label: "GetService", re: /\bGetService\s*\(/i, detail: "Roblox service lookup" },
  { type: "event", label: "Connect", re: /:\s*Connect\s*\(/i, detail: "event callback connection" },
  { type: "event", label: "FireServer", re: /:\s*FireServer\s*\(/i, detail: "remote event invocation" },
  { type: "event", label: "InvokeServer", re: /:\s*InvokeServer\s*\(/i, detail: "remote function invocation" },
  { type: "event", label: "OnClient", re: /\.OnClient[A-Za-z_]+/i, detail: "client-side callback/event member" },
  { type: "network", label: "HttpGet", re: /\bHttpGet\s*\(/i, detail: "HTTP GET helper" },
  { type: "network", label: "RequestAsync", re: /\bRequestAsync\s*\(/i, detail: "HTTP request" },
  { type: "network", label: "request", re: /\b(?:syn\.)?request\s*\(/i, detail: "executor/network request" },
  { type: "network", label: "http_request", re: /\bhttp_request\s*\(/i, detail: "executor/network request" },
  { type: "websocket", label: "WebSocket", re: /\bWebSocket\b|WebSocket\.connect/i, detail: "websocket usage" },
  { type: "filesystem", label: "writefile", re: /\b(?:writefile|appendfile)\s*\(/i, detail: "filesystem write" },
  { type: "filesystem", label: "readfile", re: /\b(?:readfile|loadfile|dofile)\s*\(/i, detail: "filesystem read/load" },
  { type: "filesystem", label: "folder ops", re: /\b(?:makefolder|isfolder|isfile|delfile|delfolder|listfiles)\s*\(/i, detail: "filesystem/folder operation" },
  { type: "dynamic", label: "loadstring/load", re: /\b(?:loadstring|load)\s*\(/i, detail: "dynamic code loading" },
  { type: "environment", label: "getgenv", re: /\bgetgenv\s*\(/i, detail: "global executor environment access" },
  { type: "environment", label: "getfenv", re: /\bgetfenv\s*\(/i, detail: "function environment access" },
  { type: "environment", label: "debug", re: /\bdebug\.[A-Za-z_][A-Za-z0-9_]*/i, detail: "debug API usage" },
  { type: "hook", label: "metamethod hook", re: /\bhookmetamethod\s*\(|\bgetrawmetatable\s*\(/i, detail: "metamethod/metatable instrumentation" },
  { type: "task", label: "task.spawn", re: /\btask\.(?:spawn|defer|delay)\s*\(/i, detail: "scheduled/asynchronous task" },
  { type: "task", label: "coroutine", re: /\bcoroutine\.(?:create|wrap|resume|yield)\s*\(/i, detail: "coroutine scheduling" },
  { type: "clipboard", label: "clipboard", re: /\b(?:setclipboard|toclipboard|setrbxclipboard)\s*\(/i, detail: "clipboard access" },
  { type: "executor", label: "executor global", re: /\b(?:identifyexecutor|getexecutorname|getthreadidentity|setthreadidentity)\s*\(/i, detail: "executor/runtime API" },
  { type: "crypto", label: "crypt", re: /\bcrypt\.[A-Za-z_][A-Za-z0-9_]*/i, detail: "cryptographic helper" },
  { type: "drawing", label: "Drawing", re: /\bDrawing\.(?:new|new|clear)\s*\(|\bgetrenderproperty\s*\(/i, detail: "drawing/render API" },
  { type: "ui", label: "UI constructor", re: /\b(?:Create|CreateWindow|Window|UI|Library)\b.*\b(?:new|create)\b/i, detail: "possible UI/library construction" }
];

const EXACT_API = [
  ["print", /\bprint\s*\(/i],
  ["warn", /\bwarn\s*\(/i],
  ["error", /\berror\s*\(/i],
  ["pcall", /\bpcall\s*\(/i],
  ["xpcall", /\bxpcall\s*\(/i],
  ["setmetatable", /\bsetmetatable\s*\(/i],
  ["getmetatable", /\bgetmetatable\s*\(/i]
];

function detectProvider(source) {
  const profiles = [
    { name: "Luraph", re: /This file was protected using Luraph Obfuscator/i },
    { name: "Prometheus", re: /Prometheus|WatermarkCheck|ProxifyLocals|ConstantArray/i },
    { name: "IronBrew", re: /IronBrew|Ironbrew/i },
    { name: "MoonVeil", re: /MoonVeil|moonveil/i },
    { name: "Luarmor", re: /Luarmor|luarmor/i },
    { name: "Generic VM", re: /setmetatable\s*\(\s*\{|while\s+true\s+do[\s\S]{0,8000}if\s+[A-Za-z_]\w*\s*<=\s*\d+/i }
  ];
  return profiles.find(p => p.re.test(source))?.name || "Unknown";
}

function analyze(source, filename = "script.lua") {
  const calls = [];
  const behaviorCounts = {};
  const globals = [];
  const libraries = [];
  const services = [];

  const libraryVarRe = /\b(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*(?:Library|Lib|UI|Gui|Framework|Module|Manager))\s*=\s*\{/g;

  for (const [name, re] of EXACT_API) {
    const matcher = new RegExp(re.source, re.flags.replace("g", "") + "g");
    let m;
    while ((m = matcher.exec(source))) {
      calls.push({
        line: lineOf(source, m.index),
        type: "api",
        name,
        message: `${name}(...)`,
        source: source.split("\n")[lineOf(source, m.index) - 1]?.trim().slice(0, 220) || ""
      });
    }
  }

  let lm;
  while ((lm = libraryVarRe.exec(source))) {
    const line = lineOf(source, lm.index);
    calls.push({ line, type: "library", name: "module table", message: `${lm[1]} table construction`, source: source.split("\n")[line - 1]?.trim().slice(0, 220) || "" });
    behaviorCounts.library = (behaviorCounts.library || 0) + 1;
    addUnique(libraries, lm[1]);
  }

  for (const pattern of PATTERNS) {
    const matcher = new RegExp(pattern.re.source, pattern.re.flags.includes("g") ? pattern.re.flags : pattern.re.flags + "g");
    let m;
    while ((m = matcher.exec(source))) {
      const line = lineOf(source, m.index);
      const item = {
        line,
        type: pattern.type,
        name: pattern.label,
        message: pattern.detail,
        source: source.split("\n")[line - 1]?.trim().slice(0, 220) || ""
      };
      calls.push(item);
      behaviorCounts[pattern.type] = (behaviorCounts[pattern.type] || 0) + 1;
    }
  }

  for (const name of ["game", "workspace", "script", "getgenv", "getrenv", "getfenv", "loadstring", "buffer", "bit32", "debug", "Instance", "request", "http_request", "readfile", "writefile"]) {
    if (new RegExp(`\\b${name.replace(/[.*+?^${}()|[\\]\\\\]/g, "\\\\$&")}\\b`).test(source)) addUnique(globals, name);
  }

  const reqRe = /\brequire\s*\(\s*(["'])(.*?)\1\s*\)/g;
  let rm;
  while ((rm = reqRe.exec(source))) addUnique(libraries, rm[2]);

  const svcRe = /\bGetService\s*\(\s*(["'])(.*?)\1\s*\)/g;
  let sm;
  while ((sm = svcRe.exec(source))) addUnique(services, sm[2]);

  calls.sort((a, b) => a.line - b.line || a.type.localeCompare(b.type));

  const dumper = staticDumpers(source);
  const lines = source ? source.split(/\r?\n/).length : 0;
  const functions = (source.match(/\bfunction\b|\bfunction\s*\(/g) || []).length;
  const loops = (source.match(/\b(?:while|repeat|for)\b/g) || []).length;
  const branches = (source.match(/\b(?:if|elseif)\b/g) || []).length;

  return {
    filename,
    provider: detectProvider(source),
    bytes: Buffer.byteLength(source, "utf8"),
    lines,
    functions,
    loops,
    branches,
    globals,
    libraries,
    services,
    behaviorCounts,
    calls: calls.slice(0, 2000),
    dumpers: {
      strings: dumper.strings,
      constants: dumper.constants,
      calls: calls.slice(0, 2000),
      vm: {
        markers: [
          /setmetatable\s*\(\s*\{/i.test(source) && "setmetatable wrapper",
          /buffer\.(?:readu8|writeu32|fromstring|tostring|len)\b/i.test(source) && "buffer API",
          /\.YA\s*\(\s*\)/i.test(source) && "YA marker",
          /while\s+true\s+do/i.test(source) && "dispatch loop"
        ].filter(Boolean),
        count: calls.filter(c => c.type === "vm").length
      }
    }
  };
}

function foldPureCalls(source) {
  let out = source;
  let previous;
  do {
    previous = out;
    out = out.replace(/\bstring\.char\s*\(\s*((?:0[xX][0-9A-Fa-f]+|\d+)\s*(?:,\s*(?:0[xX][0-9A-Fa-f]+|\d+)\s*)*)\)/g, (full, args) => {
      const nums = args.split(",").map(x => Number(x.trim()));
      if (!nums.every(n => Number.isFinite(n) && n >= 0 && n <= 255)) return full;
      const value = String.fromCharCode(...nums);
      return JSON.stringify(value);
    });
    out = out.replace(/\bstring\.reverse\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g, (full, raw) => JSON.stringify(decodeQuoted(raw).split("").reverse().join("")));
    out = out.replace(/\bstring\.rep\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*(\d+)\s*\)/g, (full, raw, count) => {
      const n = Number(count);
      if (!Number.isSafeInteger(n) || n < 0 || n > 10000) return full;
      const value = decodeQuoted(raw).repeat(n);
      return value.length <= 100000 ? JSON.stringify(value) : full;
    });
    out = out.replace(/\btable\.concat\s*\(\s*\{\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*(?:,\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*)*)?\}\s*\)/g, (full, body) => {
      if (!body) return JSON.stringify("");
      const parts = [];
      const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g;
      let m;
      while ((m = re.exec(body))) parts.push(decodeQuoted(m[1]));
      if (!parts.length) return full;
      return JSON.stringify(parts.join(""));
    });
  } while (out !== previous);
  return out;
}

function cleanSource(source) {
  let out = String(source || "").replace(/^\uFEFF/, "").replace(/\r\n?/g, "\n");

  out = foldPureCalls(out);

  out = out.replace(
    /^\s*--\s*This file was protected using Luraph Obfuscator v[\d.]+.*$/im,
    "-- QyrexDeobf: Luraph protection marker removed"
  );

  out = out.replace(/^[ \t]*--\s*QyrexDeobf[^\n]*\n?/gm, "");

  const splitStatements = [];
  let quote = null;
  let escape = false;
  let current = "";
  for (let i = 0; i < out.length; i++) {
    const ch = out[i];
    current += ch;
    if (quote) {
      if (escape) { escape = false; continue; }
      if (ch === "\\") { escape = true; continue; }
      if (ch === quote) quote = null;
      continue;
    }
    if (ch === '"' || ch === "'") { quote = ch; continue; }
    if (ch === ";") {
      current = current.replace(/[ \t]+$/g, "") + "\n";
      splitStatements.push(current);
      current = "";
    }
  }
  current = current.replace(/[ \t]+$/g, "");
  if (current) splitStatements.push(current);
  out = splitStatements.join("");

  out = out
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{4,}/g, "\n\n\n")
    .replace(/^\s+$/gm, "");

  const decoded = out.replace(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g, raw => {
    const value = decodeQuoted(raw);
    if (value === raw.slice(1, -1) || /[\n\r]/.test(value)) return raw;
    const q = raw[0];
    const escaped = value
      .replace(/\\/g, "\\\\")
      .replace(new RegExp("\\\\" + q, "g"), "\\\\" + q)
      .replace(/\n/g, "\\n")
      .replace(/\r/g, "\\r")
      .replace(/\t/g, "\\t");
    return q + escaped + q;
  });

  return `-- QyrexDeobf static cleanup\n-- This output is structurally cleaned; VM recovery depends on the selected engine.\n\n${decoded.trim()}\n`;
}

module.exports = {
  analyze,
  cleanSource,
  staticDumpers
};
