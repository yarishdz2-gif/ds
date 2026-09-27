(function () {
  'use strict';

  const PATTERNS = [
    ['library','require/library',/\brequire\s*\(/gi,'require(...) / module load'],
    ['instance','Instance.new',/\bInstance\s*\.\s*new\s*\(/gi,'Instance.new(...)'],
    ['service','GetService',/\bGetService\s*\(/gi,'Roblox service lookup'],
    ['event','Connect',/:\s*Connect\s*\(/gi,'event callback connection'],
    ['event','FireServer',/:\s*FireServer\s*\(/gi,'remote event invocation'],
    ['event','InvokeServer',/:\s*InvokeServer\s*\(/gi,'remote function invocation'],
    ['event','OnClient',/\.OnClient[A-Za-z_]*/gi,'client callback/event member'],
    ['network','HttpGet',/\bHttpGet\s*\(/gi,'HTTP GET helper'],
    ['network','RequestAsync',/\bRequestAsync\s*\(/gi,'HTTP request'],
    ['network','request',/\b(?:syn\.)?request\s*\(/gi,'executor/network request'],
    ['network','http_request',/\bhttp_request\s*\(/gi,'executor/network request'],
    ['websocket','WebSocket',/\bWebSocket(?:\.connect)?\b/gi,'websocket usage'],
    ['filesystem','writefile',/\b(?:writefile|appendfile)\s*\(/gi,'filesystem write'],
    ['filesystem','readfile',/\b(?:readfile|loadfile|dofile)\s*\(/gi,'filesystem read/load'],
    ['filesystem','folder ops',/\b(?:makefolder|isfolder|isfile|delfile|delfolder|listfiles)\s*\(/gi,'filesystem/folder operation'],
    ['dynamic','loadstring/load',/\b(?:loadstring|load)\s*\(/gi,'dynamic code loading'],
    ['environment','getgenv',/\bgetgenv\s*\(/gi,'global executor environment access'],
    ['environment','getrenv',/\bgetrenv\s*\(/gi,'runtime environment access'],
    ['environment','getfenv',/\bgetfenv\s*\(/gi,'function environment access'],
    ['environment','debug',/\bdebug\.[A-Za-z_][A-Za-z0-9_]*/gi,'debug API usage'],
    ['hook','metamethod hook',/\bhookmetamethod\s*\(|\bgetrawmetatable\s*\(|\bsetreadonly\s*\(/gi,'metamethod/metatable instrumentation'],
    ['task','task.spawn',/\btask\.(?:spawn|defer|delay)\s*\(/gi,'scheduled/asynchronous task'],
    ['task','coroutine',/\bcoroutine\.(?:create|wrap|resume|yield)\s*\(/gi,'coroutine scheduling'],
    ['clipboard','clipboard',/\b(?:setclipboard|toclipboard|setrbxclipboard)\s*\(/gi,'clipboard access'],
    ['executor','executor global',/\b(?:identifyexecutor|getexecutorname|getthreadidentity|setthreadidentity)\s*\(/gi,'executor/runtime API'],
    ['crypto','crypt',/\bcrypt\.[A-Za-z_][A-Za-z0-9_]*/gi,'cryptographic helper'],
    ['drawing','Drawing',/\bDrawing\.(?:new|clear)\s*\(|\bgetrenderproperty\s*\(/gi,'drawing/render API'],
    ['ui','UI constructor',/\b(?:CreateWindow|Window|Library|Framework|UI)\s*\([^\n]{0,180}\)/gi,'possible UI/library construction'],
    ['state','global state',/\b(?:getgenv|shared)\s*\[\s*["'][^"']+["']\s*\]/gi,'shared/global state access'],
    ['metatable','metatable op',/\b(?:rawget|rawset|rawequal|rawlen|setmetatable|getmetatable)\s*\(/gi,'metatable/raw operation'],
    ['string','byte/char decoding',/\b(?:string\.(?:char|byte|reverse|rep|sub)|utf8\.(?:char|codepoint))\s*\(/gi,'string transformation/decoding helper'],
    ['control','dispatcher loop',/\bwhile\s+true\s+do\b/gi,'potential VM/dispatcher loop']
  ];

  const EXACT = [
    ['print',/\bprint\s*\(/gi],
    ['warn',/\bwarn\s*\(/gi],
    ['error',/\berror\s*\(/gi],
    ['pcall',/\bpcall\s*\(/gi],
    ['xpcall',/\bxpcall\s*\(/gi]
  ];

  function byteLength(s) { return new TextEncoder().encode(s).length; }
  function lineOf(src, index) { return src.slice(0, index).split('\n').length; }
  function uniquePush(arr, value) { if (value && !arr.includes(value)) arr.push(value); }

  function decodeQuoted(raw) {
    if (!raw || raw.length < 2) return raw || '';
    const body = raw.slice(1, -1);
    return body.replace(/\\(x[0-9a-fA-F]{2}|u\{[0-9a-fA-F]+\}|[abfnrtv\\"'\n\r\t])/g, (_, token) => {
      if (/^x/i.test(token)) return String.fromCharCode(parseInt(token.slice(1), 16));
      if (/^u\{/i.test(token)) {
        try { return String.fromCodePoint(parseInt(token.slice(2, -1), 16)); } catch (_) { return token; }
      }
      return ({a:'\x07',b:'\b',f:'\f',n:'\n',r:'\r',t:'\t',v:'\v','\\':'\\','"':'"',"'":"'"})[token] ?? token;
    });
  }

  function extractStrings(src) {
    const out = [];
    const re = /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/gs;
    let m;
    while ((m = re.exec(src))) out.push({ value:m[1], line:lineOf(src,m.index), length:m[1].length });
    return out;
  }

  function staticDumpers(src) {
    const strings = extractStrings(src);
    const decoded = [];
    for (const s of strings) {
      const d = decodeQuoted(s.value);
      if (d !== s.value.slice(1,-1) && d.length <= 8192) decoded.push({line:s.line, raw:s.value, decoded:d});
    }
    const numbers = [];
    const numRe = /(?<![A-Za-z0-9_])(?:0[xX][0-9A-Fa-f_]+|0[bB][01_]+|\d+(?:\.\d+)?)(?![A-Za-z0-9_])/g;
    let m;
    while ((m = numRe.exec(src))) numbers.push({value:m[0], line:lineOf(src,m.index)});
    const identifiers = [];
    const idRe = /\b[A-Za-z_][A-Za-z0-9_]{2,}\b/g;
    while ((m = idRe.exec(src))) {
      const v = m[0];
      if (/^(function|local|return|then|else|elseif|end|for|while|repeat|until|do|and|or|not|true|false|nil|in)$/.test(v)) continue;
      if (/Library|Lib|UI|Gui|Framework|Module|Manager/i.test(v)) uniquePush(identifiers, v);
    }
    return {
      strings:{count:strings.length, largest:strings.slice().sort((a,b)=>b.length-a.length).slice(0,20), decoded:decoded.slice(0,200)},
      constants:{numbers:numbers.slice(0,2000), numberCount:numbers.length},
      identifiers:identifiers.slice(0,200)
    };
  }

  function detectProvider(src) {
    const profiles = [
      ['Luraph',/This file was protected using Luraph Obfuscator/i],
      ['Prometheus',/Prometheus|WatermarkCheck|ProxifyLocals|ConstantArray/i],
      ['IronBrew',/IronBrew|Ironbrew/i],
      ['MoonVeil',/MoonVeil|moonveil/i],
      ['Luarmor',/Luarmor|luarmor/i],
      ['Generic VM',/setmetatable\s*\(\s*\{|while\s+true\s+do[\s\S]{0,8000}if\s+[A-Za-z_]\w*\s*<=\s*\d+/i]
    ];
    return profiles.find(p=>p[1].test(src))?.[0] || 'Unknown';
  }

  function foldPureCalls(src) {
    let out = String(src || '');
    let previous;
    for (let pass=0; pass<6; pass++) {
      previous=out;
      out=out.replace(/\bstring\.char\s*\(\s*((?:0[xX][0-9A-Fa-f]+|\d+)\s*(?:,\s*(?:0[xX][0-9A-Fa-f]+|\d+)\s*)*)\)/g,(full,args)=>{
        const nums=args.split(',').map(x=>Number(x.trim()));
        if(!nums.every(n=>Number.isFinite(n)&&n>=0&&n<=0x10FFFF)) return full;
        try { return JSON.stringify(String.fromCodePoint(...nums)); } catch (_) { return full; }
      });
      out=out.replace(/\bstring\.reverse\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*\)/g,(full,raw)=>JSON.stringify(decodeQuoted(raw).split('').reverse().join('')));
      out=out.replace(/\bstring\.rep\s*\(\s*("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*,\s*(\d+)\s*\)/g,(full,raw,count)=>{
        const n=Number(count); if(!Number.isSafeInteger(n)||n<0||n>5000) return full;
        const v=decodeQuoted(raw).repeat(n); return v.length<=50000?JSON.stringify(v):full;
      });
      out=out.replace(/\btable\.concat\s*\(\s*\{\s*((?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*(?:,\s*(?:"(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')\s*)*)?\}\s*\)/g,(full,body)=>{
        if(!body) return JSON.stringify('');
        const parts=[...body.matchAll(/("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*')/g)].map(x=>decodeQuoted(x[1]));
        return parts.length?JSON.stringify(parts.join('')):full;
      });
      if(out===previous) break;
    }
    return out;
  }

  function cleanSource(src) {
    let out=String(src||'').replace(/^\uFEFF/,'').replace(/\r\n?/g,'\n');
    out=foldPureCalls(out);
    out=out.replace(/^\s*--\s*This file was protected using Luraph Obfuscator v[\d.]+.*$/im,'-- QyrexDeobf: Luraph protection marker removed');
    out=out.replace(/^\s*--\s*QyrexDeobf[^\n]*\n?/gm,'');
    out=out.replace(/[ \t]+\n/g,'\n').replace(/\n{4,}/g,'\n\n\n');
    return `-- QyrexDeobf static cleanup\n-- Browser mode: no target code is executed.\n-- VM recovery depends on a compatible offline engine.\n\n${out.trim()}\n`;
  }

  function analyze(src, filename='script.lua') {
    src=String(src||'');
    const lines=src?src.split(/\r?\n/).length:0;
    const sourceLines=src.split('\n');
    const calls=[]; const behaviorCounts={}; const globals=[]; const libraries=[]; const services=[];
    const push=(line,type,name,message)=>{calls.push({line,type,name,message,source:(sourceLines[line-1]||'').trim().slice(0,240)}); behaviorCounts[type]=(behaviorCounts[type]||0)+1;};

    for(const [name,re0] of EXACT){const re=new RegExp(re0.source,'gi'); let m; while((m=re.exec(src))) push(lineOf(src,m.index),'api',name,`${name}(...)`);}
    for(const [type,label,re0,detail] of PATTERNS){const re=new RegExp(re0.source,'gi'); let m; while((m=re.exec(src))) push(lineOf(src,m.index),type,label,detail);}

    for(const name of ['game','workspace','script','shared','getgenv','getrenv','getfenv','loadstring','buffer','bit32','debug','Instance','request','http_request','readfile','writefile','Drawing']) if(new RegExp('\\b'+name.replace(/[.*+?^${}()|[\]\\]/g,'\\$&')+'\\b').test(src)) uniquePush(globals,name);
    const reqRe=/\brequire\s*\(\s*(["'])(.*?)\1\s*\)/g; let m;
    while((m=reqRe.exec(src))) uniquePush(libraries,m[2]);
    const svcRe=/\bGetService\s*\(\s*(["'])(.*?)\1\s*\)/g;
    while((m=svcRe.exec(src))) uniquePush(services,m[2]);
    const libRe=/\b(?:local\s+)?([A-Za-z_][A-Za-z0-9_]*(?:Library|Lib|UI|Gui|Framework|Module|Manager))\s*=\s*\{/g;
    while((m=libRe.exec(src))){ uniquePush(libraries,m[1]); push(lineOf(src,m.index),'library','module table',`${m[1]} table construction`); }

    calls.sort((a,b)=>a.line-b.line||a.type.localeCompare(b.type));
    const dumpers=staticDumpers(src);
    const vmMarkers=[
      /setmetatable\s*\(\s*\{/i.test(src)&&'setmetatable wrapper',
      /buffer\.(?:readu8|writeu32|fromstring|tostring|len)\b/i.test(src)&&'buffer API',
      /\.YA\s*\(\s*\)/i.test(src)&&'YA marker',
      /while\s+true\s+do/i.test(src)&&'dispatch loop'
    ].filter(Boolean);
    return {
      filename, provider:detectProvider(src), bytes:byteLength(src), lines,
      functions:(src.match(/\bfunction\b/g)||[]).length,
      loops:(src.match(/\b(?:while|repeat|for)\b/g)||[]).length,
      branches:(src.match(/\b(?:if|elseif)\b/g)||[]).length,
      globals,libraries,services,behaviorCounts,
      calls:calls.slice(0,3000),
      dumpers:{strings:dumpers.strings,constants:dumpers.constants,identifiers:dumpers.identifiers,vm:{markers:vmMarkers,count:0}}
    };
  }

  window.QyrexBrowserAnalyzer={analyze,cleanSource,staticDumpers,foldPureCalls,detectProvider};
})();
