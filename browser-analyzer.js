(function () {
  'use strict';

  // QyrexDeobf browser dumper pack.
  // Everything here is static: the submitted Lua/Luau source is never executed.

  const LUA_KEYWORDS = new Set([
    'and','break','do','else','elseif','end','false','for','function','goto',
    'if','in','local','nil','not','or','repeat','return','then','true','until',
    'while','continue'
  ]);

  const PATTERNS = [
    ['library','require/library',/\brequire\s*\(/gi,'module/library load'],
    ['library','library table',/\b(?:local\s+)?[A-Za-z_][A-Za-z0-9_]*(?:Library|Lib|UI|Gui|Framework|Module|Manager)\s*=\s*\{/gi,'library/module table construction'],
    ['instance','Instance.new',/\bInstance\s*\.\s*new\s*\(/gi,'Instance construction'],
    ['service','GetService',/\bGetService\s*\(/gi,'service lookup'],
    ['event','Connect',/:\s*Connect\s*\(/gi,'event callback connection'],
    ['event','FireServer',/:\s*FireServer\s*\(/gi,'remote event invocation'],
    ['event','InvokeServer',/:\s*InvokeServer\s*\(/gi,'remote function invocation'],
    ['event','OnClient',/\.OnClient[A-Za-z_]*/gi,'client callback/event member'],
    ['network','HttpGet',/\bHttpGet\s*\(/gi,'HTTP GET helper'],
    ['network','RequestAsync',/\bRequestAsync\s*\(/gi,'HTTP request'],
    ['network','request',/\b(?:syn\.)?request\s*\(/gi,'executor/network request'],
    ['network','http_request',/\bhttp_request\s*\(/gi,'executor/network request'],
    ['network','WebSocket',/\bWebSocket(?:\.connect)?\b/gi,'websocket usage'],
    ['filesystem','writefile',/\b(?:writefile|appendfile)\s*\(/gi,'filesystem write'],
    ['filesystem','readfile',/\b(?:readfile|loadfile|dofile)\s*\(/gi,'filesystem read/load'],
    ['filesystem','folder ops',/\b(?:makefolder|isfolder|isfile|delfile|delfolder|listfiles)\s*\(/gi,'filesystem/folder operation'],
    ['dynamic','loadstring/load',/\b(?:loadstring|load)\s*\(/gi,'dynamic code loading'],
    ['environment','getgenv',/\bgetgenv\s*\(/gi,'global executor environment access'],
    ['environment','getrenv',/\bgetrenv\s*\(/gi,'runtime environment access'],
    ['environment','getfenv',/\bgetfenv\s*\(/gi,'function environment access'],
    ['environment','shared',/\bshared\s*(?:\.|\[)/gi,'shared state access'],
    ['environment','debug',/\bdebug\.[A-Za-z_][A-Za-z0-9_]*/gi,'debug API usage'],
    ['hook','metamethod hook',/\bhookmetamethod\s*\(|\bhookfunction\s*\(|\bgetrawmetatable\s*\(|\bsetreadonly\s*\(/gi,'hook/metatable instrumentation'],
    ['task','task',/\btask\.(?:spawn|defer|delay|wait)\s*\(/gi,'scheduled/asynchronous task'],
    ['task','coroutine',/\bcoroutine\.(?:create|wrap|resume|yield)\s*\(/gi,'coroutine scheduling'],
    ['clipboard','clipboard',/\b(?:setclipboard|toclipboard|setrbxclipboard)\s*\(/gi,'clipboard access'],
    ['executor','executor global',/\b(?:identifyexecutor|getexecutorname|getthreadidentity|setthreadidentity|getgc|getinstances|getnilinstances|getloadedmodules)\s*\(/gi,'executor/runtime API'],
    ['crypto','crypt',/\b(?:crypt|crypto)\.[A-Za-z_][A-Za-z0-9_]*/gi,'cryptographic helper'],
    ['drawing','Drawing',/\bDrawing\.(?:new|clear)\s*\(|\bgetrenderproperty\s*\(/gi,'drawing/render API'],
    ['ui','UI constructor',/\b(?:CreateWindow|Create|Window|Library|Framework|UI)\s*\([^\n]{0,220}\)/gi,'possible UI/library construction'],
    ['state','global state',/\b(?:getgenv|shared)\s*(?:\[\s*["'][^"']+["']\s*\]|["'][^"']+["'])/gi,'shared/global state'],
    ['metatable','metatable op',/\b(?:rawget|rawset|rawequal|rawlen|setmetatable|getmetatable)\s*\(/gi,'raw/metatable operation'],
    ['string','string transform',/\b(?:string\.(?:char|byte|reverse|rep|sub|gsub|format)|utf8\.(?:char|codepoint))\s*\(/gi,'string transformation/decoding helper'],
    ['control','dispatcher loop',/\bwhile\s+true\s+do\b/gi,'potential VM/dispatcher loop']
  ];

  const EXACT = [
    ['print',/\bprint\s*\(/gi], ['warn',/\bwarn\s*\(/gi], ['error',/\berror\s*\(/gi],
    ['pcall',/\bpcall\s*\(/gi], ['xpcall',/\bxpcall\s*\(/gi], ['assert',/\bassert\s*\(/gi],
    ['setmetatable',/\bsetmetatable\s*\(/gi], ['getmetatable',/\bgetmetatable\s*\(/gi]
  ];

  function byteLength(s) { return new TextEncoder().encode(s).length; }
  function lineOf(src, index) { return src.slice(0, index).split('\n').length; }
  function uniquePush(arr, value) { if (value && !arr.includes(value)) arr.push(value); }

  function decodeLuaEscapes(body) {
    let out = String(body || '');
    out = out.replace(/\\x([0-9a-fA-F]{2})/g, (_, h) => String.fromCharCode(parseInt(h, 16)));
    out = out.replace(/\\u\{([0-9a-fA-F]+)\}/g, (_, h) => {
      try { return String.fromCodePoint(parseInt(h, 16)); } catch (_) { return _; }
    });
    out = out.replace(/\\([0-9]{1,3})/g, (_, d) => {
      const n = Number(d);
      return n <= 255 ? String.fromCharCode(n) : _;
    });
    const map = { a:'\x07', b:'\b', f:'\f', n:'\n', r:'\r', t:'\t', v:'\v', '\\':'\\', '"':'"', "'":"'" };
    out = out.replace(/\\([abfnrtv\\"'])/g, (_, c) => map[c] ?? _);
    return out;
  }

  function parseQuoted(raw) {
    if (!raw || raw.length < 2) return { value: raw || '', kind: 'plain' };
    if ((raw[0] === '"' && raw.at(-1) === '"') || (raw[0] === "'" && raw.at(-1) === "'")) {
      return { value: decodeLuaEscapes(raw.slice(1, -1)), kind: 'quoted' };
    }
    return { value: raw, kind: 'plain' };
  }

  function parseLongBracket(raw) {
    const m = /^\[(=*)\[([\s\S]*)\]\1\]$/.exec(raw || '');
    return m ? m[2] : null;
  }

  function extractStrings(src) {
    const out = [];
    let i = 0;
    while (i < src.length) {
      const ch = src[i];
      if (ch === '"' || ch === "'") {
        const start = i, quote = ch;
        i++;
        while (i < src.length) {
          if (src[i] === '\\') { i += 2; continue; }
          if (src[i] === quote) { i++; break; }
          i++;
        }
        const raw = src.slice(start, i);
        const parsed = parseQuoted(raw);
        out.push({ value: raw, decoded: parsed.value, line: lineOf(src, start), length: raw.length, kind: 'quoted' });
        continue;
      }
      if (ch === '[') {
        const lm = /^\[(=*)\[/.exec(src.slice(i));
        if (lm) {
          const close = `]${lm[1]}]`;
          const end = src.indexOf(close, i + lm[0].length);
          if (end >= 0) {
            const raw = src.slice(i, end + close.length);
            out.push({ value: raw, decoded: parseLongBracket(raw), line: lineOf(src, i), length: raw.length, kind: 'long' });
            i = end + close.length;
            continue;
          }
        }
      }
      i++;
    }
    return out;
  }

  function splitTopLevel(text, separatorRegex = /,/) {
    const out = [];
    let start = 0, depth = 0, quote = null, escape = false;
    for (let i = 0; i < text.length; i++) {
      const ch = text[i];
      if (quote) {
        if (escape) { escape = false; continue; }
        if (ch === '\\') { escape = true; continue; }
        if (ch === quote) quote = null;
        continue;
      }
      if (ch === '"' || ch === "'") { quote = ch; continue; }
      if ('([{'.includes(ch)) depth++;
      else if (')]}'.includes(ch)) depth = Math.max(0, depth - 1);
      else if (depth === 0 && separatorRegex.test(ch)) {
        out.push(text.slice(start, i).trim());
        start = i + 1;
      }
    }
    out.push(text.slice(start).trim());
    return out.filter(Boolean);
  }

  function unquoteLiteral(expr) {
    const s = String(expr || '').trim();
    if ((s.startsWith('"') && s.endsWith('"')) || (s.startsWith("'") && s.endsWith("'"))) return decodeLuaEscapes(s.slice(1, -1));
    const lb = parseLongBracket(s);
    return lb !== null ? lb : null;
  }

  function parseNumber(expr) {
    const s = String(expr || '').trim().replace(/_/g, '');
    if (/^[-+]?0x[0-9a-f]+$/i.test(s) || /^[-+]?0b[01]+$/i.test(s) || /^[-+]?\d+(?:\.\d+)?$/.test(s)) {
      const n = Number(s);
      return Number.isFinite(n) ? n : null;
    }
    return null;
  }

  function luaStringEscape(value) {
    return JSON.stringify(String(value));
  }

  function literalValue(expr, env = Object.create(null)) {
    const s = String(expr || '').trim();
    const q = unquoteLiteral(s);
    if (q !== null) return { known: true, type: 'string', value: q };
    const n = parseNumber(s);
    if (n !== null) return { known: true, type: 'number', value: n };
    if (s === 'true' || s === 'false') return { known: true, type: 'boolean', value: s === 'true' };
    if (s === 'nil') return { known: true, type: 'nil', value: null };
    if (/^[A-Za-z_][A-Za-z0-9_]*$/.test(s) && Object.prototype.hasOwnProperty.call(env, s)) return env[s];
    return { known: false };
  }

  function evaluateCall(name, args, env) {
    const parts = splitTopLevel(args);
    const vals = parts.map(x => literalValue(x, env));
    if (name === 'string.char' || name === 'utf8.char') {
      if (!vals.length || vals.some(v => !v.known || v.type !== 'number')) return { known: false };
      try {
        const chars = vals.map(v => v.value);
        const value = String.fromCodePoint(...chars);
        return value.length <= 100000 ? { known:true,type:'string',value } : { known:false };
      } catch (_) { return { known:false }; }
    }
    if (name === 'string.reverse' && vals.length === 1 && vals[0].known && vals[0].type === 'string') return { known:true,type:'string',value:vals[0].value.split('').reverse().join('') };
    if (name === 'string.rep' && vals.length >= 1 && vals[0].known && vals[0].type === 'string') {
      const count = vals[1]?.value;
      if (Number.isInteger(count) && count >= 0 && count <= 10000) {
        const value = vals[0].value.repeat(count);
        return value.length <= 100000 ? { known:true,type:'string',value } : { known:false };
      }
    }
    if (name === 'string.sub' && vals.length >= 2 && vals[0].known && vals[0].type === 'string' && vals[1]?.known) {
      const s0 = vals[0].value, start = Number(vals[1].value), stop = vals[2]?.known ? Number(vals[2].value) : undefined;
      if (Number.isFinite(start) && (stop === undefined || Number.isFinite(stop))) return { known:true,type:'string',value:s0.substring(Math.max(0,start-1), stop === undefined ? undefined : Math.max(0,stop)) };
    }
    if (name === 'table.concat') {
      const raw = parts[0] || '';
      const tm = /^\{([\s\S]*)\}$/.exec(raw);
      if (tm) {
        const items = splitTopLevel(tm[1]).map(x => literalValue(x, env));
        if (items.every(v => v.known && (v.type === 'string' || v.type === 'number'))) return { known:true,type:'string',value:items.map(v=>String(v.value)).join('') };
      }
    }
    if ((name === 'bit32.bxor' || name === 'bit32.bor' || name === 'bit32.band') && vals.length && vals.every(v => v.known && v.type === 'number')) {
      const nums = vals.map(v => v.value >>> 0);
      let result;
      if (name.endsWith('bxor')) result = nums.reduce((a,b) => (a ^ b) >>> 0, 0);
      else if (name.endsWith('bor')) result = nums.reduce((a,b) => (a | b) >>> 0, 0);
      else result = nums.reduce((a,b) => (a & b) >>> 0, 0xFFFFFFFF);
      return { known:true,type:'number',value:result >>> 0 };
    }
    if ((name === 'tonumber' || name === 'tostring') && vals.length && vals[0].known) {
      if (name === 'tonumber') {
        const num = Number(vals[0].value);
        return Number.isFinite(num) ? {known:true,type:'number',value:num} : {known:false};
      }
      return {known:true,type:'string',value:String(vals[0].value)};
    }
    return { known: false };
  }

  function foldPureCalls(src) {
    let out = String(src || '');
    const callRe = /\b(string\.(?:char|reverse|rep|sub)|utf8\.char|table\.concat|bit32\.(?:bxor|bor|band)|(?:toString|tonumber|tostring))\s*\(([\s\S]*?)\)/g;
    for (let pass = 0; pass < 8; pass++) {
      let changed = false;
      out = out.replace(callRe, (full, name, args) => {
        const val = evaluateCall(name === 'toString' ? 'tostring' : name, args, Object.create(null));
        if (!val.known) return full;
        changed = true;
        return val.type === 'string' ? luaStringEscape(val.value) : String(val.value);
      });
      out = out.replace(/((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))\s*\.\.\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'))/g, (full,a,b) => {
        const av=unquoteLiteral(a), bv=unquoteLiteral(b);
        if(av===null||bv===null)return full;
        changed=true; return luaStringEscape(av+bv);
      });
      out = out.replace(/\{\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*(?:,\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*)*)\s*\}\s*/g, m => m);
      if (!changed) break;
    }
    return out;
  }

  function decodeBase64(text) {
    try {
      const cleaned = String(text || '').replace(/\s+/g, '');
      if (!/^[A-Za-z0-9+/]*={0,2}$/.test(cleaned) || cleaned.length < 8 || cleaned.length % 4 !== 0) return null;
      const bin = atob(cleaned);
      let printable = 0;
      for (let i = 0; i < bin.length; i++) {
        const c = bin.charCodeAt(i);
        if (c === 9 || c === 10 || c === 13 || (c >= 32 && c <= 126)) printable++;
      }
      if (!bin.length || printable / bin.length < 0.75) return null;
      return Array.from(bin, ch => String.fromCharCode(ch.charCodeAt(0))).join('');
    } catch (_) { return null; }
  }

  function extractEncodedCandidates(src) {
    const strings = extractStrings(src);
    const base64 = [], hex = [], decimalBytes = [];
    for (const item of strings) {
      const value = item.decoded;
      if (!value || value.length > 200000) continue;
      const b64 = decodeBase64(value);
      if (b64 && b64 !== value) base64.push({line:item.line, raw:item.value, decoded:b64.slice(0,20000)});
      if (/^(?:[0-9a-fA-F]{2}){8,}$/.test(value.replace(/\s+/g,''))) {
        try {
          const clean=value.replace(/\s+/g,'');
          let out=''; for(let i=0;i<clean.length;i+=2) out += String.fromCharCode(parseInt(clean.slice(i,i+2),16));
          if(out && out !== value) hex.push({line:item.line,raw:item.value,decoded:out.slice(0,20000)});
        } catch(_){}
      }
    }
    const byteRe = /\b(?:string\.(?:char|frombytecode)|bytesToString|base64Decode)\s*\(\s*\{([\d,\s]+)\}\s*\)/gi;
    let m;
    while((m=byteRe.exec(src))){
      const nums=splitTopLevel(m[1]).map(Number).filter(Number.isFinite);
      if(nums.length && nums.every(n=>n>=0&&n<=255)){
        decimalBytes.push({line:lineOf(src,m.index),raw:m[0],decoded:String.fromCharCode(...nums.slice(0,20000))});
      }
    }
    return {base64,hex,decimalBytes};
  }

  function extractConstantAssignments(src) {
    const env = Object.create(null);
    const values = [];
    const lines = src.split(/\r?\n/);
    const simple = /^\s*(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.+?)\s*;?\s*$/;
    for (let i=0;i<lines.length;i++) {
      const m=simple.exec(lines[i]);
      if(!m) continue;
      const name=m[1], rhs=m[2];
      let value=literalValue(rhs,env);
      const cm=/^(string\.(?:char|reverse|rep|sub)|utf8\.char|table\.concat|bit32\.(?:bxor|bor|band)|tostring|tonumber)\s*\(([\s\S]*)\)$/.exec(rhs);
      if(cm) value=evaluateCall(cm[1],cm[2],env);
      if(!value.known) continue;
      env[name]=value;
      values.push({line:i+1,name,type:value.type,value:value.value===null?'nil':String(value.value).slice(0,20000)});
    }
    return {env,values};
  }

  function identifyVMMarkers(src) {
    const checks = [
      ['Luraph dispatcher helpers',/\b(?:CALL|NAMECALL|CHECKIF|CHECKAND|CHECKOR|CHECKEQ|CHECKNEQ|CHECKWHILE|CONSTRUCT|FORINFO|FORSTEP[123]|TEMPLATE_STRING)\b/g],
      ['Luraph buffer decoder',/\bbuffer\.(?:readu8|writeu32|fromstring|tostring|len)\b/gi],
      ['Luraph YA marker',/\.YA\s*\(\s*\)/gi],
      ['FlameDumper hook bridge',/\b(?:_HOOKOP|CODER_[A-Z_]+|stack_4|Universal Reader)\b/gi],
      ['25ms runtime markers',/(?:__25mslocation|<25ms_concat_me>|analyzefunction|simplelog)/gi],
      ['Unveilr/HookOp markers',/\b(?:ExpressionHooks|hookOpValue|hookOp|HOOKEXP|TraceId|ExecEnv)\b/gi],
      ['Larry/Zala dumper markers',/\b(?:TRACE_CALLBACKS|CONSTANT_COLLECTION|CAPTURE_VM_OPS|call_graph|string_refs|dump_env|dump_table)\b/gi],
      ['IronBrew-like VM',/\b(?:IronBrew|IB\s*VM|__index)\b/gi],
      ['MoonVeil',/\bMoonVeil\b/gi],
      ['Luarmor',/\bLuarmor\b/gi],
      ['Prometheus passes',/\b(?:Prometheus|ConstantArray|ProxifyLocals|EncryptStrings|SplitStrings|Vmify|WatermarkCheck)\b/gi],
      ['Junkie markers',/\b(?:Junkie|junkie|junkieVM)\b/gi]
    ];
    const markers=[];
    for(const [name,re] of checks){
      const hits=src.match(re);
      if(hits && hits.length) markers.push({name,count:hits.length});
    }
    return markers;
  }

  function detectProvider(src) {
    const rules = [
      ['Luraph',/This file was protected using Luraph Obfuscator|(?:\bCALL\b.*\bCHECKIF\b.*\bCHECKWHILE\b)|\.YA\s*\(\s*\)/is],
      ['FlameCoder/FlameDumper',/\b(?:Universal Reader|_HOOKOP|CODER_CALL)\b/i],
      ['25ms',/(?:__25mslocation|<25ms_concat_me>|@25msrequireluvsu)/i],
      ['Unveilr',/\b(?:ExpressionHooks|hookOpValue|ExecEnv)\b/i],
      ['Prometheus',/\b(?:Prometheus|WatermarkCheck|ProxifyLocals|ConstantArray|EncryptStrings|Vmify)\b/i],
      ['IronBrew',/\bIronBrew\b|\bIronbrew\b/i],
      ['MoonVeil',/\bMoonVeil\b|\bmoonveil\b/i],
      ['Luarmor',/\bLuarmor\b|\bluarmor\b/i],
      ['Junkie',/\bJunkie\b|\bjunkieVM\b/i],
      ['Generic VM',/setmetatable\s*\(\s*\{|while\s+true\s+do[\s\S]{0,10000}if\s+[A-Za-z_]\w*\s*<=\s*\d+/i]
    ];
    return rules.find(([_,re])=>re.test(src))?.[0] || 'Unknown';
  }

  function buildCalls(src) {
    const sourceLines=src.split(/\r?\n/), calls=[], behaviorCounts={};
    const push=(line,type,name,message)=>{
      calls.push({line,type,name,message,source:(sourceLines[line-1]||'').trim().slice(0,300)});
      behaviorCounts[type]=(behaviorCounts[type]||0)+1;
    };
    for(const [type,label,re0,detail] of PATTERNS){
      const re=new RegExp(re0.source,re0.flags.includes('g')?re0.flags:re0.flags+'g'); let m;
      while((m=re.exec(src))) push(lineOf(src,m.index),type,label,detail);
    }
    for(const [name,re0] of EXACT){
      const re=new RegExp(re0.source,'gi'); let m;
      while((m=re.exec(src))) push(lineOf(src,m.index),'api',name,`${name}(...)`);
    }
    const req=/\brequire\s*\(\s*(["'])(.*?)\1\s*\)/g; let m;
    while((m=req.exec(src))) push(lineOf(src,m.index),'library','require',`require("${m[2]}")`);
    const svc=/\bGetService\s*\(\s*(["'])(.*?)\1\s*\)/g;
    while((m=svc.exec(src))) push(lineOf(src,m.index),'service','GetService',`GetService("${m[2]}")`);
    calls.sort((a,b)=>a.line-b.line||a.type.localeCompare(b.type));
    return {calls:calls.slice(0,5000),behaviorCounts};
  }

  function buildEnvironment(src) {
    const globals=[], libraries=[], services=[], envFunctions=[];
    const candidates=['game','workspace','script','shared','getgenv','getrenv','getfenv','loadstring','load','buffer','bit32','debug','Instance','request','http_request','readfile','writefile','Drawing','WebSocket','crypt'];
    for(const name of candidates) if(new RegExp(`\\b${name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')}\\b`).test(src)) uniquePush(globals,name);
    const req=/\brequire\s*\(\s*(["'])(.*?)\1\s*\)/g; let m;
    while((m=req.exec(src))) uniquePush(libraries,m[2]);
    const svc=/\bGetService\s*\(\s*(["'])(.*?)\1\s*\)/g;
    while((m=svc.exec(src))) uniquePush(services,m[2]);
    const assign=/\b(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*(?:Library|Lib|UI|Gui|Framework|Module|Manager))\s*=\s*\{/g;
    while((m=assign.exec(src))) uniquePush(libraries,m[1]);

    const consts=extractConstantAssignments(src);
    for(const [name,val] of Object.entries(consts.env)) {
      if (['string','number','boolean'].includes(val.type)) envFunctions.push(`${name} = ${String(val.value).slice(0,500)}`);
    }
    return {globals,libraries,services,constants:consts.values,envFunctions};
  }

  function cleanSource(src) {
    let out=String(src||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    out=foldPureCalls(out);
    out=out.replace(/^\s*--\s*This file was protected using Luraph Obfuscator v[\d.]+.*$/gim,'');
    out=out.replace(/^\s*--\s*(?:QyrexDeobf|Luraph protection marker removed).*$/gim,'');
    // Normalize separators without pretending to reconstruct a VM that was not recovered.
    out=out.replace(/;(?=\s*(?:local|return|if|for|while|repeat|function)\b)/g,';\n');
    out=out.replace(/[ \t]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n').trim();
    return [
      '-- QyrexDeobf browser multi-dumper',
      '-- Static analysis only: target code was not executed.',
      `-- Provider hint: ${detectProvider(src)}`,
      ''
    ].concat(out ? [out] : ['-- no source']).join('\n') + '\n';
  }

  function analyze(src, filename='script.lua') {
    src=String(src||'');
    const lines=src?src.split(/\r?\n/).length:0;
    const env=buildEnvironment(src);
    const calls=buildCalls(src);
    const strings=extractStrings(src);
    const encoded=extractEncodedCandidates(src);
    const markers=identifyVMMarkers(src);
    const numericRe=/(?<![A-Za-z0-9_])(?:[-+]?(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|\d+(?:\.\d+)?))(?![A-Za-z0-9_])/g;
    const numbers=[]; let nm;
    while((nm=numericRe.exec(src))) numbers.push({value:nm[0],line:lineOf(src,nm.index)});
    const decoded=strings.filter(s=>s.decoded!==s.value && s.decoded!==s.value.slice(1,-1)).slice(0,500)
      .map(s=>({line:s.line,raw:s.value,decoded:s.decoded.slice(0,20000)}));

    const markerNames=markers.map(x=>`${x.name} (${x.count})`);
    const vmCount=markers.reduce((a,b)=>a+b.count,0);

    return {
      filename, provider:detectProvider(src), bytes:byteLength(src), lines,
      functions:(src.match(/\bfunction\b/g)||[]).length,
      loops:(src.match(/\b(?:while|repeat|for)\b/g)||[]).length,
      branches:(src.match(/\b(?:if|elseif)\b/g)||[]).length,
      globals:env.globals,libraries:env.libraries,services:env.services,
      environment:env, behaviorCounts:calls.behaviorCounts,
      calls:calls.calls,
      dumpers:{
        strings:{
          count:strings.length,
          largest:strings.slice().sort((a,b)=>b.length-a.length).slice(0,30),
          decoded,
          base64:encoded.base64.slice(0,100),
          hex:encoded.hex.slice(0,100),
          decimalBytes:encoded.decimalBytes.slice(0,100)
        },
        constants:{
          numbers:numbers.slice(0,3000),
          numberCount:numbers.length,
          assignments:env.constants.slice(0,1000)
        },
        calls:calls.calls.slice(0,5000),
        vm:{markers:markerNames,count:vmCount,details:markers}
      },
      decoderSummary:{
        pureFolds:true,
        base64:encoded.base64.length,
        hex:encoded.hex.length,
        decimalBytes:encoded.decimalBytes.length,
        constantAssignments:env.constants.length
      }
    };
  }

  window.QyrexBrowserAnalyzer = {
    analyze, cleanSource, foldPureCalls, extractStrings, extractEncodedCandidates,
    identifyVMMarkers, detectProvider
  };
})();
