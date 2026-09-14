const express = require('express');
const cors = require('cors');

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(express.json({ limit: '50mb' })); 

// Generador Polimórfico tipo Luraph (lIllIIll)
const genLuraphID = (min = 8, max = 14) => {
    const len = Math.floor(Math.random() * (max - min + 1)) + min;
    let res = '';
    for(let i=0; i<len; i++) res += Math.random() > 0.5 ? 'l' : 'I';
    return res;
};

// Motor de Erradicación Numérica Avanzado (Convierte números en cálculos de longitud de strings)
const obfNum = (num) => {
    const syms = ["!", "@", "#", "$", "%", "^", "&", "*", "(", ")", "-", "_", "+", "="];
    let exp = [];
    let current = parseInt(num);
    
    if (current === 0) return `(#"")`;
    
    // Descomponer en sumas de longitudes de strings aleatorios
    while(current > 0) {
        let chunk = Math.min(current, Math.floor(Math.random() * 10) + 1);
        let str = "";
        for(let i=0; i<chunk; i++) str += syms[Math.floor(Math.random()*syms.length)];
        exp.push(`(#"${str}")`);
        current -= chunk;
    }
    return exp.join(' + ');
};

// Motor de Ofuscación Luau
const processLuauObfuscation = (source, opts) => {
    // 0. Fallback de seguridad si no llegan las opciones del frontend
    const options = opts || { numEradication: true, coroutine: false, antiSkid: true, junkCode: true };

    // 1. Cifrado básico (Base64 + XOR) con compresión hexadecimal
    // Soluciona el error de "too many constants" al ofuscar scripts grandes en Luau
    let b64 = Buffer.from(source).toString('base64');
    let xorKey = Math.floor(Math.random() * 255);
    
    let encryptedPayload = "";
    for(let i=0; i<b64.length; i++) {
        let enc = b64.charCodeAt(i) ^ xorKey;
        // Convertimos a escape hex soportado nativamente por Luau
        encryptedPayload += '\\x' + enc.toString(16).padStart(2, '0');
    }
    
    // 2. Generación de variables polimórficas del entorno
    const var_env = genLuraphID();
    const var_string = genLuraphID();
    const var_char = genLuraphID();
    const var_table = genLuraphID();
    const var_insert = genLuraphID();
    const var_b64dec = genLuraphID();
    const var_load = genLuraphID();
    const var_pcall = genLuraphID();
    const var_bxor = genLuraphID();
    
    const key_str = options.numEradication ? obfNum(xorKey) : xorKey;

    // 3. Inyección de Código Muerto (Junk Code)
    let junkCode = "";
    if (options.junkCode) {
        for(let i=0; i<3; i++) {
            junkCode += `local ${genLuraphID()} = function() return ${options.numEradication ? obfNum(Math.floor(Math.random()*50)) : Math.floor(Math.random()*50)} end;\n`;
        }
    }

    // 4. Bloque Anti-Skid Seguro (Evita congelar el juego con bucles infinitos)
    let antiSkid = "";
    if (options.antiSkid) {
        antiSkid = `
        local ${genLuraphID()} = ${var_pcall}(function()
            if not getgenv or not loadstring then
                error("QYREX ENGINE: Execution environment not supported (Executor Required).")
            end
        end)
        `;
    }

    const stateVar = genLuraphID();
    const obfState = (n) => options.numEradication ? obfNum(n) : n;

    // 5. Construcción de la Máquina de Estados (Control Flow Flattening)
    let template = `
local ${var_env} = getgenv and getgenv() or _G or shared;
local ${var_pcall} = pcall;
${antiSkid}
${junkCode}
local ${var_string} = string;
local ${var_char} = ${var_string}.char;
local ${var_table} = table;
local ${var_insert} = ${var_table}.insert;
local ${var_bxor} = bit32 and bit32.bxor or bit and bit.bxor;
local ${var_load} = loadstring or ${var_env}.loadstring;

if type(${var_load}) ~= "function" then return end

local function ${var_b64dec}(data)
    local b='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/'
    data = string.gsub(data, '[^'..b..'=]', '')
    return (data:gsub('.', function(x)
        if (x == '=') then return '' end
        local r,f='',(b:find(x)-1)
        for i=6,1,-1 do r=r..(f%2^i-f%2^(i-1)>0 and '1' or '0') end
        return r;
    end):gsub('%d%d%d?%d?%d?%d?%d?%d?', function(x)
        if (#x ~= 8) then return '' end
        local c=0
        for i=1,8 do c=c+(x:sub(i,i)=='1' and 2^(8-i) or 0) end
        return string.char(c)
    end))
end

local function execute_vm()
    local payload = "${encryptedPayload}";
    local dec_bytes = {};
    local ${stateVar} = ${obfState(1)};
    local k = ${key_str};
    
    while ${stateVar} <= ${obfState(3)} do
        if ${stateVar} == ${obfState(1)} then
            for i=1, #payload do
                ${var_insert}(dec_bytes, ${var_char}(${var_bxor}(payload:byte(i), k)))
            end
            ${stateVar} = ${obfState(2)};
        elseif ${stateVar} == ${obfState(2)} then
            local b64_str = ${var_table}.concat(dec_bytes);
            local final_script = ${var_b64dec}(b64_str);
            local s, func = ${var_pcall}(${var_load}, final_script);
            
            if s and type(func) == "function" then
                ${options.coroutine ? `coroutine.wrap(func)()` : `func()`};
            end
            ${stateVar} = ${obfState(4)};
        end
    end
end

${options.coroutine ? `coroutine.wrap(execute_vm)()` : `execute_vm()`};
`;

    // Eliminar posibles comentarios lua antes de minificar para evitar corrupción
    template = template.replace(/--.*$/gm, '');
    
    // Minificar eliminando espacios en blanco innecesarios
    template = template.replace(/\n\s+/g, '\n').replace(/^\s+/gm, '').trim();
    
    return template;
};

app.post('/api/obfuscate', (req, res) => {
    try {
        const { code, options } = req.body;

        if (!code || code.trim() === '') {
            return res.status(400).json({ error: 'No Luau script provided.' });
        }

        const obfuscatedLuau = processLuauObfuscation(code, options);

        res.json({
            success: true,
            obfuscatedCode: obfuscatedLuau,
            message: 'Luau script successfully heavily obfuscated.'
        });

    } catch (error) {
        console.error("[Qyrex Engine] Error:", error);
        res.status(500).json({ 
            success: false, 
            error: 'Server-side processing failed.',
            details: error.message 
        });
    }
});

app.listen(PORT, () => {
    console.log(`[QYREX LUAU ENGINE] Backend running on port ${PORT}`);
    console.log(`[QYREX LUAU ENGINE] Ready to encrypt exploit scripts.`);
});
