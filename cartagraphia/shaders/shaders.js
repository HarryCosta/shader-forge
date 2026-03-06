// --- SHADER 1: THE MAP GENERATOR ---
const mapVsSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vUv;
    void main() { 
        vUv = aVertexPosition.xy * 0.5 + 0.5;
        gl_Position = aVertexPosition; 
    }
`;

const mapFsSource = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 u_resolution;
    
    uniform float u_zoom;
    uniform vec2 u_pan;

    uniform float u_seed;
    uniform float u_macro_scale;
    uniform float u_macro_dist;
    uniform float u_micro_scale;
    uniform float u_micro_dist;
    uniform float u_river_seed;
    uniform float u_river_scale;
    uniform float u_river_width;
    
    uniform float u_active_continents;
    uniform float u_desert_spread;
    uniform float u_pole_pos;
    uniform float u_pole_distort;
    uniform float u_snow_spread; 
    
    uniform vec2 u_c1_pos; uniform vec2 u_c1_scale;
    uniform vec2 u_c2_pos; uniform vec2 u_c2_scale;
    uniform vec2 u_c3_pos; uniform vec2 u_c3_scale;
    uniform vec2 u_c4_pos; uniform vec2 u_c4_scale;
    uniform vec2 u_c5_pos; uniform vec2 u_c5_scale;

    uniform vec3 u_col_deepOcean;
    uniform vec3 u_col_shallowOcean;
    uniform vec3 u_col_sand;
    uniform vec3 u_col_desertLight;
    uniform vec3 u_col_desertMid;
    uniform vec3 u_col_desertDark;
    uniform vec3 u_col_coast;
    uniform vec3 u_col_inland;
    uniform vec3 u_col_mountains;
    uniform vec3 u_col_iceLight;
    uniform vec3 u_col_iceDark;

    uniform bool u_show_regions;
    uniform bool u_regions_on_poles;
    uniform int u_hovered_region;
    
    // Accepts 200 visible points. Z is the Global ID!
    uniform vec3 u_region_points[200];
    uniform float u_region_opacity;
    uniform float u_region_jagged;
    uniform float u_region_border;

    ${GLSL_VECTOR_NOISE}
    ${GLSL_POS}
    ${GLSL_POLES}
    ${GLSL_RIVERS}
    ${GLSL_REGIONS}

    const vec2 offset = vec2(5.2, 1.3);

    void main() {
        vec2 baseUv = vUv;
        baseUv -= 0.5;         
        baseUv /= u_zoom;      
        baseUv += 0.5;         
        baseUv += u_pan;       

        vec2 st = baseUv;
        st.x *= u_resolution.x / u_resolution.y; 

        vec2 macroWarp = vec2(
            fbm(st * u_macro_scale) - 0.5,
            fbm(st * u_macro_scale + offset) - 0.5
        ) * u_macro_dist;
        vec2 macroSt = st + macroWarp;

        vec2 microWarp = vec2(
            fbm(macroSt * u_micro_scale) - 0.5,
            fbm(macroSt * u_micro_scale + offset) - 0.5
        ) * u_micro_dist;
        vec2 finalSt = macroSt + microWarp;

        float mask1 = getContinentMask(finalSt, u_c1_pos, u_c1_scale) * step(1.0, u_active_continents);
        float mask2 = getContinentMask(finalSt, u_c2_pos, u_c2_scale) * step(2.0, u_active_continents);
        float mask3 = getContinentMask(finalSt, u_c3_pos, u_c3_scale) * step(3.0, u_active_continents);
        float mask4 = getContinentMask(finalSt, u_c4_pos, u_c4_scale) * step(4.0, u_active_continents);
        float mask5 = getContinentMask(finalSt, u_c5_pos, u_c5_scale) * step(5.0, u_active_continents);
        
        float poleDist = getPoleDistance(baseUv, st, u_pole_distort);
        float poleThreshold = 1.0 - (u_pole_pos - 0.5);
        float poleStructure = smoothstep(poleThreshold - 0.2, poleThreshold + 0.1, poleDist);
        
        float combinedMasks = clamp(mask1 + mask2 + mask3 + mask4 + mask5 + poleStructure, 0.0, 1.0);

        float mapNoise = fbm(finalSt * u_micro_scale * 0.5);
        float elevation = (combinedMasks * 0.55) + (mapNoise * 0.45);

        float rNoise = getRiverCreases(finalSt * u_river_scale, u_river_seed);
        float dynamicWidth = u_river_width * mix(1.5, 0.2, smoothstep(0.45, 0.8, elevation));
        float riverValley = 1.0 - smoothstep(0.0, dynamicWidth, rNoise);
        float riverBreaker = fbm(finalSt * u_river_scale * 0.5 + (u_river_seed * 2.0));
        float branchMask = smoothstep(0.40, 0.55, riverBreaker); 
        float riverCarve = riverValley * branchMask;
        float heightAboveSeaLevel = max(0.0, elevation - 0.435); 
        elevation -= riverCarve * heightAboveSeaLevel;

        vec3 color = u_col_deepOcean;
        color = mix(color, u_col_shallowOcean, smoothstep(0.3, 0.45, elevation));
        color = mix(color, u_col_sand, smoothstep(0.44, 0.455 , elevation)); 
        
        float grassDetail = (fbm(finalSt * u_micro_scale * 2.0) - 0.5) * 0.25;
        vec3 vegetationColor = mix(u_col_coast, u_col_inland, smoothstep(0.46, 0.82, elevation + grassDetail));
        
        float equatorWarp = (fbm(st * 2.5) - 0.5) * 0.5; 
        float distToEquator = abs(baseUv.y - 0.5 + equatorWarp) * 2.0;
        
        float desertDetail = fbm(finalSt * u_micro_scale * 2.0);
        vec3 desertColor = mix(u_col_desertLight, u_col_desertMid, smoothstep(0.3, 0.5, desertDetail));
        desertColor = mix(desertColor, u_col_desertDark, smoothstep(0.5, 0.8, desertDetail + (elevation * 0.3)));
        float biomeNoise = (fbm(finalSt * u_micro_scale) - 0.5) * 0.3; 
        float desertMask = 1.0 - smoothstep(u_desert_spread * 0.3, u_desert_spread, distToEquator + biomeNoise);
        vec3 landColor = mix(vegetationColor, desertColor, clamp(desertMask, 0.0, 1.0));
        
        landColor = mix(landColor, u_col_mountains, smoothstep(0.8, 0.95, elevation));

        float iceNoise = fbm(finalSt * u_micro_scale * 3.0);
        vec3 finalIceColor = mix(u_col_iceLight, u_col_iceDark, smoothstep(0.3, 0.7, iceNoise));

        float snowThreshold = 1.0 - u_snow_spread;
        float snowMask = smoothstep(snowThreshold, snowThreshold + 0.15, distToEquator + biomeNoise - (elevation * 0.3));
        landColor = mix(landColor, finalIceColor, clamp(snowMask, 0.0, 1.0));

        color = mix(color, landColor, smoothstep(0.470, 0.471, elevation));
        
        float poleColorMask = smoothstep(poleThreshold - 0.05, poleThreshold + 0.05, poleDist);
        color = mix(color, finalIceColor, clamp(poleColorMask, 0.0, 1.0));

        float isLandPx = smoothstep(0.465, 0.475, elevation); 
        float isPolePx = smoothstep(poleThreshold - 0.15, poleThreshold - 0.05, poleDist);
        
        float alphaState = 0.0; 

        if (isLandPx > 0.1 || isPolePx > 0.1) {
            alphaState = 1.0; 
            
            if (u_show_regions) {
                float regionMask = isLandPx;
                
                if (!u_regions_on_poles) {
                    regionMask *= (1.0 - isPolePx);
                }

                if (regionMask > 0.01) {
                    vec2 jitter = vec2(fbm(st * 15.0), fbm(st * 15.0 + 5.2)) * u_region_jagged;
                    vec3 rData = getRegionData(st + jitter, u_region_points);
                    int rIndex = int(rData.x); // Global ID!
                    float borderDist = rData.y;
                    
                    vec3 rColor = vec3(
                        fract(sin(float(rIndex) * 12.9898) * 43758.5453),
                        fract(sin(float(rIndex) * 78.233) * 43758.5453),
                        fract(sin(float(rIndex) * 39.346) * 43758.5453)
                    );
                    
                    color = mix(color, rColor, u_region_opacity * regionMask); 
                    float borderLine = smoothstep(u_region_border, u_region_border * 0.2, borderDist);
                    color = mix(color, vec3(0.1), borderLine * 0.9 * regionMask);
                    
                    if (rIndex == u_hovered_region) {
                        color = mix(color, vec3(1.0), 0.15 * regionMask); 
                        float hoverBorder = smoothstep(u_region_border * 1.5, u_region_border * 0.5, borderDist);
                        color = mix(color, vec3(1.0, 0.8, 0.2), hoverBorder * regionMask); 
                    }

                    if (regionMask > 0.5) {
                        float encodedID = mod(float(rIndex), 250.0) + 1.0;
                        alphaState = encodedID / 255.0;
                    }
                }
            }
        }
        
        gl_FragColor = vec4(color, alphaState);
    }
`;

// --- SHADER 2: POST PROCESSING (Bilateral Edge-Preserving Blur) ---
const postVsSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vUv;
    void main() { 
        vUv = aVertexPosition.xy * 0.5 + 0.5;
        gl_Position = aVertexPosition; 
    }
`;

const postFsSource = `
    precision highp float;
    varying vec2 vUv;
    uniform sampler2D u_image;
    uniform vec2 u_resolution;
    uniform float u_soften;
    uniform float u_grain;

    // UPGRADED: A Hash-based pseudo-random function without sine-banding artifacts!
    float random(vec2 p) {
        vec3 p3  = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    void main() {
        vec4 centerPx = texture2D(u_image, vUv);
        vec3 result = centerPx.rgb;
        
        if (u_soften > 0.0) {
            vec2 texel = 1.0 / u_resolution;
            result = vec3(0.0);
            float weightSum = 0.0;
            
            for(int x = -2; x <= 2; x++) {
                for(int y = -2; y <= 2; y++) {
                    vec2 offset = vec2(float(x), float(y)) * texel * u_soften;
                    vec4 nPx = texture2D(u_image, vUv + offset);
                    
                    bool sameTerrain = abs(centerPx.a - nPx.a) < 0.002; 
                    vec3 colorToUse = sameTerrain ? nPx.rgb : centerPx.rgb;
                    
                    float spatialDist = abs(float(x)) + abs(float(y)); 
                    float weight = 1.0 / (1.0 + spatialDist);
                    
                    float colorDist = distance(centerPx.rgb, colorToUse);
                    weight *= exp(-colorDist * 12.0); 
                    
                    result += colorToUse * weight;
                    weightSum += weight;
                }
            }
            result /= weightSum;
        }

        // --- ORGANIC FILM / PAPER GRAIN ---
        vec2 pxCoord = vUv * u_resolution;
        float n1 = random(pxCoord);                                   // Fine micro-grain
        float n2 = random(floor(pxCoord * 0.5));                      // Clumpy 2x2 grain
        float n3 = random(floor(pxCoord * vec2(0.2, 1.0)));           // Fibrous/directional paper grain
        
        float combinedNoise = (n1 + n2 + n3) / 3.0;                   // Blend them
        combinedNoise = (combinedNoise - 0.5) * 2.0;                  // Map to range: -1.0 to 1.0
        
        float luminance = dot(result, vec3(0.299, 0.587, 0.114));
        float grainWeight = 1.0 - abs(luminance - 0.5) * 1.5;         // Bell curve
        grainWeight = clamp(grainWeight, 0.25, 1.0);                  
        
        result = result + (combinedNoise * u_grain * grainWeight) * (1.0 - result * 0.3);

        gl_FragColor = vec4(result, centerPx.a);
    }
`;