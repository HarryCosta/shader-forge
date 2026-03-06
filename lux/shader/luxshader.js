const vsSource = `
    attribute vec4 aVertexPosition;
    varying vec2 vUv;
    void main() { 
        vUv = aVertexPosition.xy * 0.5 + 0.5;
        gl_Position = aVertexPosition; 
    }
`;

const fsSource = `
    precision highp float;
    varying vec2 vUv;
    uniform vec2 u_resolution;
    uniform float u_time;
    
    uniform vec3 u_col_core;
    uniform vec3 u_col_aura;
    uniform float u_speed;
    uniform float u_scale;
    uniform float u_rotation; 
    
    uniform float u_turbulence;
    uniform float u_turb_scale;
    uniform float u_turb_speed; 
    uniform float u_sparks;     
    uniform float u_pulse;      
    uniform float u_lightning;
    uniform float u_arc_speed;
    uniform float u_arc_scale;
    uniform int u_shape; 
    uniform int u_arc_style;
    uniform int u_turb_style;

    mat2 rot(float a) {
        float s = sin(a), c = cos(a);
        return mat2(c, -s, s, c);
    }

    float random(vec2 p) {
        vec3 p3  = fract(vec3(p.xyx) * .1031);
        p3 += dot(p3, p3.yzx + 33.33);
        return fract((p3.x + p3.y) * p3.z);
    }

    float noise(vec2 st) {
        vec2 i = floor(st);
        vec2 f = fract(st);
        vec2 u = f * f * (3.0 - 2.0 * f);
        return mix(mix(random(i + vec2(0.0,0.0)), random(i + vec2(1.0,0.0)), u.x),
                   mix(random(i + vec2(0.0,1.0)), random(i + vec2(1.0,1.0)), u.x), u.y);
    }

    void main() {
        vec2 uv = vUv - 0.5;
        uv.x *= u_resolution.x / u_resolution.y;
        
        float pulseMod = 1.0 + sin(u_time * u_pulse) * 0.05;
        uv *= (1.0 / (u_scale * pulseMod));
        uv *= rot(u_rotation);
        
        float t = u_time * u_speed * 0.5;

        vec2 p = uv;
        for(int i = 1; i < 5; i++) {
            vec2 newp = p;
            newp.x += (0.6 / float(i)) * sin(float(i) * p.y + t + u_turbulence);
            newp.y += (0.6 / float(i)) * cos(float(i) * p.x + t + u_turbulence);
            p = newp;
            p *= rot(t * 0.2); 
        }
        
        float base_d = 0.0;
        float limit = 0.6; 
        
        if (u_shape == 0) {
            base_d = length(uv); 
        } else if (u_shape == 1) {
            base_d = abs(length(uv) - 0.35); 
        } else if (u_shape == 2) {
            base_d = length(vec2(uv.x, max(0.0, abs(uv.y) - limit))); 
        } else if (u_shape == 3) {
            base_d = length(vec2(max(0.0, abs(uv.x) - limit), uv.y)); 
        } else if (u_shape == 4) {
            float beamV = length(vec2(uv.x, max(0.0, abs(uv.y) - limit)));
            float beamH = length(vec2(max(0.0, abs(uv.x) - limit), uv.y));
            base_d = min(beamV, beamH); 
        } else if (u_shape == 5) {
            vec2 q = uv;
            q.y += 0.25; 
            q.x += sin(q.y * 6.0 - t * 12.0) * 0.1 * smoothstep(0.0, 0.8, q.y);
            float pinch = exp(clamp(q.y * 4.5, -10.0, 10.0)); 
            float y_dist = max(0.0, abs(q.y - 0.15) - 0.25); 
            base_d = length(vec2(q.x * pinch, y_dist));
        }

        float vignette = smoothstep(0.8, 0.4, length(uv));
        float worble = 0.0;
        float t_turb = t * u_turb_speed;

        if (u_turb_style == 0) {
            worble = sin(p.x * u_turb_scale + t_turb) * cos(p.y * u_turb_scale - t_turb) * 0.05;
        } else {
            float n1 = noise(p * u_turb_scale + t_turb);
            float n2 = noise(p * (u_turb_scale * 2.0) - t_turb * 2.0);
            worble = (abs(n1 - 0.5) + abs(n2 - 0.5) * 0.5) * 0.12;
        }
        
        float d = abs(base_d + worble * u_turbulence * vignette); 
        d = max(0.001, d);
        
        float core = 0.05 / d;
        core = smoothstep(0.5, 1.5, core); 
        
        float aura = 0.1 / d;
        vec3 finalColor = u_col_aura * aura;
        finalColor = mix(finalColor, u_col_core, core);
        finalColor *= vignette;

        if (u_sparks > 0.0) {
            vec2 sparkUv = uv + p * (0.1 * u_turbulence + 0.05); 
            float sAngle = atan(sparkUv.y, sparkUv.x);
            float sRadius = length(sparkUv);
            float s1 = sin(sAngle * 14.0 + t * 4.0);
            float s2 = sin(sRadius * 40.0 - t * 8.0);
            float killNoise = random(floor(sparkUv * 15.0 - t));
            float sparkField = s1 * s2 * killNoise;
            sparkField = smoothstep(0.96 - (u_sparks * 0.05), 1.0, sparkField);
            finalColor += u_col_core * sparkField * vignette * u_sparks * 3.0;
        }

        if (u_lightning > 0.0) {
            float strike = 0.0;
            float t_arc = u_time * u_arc_speed * 5.0; 
            if (u_arc_style == 0) {
                float lAngle = atan(uv.y, uv.x);
                float crackle = (sin(lAngle * 10.0 + t_arc) * 0.05 
                              + cos(lAngle * 23.0 - t_arc * 1.5) * 0.03) * u_arc_scale;
                float lDist = abs(base_d + crackle * u_lightning);
                strike = (0.003 / lDist) * vignette;
            } else {
                float lStrike = 0.0;
                for(int i = 0; i < 3; i++) {
                    float fi = float(i);
                    vec2 p_noise = uv * (6.0 + fi * 2.0);
                    float t_noise = t_arc * (1.0 + fi * 0.2);
                    float n = 0.0;
                    float amp = 1.0;
                    for(int j = 0; j < 4; j++) {
                        n += amp * abs(noise(p_noise - t_noise) - 0.5);
                        p_noise = p_noise * 2.0 * rot(0.785); 
                        amp *= 0.5;
                    }
                    float lDist = abs(base_d + (n - 0.25) * 0.6 * u_lightning * u_arc_scale);
                    lStrike += 0.0008 / (lDist * lDist + 0.001);
                }
                strike = lStrike * vignette;
            }
            finalColor += mix(u_col_core, vec3(1.0), 0.9) * strike * u_lightning;
        }

        gl_FragColor = vec4(finalColor, 1.0);
    }
`;