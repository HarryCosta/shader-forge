// state.js
// --- THE BRAIN: GLOBAL APP STATE ---

// 1. 3D Mesh Trackers
export const activeParts = { guard: null, blade: null, grip: null, pommel: null };

// 2. Material Assignments (Pre-filled with your default config)
export const currentMaterials = { 
    guard: { 'guard-main': 'oldSteel', 'guard': 'oldSteel' }, 
    blade: { 'blade-main': 'newSteel', 'blade-accent': 'newSteel', 'blade': 'newSteel' }, 
    grip: { 'grip-main': 'oldDarkSteel', 'grip-accent': 'oldSteel', 'grip': 'oldDarkSteel' }, 
    pommel: { 'pommel-main': 'polishedBronze', 'pommel-accent': 'oldSteel', 'pommel': 'polishedBronze' } 
}; 

// 3. Texture Settings
export const currentTexScales = { guard: 2.0, blade: 7.5, grip: 1.5, pommel: 3.0 };
export const currentBumpScales = { guard: 1.5, blade: 0.2, grip: 2.0, pommel: 1.0 };
export const currentTexRots = { guard: false, blade: true, grip: false, pommel: false };

// 4. Global Edge Wear Settings
// We wrap these in an object so other files can safely update the values!
export const edgeState = {
    color: '#000000',
    strength: 1.00,
    grunge: 0.30, 
    scale: 4.0, 
    activeTex: null // We will pass the loaded Three.js texture into this from the main file
};