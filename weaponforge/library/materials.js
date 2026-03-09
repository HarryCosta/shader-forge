// library/materials.js
import * as THREE from 'three';

const texLoader = new THREE.TextureLoader();

// Helper function to easily load a full PBR texture set
function loadTextureSet(basePath, name, hasMetallic = true) {
    const loadTex = (type, isColor) => {
        const tex = texLoader.load(`${basePath}/${name}-${type}.png`);
        tex.wrapS = THREE.RepeatWrapping;
        tex.wrapT = THREE.RepeatWrapping;
        // Diffuse needs sRGB, math maps need NoColorSpace!
        tex.colorSpace = isColor ? THREE.SRGBColorSpace : THREE.NoColorSpace;
        tex.repeat.set(3, 3); // Adjust this number if the textures look too big/small on the models
        return tex;
    };

    const maps = {
        map: loadTex('diffuse', true),
        normalMap: loadTex('normal', false),
        roughnessMap: loadTex('roughness', false),
    };

    if (hasMetallic) maps.metalnessMap = loadTex('metallic', false);

    return maps;
}

// 1. Load your baked image sets from the new folders
const leather1 = loadTextureSet('assets/textures/leather/leather01', 'leather01', false);
const leather2 = loadTextureSet('assets/textures/leather/leather02', 'leather02', false);
const metal1 = loadTextureSet('assets/textures/Metal/metal01', 'metal01', true);
const metal2 = loadTextureSet('assets/textures/Metal/metal02', 'metal02', true);


// 2. Map them to your Forge materials!
export const materials = {
    // 0xffffff leaves the texture at its natural color. Darker hex codes tint it darker!
    newSteel: { name: 'New Steel', color: 0xffffff, ...metal1, preview: '#999999' },
    newDarkSteel: { name: 'New Dark Steel', color: 0x555555, ...metal1, preview: '#333333' },
    
    oldSteel: { name: 'Old Steel', color: 0xffffff, ...metal2, preview: '#777777' },
    oldDarkSteel: { name: 'Old Dark Steel', color: 0x444444, ...metal2, preview: '#222222' },
    
    // We can tint the base metal texture to fake Bronze and Gold!
    polishedBronze: { name: 'Polished Bronze', color: 0xffb37a, ...metal1, preview: '#9e734c' },
    ancientBronze: { name: 'Ancient Bronze', color: 0xffb37a, ...metal2, preview: '#6e624e' },
    shinyGold: { name: 'Shiny Gold', color: 0xffe066, ...metal1, preview: '#c6af47' },

    // Leathers (Hardcoded to 0 metalness since they have no metallic map)
    brownLeather: { name: 'Brown Leather', color: 0xffffff, ...leather1, metalness: 0.0, preview: '#4a3528' },
    blackLeather: { name: 'Black Leather', color: 0xffffff, ...leather2, metalness: 0.0, preview: '#161616' }
};