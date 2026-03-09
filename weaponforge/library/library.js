// library/library.js
// --- THE 3D BLUEPRINTS ---

export const library = {
    blades: {
        blade1: { model: 'assets/sword/blade1.glb', widthRef: 50, heightRef: 380, name: 'Standard' },
        blade2: { model: 'assets/sword/blade2.glb', widthRef: 60, heightRef: 380, name: 'Heavy' }
    },
    guards: {
        guard1: { model: 'assets/sword/guard1.glb', widthRef: 140, heightRef: 35, name: 'Standard' },
        guard2: { model: 'assets/sword/guard2.glb', widthRef: 150, heightRef: 45, name: 'Curved' }
    },
    grips: {
        grip1: { model: 'assets/sword/grip1.glb', widthRef: 30, heightRef: 100, name: 'Standard' },
        grip2: { model: 'assets/sword/grip2.glb', widthRef: 35, heightRef: 110, name: 'Ergo Wrap' }
    },
    pommels: {
        pommel1: { model: 'assets/sword/pommel1.glb', widthRef: 45, name: 'Round' },
        pommel2: { model: 'assets/sword/pommel2.glb', widthRef: 50, name: 'Heavy' }
    }
};