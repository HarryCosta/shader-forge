import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'; // NEW: The Blur Engine
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { library } from './library/library.js';
import { materials } from './library/materials.js';

// --- 1. SETUP THREE.JS SCENE ---
const container = document.getElementById('canvas-container');
const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1117'); 

const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 10);
camera.position.set(0, 0.4, 2.0); 

const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.4, 0); 
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.update(); 

// --- SCENE LIGHTING & HDRI ---
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

new RGBELoader()
    .setPath('assets/') // <-- REMOVE THE 'hdri/' FROM THIS LINE!
    .load('001.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture; 
    });

// --- NEW: POST-PROCESSING STACK ---
const composer = new EffectComposer(renderer);

// 1. Render the base scene
const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

// 2. Ambient Occlusion (AO) Pass
const ssaoPass = new SSAOPass(scene, camera, container.clientWidth, container.clientHeight);
ssaoPass.kernelRadius = 32;
ssaoPass.minDistance = 0.001;
ssaoPass.maxDistance = 0.02;
composer.addPass(ssaoPass);

// 3. Bloom Pass (This applies the physical blurring to our bright edge pixels)
// Parameters: resolution, strength (intensity of blur), radius (spread), threshold (what gets blurred)
const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.01, 0.8, 0.9);
composer.addPass(bloomPass);

// 4. Edge Outline Pass (Added after Bloom so the black outlines stay crisp!)
const outlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera);
outlinePass.edgeStrength = 2.5; 
outlinePass.edgeThickness = 1.0; 
outlinePass.visibleEdgeColor.set('#000000'); 
outlinePass.hiddenEdgeColor.set('#000000');
composer.addPass(outlinePass);

// 5. Output Pass
const outputPass = new OutputPass();
composer.addPass(outputPass);

window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
    ssaoPass.setSize(container.clientWidth, container.clientHeight);
});


// --- 2. THE 3D ASSEMBLY ENGINE ---
const loader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

const activeParts = { guard: null, blade: null, grip: null, pommel: null };
const currentMaterials = { guard: {}, blade: {}, grip: {}, pommel: {} }; 

function findSocket(parent, socketName) {
    let found = null;
    parent.traverse((child) => {
        if (child.name.toLowerCase().startsWith(socketName.toLowerCase())) found = child;
    });
    return found;
}

function extractMaterialSlots(partMesh, expectedPartName) {
    const slots = new Set();
    partMesh.traverse((child) => {
        if (child.isMesh && child.material && child.userData.partType === expectedPartName) {
            if (Array.isArray(child.material)) {
                child.material.forEach(m => slots.add(m.name));
            } else {
                slots.add(child.material.name);
            }
        }
    });
    return Array.from(slots);
}

function applyMaterial(partName, slotName, materialId) {
    if (!activeParts[partName]) return;
    const matData = materials[materialId];
    
    currentMaterials[partName][slotName] = materialId;

    activeParts[partName].traverse((child) => {
        if (child.isMesh && child.userData.partType === partName) {
            
            // --- 1. CLEAN MATERIAL COMPILER ---
            // No more hacking the Emissive channel! Just a standard PBR setup.
            const pbrMaterial = new THREE.MeshStandardMaterial({
                color: matData.color,
                roughness: matData.roughness,
                metalness: matData.metalness,
                bumpMap: matData.bumpMap || null,
                roughnessMap: matData.roughnessMap || null,
                bumpScale: matData.bumpScale || 0,
                name: slotName
            });

            // --- 2. BULLETPROOF SHADER INJECTION ---
            if (child.userData.curvatureMap) {
                pbrMaterial.onBeforeCompile = (shader) => {
                    
                    // A. Pass the texture directly to the GPU as a custom uniform
                    shader.uniforms.edgeMaskMap = { value: child.userData.curvatureMap };
                    
                    // B. Declare the uniform at the top of the fragment shader
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <common>',
                        `
                        #include <common>
                        uniform sampler2D edgeMaskMap;
                        `
                    );

                    // C. Inject the physical edge wear math!
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <roughnessmap_fragment>',
                        `
                        #include <roughnessmap_fragment>
                        
                        #ifdef USE_UV
                            // Safely read the custom map using standard UVs
                            float edgeMask = texture2D( edgeMaskMap, vUv ).r;
                            
                            // Force the edges to be highly polished
                            roughnessFactor = mix(roughnessFactor, 0.1, edgeMask);
                            
                            // Brighten the base metal color to simulate fresh scratches
                            diffuseColor.rgb = mix(diffuseColor.rgb, vec3(1.0), edgeMask * 0.4); 
                        #endif
                        `
                    );
                };
            }

            if (Array.isArray(child.material)) {
                for (let i = 0; i < child.material.length; i++) {
                    if (child.material[i].name === slotName) child.material[i] = pbrMaterial;
                }
            } else {
                if (child.material.name === slotName) child.material = pbrMaterial;
            }
        }
    });

    const thumb = document.getElementById(`thumb-tex-${partName}-${slotName}`);
    const nameLabel = document.getElementById(`name-tex-${partName}-${slotName}`);
    if(thumb && nameLabel) {
        thumb.style.backgroundColor = matData.preview;
        nameLabel.innerText = matData.name;
    }
}

function buildMaterialUI(partName, slots) {
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
        applyMaterial(partName, slot, defaultMatId);
    });
}

function loadPart(path, partName) {
    return new Promise((resolve) => {
        const curvePath = path.replace('.glb', '_curvature.png');
        
        // 1. Intercept the PNG texture load
        texLoader.load(curvePath, (loadedTex) => {
            const img = loadedTex.image;
            
            // 2. Create a hidden Canvas matching the image size
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            // 3. RUN THE BLUR PASS! 
            // Change this number to make the edges softer or sharper.
            const blurAmount = 1.5; 
            ctx.filter = `blur(${blurAmount}px)`;
            
            // Draw the image onto the canvas through the blur filter
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            // 4. Convert the blurred canvas back into a Three.js Texture
            const blurredTex = new THREE.CanvasTexture(canvas);
            blurredTex.flipY = false; 
            blurredTex.colorSpace = THREE.SRGBColorSpace;

            // 5. Load the GLB model and attach the blurred map
            loader.load(path, (gltf) => {
                gltf.scene.traverse(child => { 
                    child.userData.partType = partName; 
                    if (child.isMesh) {
                        child.userData.curvatureMap = blurredTex; 
                    }
                });
                resolve(gltf.scene);
            }, undefined, (error) => console.error(error));
            
        }, undefined, () => {
            // Safety fallback just in case a curvature map is missing
            loader.load(path, (gltf) => {
                gltf.scene.traverse(child => { child.userData.partType = partName; });
                resolve(gltf.scene);
            });
        });
    });
}

async function assembleWeapon(bladeId, guardId, gripId, pommelId) {
    if (activeParts.guard) scene.remove(activeParts.guard);

    activeParts.guard = await loadPart(library.guards[guardId].model, 'guard');
    scene.add(activeParts.guard);

    activeParts.blade = await loadPart(library.blades[bladeId].model, 'blade');
    const socketBlade = findSocket(activeParts.guard, 'socket_blade');
    if (socketBlade) socketBlade.add(activeParts.blade);

    activeParts.grip = await loadPart(library.grips[gripId].model, 'grip');
    const socketGrip = findSocket(activeParts.guard, 'socket_grip');
    if (socketGrip) socketGrip.add(activeParts.grip);

    activeParts.pommel = await loadPart(library.pommels[pommelId].model, 'pommel');
    const socketPommel = findSocket(activeParts.grip, 'socket_pommel');
    if (socketPommel) socketPommel.add(activeParts.pommel);

    buildMaterialUI('blade', extractMaterialSlots(activeParts.blade, 'blade'));
    buildMaterialUI('guard', extractMaterialSlots(activeParts.guard, 'guard'));
    buildMaterialUI('grip', extractMaterialSlots(activeParts.grip, 'grip'));
    buildMaterialUI('pommel', extractMaterialSlots(activeParts.pommel, 'pommel'));

    outlinePass.selectedObjects = [activeParts.guard];

    document.body.classList.add('panel-open');
}

// --- 3. UI CONTROLS & 3D SLIDERS ---
document.getElementById('btn-toggle-ui').addEventListener('click', () => {
    const wrapper = document.getElementById('ui-wrapper');
    document.body.classList.toggle('panel-open'); 
    wrapper.classList.toggle('open');
    const btn = document.getElementById('btn-toggle-ui');
    btn.innerText = wrapper.classList.contains('open') ? 'CLOSE FORGE' : 'OPEN FORGE';
    btn.style.color = wrapper.classList.contains('open') ? '#ffffff' : '#8b949e';
});

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

bind3DSlider('inp-blade-w', 'blade', 'x', library.blades.blade1.widthRef, 'val-blade-w');
bind3DSlider('inp-blade-h', 'blade', 'y', library.blades.blade1.heightRef, 'val-blade-h');
bind3DSlider('inp-guard-w', 'guard', 'x', library.guards.guard1.widthRef, 'val-guard-w');
bind3DSlider('inp-guard-h', 'guard', 'y', library.guards.guard1.heightRef, 'val-guard-h');
bind3DSlider('inp-grip-w', 'grip', 'x', library.grips.grip1.widthRef, 'val-grip-w');
bind3DSlider('inp-grip-h', 'grip', 'y', library.grips.grip1.heightRef, 'val-grip-h');
bind3DSlider('inp-pommel-size', 'pommel', 'uniform', library.pommels.pommel1.widthRef, 'val-pommel-size');

// --- 4. UNIVERSAL MODAL LOGIC ---
const modal = document.getElementById('tex-modal');
const modalGrid = document.getElementById('modal-tex-grid');
let modalTargetPart = null;
let modalTargetSlot = null; 

function openModal(mode, part, category = null, slot = null) {
    modalTargetPart = part;
    modalTargetSlot = slot;
    modalGrid.innerHTML = ''; 
    
    if (mode === 'texture') {
        document.getElementById('modal-title').innerText = 'SELECT MATERIAL';
        for (const key in materials) {
            const mat = materials[key];
            const div = document.createElement('div');
            div.className = 'grid-item';
            div.innerHTML = `
                <div class="grid-item-color" style="background-color: ${mat.preview};"></div>
                <div class="grid-item-label">${mat.name}</div>
            `;
            div.addEventListener('click', () => {
                applyMaterial(part, slot, key); 
                modal.classList.remove('active');
            });
            modalGrid.appendChild(div);
        }
    } else if (mode === 'shape') {
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
                
                await assembleWeapon(selection.blade, selection.guard, selection.grip, selection.pommel);
                
                document.querySelector(`.btn-shape[data-part="${part}"]`).setAttribute('data-active', key);
                document.getElementById(`name-shape-${part}`).innerText = p.name;
                modal.classList.remove('active');
            });
            modalGrid.appendChild(div);
        }
    }
    modal.classList.add('active');
}

document.querySelectorAll('.btn-shape').forEach(btn => btn.addEventListener('click', function() { openModal('shape', this.getAttribute('data-part'), this.getAttribute('data-category')); }));
document.getElementById('btn-close-modal').addEventListener('click', () => modal.classList.remove('active'));
modal.addEventListener('click', (e) => { if(e.target === modal) modal.classList.remove('active'); });

// --- 5. SWATCH POPOVER LOGIC ---
const swatchPopover = document.getElementById('swatch-popover');

function openSwatchMenu(event, part, slot) {
    swatchPopover.innerHTML = '';
    
    for (const key in materials) {
        const mat = materials[key];
        const div = document.createElement('div');
        div.className = 'swatch-item';
        div.style.backgroundColor = mat.preview;
        div.title = mat.name; 
        
        div.addEventListener('click', () => {
            applyMaterial(part, slot, key);
        });
        swatchPopover.appendChild(div);
    }
    
    const rect = event.currentTarget.getBoundingClientRect();
    swatchPopover.style.top = `${rect.bottom + 8}px`;
    swatchPopover.style.right = `${window.innerWidth - rect.right}px`; 
    
    swatchPopover.classList.add('active');
    event.stopPropagation();
}

window.addEventListener('click', (e) => {
    if (!swatchPopover.contains(e.target)) {
        swatchPopover.classList.remove('active');
    }
});

// Render Loop
function animate() {
    requestAnimationFrame(animate);
    controls.update();
    composer.render();
}
animate();

// Boot up
assembleWeapon('blade1', 'guard1', 'grip1', 'pommel1');