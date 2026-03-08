// library/materials.js
import * as THREE from 'three';

// --- 1. RAW NOISE GENERATOR ---
function createWhiteNoise(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    for (let i = 0; i < imgData.data.length; i += 4) {
        const val = Math.random() * 255;
        imgData.data[i] = val; imgData.data[i+1] = val; imgData.data[i+2] = val; imgData.data[i+3] = 255;
    }
    ctx.putImageData(imgData, 0, 0);
    return canvas;
}

// --- 2. FRACTAL NOISE GENERATOR ---
function createFractalNoise(size, startingResolution) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    ctx.globalCompositeOperation = 'overlay'; 
    ctx.imageSmoothingEnabled = true;

    let currentRes = startingResolution;
    let alpha = 0.6;

    for(let i = 0; i < 5; i++) {
        const noise = createWhiteNoise(currentRes);
        ctx.globalAlpha = alpha;
        ctx.drawImage(noise, 0, 0, size, size);
        currentRes *= 2; 
        alpha *= 0.6;
    }
    return canvas;
}

// --- 3. THE BLENDER "DISTANCE-TO-EDGE" VORONOI GENERATOR ---
// --- 3. THE BLENDER "DISTANCE-TO-EDGE" VORONOI GENERATOR ---
function createCellularLeather(size) {
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    const imgData = ctx.createImageData(size, size);
    const data = imgData.data;

    // MATCHED BLENDER SCALE: Increased from 18 to 56!
    const cells = 56; 
    const points = [];

    for(let i=0; i<cells; i++) {
        points[i] = [];
        for(let j=0; j<cells; j++) {
            points[i][j] = [Math.random(), Math.random()];
        }
    }

    for(let y=0; y<size; y++) {
        for(let x=0; x<size; x++) {
            let u = (x / size) * cells;
            let v = (y / size) * cells;

            // Faster, sharper noise warping
            const warpX = Math.sin(u * 2.0) * 0.5 + Math.sin(v * 3.0) * 0.5;
            const warpY = Math.cos(u * 3.0) * 0.5 + Math.cos(v * 2.0) * 0.5;
            u += warpX * 0.8;
            v += warpY * 0.8;

            const cu = Math.floor(u);
            const cv = Math.floor(v);

            let f1 = 1000.0; 
            let f2 = 1000.0; 

            for(let i=-1; i<=1; i++) {
                for(let j=-1; j<=1; j++) {
                    let neighborU = (cu + i) % cells;
                    let neighborV = (cv + j) % cells;
                    if(neighborU < 0) neighborU += cells;
                    if(neighborV < 0) neighborV += cells;

                    const pt = points[neighborU][neighborV];
                    const dx = (cu + i + pt[0]) - u;
                    const dy = (cv + j + pt[1]) - v;
                    const dist = Math.sqrt(dx*dx + dy*dy);

                    if(dist < f1) {
                        f2 = f1;
                        f1 = dist;
                    } else if(dist < f2) {
                        f2 = dist;
                    }
                }
            }

            // CRUNCH THE CONTRAST: This mimics your tight Color Ramp!
            // It makes the plates flat and the cracks very thin and dark.
            let edgeDist = f2 - f1;
            edgeDist = Math.min(1.0, edgeDist * 4.0); 

            // Add microscopic noise to the surface of the leather plates
            const microNoise = (Math.random() * 0.15) - 0.075;
            edgeDist = Math.max(0, Math.min(1, edgeDist + microNoise));

            const val = Math.floor(edgeDist * 255);
            const index = (y * size + x) * 4;
            data[index] = val;     
            data[index+1] = val;   
            data[index+2] = val;   
            data[index+3] = 255;   
        }
    }
    ctx.putImageData(imgData, 0, 0);
    
    // Broad, soft rolling folds
    const macroFolds = createFractalNoise(size, 4);
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.5;
    ctx.drawImage(macroFolds, 0, 0, size, size);

    return canvas;
}

// --- 4. MASTER TEXTURE BUILDER ---
function createAdvancedTexture(type) {
    const size = 1024;
    const canvas = document.createElement('canvas');
    canvas.width = size; canvas.height = size;
    const ctx = canvas.getContext('2d');
    
    ctx.fillStyle = '#808080';
    ctx.fillRect(0, 0, size, size);
    
    if (type === 'brushed') {
        const clouds = createFractalNoise(size, 16);
        ctx.globalAlpha = 0.4;
        ctx.drawImage(clouds, 0, 0, size, size);
        
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'overlay';
        for(let i = 0; i < 15000; i++) {
            const shade = Math.random() > 0.5 ? 255 : 0;
            ctx.fillStyle = `rgba(${shade},${shade},${shade},${Math.random() * 0.05})`;
            ctx.fillRect(0, Math.random() * size, size, Math.random() * 1.5);
        }
    } 
    else if (type === 'leather') {
        // CALL THE NEW VORONOI GENERATOR!
        const leatherCells = createCellularLeather(size);
        ctx.globalAlpha = 1.0;
        ctx.drawImage(leatherCells, 0, 0, size, size);
    } 
    else if (type === 'grunge') {
        const grungeBase = createFractalNoise(size, 4);
        ctx.globalAlpha = 1.0;
        ctx.globalCompositeOperation = 'overlay';
        ctx.drawImage(grungeBase, 0, 0, size, size);
        ctx.drawImage(grungeBase, 0, 0, size, size);
        
        ctx.globalCompositeOperation = 'multiply';
        ctx.globalAlpha = 0.4;
        for(let i = 0; i < 3000; i++) {
            ctx.fillStyle = '#000000';
            ctx.beginPath();
            ctx.arc(Math.random() * size, Math.random() * size, Math.random() * 6, 0, Math.PI * 2);
            ctx.fill();
        }
    }
    
    const tex = new THREE.CanvasTexture(canvas);
    tex.wrapS = THREE.RepeatWrapping;
    tex.wrapT = THREE.RepeatWrapping;
    tex.colorSpace = THREE.NoColorSpace; 
    
    if (type === 'brushed') { 
        tex.repeat.set(2, 6); 
    } else if (type === 'leather') {
        // FIXED: Uniform scaling so the Voronoi cells stay round!
        tex.repeat.set(3, 3); 
    } else { 
        tex.repeat.set(4, 4); 
    }
    
    return tex;
}

const texBrushed = createAdvancedTexture('brushed');
const texLeather = createAdvancedTexture('leather');
const texGrunge = createAdvancedTexture('grunge');

// --- 5. MATERIAL DEFINITIONS ---
export const materials = {
    newSteel: { name: 'New Steel', color: 0x999999, roughness: 0.4, metalness: 1.0, preview: '#999999', bumpMap: texBrushed, roughnessMap: texBrushed, bumpScale: 0.0008 },
    newDarkSteel: { name: 'New Dark Steel', color: 0x333333, roughness: 0.45, metalness: 1.0, preview: '#333333', bumpMap: texBrushed, roughnessMap: texBrushed, bumpScale: 0.0008 },
    
    oldSteel: { name: 'Old Steel', color: 0x777777, roughness: 0.7, metalness: 0.8, preview: '#777777', bumpMap: texGrunge, roughnessMap: texGrunge, bumpScale: 0.005 },
    oldDarkSteel: { name: 'Old Dark Steel', color: 0x222222, roughness: 0.8, metalness: 0.8, preview: '#222222', bumpMap: texGrunge, roughnessMap: texGrunge, bumpScale: 0.008 },
    
    polishedBronze: { name: 'Polished Bronze', color: 0x9e734c, roughness: 0.3, metalness: 1.0, preview: '#9e734c', bumpMap: texBrushed, roughnessMap: texBrushed, bumpScale: 0.0005 },
    ancientBronze: { name: 'Ancient Bronze', color: 0x6e624e, roughness: 0.85, metalness: 0.8, preview: '#6e624e', bumpMap: texGrunge, roughnessMap: texGrunge, bumpScale: 0.01 },
    shinyGold: { name: 'Shiny Gold', color: 0xc6af47, roughness: 0.2, metalness: 1.0, preview: '#c6af47', bumpMap: texBrushed, roughnessMap: texBrushed, bumpScale: 0.0002 },

    // Notice the massive Bump Scale increase specifically for the Leather to get those deep cracks!
    brownLeather: { name: 'Brown Leather', color: 0x4a3528, roughness: 0.95, metalness: 0.05, preview: '#4a3528', bumpMap: texLeather, bumpScale: 0.012 },
    blackLeather: { name: 'Black Leather', color: 0x161616, roughness: 0.95, metalness: 0.05, preview: '#161616', bumpMap: texLeather, bumpScale: 0.012 }
};