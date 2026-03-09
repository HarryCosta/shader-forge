import { activeParts, currentTexScales, currentBumpScales, currentTexRots, edgeState, currentMaterials } from './state.js';
import { materials } from './library/materials.js';
import { library } from './library/library.js';

let engine = {};

export function initUI(engineCallbacks) {
    engine = engineCallbacks;

    // --- 1. PANEL TOGGLE ---
    document.getElementById('btn-toggle-ui').addEventListener('click', () => {
        const wrapper = document.getElementById('ui-wrapper');
        document.body.classList.toggle('panel-open'); 
        wrapper.classList.toggle('open');
        const btn = document.getElementById('btn-toggle-ui');
        btn.innerText = wrapper.classList.contains('open') ? 'CLOSE FORGE' : 'OPEN FORGE';
        btn.style.color = wrapper.classList.contains('open') ? '#ffffff' : '#8b949e';
    });

    // --- 2. GLOBAL EDGE WEAR SLIDERS ---
    document.getElementById('inp-global-edge-color').addEventListener('input', (e) => {
        edgeState.color = e.target.value;
        document.getElementById('val-global-edge-color').innerText = edgeState.color.toUpperCase();
        engine.updateGlobalEdgeWear();
    });

    document.getElementById('inp-global-edge-str').addEventListener('input', (e) => {
        edgeState.strength = parseFloat(e.target.value);
        document.getElementById('val-global-edge-str').innerText = edgeState.strength.toFixed(2);
        engine.updateGlobalEdgeWear();
    });

    document.getElementById('inp-global-edge-grunge').addEventListener('input', (e) => {
        edgeState.grunge = parseFloat(e.target.value);
        document.getElementById('val-global-edge-grunge').innerText = edgeState.grunge.toFixed(2);
        engine.updateGlobalEdgeWear();
    });

    document.getElementById('inp-global-edge-tex').addEventListener('change', (e) => {
        edgeState.activeTex = e.target.value === '1' ? engine.globalGrungeTex1 : engine.globalGrungeTex2;
        engine.updateGlobalEdgeWear();
    });

    document.getElementById('inp-global-edge-scale').addEventListener('input', (e) => {
        edgeState.scale = parseFloat(e.target.value);
        document.getElementById('val-global-edge-scale').innerText = edgeState.scale.toFixed(1);
        engine.updateGlobalEdgeWear();
    });

    // --- 3. 3D & TEXTURE SLIDERS ---
    function bind3DSlider(inputId, partId, axis, defaultRef, labelId) {
        document.getElementById(inputId).addEventListener('input', function(e) {
            const val = e.target.value;
            document.getElementById(labelId).innerText = val;
            
            const root = activeParts[partId]; 
            if (root) {
                const scaleFactor = val / defaultRef;
                
                if (axis === 'uniform') root.scale.set(scaleFactor, scaleFactor, scaleFactor);
                else if (axis === 'x') root.scale.x = scaleFactor;
                else if (axis === 'y') root.scale.y = scaleFactor;
                
                root.traverse((child) => {
                    if (child.userData.partType === partId && child.name.toLowerCase().startsWith('socket')) {
                        const inverse = 1 / scaleFactor;
                        if (axis === 'uniform') child.scale.set(inverse, inverse, inverse);
                        else if (axis === 'x') child.scale.x = inverse;
                        else if (axis === 'y') child.scale.y = inverse;
                    }
                });
            }
        });
    }

    function bindTextureSlider(inputId, partId, labelId) {
        const slider = document.getElementById(inputId);
        if (!slider) return;
        
        slider.addEventListener('input', function(e) {
            const val = parseFloat(e.target.value);
            document.getElementById(labelId).innerText = val.toFixed(1);
            currentTexScales[partId] = val; 
            
            const root = activeParts[partId]; 
            if (root) {
                root.traverse((child) => {
                    if (child.isMesh && child.userData.partType === partId) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(mat => {
                            if (mat.map) mat.map.repeat.set(val, val);
                            if (mat.normalMap) mat.normalMap.repeat.set(val, val);
                            if (mat.roughnessMap) mat.roughnessMap.repeat.set(val, val);
                            if (mat.metalnessMap) mat.metalnessMap.repeat.set(val, val);
                        });
                    }
                });
            }
        });
    }

    function bindBumpSlider(inputId, partId, labelId) {
        const slider = document.getElementById(inputId);
        if (!slider) return;
        
        slider.addEventListener('input', function(e) {
            const val = parseFloat(e.target.value);
            document.getElementById(labelId).innerText = val.toFixed(1);
            currentBumpScales[partId] = val; 
            
            const root = activeParts[partId]; 
            if (root) {
                root.traverse((child) => {
                    if (child.isMesh && child.userData.partType === partId) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(mat => {
                            if (mat.normalMap) mat.normalScale.set(val, val);
                        });
                    }
                });
            }
        });
    }

    function bindTextureRotation(inputId, partId) {
        const checkbox = document.getElementById(inputId);
        if (!checkbox) return;
        
        checkbox.addEventListener('change', function(e) {
            const isRotated = e.target.checked;
            currentTexRots[partId] = isRotated;
            const rotValue = isRotated ? Math.PI / 2 : 0;
            
            const root = activeParts[partId]; 
            if (root) {
                root.traverse((child) => {
                    if (child.isMesh && child.userData.partType === partId) {
                        const mats = Array.isArray(child.material) ? child.material : [child.material];
                        mats.forEach(mat => {
                            const applyRot = (tex) => {
                                if(tex) {
                                    tex.rotation = rotValue;
                                    tex.center.set(0.5, 0.5);
                                }
                            };
                            applyRot(mat.map);
                            applyRot(mat.normalMap);
                            applyRot(mat.roughnessMap);
                            applyRot(mat.metalnessMap);
                        });
                    }
                });
            }
        });
    }

    // Hook up the new sliders to the engine
    bindTextureSlider('inp-blade-tex', 'blade', 'val-blade-tex');
    bindTextureSlider('inp-guard-tex', 'guard', 'val-guard-tex');
    bindTextureSlider('inp-grip-tex', 'grip', 'val-grip-tex');
    bindTextureSlider('inp-pommel-tex', 'pommel', 'val-pommel-tex');

    bindBumpSlider('inp-blade-bump', 'blade', 'val-blade-bump');
    bindBumpSlider('inp-guard-bump', 'guard', 'val-guard-bump');
    bindBumpSlider('inp-grip-bump', 'grip', 'val-grip-bump');
    bindBumpSlider('inp-pommel-bump', 'pommel', 'val-pommel-bump');

    bindTextureRotation('inp-blade-rot', 'blade');
    bindTextureRotation('inp-guard-rot', 'guard');
    bindTextureRotation('inp-grip-rot', 'grip');
    bindTextureRotation('inp-pommel-rot', 'pommel');

    bind3DSlider('inp-blade-w', 'blade', 'x', library.blades.blade1.widthRef, 'val-blade-w');
    bind3DSlider('inp-blade-h', 'blade', 'y', library.blades.blade1.heightRef, 'val-blade-h');
    bind3DSlider('inp-guard-w', 'guard', 'x', library.guards.guard1.widthRef, 'val-guard-w');
    bind3DSlider('inp-guard-h', 'guard', 'y', library.guards.guard1.heightRef, 'val-guard-h');
    bind3DSlider('inp-grip-w', 'grip', 'x', library.grips.grip1.widthRef, 'val-grip-w');
    bind3DSlider('inp-grip-h', 'grip', 'y', library.grips.grip1.heightRef, 'val-grip-h');
    bind3DSlider('inp-pommel-size', 'pommel', 'uniform', library.pommels.pommel1.widthRef, 'val-pommel-size');

    // --- 4. MODAL LOGIC SETUP ---
    document.querySelectorAll('.btn-shape').forEach(btn => {
        btn.addEventListener('click', function() { 
            openModal('shape', this.getAttribute('data-part'), this.getAttribute('data-category')); 
        });
    });
    document.getElementById('btn-close-modal').addEventListener('click', () => document.getElementById('tex-modal').classList.remove('active'));
    document.getElementById('tex-modal').addEventListener('click', (e) => { 
        if(e.target === document.getElementById('tex-modal')) document.getElementById('tex-modal').classList.remove('active'); 
    });

    window.addEventListener('click', (e) => {
        const swatchPopover = document.getElementById('swatch-popover');
        if (!swatchPopover.contains(e.target)) {
            swatchPopover.classList.remove('active');
        }
    });

    // --- 5. RANDOMIZE LOGIC ---
    document.getElementById('btn-randomize').addEventListener('click', async () => {
        // Helper to grab a random key from your libraries
        const getRandomKey = (obj) => {
            const keys = Object.keys(obj);
            return keys[Math.floor(Math.random() * keys.length)];
        };

        // 1. Pick Random Geometry
        const randBlade = getRandomKey(library.blades);
        const randGuard = getRandomKey(library.guards);
        const randGrip = getRandomKey(library.grips);
        const randPommel = getRandomKey(library.pommels);

        document.querySelector(`.btn-shape[data-part="blade"]`).setAttribute('data-active', randBlade);
        document.querySelector(`.btn-shape[data-part="guard"]`).setAttribute('data-active', randGuard);
        document.querySelector(`.btn-shape[data-part="grip"]`).setAttribute('data-active', randGrip);
        document.querySelector(`.btn-shape[data-part="pommel"]`).setAttribute('data-active', randPommel);

        document.getElementById('name-shape-blade').innerText = library.blades[randBlade].name;
        document.getElementById('name-shape-guard').innerText = library.guards[randGuard].name;
        document.getElementById('name-shape-grip').innerText = library.grips[randGrip].name;
        document.getElementById('name-shape-pommel').innerText = library.pommels[randPommel].name;

        // Force the engine to build the new shapes
        if (engine.assembleWeapon) await engine.assembleWeapon(randBlade, randGuard, randGrip, randPommel);

        // 2. Pick Random Materials for every active slot
        const parts = ['blade', 'guard', 'grip', 'pommel'];
        parts.forEach(part => {
            if(currentMaterials[part]) {
                Object.keys(currentMaterials[part]).forEach(slot => {
                    const randMat = getRandomKey(materials);
                    currentMaterials[part][slot] = randMat;
                    if(engine.applyMaterial) engine.applyMaterial(part, slot, randMat);
                });
            }
        });

        // 3. Randomize Sliders (and trigger DOM events to apply them to 3D automatically)
        const setSliderRandom = (id, min, max) => {
            const el = document.getElementById(id);
            if(el) {
                el.value = (Math.random() * (max - min) + min).toFixed(2);
                el.dispatchEvent(new Event('input')); 
            }
        };

        const setCheckboxRandom = (id) => {
            const el = document.getElementById(id);
            if(el) {
                el.checked = Math.random() > 0.5;
                el.dispatchEvent(new Event('change'));
            }
        };

        // Random Geometry Morphing (kept within sane limits so it doesn't break the sword)
        setSliderRandom('inp-blade-w', 30, 80);
        setSliderRandom('inp-blade-h', 200, 500);
        setSliderRandom('inp-guard-w', 80, 200);
        setSliderRandom('inp-guard-h', 15, 60);
        setSliderRandom('inp-grip-w', 20, 45);
        setSliderRandom('inp-grip-h', 60, 150);
        setSliderRandom('inp-pommel-size', 30, 80);

        // Random Texture Settings
        parts.forEach(part => {
            setSliderRandom(`inp-${part}-tex`, 1.0, 8.0);
            setSliderRandom(`inp-${part}-bump`, 0.0, 3.0);
            setCheckboxRandom(`inp-${part}-rot`);
        });

        // Random Global Edge Wear (Custom Shader overrides)
        const randomColor = '#' + Math.floor(Math.random()*16777215).toString(16).padStart(6, '0');
        const colorEl = document.getElementById('inp-global-edge-color');
        if(colorEl) {
            colorEl.value = randomColor;
            colorEl.dispatchEvent(new Event('input'));
        }
        
        setSliderRandom('inp-global-edge-str', 0.0, 2.0);
        setSliderRandom('inp-global-edge-grunge', 0.0, 1.0);
        setSliderRandom('inp-global-edge-scale', 1.0, 10.0);
        
        const texEl = document.getElementById('inp-global-edge-tex');
        if(texEl) {
            texEl.value = Math.random() > 0.5 ? '1' : '2';
            texEl.dispatchEvent(new Event('change'));
        }
    });
}

// --- 6. DOM BUILDERS & MENUS ---

export function buildMaterialUI(partName, slots) {
    const shapeBtn = document.querySelector(`.btn-shape[data-part="${partName}"]`);
    const styleRow = shapeBtn.closest('.style-row');
    
    styleRow.querySelectorAll('.mat-dynamic').forEach(el => el.remove());
    
    const oldMatGroup = styleRow.querySelector('.texture-group:not(.mat-dynamic):not(:first-child)');
    if (oldMatGroup) oldMatGroup.style.display = 'none';

    slots.forEach(slot => {
        const defaultMatId = currentMaterials[partName][slot] || 'newSteel';
        
        const div = document.createElement('div');
        div.className = 'texture-group mat-dynamic';
        
        let cleanLabel = slot.split('-').pop();
        cleanLabel = cleanLabel.charAt(0).toUpperCase() + cleanLabel.slice(1);
        if (!cleanLabel || cleanLabel === "") cleanLabel = "Material";

        div.innerHTML = `
            <label>${cleanLabel}</label>
            <div class="preview-btn btn-texture" data-part="${partName}" data-slot="${slot}">
                <div class="tex-thumb" id="thumb-tex-${partName}-${slot}" style="background-color: ${materials[defaultMatId].preview};"></div>
                <span class="tex-name" id="name-tex-${partName}-${slot}">${materials[defaultMatId].name}</span>
            </div>
        `;
        
        div.querySelector('.btn-texture').addEventListener('click', function(e) {
            openSwatchMenu(e, partName, slot);
        });

        styleRow.appendChild(div);
        
        // Trigger the 3D application!
        if (engine.applyMaterial) engine.applyMaterial(partName, slot, defaultMatId);
    });
}

function openModal(mode, part, category = null, slot = null) {
    const modal = document.getElementById('tex-modal');
    const modalGrid = document.getElementById('modal-tex-grid');
    modalGrid.innerHTML = ''; 
    
    if (mode === 'shape') {
        document.getElementById('modal-title').innerText = 'SELECT SHAPE';
        const parts = library[category];
        for (const key in parts) {
            const p = parts[key];
            const div = document.createElement('div');
            div.className = 'grid-item';
            div.innerHTML = `<div class="grid-item-label" style="padding: 10px 0; font-size: 14px;">${p.name}</div>`;
            div.addEventListener('click', async () => {
                const selection = {
                    blade: document.querySelector('.btn-shape[data-part="blade"]').getAttribute('data-active') || 'blade1',
                    guard: document.querySelector('.btn-shape[data-part="guard"]').getAttribute('data-active') || 'guard1',
                    grip: document.querySelector('.btn-shape[data-part="grip"]').getAttribute('data-active') || 'grip1',
                    pommel: document.querySelector('.btn-shape[data-part="pommel"]').getAttribute('data-active') || 'pommel1'
                };
                selection[part] = key;
                
                // Trigger the 3D assembly!
                if(engine.assembleWeapon) await engine.assembleWeapon(selection.blade, selection.guard, selection.grip, selection.pommel);
                
                document.querySelector(`.btn-shape[data-part="${part}"]`).setAttribute('data-active', key);
                document.getElementById(`name-shape-${part}`).innerText = p.name;
                modal.classList.remove('active');
            });
            modalGrid.appendChild(div);
        }
    }
    modal.classList.add('active');
}

function openSwatchMenu(event, part, slot) {
    const swatchPopover = document.getElementById('swatch-popover');
    swatchPopover.innerHTML = '';
    
    for (const key in materials) {
        const mat = materials[key];
        const div = document.createElement('div');
        div.className = 'swatch-item';
        div.style.backgroundColor = mat.preview;
        div.title = mat.name; 
        
        div.addEventListener('click', () => {
            if(engine.applyMaterial) engine.applyMaterial(part, slot, key);
        });
        swatchPopover.appendChild(div);
    }
    
    swatchPopover.classList.add('active');
    
    const rect = event.currentTarget.getBoundingClientRect();
    const popoverRect = swatchPopover.getBoundingClientRect();
    
    if (rect.bottom + popoverRect.height + 8 > window.innerHeight) {
        swatchPopover.style.top = `${rect.top - popoverRect.height - 8}px`;
    } else {
        swatchPopover.style.top = `${rect.bottom + 8}px`;
    }
    
    swatchPopover.style.right = `${window.innerWidth - rect.right}px`; 
    
    event.stopPropagation();
}