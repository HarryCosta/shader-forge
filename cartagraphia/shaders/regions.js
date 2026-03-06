const GLSL_REGIONS = `
    // --- REGIONS (VORONOI) NODE GROUP ---
    
    // We now accept a vec3 array. XY = Position, Z = Global Region ID
    vec3 getRegionData(vec2 st, vec3 points[200]) {
        float minDist = 999999.0;
        float minDist2 = 999999.0;
        int closestIndex = -1;
        int closestIndex2 = -1;
        vec2 closestPoint = vec2(0.0);
        vec2 closestPoint2 = vec2(0.0);

        for(int i=0; i<200; i++) {
            vec2 p = points[i].xy;
            int gId = int(points[i].z);
            
            // Skip the culled/empty points
            if (gId < 0) continue; 

            float d = dot(st - p, st - p); 
            if(d < minDist) {
                minDist2 = minDist;
                closestPoint2 = closestPoint;
                closestIndex2 = closestIndex;

                minDist = d;
                closestPoint = p;
                closestIndex = gId; // Bind strictly to the Global ID
            } else if(d < minDist2) {
                minDist2 = d;
                closestPoint2 = p;
                closestIndex2 = gId;
            }
        }

        vec2 mid = 0.5 * (closestPoint + closestPoint2);
        vec2 dir = normalize(closestPoint2 - closestPoint);
        float borderDist = dot(st - mid, dir);

        return vec3(float(closestIndex), abs(borderDist), sqrt(minDist));
    }
`;