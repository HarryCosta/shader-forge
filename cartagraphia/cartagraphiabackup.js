const canvas = document.getElementById('mapCanvas');
const gl = canvas.getContext('webgl', { alpha: false });

if (!gl) { alert("WebGL not supported."); }

// --- WEBGL SETUP ---
function createShader(gl, type, source) {
    const shader = gl.createShader(type);
    gl.shaderSource(shader, source);
    gl.compileShader(shader);
    if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
        console.error(gl.getShaderInfoLog(shader)); return null;
    }
    return shader;
}

function initProgram(vs, fs) {
    const p = gl.createProgram();
    gl.attachShader(p, createShader(gl, gl.VERTEX_SHADER, vs));
    gl.attachShader(p, createShader(gl, gl.FRAGMENT_SHADER, fs));
    gl.linkProgram(p);
    return p;
}

const mapProgram = initProgram(mapVsSource, mapFsSource);
const postProgram = initProgram(postVsSource, postFsSource);

const posBuffer = gl.createBuffer();
gl.bindBuffer(gl.ARRAY_BUFFER, posBuffer);
gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([1,1, -1,1, 1,-1, -1,-1]), gl.STATIC_DRAW);

const mapLocs = {
    res: gl.getUniformLocation(mapProgram, "u_resolution"),
    zoom: gl.getUniformLocation(mapProgram, "u_zoom"),
    pan: gl.getUniformLocation(mapProgram, "u_pan"),
    seed: gl.getUniformLocation(mapProgram, "u_seed"),
    macro_scale: gl.getUniformLocation(mapProgram, "u_macro_scale"),
    macro_dist: gl.getUniformLocation(mapProgram, "u_macro_dist"),
    micro_scale: gl.getUniformLocation(mapProgram, "u_micro_scale"),
    micro_dist: gl.getUniformLocation(mapProgram, "u_micro_dist"),
    river_seed: gl.getUniformLocation(mapProgram, "u_river_seed"),
    river_scale: gl.getUniformLocation(mapProgram, "u_river_scale"),
    river_width: gl.getUniformLocation(mapProgram, "u_river_width"),
    active_continents: gl.getUniformLocation(mapProgram, "u_active_continents"),
    desert_spread: gl.getUniformLocation(mapProgram, "u_desert_spread"),
    p_pos: gl.getUniformLocation(mapProgram, "u_pole_pos"),
    p_dist: gl.getUniformLocation(mapProgram, "u_pole_distort"),
    snow_spread: gl.getUniformLocation(mapProgram, "u_snow_spread"),
    c1_pos: gl.getUniformLocation(mapProgram, "u_c1_pos"),
    c1_scale: gl.getUniformLocation(mapProgram, "u_c1_scale"),
    c2_pos: gl.getUniformLocation(mapProgram, "u_c2_pos"),
    c2_scale: gl.getUniformLocation(mapProgram, "u_c2_scale"),
    c3_pos: gl.getUniformLocation(mapProgram, "u_c3_pos"),
    c3_scale: gl.getUniformLocation(mapProgram, "u_c3_scale"),
    c4_pos: gl.getUniformLocation(mapProgram, "u_c4_pos"),
    c4_scale: gl.getUniformLocation(mapProgram, "u_c4_scale"),
    c5_pos: gl.getUniformLocation(mapProgram, "u_c5_pos"),
    c5_scale: gl.getUniformLocation(mapProgram, "u_c5_scale"),
    col_deepOcean: gl.getUniformLocation(mapProgram, "u_col_deepOcean"),
    col_shallowOcean: gl.getUniformLocation(mapProgram, "u_col_shallowOcean"),
    col_sand: gl.getUniformLocation(mapProgram, "u_col_sand"),
    col_desertLight: gl.getUniformLocation(mapProgram, "u_col_desertLight"),
    col_desertMid: gl.getUniformLocation(mapProgram, "u_col_desertMid"),
    col_desertDark: gl.getUniformLocation(mapProgram, "u_col_desertDark"),
    col_coast: gl.getUniformLocation(mapProgram, "u_col_coast"),
    col_inland: gl.getUniformLocation(mapProgram, "u_col_inland"),
    col_mountains: gl.getUniformLocation(mapProgram, "u_col_mountains"),
    col_iceLight: gl.getUniformLocation(mapProgram, "u_col_iceLight"),
    col_iceDark: gl.getUniformLocation(mapProgram, "u_col_iceDark"),
    show_regions: gl.getUniformLocation(mapProgram, "u_show_regions"),
    regions_on_poles: gl.getUniformLocation(mapProgram, "u_regions_on_poles"),
    hovered_region: gl.getUniformLocation(mapProgram, "u_hovered_region"),
    hovered_continent: gl.getUniformLocation(mapProgram, "u_hovered_continent"), // NEW
    region_points: gl.getUniformLocation(mapProgram, "u_region_points"),
    region_opacity: gl.getUniformLocation(mapProgram, "u_region_opacity"),
    region_jagged: gl.getUniformLocation(mapProgram, "u_region_jagged"),
    region_border: gl.getUniformLocation(mapProgram, "u_region_border")
};

const postLocs = {
    res: gl.getUniformLocation(postProgram, "u_resolution"),
    image: gl.getUniformLocation(postProgram, "u_image"),
    soften: gl.getUniformLocation(postProgram, "u_soften"),
    grain: gl.getUniformLocation(postProgram, "u_grain")
};

// --- KINGDOM GENERATION LOGIC ---
let showRegions = false;
let hoveredRegion = -1;
let hoveredContinent = 0; // NEW: Tracks mouse over UI panels

// NEW: Add Mouse Listeners to Continent Groups
for (let i = 1; i <= 5; i++) {
    const group = document.getElementById('group_landmass_' + i);
    if (group) {
        group.addEventListener('mouseenter', () => { hoveredContinent = i; });
        group.addEventListener('mouseleave', () => { hoveredContinent = 0; });
    }
}

const MAX_GLOBAL_REGIONS = 500;
const MAX_GPU_REGIONS = 200; 
const globalRegionPoints = new Float32Array(MAX_GLOBAL_REGIONS * 2);
const gpuRegionPoints = new Float32Array(MAX_GPU_REGIONS * 3);

const kingdomNames = [];

function mulberry32(a) {
    return function() {
      var t = a += 0x6D2B79F5;
      t = Math.imul(t ^ t >>> 15, t | 1);
      t ^= t + Math.imul(t ^ t >>> 7, t | 61);
      return ((t ^ t >>> 14) >>> 0) / 4294967296;
    }
}

function generateNames(seed) {
    kingdomNames.length = 0; 
    let rng = mulberry32(Math.floor(seed * 10000) + 88888); 
    
    let prefixes = typeof kingdomPrefixes !== 'undefined' ? kingdomPrefixes : ["King"];
    let suffixes = typeof kingdomSuffixes !== 'undefined' ? kingdomSuffixes : ["dom"];
    
    for(let i = 0; i < MAX_GLOBAL_REGIONS; i++) {
        let p = prefixes[Math.floor(rng() * prefixes.length)];
        let s = suffixes[Math.floor(rng() * suffixes.length)];
        
        let numerals = [" I", " II", " III", " IV", " V"];
        let num = rng() > 0.90 ? numerals[Math.floor(rng() * numerals.length)] : "";
        
        kingdomNames.push(p + s + num);
    }
}

function generateRegionPoints(seed, count) {
    count = count || 100; 
    let rng = mulberry32(Math.floor(seed * 10000) + 12345);
    
    let aspect = 1.77; 
    if (canvas.clientWidth && canvas.clientHeight) {
        aspect = canvas.clientWidth / canvas.clientHeight;
    }

    let rows = Math.max(1, Math.round(Math.sqrt(count / aspect)));
    let cols = Math.max(1, Math.ceil(count / rows));

    let mapWidth = 3.5;
    let mapHeight = 2.0;

    let cellW = mapWidth / cols;
    let cellH = mapHeight / rows;

    let startX = (aspect * 0.5) - (mapWidth * 0.5);
    let startY = 0.5 - (mapHeight * 0.5);
    
    for(let i = 0; i < MAX_GLOBAL_REGIONS; i++) {
        if (i < count) {
            let c = i % cols;
            let r = Math.floor(i / cols);

            let baseX = startX + (c * cellW) + (cellW * 0.5);
            let baseY = startY + (r * cellH) + (cellH * 0.5);

            globalRegionPoints[i*2]   = baseX + (rng() - 0.5) * cellW * 0.8;
            globalRegionPoints[i*2+1] = baseY + (rng() - 0.5) * cellH * 0.8;
        } else {
            globalRegionPoints[i*2] = 9999.0;
            globalRegionPoints[i*2+1] = 9999.0;
        }
    }
}


// --- UI BUTTON LOGIC ---
document.getElementById('btn_toggle_regions').addEventListener('click', () => {
    showRegions = !showRegions;
    const btn = document.getElementById('btn_toggle_regions');
    if(showRegions) {
        btn.classList.remove('btn-blue');
        btn.classList.add('btn-green');
        btn.innerText = 'Regions: ON';
    } else {
        btn.classList.add('btn-blue');
        btn.classList.remove('btn-green');
        btn.innerText = 'Regions: OFF';
        document.getElementById('tooltip').style.display = 'none';
        hoveredRegion = -1;
    }
});


// --- MOUSE CAMERA & GPU-READBACK ENGINE ---
let camZoom = 0.80;
let camPanX = 0.00;
let camPanY = 0.00;
let isDragging = false;
let lastX = 0;
let lastY = 0;
const tooltip = document.getElementById('tooltip');

function clampCamera() {
    camZoom = Math.max(0.8, Math.min(camZoom, 50.0));
    let maxPan = Math.max(0.0, 0.5 - (0.5 / camZoom)); 
    let margin = 0.1;
    maxPan += margin;
    camPanX = Math.max(-maxPan, Math.min(camPanX, maxPan));
    camPanY = Math.max(-maxPan, Math.min(camPanY, maxPan));
}

canvas.addEventListener('mousedown', (e) => {
    if (e.target !== canvas) return;
    isDragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
});

window.addEventListener('mouseup', () => { isDragging = false; });

window.addEventListener('mousemove', (e) => {
    if (isDragging) {
        let dx = e.clientX - lastX;
        let dy = e.clientY - lastY;
        lastX = e.clientX;
        lastY = e.clientY;

        camPanX -= (dx / canvas.width) / camZoom;
        camPanY += (dy / canvas.height) / camZoom;
        
        clampCamera();
    }

    if (showRegions) {
        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        let pixel = new Uint8Array(4);
        let pxX = Math.max(0, Math.min(Math.floor(e.clientX), canvas.width - 1));
        let pxY = Math.max(0, Math.min(Math.floor(canvas.height - e.clientY), canvas.height - 1));
        gl.readPixels(pxX, pxY, 1, 1, gl.RGBA, gl.UNSIGNED_BYTE, pixel);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        let alphaVal = pixel[3];
        
        if (alphaVal > 0 && alphaVal < 255) {
            let rIdBase = alphaVal - 1; 
            
            let possibleIDs = [];
            let activeCount = Math.floor(state.region_count || 100);

            for (let k = rIdBase; k < activeCount; k += 250) {
                possibleIDs.push(k);
            }

            let bestId = -1;
            if (possibleIDs.length === 1) {
                bestId = possibleIDs[0];
            } else if (possibleIDs.length > 1) {
                let aspect = canvas.width / canvas.height;
                let mouseUvX = e.clientX / canvas.width;
                let mouseUvY = 1.0 - (e.clientY / canvas.height); 
                let worldX = (mouseUvX - 0.5) / camZoom + 0.5 + camPanX;
                let worldY = (mouseUvY - 0.5) / camZoom + 0.5 + camPanY;
                let st_X = worldX * aspect;
                let st_Y = worldY;

                let minDist = Infinity;
                for (let id of possibleIDs) {
                    let dx = globalRegionPoints[id*2] - st_X;
                    let dy = globalRegionPoints[id*2+1] - st_Y;
                    let distSq = dx*dx + dy*dy;
                    if (distSq < minDist) {
                        minDist = distSq;
                        bestId = id;
                    }
                }
            }
            
            if (bestId !== -1 && bestId !== hoveredRegion) {
                hoveredRegion = bestId;
                tooltip.innerText = "Kingdom of " + kingdomNames[bestId];
            }
            
            tooltip.style.display = 'block';
            tooltip.style.left = (e.clientX + 15) + 'px';
            tooltip.style.top = (e.clientY + 15) + 'px';
        } else {
            hoveredRegion = -1;
            tooltip.style.display = 'none';
        }
    }
});

canvas.addEventListener('wheel', (e) => {
    if (e.target !== canvas) return;
    e.preventDefault();
    
    let mouseUvX = e.clientX / canvas.width;
    let mouseUvY = 1.0 - (e.clientY / canvas.height);
    
    let worldX_before = (mouseUvX - 0.5) / camZoom + 0.5 + camPanX;
    let worldY_before = (mouseUvY - 0.5) / camZoom + 0.5 + camPanY;

    let zoomFactor = e.deltaY < 0 ? 1.15 : 0.85;
    camZoom *= zoomFactor;

    let worldX_after = (mouseUvX - 0.5) / camZoom + 0.5 + camPanX;
    let worldY_after = (mouseUvY - 0.5) / camZoom + 0.5 + camPanY;

    camPanX += (worldX_before - worldX_after);
    camPanY += (worldY_before - worldY_after);
    
    clampCamera();
}, { passive: false });

document.getElementById('btn_reset_camera').addEventListener('click', () => {
    camZoom = 0.80;
    camPanX = 0.00;
    camPanY = 0.00;
});


// --- STATE CACHING & UI BINDING ---
const inputs = {
    active_continents: document.getElementById('active_continents'),
    regions_on_poles: document.getElementById('regions_on_poles'),
    region_seed: document.getElementById('region_seed'),
    name_seed: document.getElementById('name_seed'), 
    region_count: document.getElementById('region_count'),
    region_opacity: document.getElementById('region_opacity'),
    region_jagged: document.getElementById('region_jagged'),
    region_border: document.getElementById('region_border'),
    soften: document.getElementById('soften'),
    grain: document.getElementById('grain'),
    map_seed: document.getElementById('map_seed'),
    macro_scale: document.getElementById('macro_scale'),
    macro_dist: document.getElementById('macro_dist'),
    micro_scale: document.getElementById('micro_scale'),
    micro_dist: document.getElementById('micro_dist'),
    river_seed: document.getElementById('river_seed'),
    river_scale: document.getElementById('river_scale'),
    river_width: document.getElementById('river_width'),
    desert_spread: document.getElementById('desert_spread'),
    p_pos: document.getElementById('p_pos'),
    p_dist: document.getElementById('p_dist'),
    snow_spread: document.getElementById('snow_spread'), 
    c1_x: document.getElementById('c1_x'), c1_y: document.getElementById('c1_y'), 
    c1_sx: document.getElementById('c1_sx'), c1_sy: document.getElementById('c1_sy'),
    c2_x: document.getElementById('c2_x'), c2_y: document.getElementById('c2_y'), 
    c2_sx: document.getElementById('c2_sx'), c2_sy: document.getElementById('c2_sy'),
    c3_x: document.getElementById('c3_x'), c3_y: document.getElementById('c3_y'), 
    c3_sx: document.getElementById('c3_sx'), c3_sy: document.getElementById('c3_sy'),
    c4_x: document.getElementById('c4_x'), c4_y: document.getElementById('c4_y'), 
    c4_sx: document.getElementById('c4_sx'), c4_sy: document.getElementById('c4_sy'),
    c5_x: document.getElementById('c5_x'), c5_y: document.getElementById('c5_y'), 
    c5_sx: document.getElementById('c5_sx'), c5_sy: document.getElementById('c5_sy'),
    col_deepOcean: document.getElementById('col_deepOcean'),
    col_shallowOcean: document.getElementById('col_shallowOcean'),
    col_sand: document.getElementById('col_sand'),
    col_desertLight: document.getElementById('col_desertLight'),
    col_desertMid: document.getElementById('col_desertMid'),
    col_desertDark: document.getElementById('col_desertDark'),
    col_coast: document.getElementById('col_coast'),
    col_inland: document.getElementById('col_inland'),
    col_mountains: document.getElementById('col_mountains'),
    col_iceLight: document.getElementById('col_iceLight'),
    col_iceDark: document.getElementById('col_iceDark')
};

const state = {};

function hexToRgb(hex) {
    let r = parseInt(hex.slice(1, 3), 16) / 255;
    let g = parseInt(hex.slice(3, 5), 16) / 255;
    let b = parseInt(hex.slice(5, 7), 16) / 255;
    return [r, g, b];
}

function rgbToHex(rgb) {
    let r = Math.round(rgb[0] * 255);
    let g = Math.round(rgb[1] * 255);
    let b = Math.round(rgb[2] * 255);
    return "#" + (1 << 24 | r << 16 | g << 8 | b).toString(16).slice(1);
}

function updateState(id, val) {
    if (id.startsWith('col_')) {
        state[id] = hexToRgb(val);
    } else if (id === 'regions_on_poles') {
        state[id] = val;
    } else {
        state[id] = parseFloat(val);
    }
}

Object.keys(inputs).forEach(id => {
    if (inputs[id].type === 'checkbox') updateState(id, inputs[id].checked);
    else updateState(id, inputs[id].value);
});

// Run Initial Generators
setTimeout(() => {
    generateRegionPoints(state.region_seed, state.region_count);
    generateNames(state.name_seed || 1.0);
}, 50);

function initContinentVisibility() {
    let count = state.active_continents;
    document.getElementById('group_landmass_1').style.display = count >= 1 ? 'block' : 'none';
    document.getElementById('group_landmass_2').style.display = count >= 2 ? 'block' : 'none';
    document.getElementById('group_landmass_3').style.display = count >= 3 ? 'block' : 'none';
    document.getElementById('group_landmass_4').style.display = count >= 4 ? 'block' : 'none';
    document.getElementById('group_landmass_5').style.display = count >= 5 ? 'block' : 'none';
}
initContinentVisibility();

Object.keys(inputs).forEach(id => {
    const eventType = inputs[id].type === 'checkbox' ? 'change' : 'input';
    
    inputs[id].addEventListener(eventType, (e) => {
        updateState(id, inputs[id].type === 'checkbox' ? e.target.checked : e.target.value);
        
        const valDisplay = document.getElementById('val_' + id);
        if (valDisplay && !id.startsWith('col_')) {
            let dec = 2;
            if (id === 'river_width' || id === 'region_border') dec = 3;
            if (id === 'region_count' || id === 'active_continents' || id === 'region_seed' || id === 'name_seed') dec = 0;
            valDisplay.innerText = state[id].toFixed(dec);
        }

        if (id === 'region_seed' || id === 'region_count') {
            generateRegionPoints(state.region_seed, state.region_count);
        }
        
        if (id === 'name_seed') {
            generateNames(state.name_seed);
        }
        
        if (id === 'active_continents') {
            initContinentVisibility();
        }
    });
});


// --- IMPORT / EXPORT LOGIC ---
document.getElementById('btn_export').addEventListener('click', () => {
    const exportData = {
        state: state,
        camera: { zoom: camZoom, panX: camPanX, panY: camPanY }
    };
    
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(exportData, null, 2));
    const dlAnchorElem = document.createElement('a');
    dlAnchorElem.setAttribute("href", dataStr);
    dlAnchorElem.setAttribute("download", "fantasy_map_" + Math.floor(state.map_seed) + ".json");
    document.body.appendChild(dlAnchorElem);
    dlAnchorElem.click();
    dlAnchorElem.remove();
});

document.getElementById('btn_import').addEventListener('click', () => {
    document.getElementById('file_import').click();
});

function loadProjectData(importedData) {
    if (importedData.camera) {
        camZoom = importedData.camera.zoom;
        camPanX = importedData.camera.panX;
        camPanY = importedData.camera.panY;
        clampCamera(); 
    }

    if (importedData.state) {
        Object.keys(importedData.state).forEach(key => {
            if (key === 'region_scale') {
                state['region_count'] = 50; 
            } else if (key === 'river_valley' || key === 'river_abundance' || key === 'river_meander') {
                // Ignore old variables
            } else {
                state[key] = importedData.state[key];
            }
            
            const inputEl = document.getElementById(key === 'region_scale' ? 'region_count' : key);
            if (inputEl) {
                if (key.startsWith('col_')) {
                    inputEl.value = rgbToHex(state[key]);
                } else if (inputEl.type === 'checkbox') {
                    inputEl.checked = state[key];
                } else {
                    inputEl.value = state[key];
                    const valDisplay = document.getElementById('val_' + (key === 'region_scale' ? 'region_count' : key));
                    if (valDisplay) {
                        let dec = 2;
                        if (key === 'river_width' || key === 'region_border') dec = 3;
                        if (key === 'region_count' || key === 'active_continents' || key === 'region_seed' || key === 'name_seed') dec = 0;
                        valDisplay.innerText = state[key].toFixed(dec);
                    }
                }
            }
        });
        
        if (state.active_continents !== undefined) {
            initContinentVisibility();
        }
        
        if (importedData.state.region_seed !== undefined) {
            generateRegionPoints(importedData.state.region_seed, state.region_count);
        }
        
        if (importedData.state.name_seed !== undefined) {
            generateNames(importedData.state.name_seed);
        } else {
            generateNames(1.0); 
        }
    }
}

document.getElementById('file_import').addEventListener('change', (event) => {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const importedData = JSON.parse(e.target.result);
            loadProjectData(importedData);
        } catch (err) {
            alert("Error loading map file. Make sure it's a valid JSON map.");
            console.error(err);
        }
    };
    reader.readAsText(file);
    event.target.value = ""; 
});

let requestImageDownload = false;

document.getElementById('btn_export_img').addEventListener('click', () => {
    requestImageDownload = true;
});

// --- CLOUD DATABASE MANAGER (Simulated via AppBackend) ---
const modal = document.getElementById('projects-modal');
const listContainer = document.getElementById('projects-list');

document.getElementById('toolbar-save').addEventListener('click', () => {
    const user = typeof AppBackend !== 'undefined' ? AppBackend.getCurrentUser() : null;
    if (!user) {
        alert("You must be logged in to save projects. Please return to the Hub to log in.");
        return;
    }

    const mapName = prompt("Enter a name for this map:", "Fantasy Map " + Math.floor(state.map_seed));
    if (!mapName) return;

    const exportData = {
        name: mapName,
        date: new Date().toLocaleDateString(),
        state: state,
        camera: { zoom: camZoom, panX: camPanX, panY: camPanY }
    };

    const success = AppBackend.saveProject(exportData);
    
    if (success) {
        const btn = document.getElementById('toolbar-save');
        const originalText = btn.innerText;
        btn.innerText = "saved to cloud!";
        btn.style.color = "#8ab4f8";
        setTimeout(() => {
            btn.innerText = originalText;
            btn.style.color = "";
        }, 1500);
    }
});

document.getElementById('toolbar-projects').addEventListener('click', () => {
    const user = typeof AppBackend !== 'undefined' ? AppBackend.getCurrentUser() : null;
    if (!user) {
        alert("You must be logged in to view your projects.");
        return;
    }
    
    renderProjects();
    modal.style.display = 'flex';
});

document.getElementById('btn-close-modal').addEventListener('click', () => {
    modal.style.display = 'none';
});

function renderProjects() {
    let userProjects = AppBackend.getUserProjects(); 
    
    listContainer.innerHTML = '';
    
    if (userProjects.length === 0) {
        listContainer.innerHTML = '<p style="text-align:center; color:#8b949e;">No saved projects found. Click "save map" in the top bar to create one!</p>';
        return;
    }

    userProjects.forEach((proj, index) => {
        const el = document.createElement('div');
        el.className = 'project-item';
        el.innerHTML = `
            <div class="project-info">
                <h4>${proj.name}</h4>
                <p>Saved on: ${proj.date}</p>
            </div>
            <div class="project-actions">
                <button class="btn-outline load-btn" data-index="${index}">Load</button>
                <button class="btn-outline btn-delete delete-btn" data-index="${index}">Delete</button>
            </div>
        `;
        listContainer.appendChild(el);
    });

    document.querySelectorAll('.load-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            loadProjectData(userProjects[idx]);
            modal.style.display = 'none';
        });
    });

    document.querySelectorAll('.delete-btn').forEach(btn => {
        btn.addEventListener('click', (e) => {
            const idx = e.target.getAttribute('data-index');
            const mapToDelete = userProjects[idx].name;
            if(confirm("Are you sure you want to permanently delete '" + mapToDelete + "'?")) {
                AppBackend.deleteProject(mapToDelete);
                renderProjects(); 
            }
        });
    });
}

// --- FRAMEBUFFER SETUP ---
let targetTexture = null;
let fb = null;

function setupFBO(width, height) {
    if (!targetTexture) {
        targetTexture = gl.createTexture();
        fb = gl.createFramebuffer();
    }
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, width, height, 0, gl.RGBA, gl.UNSIGNED_BYTE, null);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, targetTexture, 0);
    gl.bindFramebuffer(gl.FRAMEBUFFER, null);
}

// --- RENDER LOOP ---
function render() {
    if (canvas.width !== canvas.clientWidth || canvas.height !== canvas.clientHeight) {
        canvas.width = canvas.clientWidth;
        canvas.height = canvas.clientHeight;
        setupFBO(canvas.width, canvas.height); 
    }

    let visibleRegions = [];
    let activeCount = Math.floor(state.region_count || 100);
    let aspect = canvas.width / canvas.height;
    
    let cX = (0.5 + camPanX) * aspect;
    let cY = 0.5 + camPanY;

    let halfViewW = (0.5 / camZoom) * aspect;
    let halfViewH = (0.5 / camZoom);
    let margin = 0.5; 

    let cMinX = cX - halfViewW - margin;
    let cMaxX = cX + halfViewW + margin;
    let cMinY = cY - halfViewH - margin;
    let cMaxY = cY + halfViewH + margin;

    for(let i=0; i<activeCount; i++) {
        let px = globalRegionPoints[i*2];
        let py = globalRegionPoints[i*2+1];
        
        if (px > cMinX && px < cMaxX && py > cMinY && py < cMaxY) {
            let distSq = (px - cX)*(px - cX) + (py - cY)*(py - cY);
            visibleRegions.push({ id: i, x: px, y: py, d: distSq });
        }
    }

    visibleRegions.sort((a, b) => a.d - b.d);
    let renderCount = Math.min(visibleRegions.length, MAX_GPU_REGIONS);

    for(let i=0; i<MAX_GPU_REGIONS; i++) {
        if (i < renderCount) {
            gpuRegionPoints[i*3 + 0] = visibleRegions[i].x;
            gpuRegionPoints[i*3 + 1] = visibleRegions[i].y;
            gpuRegionPoints[i*3 + 2] = visibleRegions[i].id; 
        } else {
            gpuRegionPoints[i*3 + 0] = 9999.0;
            gpuRegionPoints[i*3 + 1] = 9999.0;
            gpuRegionPoints[i*3 + 2] = -1.0; 
        }
    }

    // --- PASS 1: DRAW MAP TO FRAMEBUFFER ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(mapProgram);

    const aPosMap = gl.getAttribLocation(mapProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(aPosMap);
    gl.vertexAttribPointer(aPosMap, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(mapLocs.res, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(mapLocs.zoom, camZoom);
    gl.uniform2f(mapLocs.pan, camPanX, camPanY);

    gl.uniform1f(mapLocs.seed, state.map_seed);
    gl.uniform1f(mapLocs.macro_scale, state.macro_scale);
    gl.uniform1f(mapLocs.macro_dist, state.macro_dist);
    gl.uniform1f(mapLocs.micro_scale, state.micro_scale);
    gl.uniform1f(mapLocs.micro_dist, state.micro_dist);
    gl.uniform1f(mapLocs.river_seed, state.river_seed);
    gl.uniform1f(mapLocs.river_scale, state.river_scale);
    gl.uniform1f(mapLocs.river_width, state.river_width);
    
    gl.uniform1f(mapLocs.active_continents, state.active_continents);
    
    gl.uniform1f(mapLocs.desert_spread, state.desert_spread);
    gl.uniform1f(mapLocs.p_pos, state.p_pos);
    gl.uniform1f(mapLocs.p_dist, state.p_dist);
    gl.uniform1f(mapLocs.snow_spread, state.snow_spread); 
    
    gl.uniform2f(mapLocs.c1_pos, state.c1_x, state.c1_y);
    gl.uniform2f(mapLocs.c1_scale, state.c1_sx, state.c1_sy);
    gl.uniform2f(mapLocs.c2_pos, state.c2_x, state.c2_y);
    gl.uniform2f(mapLocs.c2_scale, state.c2_sx, state.c2_sy);
    gl.uniform2f(mapLocs.c3_pos, state.c3_x, state.c3_y);
    gl.uniform2f(mapLocs.c3_scale, state.c3_sx, state.c3_sy);
    gl.uniform2f(mapLocs.c4_pos, state.c4_x, state.c4_y);
    gl.uniform2f(mapLocs.c4_scale, state.c4_sx, state.c4_sy);
    gl.uniform2f(mapLocs.c5_pos, state.c5_x, state.c5_y);
    gl.uniform2f(mapLocs.c5_scale, state.c5_sx, state.c5_sy);

    gl.uniform3f(mapLocs.col_deepOcean, state.col_deepOcean[0], state.col_deepOcean[1], state.col_deepOcean[2]);
    gl.uniform3f(mapLocs.col_shallowOcean, state.col_shallowOcean[0], state.col_shallowOcean[1], state.col_shallowOcean[2]);
    gl.uniform3f(mapLocs.col_sand, state.col_sand[0], state.col_sand[1], state.col_sand[2]);
    gl.uniform3f(mapLocs.col_desertLight, state.col_desertLight[0], state.col_desertLight[1], state.col_desertLight[2]);
    gl.uniform3f(mapLocs.col_desertMid, state.col_desertMid[0], state.col_desertMid[1], state.col_desertMid[2]);
    gl.uniform3f(mapLocs.col_desertDark, state.col_desertDark[0], state.col_desertDark[1], state.col_desertDark[2]);
    gl.uniform3f(mapLocs.col_coast, state.col_coast[0], state.col_coast[1], state.col_coast[2]);
    gl.uniform3f(mapLocs.col_inland, state.col_inland[0], state.col_inland[1], state.col_inland[2]);
    gl.uniform3f(mapLocs.col_mountains, state.col_mountains[0], state.col_mountains[1], state.col_mountains[2]);
    gl.uniform3f(mapLocs.col_iceLight, state.col_iceLight[0], state.col_iceLight[1], state.col_iceLight[2]);
    gl.uniform3f(mapLocs.col_iceDark, state.col_iceDark[0], state.col_iceDark[1], state.col_iceDark[2]);

    gl.uniform1i(mapLocs.show_regions, showRegions ? 1 : 0);
    gl.uniform1i(mapLocs.regions_on_poles, state.regions_on_poles ? 1 : 0);
    gl.uniform1i(mapLocs.hovered_region, hoveredRegion);
    gl.uniform1i(mapLocs.hovered_continent, hoveredContinent); // NEW: Send hover state to GPU
    
    gl.uniform3fv(mapLocs.region_points, gpuRegionPoints);
    
    gl.uniform1f(mapLocs.region_opacity, state.region_opacity);
    gl.uniform1f(mapLocs.region_jagged, state.region_jagged);
    gl.uniform1f(mapLocs.region_border, state.region_border);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    // --- PASS 2: DRAW FILTERED IMAGE TO SCREEN ---
    gl.bindFramebuffer(gl.FRAMEBUFFER, null); 
    gl.viewport(0, 0, gl.canvas.width, gl.canvas.height);
    gl.useProgram(postProgram);

    const aPosPost = gl.getAttribLocation(postProgram, 'aVertexPosition');
    gl.enableVertexAttribArray(aPosPost);
    gl.vertexAttribPointer(aPosPost, 2, gl.FLOAT, false, 0, 0);

    gl.uniform2f(postLocs.res, gl.canvas.width, gl.canvas.height);
    gl.uniform1f(postLocs.soften, state.soften);
    gl.uniform1f(postLocs.grain, state.grain);

    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, targetTexture);
    gl.uniform1i(postLocs.image, 0);

    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);

    if (requestImageDownload) {
        const dataURL = canvas.toDataURL('image/png');
        const link = document.createElement('a');
        link.download = 'fantasy_map_' + Math.floor(state.map_seed) + '.png';
        link.href = dataURL;
        link.click();
        
        requestImageDownload = false; 
    }

    requestAnimationFrame(render);
}

render();