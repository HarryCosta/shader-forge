const GLSL_RIVERS = `
    // --- ORGANIC RIVERS (Optimized) ---
    float getRiverCreases(vec2 p, float seed) {
        // Generate the main river shape using the full fbm
        float base = fbm(p + vec2(seed, -seed));
        
        // abs() folds the waves into sharp, V-shaped valleys
        float valleys = abs(base - 0.5) * 2.0;
        
        // Add micro-detail
        float detail = (noise(vec3(p * 4.0, seed * 0.1)) - 0.5) * 0.5;
        
        return valleys + (detail * valleys);
    }
`;