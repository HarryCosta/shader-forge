# ShaderForge ⚔️ 🗺️

**ShaderForge** is a browser-based, dual-engine WebGL procedural generation suite. It features a custom-built GUI and two distinct tools: **Cartagraphia** (a physics-based fantasy map generator) and **Lux** (an advanced particulate and energy shader engine). 

Built entirely with vanilla JavaScript and raw WebGL/GLSL, ShaderForge performs complex mathematical generation, rendering, and media capture directly on the GPU without relying on heavy 3D frameworks.

🚀 **Live Demo:** [Play ShaderForge Here](https://harrycosta.github.io/shader-forge/)

---

## 🗺️ Cartagraphia | Procedural Map Engine
A highly optimized, hardware-accelerated fantasy map generator that uses layered Fractal Brownian Motion (fBM) and Voronoi noise to sculpt terrain in real-time.

**Key Features:**
* **Dynamic Tectonics:** Sculpt up to 5 distinct continents with adjustable coordinates and scales.
* **Complex Biomes:** Procedurally calculate shorelines, deserts, ice caps, and inland vegetation based on elevation and equatorial proximity.
* **Hydrology & Political Regions:** Generate complex river systems and fully colored, voronoi-based kingdom territories (complete with a procedural name generator).
* **Post-Processing:** Real-time bilateral edge-preserving blur and organic film grain.
* **Export:** Export maps as high-res PNGs or save the raw generation parameters locally via JSON.

## ✨ Lux | Particulate Shader Engine
A visually stunning energy simulator that allows users to design, tweak, and catalog dynamic magic spells and particle effects.

**Key Features:**
* **Custom "Evocations":** Manipulate shape, scale, pulse, turbulence (worble), electrical arcs, and ember density.
* **The Grimoire (Local Save DB):** Save and load custom spell configurations to your browser's local storage. Includes 5 pre-loaded starter presets (Basic Flame, Fire Shield, Light Orb, Charm Aura, and Void Portal).
* **Media Capture:** Native, browser-based 60FPS `.webm` video recording to capture 3-second seamless loops of your creations.

---

## 🛠️ Technical Highlights & UI

* **Raw WebGL & GLSL:** Custom fragment and vertex shaders. No Three.js or external rendering libraries were used.
* **Advanced Color Management:** Integrated [Pickr](https://github.com/Simonwep/pickr) for professional-grade HSLA/RGBA/HEX color selection with live WebGL updating.
* **Fully Responsive & Mobile Ready:** Custom CSS media queries detect device orientation (portrait vs landscape), automatically converting the desktop sidebar into a touchscreen-friendly bottom sheet.
* **Multi-Touch Support:** Full canvas support for single-finger panning and two-finger pinch-to-zoom on mobile devices.
* **State Management:** Complete JSON-based state serialization for importing, exporting, and saving projects across both tools.

---

## 💻 Running Locally

Because ShaderForge uses the ES6 `fetch` API to load default JSON configurations and textures, it cannot be run by simply double-clicking the `index.html` file (due to standard browser CORS security policies). 

To run locally:
1. Clone the repository: `git clone https://github.com/harrycosta/shader-forge.git`
2. Open the folder in your preferred code editor (e.g., VS Code).
3. Start a local development server (e.g., the "Live Server" extension in VS Code, or `python -m http.server`).
4. Navigate to the provided local host address (usually `http://127.0.0.1:5500/index.html`).

---

## 📜 License
This project is open-source and available under the MIT License. Feel free to fork, experiment, and generate your own worlds!
