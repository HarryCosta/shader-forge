const GLSL_POLES = `
    // --- POLES NODE GROUP ---
    
    // Returns the distorted geographic distance from the equator
    float getPoleDistance(vec2 vUv, vec2 st, float poleDistort) {
        float distToEquator = abs(vUv.y - 0.5) * 2.0; 
        
        // Use the base noise function (fbm) to warp the pole lines
        float macroIce = (fbm(st * 4.0) - 0.5) * poleDistort;
        float microIce = (fbm(st * 12.0) - 0.5) * (poleDistort * 0.2);
        
        return distToEquator + macroIce + microIce;
    }
`;