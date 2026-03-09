import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';

// --- 1. IMPORT OUR CUSTOM MODULES ---
import { scene, composer, outlinePass, controls } from './scene.js';
import { activeParts, currentMaterials, currentTexScales, currentBumpScales, currentTexRots, edgeState } from './state.js';
import { initUI, buildMaterialUI } from './ui.js';
import { library } from './library/library.js';
import { materials } from './library/materials.js';

// --- 2. LOADERS & GLOBAL TEXTURES ---
const loader = new GLTFLoader();
const texLoader = new THREE.TextureLoader();

const globalGrungeTex1 = texLoader.load('assets/textures/grunge/grunge01.png');
globalGrungeTex1.wrapS = THREE.RepeatWrapping;
globalGrungeTex1.wrapT = THREE.RepeatWrapping;
globalGrungeTex1.colorSpace = THREE.NoColorSpace;

const globalGrungeTex2 = texLoader.load('assets/textures/grunge/grunge02.png');
globalGrungeTex2.wrapS = THREE.RepeatWrapping;
globalGrungeTex2.wrapT = THREE.RepeatWrapping;
globalGrungeTex2.colorSpace = THREE.NoColorSpace;

// Set the default startup texture
edgeState.activeTex = globalGrungeTex1;

// --- 3. CORE ENGINE LOGIC ---
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
    const scale = currentTexScales[partName]; 
    const bumpScale = currentBumpScales[partName];
    const rotation = currentTexRots[partName] ? Math.PI / 2 : 0;

    activeParts[partName].traverse((child) => {
        if (child.isMesh && child.userData.partType === partName) {
            
            // --- CLEAN MATERIAL COMPILER ---
            const pbrMaterial = new THREE.MeshStandardMaterial({
                color: matData.color || 0xffffff,
                map: matData.map ? matData.map.clone() : null,
                normalMap: matData.normalMap ? matData.normalMap.clone() : null,
                roughnessMap: matData.roughnessMap ? matData.roughnessMap.clone() : null,
                metalnessMap: matData.metalnessMap ? matData.metalnessMap.clone() : null,
                
                roughness: matData.roughness !== undefined ? matData.roughness : 1.0,
                metalness: matData.metalness !== undefined ? matData.metalness : 1.0,
                name: slotName
            });

            const applyTexSettings = (tex) => {
                if (tex) {
                    tex.repeat.set(scale, scale);
                    tex.rotation = rotation;
                    tex.center.set(0.5, 0.5); 
                }
            };

            applyTexSettings(pbrMaterial.map);
            applyTexSettings(pbrMaterial.normalMap);
            applyTexSettings(pbrMaterial.roughnessMap);
            applyTexSettings(pbrMaterial.metalnessMap);

            if (pbrMaterial.normalMap) {
                pbrMaterial.normalScale.set(bumpScale, bumpScale);
            }

            // --- BULLETPROOF SHADER INJECTION ---
            if (child.userData.curvatureMap) {
                
                pbrMaterial.userData.shaderUniforms = {
                    edgeMaskMap: { value: child.userData.curvatureMap },
                    edgeGrungeMap: { value: edgeState.activeTex }, 
                    edgeColor: { value: new THREE.Color(edgeState.color) },
                    edgeStrength: { value: edgeState.strength },
                    edgeGrunge: { value: edgeState.grunge },
                    edgeGrungeScale: { value: edgeState.scale } 
                };

                pbrMaterial.onBeforeCompile = (shader) => {
                    shader.uniforms.edgeMaskMap = pbrMaterial.userData.shaderUniforms.edgeMaskMap;
                    shader.uniforms.edgeGrungeMap = pbrMaterial.userData.shaderUniforms.edgeGrungeMap;
                    shader.uniforms.edgeColor = pbrMaterial.userData.shaderUniforms.edgeColor;
                    shader.uniforms.edgeStrength = pbrMaterial.userData.shaderUniforms.edgeStrength;
                    shader.uniforms.edgeGrunge = pbrMaterial.userData.shaderUniforms.edgeGrunge;
                    shader.uniforms.edgeGrungeScale = pbrMaterial.userData.shaderUniforms.edgeGrungeScale;
                    
                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <common>',
                        `
                        #include <common>
                        varying vec2 vRawUv;
                        `
                    );
                    shader.vertexShader = shader.vertexShader.replace(
                        '#include <uv_vertex>',
                        `
                        #include <uv_vertex>
                        vRawUv = uv; 
                        `
                    );

                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <common>',
                        `
                        #include <common>
                        uniform sampler2D edgeMaskMap;
                        uniform sampler2D edgeGrungeMap; 
                        uniform vec3 edgeColor;
                        uniform float edgeStrength;
                        uniform float edgeGrunge;
                        uniform float edgeGrungeScale;
                        varying vec2 vRawUv;
                        `
                    );
                    
                    shader.fragmentShader = shader.fragmentShader.replace(
                        '#include <roughnessmap_fragment>',
                        `
                        #include <roughnessmap_fragment>
                        
                        float noiseVal = texture2D(edgeGrungeMap, vRawUv * edgeGrungeScale).r;
                        float sharpNoise = smoothstep(0.35, 0.65, noiseVal);
                        float grungeMask = mix(1.0, sharpNoise, edgeGrunge);
                        
                        float edgeMask = min(1.0, texture2D( edgeMaskMap, vRawUv ).r * 2.5) * grungeMask;
                        
                        roughnessFactor = mix(roughnessFactor, 0.0, edgeMask);
                        diffuseColor.rgb = mix(diffuseColor.rgb, edgeColor, edgeMask * edgeStrength); 
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

    // Update the UI thumbnail
    const thumb = document.getElementById(`thumb-tex-${partName}-${slotName}`);
    const nameLabel = document.getElementById(`name-tex-${partName}-${slotName}`);
    if(thumb && nameLabel) {
        thumb.style.backgroundColor = matData.preview;
        nameLabel.innerText = matData.name;
    }
}

function loadPart(path, partName) {
    return new Promise((resolve) => {
        const curvePath = path.replace('.glb', '_curvature.png');
        
        texLoader.load(curvePath, (loadedTex) => {
            const img = loadedTex.image;
            
            const canvas = document.createElement('canvas');
            canvas.width = img.width;
            canvas.height = img.height;
            const ctx = canvas.getContext('2d');
            
            const blurAmount = 1.5; 
            ctx.filter = `blur(${blurAmount}px)`;
            
            ctx.drawImage(img, 0, 0, img.width, img.height);
            
            const blurredTex = new THREE.CanvasTexture(canvas);
            blurredTex.flipY = false; 
            blurredTex.colorSpace = THREE.SRGBColorSpace;

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

    // buildMaterialUI is now imported from ui.js!
    buildMaterialUI('blade', extractMaterialSlots(activeParts.blade, 'blade'));
    buildMaterialUI('guard', extractMaterialSlots(activeParts.guard, 'guard'));
    buildMaterialUI('grip', extractMaterialSlots(activeParts.grip, 'grip'));
    buildMaterialUI('pommel', extractMaterialSlots(activeParts.pommel, 'pommel'));

    outlinePass.selectedObjects = [activeParts.guard];
    document.body.classList.add('panel-open');
}

function updateGlobalEdgeWear() {
    Object.values(activeParts).forEach(root => {
        if (!root) return;
        root.traverse((child) => {
            if (child.isMesh && child.material) {
                const mats = Array.isArray(child.material) ? child.material : [child.material];
                mats.forEach(mat => {
                    if (mat.userData && mat.userData.shaderUniforms) {
                        // Values pull cleanly from the edgeState imported from state.js!
                        mat.userData.shaderUniforms.edgeColor.value.set(edgeState.color);
                        mat.userData.shaderUniforms.edgeStrength.value = edgeState.strength;
                        mat.userData.shaderUniforms.edgeGrunge.value = edgeState.grunge;
                        mat.userData.shaderUniforms.edgeGrungeScale.value = edgeState.scale;
                        mat.userData.shaderUniforms.edgeGrungeMap.value = edgeState.activeTex; 
                    }
                });
            }
        });
    });
}

// --- 4. STARTUP SEQUENCE ---

// Pass the engine logic into the UI module so the buttons know what to trigger
initUI({
    applyMaterial,
    assembleWeapon,
    updateGlobalEdgeWear,
    globalGrungeTex1,
    globalGrungeTex2
});

function animate() {
    requestAnimationFrame(animate);
    controls.update(); // Keep the smooth camera damping active
    composer.render();
}
animate();

// Boot up!
assembleWeapon('blade1', 'guard1', 'grip1', 'pommel2').then(() => {
    document.querySelectorAll('input[type="range"]').forEach(slider => {
        slider.dispatchEvent(new Event('input'));
    });
    document.querySelectorAll('input[type="checkbox"]').forEach(box => {
        box.dispatchEvent(new Event('change'));
    });
});