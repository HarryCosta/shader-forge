const GLSL_POS = `
    // --- POS NODE GROUP (CONTINENTS) - Optimized ---
    float getContinentMask(vec2 st, vec2 pos, vec2 scale) {
        // Shift coordinates so 0,0 is the center
        vec2 centeredUv = st - vec2(0.5);
        vec2 localUv = (centeredUv - pos) / scale;
        
        // OPTIMIZATION: Avoid expensive length() / sqrt() calculations.
        // dot(v, v) gives us the squared distance, which is computationally practically free.
        float distSq = dot(localUv, localUv);
        
        // Because we are using squared distance, we square the old 0.4 threshold to 0.16.
        return smoothstep(0.16, 0.0, distSq);
    }
`;