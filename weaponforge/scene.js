import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { RGBELoader } from 'three/addons/loaders/RGBELoader.js';

import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { SSAOPass } from 'three/addons/postprocessing/SSAOPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js'; 
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

// --- 1. SETUP THREE.JS SCENE ---
const container = document.getElementById('canvas-container');
export const scene = new THREE.Scene();
scene.background = new THREE.Color('#0d1117'); 

export const camera = new THREE.PerspectiveCamera(45, container.clientWidth / container.clientHeight, 0.01, 10);
camera.position.set(0, 0.4, 2.0); 

export const renderer = new THREE.WebGLRenderer({ alpha: true, antialias: true });
renderer.setSize(container.clientWidth, container.clientHeight);
renderer.setPixelRatio(window.devicePixelRatio);
container.appendChild(renderer.domElement);

export const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.target.set(0, 0.4, 0); 
controls.mouseButtons = { LEFT: THREE.MOUSE.PAN, MIDDLE: THREE.MOUSE.DOLLY, RIGHT: THREE.MOUSE.ROTATE };
controls.update(); 

// --- SCENE LIGHTING & HDRI ---
const dirLight = new THREE.DirectionalLight(0xffffff, 2.0);
dirLight.position.set(5, 5, 5);
scene.add(dirLight);

new RGBELoader()
    .setPath('assets/') 
    .load('001.hdr', function (texture) {
        texture.mapping = THREE.EquirectangularReflectionMapping;
        scene.environment = texture; 
    });

// --- POST-PROCESSING STACK ---
export const composer = new EffectComposer(renderer);

const renderPass = new RenderPass(scene, camera);
composer.addPass(renderPass);

const ssaoPass = new SSAOPass(scene, camera, container.clientWidth, container.clientHeight);
ssaoPass.kernelRadius = 32;
ssaoPass.minDistance = 0.001;
ssaoPass.maxDistance = 0.02;
composer.addPass(ssaoPass);

const bloomPass = new UnrealBloomPass(new THREE.Vector2(container.clientWidth, container.clientHeight), 0.01, 0.8, 0.9);
composer.addPass(bloomPass);

export const outlinePass = new OutlinePass(new THREE.Vector2(container.clientWidth, container.clientHeight), scene, camera);
outlinePass.edgeStrength = 2.5; 
outlinePass.edgeThickness = 1.0; 
outlinePass.visibleEdgeColor.set('#000000'); 
outlinePass.hiddenEdgeColor.set('#000000');
composer.addPass(outlinePass);

const outputPass = new OutputPass();
composer.addPass(outputPass);

// --- AUTO-RESIZE HANDLER ---
window.addEventListener('resize', () => {
    camera.aspect = container.clientWidth / container.clientHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(container.clientWidth, container.clientHeight);
    composer.setSize(container.clientWidth, container.clientHeight);
    ssaoPass.setSize(container.clientWidth, container.clientHeight);
});