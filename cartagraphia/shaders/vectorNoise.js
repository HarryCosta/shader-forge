const GLSL_VECTOR_NOISE = `
    // --- VECTOR NOISE NODE GROUP (Optimized 3D) ---
    
    // 3D Hash function (Extremely lightweight pseudo-randomness)
    float hash(vec3 p) {
        p = fract(p * vec3(233.14, 113.14, 345.21));
        p += dot(p, p.zyx + 19.19);
        return fract(p.x * p.y * p.z);
    }

    // 3D Noise function (Slices through volume)
    float noise(vec3 p) {
        vec3 i = floor(p);
        vec3 f = fract(p);
        
        // OPTIMIZATION: Hardware-accelerated interpolation
        vec3 u = smoothstep(0.0, 1.0, f);

        // Interpolate across the 3D grid
        return mix(
            mix(
                mix(hash(i + vec3(0.0, 0.0, 0.0)), hash(i + vec3(1.0, 0.0, 0.0)), u.x),
                mix(hash(i + vec3(0.0, 1.0, 0.0)), hash(i + vec3(1.0, 1.0, 0.0)), u.x),
                u.y
            ),
            mix(
                mix(hash(i + vec3(0.0, 0.0, 1.0)), hash(i + vec3(1.0, 0.0, 1.0)), u.x),
                mix(hash(i + vec3(0.0, 1.0, 1.0)), hash(i + vec3(1.0, 1.0, 1.0)), u.x),
                u.y
            ),
            u.z
        );
    }

    // OPTIMIZATION: Pre-calculate the rotation matrix as a global constant
    // This stops the GPU from rebuilding it inside the loop millions of times.
    const mat2 m_rot = mat2(1.6, -1.2, 1.2, 1.6);

    // Fractal Brownian Motion
    float fbm(vec2 p) {
        float value = 0.0; 
        float amplitude = 0.48;
        
        // Inject the u_seed uniform into the Z-axis to slice smoothly
        vec3 p3 = vec3(p, u_seed * 0.05); 
        
        for (int i = 0; i < 8; i++) {
            value += amplitude * noise(p3);
            
            // Rotate the 2D plane using our pre-computed constant matrix
            p3.xy *= m_rot;
            
            // Slightly warp the seed dimension per octave for added complexity
            p3.z *= 1.2; 
            
            amplitude *= 0.48;
        }
        return value;
    }
`;