const canvas = document.getElementById('luxCanvas');
const gl = canvas.getContext('webgl');

if (!gl) { alert("WebGL not supported."); }

function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader)); return null;
    }
    return shader;
}

const program = gl.createProgram();
gl.attachShader(program, createShader(gl, gl.VERTEX_SHADER, vsSource));
gl.attachShader(program, createShader(gl, gl.FRAGMENT_SHADER, fsSource));
gl.linkProgram(program);

const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1,1, -1,1, 1,-1, -1,-1]), gl.STATIC_DRAW);

const locs = {
    res: gl.getUniformLocation(program, "u_resolution"),
    time: gl.getUniformLocation(program, "u_time"),
    col_core: gl.getUniformLocation(program, "u_col_core"),
    col_aura: gl.getUniformLocation(program, "u_col_aura"),
    speed: gl.getUniformLocation(program, "u_speed"),
    scale: gl.getUniformLocation(program, "u_scale"),
    rotation: gl.getUniformLocation(program, "u_rotation"),
    turbulence: gl.getUniformLocation(program, "u_turbulence"),
    turb_scale: gl.getUniformLocation(program, "u_turb_scale"),
    turb_speed: gl.getUniformLocation(program, "u_turb_speed"),
    sparks: gl.getUniformLocation(program, "u_sparks"),
    pulse: gl.getUniformLocation(program, "u_pulse"),
    lightning: gl.getUniformLocation(program, "u_lightning"),
    arc_speed: gl.getUniformLocation(program, "u_arc_speed"),
    arc_scale: gl.getUniformLocation(program, "u_arc_scale"),
    shape: gl.getUniformLocation(program, "u_shape"),
    arc_style: gl.getUniformLocation(program, "u_arc_style"),
    turb_style: gl.getUniformLocation(program, "u_turb_style")
};

const state = {};

// --- BULLETPROOF HEX CONVERTER ---
function hexToRgb(hex) {
    const shorthandRegex = /^#?([a-f\d])([a-f\d])([a-f\d])$/i;
    hex = hex.replace(shorthandRegex, function(m, r, g, b) {
        return "#" + r + r + g + g + b + b;
    });
    
    if (!hex.startsWith('#')) hex = '#' + hex;

    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    
    if (isNaN(r) || isNaN(g) || isNaN(b)) return [1.0, 1.0, 1.0];
    return [r, g, b];
}

function rgbToHex(rgb) {
    const r = Math.round(rgb[0] * 255).toString(16).padStart(2, '0');
    const g = Math.round(rgb[1] * 255).toString(16).padStart(2, '0');
    const b = Math.round(rgb[2] * 255).toString(16).padStart(2, '0');
    return `#${r}${g}${b}`;
}

const inputs = {
    shape: document.getElementById('shape'),
    rotation: document.getElementById('rotation'),
    arc_style: document.getElementById('arc_style'),
    turb_style: document.getElementById('turb_style'),
    speed: document.getElementById('speed'),
    scale: document.getElementById('scale'),
    turbulence: document.getElementById('turbulence'),
    turb_scale: document.getElementById('turb_scale'),
    turb_speed: document.getElementById('turb_speed'), 
    sparks: document.getElementById('sparks'),
    pulse: document.getElementById('pulse'),           
    lightning: document.getElementById('lightning'),
    arc_speed: document.getElementById('arc_speed'),   
    arc_scale: document.getElementById('arc_scale')
};

function updateState(id, val) {
    if (id.startsWith('col_')) {
        state[id] = hexToRgb(val);
    } else if (['shape','arc_style','turb_style'].includes(id)) {
        state[id] = parseInt(val, 10);
    } else {
        state[id] = parseFloat(val);
    }
}

Object.keys(inputs).forEach(id => updateState(id, inputs[id].value));

Object.keys(inputs).forEach(id => {
    inputs[id].addEventListener('input', (e) => {
        updateState(id, e.target.value);
        const valDisplay = document.getElementById('val_' + id);
        const noFix = ['shape','arc_style','turb_style'];
        if (valDisplay && !id.startsWith('col_') && !noFix.includes(id)) {
            valDisplay.innerText = state[id].toFixed(2);
        }
    });
});

// --- INITIALIZE ADVANCED COLOR PICKERS ---
const colorPickers = {}; 

document.querySelectorAll('.custom-color-picker').forEach(el => {
    const id = el.id;
    const defaultColor = el.getAttribute('data-default');
    
    updateState(id, defaultColor);

    const pickr = Pickr.create({
        el: el,
        theme: 'nano',
        default: defaultColor,
        swatches: [
            '#ffffff', '#ff4d4d', '#4dff4d', '#4d4dff', '#ffff4d', '#ff4dff', '#4dffff', '#000000'
        ],
        components: {
            preview: true,
            opacity: false,
            hue: true,
            interaction: {
                hex: true,
                rgba: true,
                hsla: true,
                input: true
            }
        }
    });

    // 1. Live update the WebGL engine while dragging (Smooth, no UI redraws)
    pickr.on('change', (color) => {
        const hex = color.toHEXA().toString();
        updateState(id, hex);
    });

    // 2. Lock in the color to the UI button when mouse drag stops
    pickr.on('changestop', (source, instance) => {
        instance.applyColor(true); 
    });

    // 3. Lock in the color instantly if they click a swatch
    pickr.on('swatchselect', (color, instance) => {
        const hex = color.toHEXA().toString();
        updateState(id, hex);
        instance.applyColor(true);
    });

    // 4. Fallback: Lock in the color if they click completely off the menu
    pickr.on('hide', instance => {
        instance.applyColor(true);
    });

    colorPickers[id] = pickr;
});

// --- PRESET FETCHING SYSTEM ---
const STORAGE_KEY = 'lux_library';

const PRESETS = [
    { name: "Basic Flame", category: "Pyromancy", file: "presets/lux_spell-flame.json" },
    { name: "Fire Shield", category: "Pyromancy", file: "presets/lux_spell-fireshield.json" },
    { name: "Light Orb", category: "Radiance", file: "presets/lux_spell-light.json" },
    { name: "Charm Aura", category: "Arcane", file: "presets/lux_spell-charm.json" },
    { name: "Void Portal", category: "Void", file: "presets/lux_spell-portal.json" }
];

async function ensureDefaultsLoaded() {
    let libStr = localStorage.getItem(STORAGE_KEY);
    if (!libStr) {
        let lib = { categories: ["Pyromancy", "Radiance", "Arcane", "Void", "General"], spells: [] };
        
        for (let i = 0; i < PRESETS.length; i++) {
            try {
                const res = await fetch(PRESETS[i].file);
                if (res.ok) {
                    const params = await res.json();
                    lib.spells.push({
                        name: PRESETS[i].name,
                        category: PRESETS[i].category,
                        id: 1000 + i,
                        params: params
                    });
                }
            } catch(e) {
                console.error("Error loading preset: " + PRESETS[i].file, e);
            }
        }
        saveLibrary(lib);
    }
}

ensureDefaultsLoaded();

function getLibrary() {
    let lib = localStorage.getItem(STORAGE_KEY);
    return lib ? JSON.parse(lib) : {"categories": ["General"], "spells": []};
}

function saveLibrary(lib) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(lib));
}

// --- SPELLBOOK & INSCRIPTION SYSTEM ---
const modalOverlay = document.getElementById('spellbook-overlay');
const modalContent = document.getElementById('modal-content-area');
const modalTitle = document.getElementById('modal-title');
const closeBtn = document.getElementById('close-modal');

document.getElementById('toolbar-inscribe').addEventListener('click', () => {
    modalTitle.innerText = "Inscribe New Evocation";
    const lib = getLibrary();
    let categoryOptions = lib.categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');

    modalContent.innerHTML = `
        <div class="inscription-form">
            <div class="form-group">
                <label>Spell Name</label>
                <input type="text" id="new-spell-name" class="modal-input" placeholder="e.g. Solar Flare">
            </div>
            <div class="form-group">
                <label>Select Category</label>
                <div class="category-row">
                    <select id="category-select" class="select-input">${categoryOptions}</select>
                    <button id="add-cat-btn" class="modal-action-btn" style="padding: 8px 15px;">+</button>
                </div>
            </div>
            <button id="confirm-inscribe" class="modal-action-btn">Commit to Grimoire</button>
        </div>
    `;

    document.getElementById('add-cat-btn').addEventListener('click', () => {
        const newCat = prompt("New category name:");
        if (newCat && !lib.categories.includes(newCat)) {
            lib.categories.push(newCat);
            saveLibrary(lib);
            alert(`Category '${newCat}' created.`);
            const select = document.getElementById('category-select');
            const opt = document.createElement('option');
            opt.value = newCat; opt.innerText = newCat;
            select.appendChild(opt);
            select.value = newCat;
        }
    });

    document.getElementById('confirm-inscribe').addEventListener('click', () => {
        const name = document.getElementById('new-spell-name').value;
        const category = document.getElementById('category-select').value;
        if (!name) return alert("Please name your spell.");

        const library = getLibrary(); 
        library.spells.push({
            name, category, params: { ...state }, id: Date.now()
        });
        saveLibrary(library);
        modalOverlay.classList.add('overlay-hidden');
        alert(`${name} inscribed!`);
    });

    modalOverlay.classList.remove('overlay-hidden');
});

document.getElementById('toolbar-spellbook').addEventListener('click', openSpellbook);

function openSpellbook() {
    modalTitle.innerText = "Grimoire of Evocations";
    const lib = getLibrary();
    
    if (lib.spells.length === 0) {
        modalContent.innerHTML = `<div style="padding:40px; text-align:center; color:#8b949e;">Your grimoire is empty.</div>`;
    } else {
        const groups = lib.spells.reduce((acc, s) => {
            acc[s.category] = acc[s.category] || [];
            acc[s.category].push(s);
            return acc;
        }, {});

        modalContent.innerHTML = Object.keys(groups).map(cat => `
            <div class="spell-category">
                <div class="category-title">${cat}</div>
                ${groups[cat].map(s => `
                    <div class="spell-item">
                        <span class="spell-name">${s.name}</span>
                        <div class="spell-actions">
                            <button class="load-spell-btn" data-id="${s.id}">Cast</button>
                            <button class="delete-spell-btn" data-id="${s.id}" title="Erase Evocation">
                                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                    <polyline points="3 6 5 6 21 6"></polyline>
                                    <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2"></path>
                                    <line x1="10" y1="11" x2="10" y2="17"></line>
                                    <line x1="14" y1="11" x2="14" y2="17"></line>
                                </svg>
                            </button>
                        </div>
                    </div>
                `).join('')}
            </div>
        `).join('');

        document.querySelectorAll('.load-spell-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const spell = lib.spells.find(s => s.id == e.target.dataset.id);
                loadSpell(spell);
            });
        });

        document.querySelectorAll('.delete-spell-btn').forEach(btn => {
            btn.addEventListener('click', (e) => {
                const button = e.target.closest('.delete-spell-btn');
                const id = button.dataset.id;
                deleteSpell(id);
            });
        });
    }
    modalOverlay.classList.remove('overlay-hidden');
}

function deleteSpell(id) {
    if (!confirm("Are you sure you wish to erase this evocation from the grimoire?")) return;
    const lib = getLibrary();
    lib.spells = lib.spells.filter(s => s.id != id);
    saveLibrary(lib);
    openSpellbook(); 
}

closeBtn.addEventListener('click', () => modalOverlay.classList.add('overlay-hidden'));
modalOverlay.addEventListener('click', (e) => {
    if (e.target === modalOverlay) modalOverlay.classList.add('overlay-hidden');
});

function loadSpell(spell) {
    Object.keys(spell.params).forEach(key => {
        state[key] = spell.params[key];
        
        if (key.startsWith('col_')) {
            const hex = rgbToHex(spell.params[key]);
            if (colorPickers[key]) {
                colorPickers[key].setColor(hex);
            }
        } else if (inputs[key]) {
            inputs[key].value = spell.params[key];
            const display = document.getElementById('val_' + key);
            if (display) display.innerText = parseFloat(inputs[key].value).toFixed(2);
        }
    });
    modalOverlay.classList.add('overlay-hidden');
}

// --- SYSTEM OPERATIONS (JSON & CAPTURE) ---
const exportJsonBtn = document.getElementById('export-json-btn');
const importJsonBtn = document.getElementById('import-json-btn');
const importJsonInput = document.getElementById('import-json-input');
const exportVidBtn = document.getElementById('export-vid-btn');

exportJsonBtn.addEventListener('click', () => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(state, null, 2));
    const a = document.createElement('a');
    a.setAttribute("href", dataStr);
    a.setAttribute("download", "lux_spell.json");
    a.click();
});

importJsonBtn.addEventListener('click', () => importJsonInput.click());

importJsonInput.addEventListener('change', (e) => {
    const file = e.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
        try {
            const loadedState = JSON.parse(event.target.result);
            loadSpell({ params: loadedState });
        } catch (err) { 
            alert("Invalid spell manifest."); 
        }
    };
    reader.readAsText(file);
    e.target.value = ''; 
});

// Video Capture Logic
let mediaRecorder;
let recordedChunks = [];

exportVidBtn.addEventListener('click', () => {
    if (mediaRecorder && mediaRecorder.state === 'recording') return;
    
    exportVidBtn.innerText = "Recording... (3s)";
    exportVidBtn.style.background = "#ff6b6b";
    exportVidBtn.style.color = "white";
    exportVidBtn.style.borderColor = "#ff6b6b";

    const stream = canvas.captureStream(60); 
    mediaRecorder = new MediaRecorder(stream, { mimeType: 'video/webm' });
    recordedChunks = [];

    mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunks.push(e.data);
    };

    mediaRecorder.onstop = () => {
        const blob = new Blob(recordedChunks, { type: 'video/webm' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'lux_capture.webm';
        a.click();
        URL.revokeObjectURL(url);
        
        exportVidBtn.innerText = "Capture 3s Loop (.webm)";
        exportVidBtn.style.background = "";
        exportVidBtn.style.color = "";
        exportVidBtn.style.borderColor = "";
    };

    mediaRecorder.start();
    setTimeout(() => { mediaRecorder.stop(); }, 3000);
});

// --- RENDER LOOP ---
let startTime = Date.now();

function render() {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth; canvas.height = canvas.clientHeight;
    }
    gl.viewport(0, 0, canvas.width, canvas.height);
    gl.useProgram(program);
    const aPos = gl.getAttribLocation(program, 'aVertexPosition');
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    let t = (Date.now() - startTime) / 1000.0;
    gl.uniform2f(locs.res, canvas.width, canvas.height);
    gl.uniform1f(locs.time, t);
    gl.uniform3f(locs.col_core, state.col_core[0], state.col_core[1], state.col_core[2]);
    gl.uniform3f(locs.col_aura, state.col_aura[0], state.col_aura[1], state.col_aura[2]);
    gl.uniform1f(locs.speed, state.speed);
    gl.uniform1f(locs.scale, state.scale);
    gl.uniform1f(locs.rotation, state.rotation);
    gl.uniform1f(locs.turbulence, state.turbulence);
    gl.uniform1f(locs.turb_scale, state.turb_scale);
    gl.uniform1f(locs.turb_speed, state.turb_speed);
    gl.uniform1f(locs.sparks, state.sparks);
    gl.uniform1f(locs.pulse, state.pulse);
    gl.uniform1f(locs.lightning, state.lightning);
    gl.uniform1f(locs.arc_speed, state.arc_speed);
    gl.uniform1f(locs.arc_scale, state.arc_scale);
    gl.uniform1i(locs.shape, state.shape); 
    gl.uniform1i(locs.arc_style, state.arc_style);
    gl.uniform1i(locs.turb_style, state.turb_style);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    requestAnimationFrame(render);
}
render();