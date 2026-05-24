export const canvasFragmentShader = `
# define SPEED_OF_LIGHT 1.0
# define EVENT_HORIZON_RADIUS 1.0
# define BACKGROUND_DISTANCE 10000.0
# define PROJECTION_DISTANCE 1.0
# define SCALE_FACTOR 1.0
# define PI 3.14159265359

// ----------
// -uniforms-
// ----------
uniform float uAccretionDisk;
uniform sampler2D uCanvasTexture;
uniform vec2 uResolution;
uniform vec3 uCameraTranslate;
uniform float uPov;
uniform int uMaxIterations;
uniform float uStepSize;
uniform float uTime;
uniform float u_progress;
uniform float u_cameraZ;

// -----------
// -variables-
// -----------

vec3 bh_pos = vec3(0.0, 0.0, 0.0);
vec3 camera_pos = vec3(0.0, 0.05, 20.0);

float innerDiskRadius = 2.0;
float outerDiskRadius = 8.0;

float diskFactor = 3.0;
float disk_flow = 10.0;
float flow_rate = 0.6;


// -----------------
// MATRIX TRANSFORMS
// -----------------
mat4 identityMat(){
    return mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
}

mat4 translate_ColOrder(float x, float y, float z){
    return mat4(
        1, 0, 0, x,
        0, 1, 0, y,
        0, 0, 1, z,
        0, 0, 0, 1
    );
}

mat4 translate_RowOrder(float x, float y, float z){
    return mat4(
        1, 0, 0, 0,
        0, 1, 0, 0,
        0, 0, 1, 0,
        x, y, z, 1
    );
}

mat4 scale(float x, float y, float z){
    return mat4(
        x, 0, 0, 0,
        0, y, 0, 0,
        0, 0, z, 0,
        0, 0, 0, 1
    );
}

mat4 rotate_x(float theta){
    return mat4(
        1, 0, 0, 0,
        0, cos(theta), -sin(theta), 0,
        0, sin(theta), cos(theta), 0,
        0, 0, 0, 1
    );
}

mat4 rotate_y(float theta){
    return mat4(
        cos(theta), 0, sin(theta), 0,
        0, 1, 0, 0,
        -sin(theta), 0, cos(theta), 0,
        0, 0, 0, 1
    );
}

mat4 rotate_z(float theta){
    return mat4(
        cos(theta), -sin(theta), 0, 0,
        sin(theta), cos(theta), 0, 0,
        0, 0, 1, 0,
        0, 0, 0, 1
    );
}

// ---------------------------
// -- FBM -> ACCRETION DISK---
// ---------------------------
float hash(float n) { 
      return fract(sin(n) * 753.5453123); 
}

float MappingRange(float X, float A, float B, float C, float D){
    //(X-A)/(B-A) * (D-C) + C
    return (X - A) / (B - A) * (D - C) + C;
}

float noise(vec3 x) {
      vec3 p = floor(x);
      vec3 f = fract(x);
      f = f * f * (3.0 - 2.0 * f);
      float n = p.x + p.y * 157.0 + 113.0 * p.z;

      return mix(mix(mix(hash(n + 0.0), hash(n + 1.0), f.x),
          mix(hash(n + 157.0), hash(n + 158.0), f.x), f.y),
          mix(mix(hash(n + 113.0), hash(n + 114.0), f.x),
          mix(hash(n + 270.0), hash(n + 271.0), f.x), f.y), f.z);
}

// open this article to learn more about the FBM
// https://iquilezles.org/articles/fbm/
float fbm(vec3 pos, const int numOctaves, const float iterScale, const float detail, const float weight) {
      float mul = weight;
      float add = 1.0 - 0.5 * mul;
      float t = noise(pos) * mul + add;

      for (int i = 1; i < numOctaves; ++i) {
          pos *= iterScale;
          mul = exp2(log2(weight) - float(i) / detail);
          add = 1.0 - 0.5 * mul;
          t *= noise(pos) * mul + add;
      }
      
      return t;
}

//--------------------------------------------------
//-ADJUST COORDINATE FROM PIXEL TO WORLD COORDINATE-
//--------------------------------------------------
struct Ray{
    vec4 origin;
    vec4 direction;
};

Ray pixelToWorldRay(){
    vec3 up = vec3(0.0, 1.0, 0.0);
    vec4 look_from = rotate_y(camera_pos.x+uCameraTranslate.x) * rotate_x(camera_pos.y+uCameraTranslate.y) * vec4(camera_pos+uCameraTranslate, 1.0);
    vec3 view = vec3(-look_from.x, -look_from.y, -look_from.z);

    vec3 n_view = normalize(view);
    vec3 n_upview = normalize(cross(up, n_view));
    vec3 c_vup = cross(n_view, n_upview);

    mat4 offset = mat4(
        vec4(n_upview, 0.0),
        vec4(c_vup, 0.0),
        vec4(n_view, 0.0),
        vec4(0.0, 0.0, 0.0 , 1.0)
    ) ;
    mat4 transform = translate_RowOrder(-0.5 * uResolution.x, -0.5 * uResolution.y, PROJECTION_DISTANCE);
    mat4 look_transform = translate_RowOrder(look_from.x, look_from.y, look_from.z);

    float pov_rad = radians(uPov);
    float h = PROJECTION_DISTANCE * 2.0 * tan(0.5 * pov_rad);
    mat4 scaled_transform = scale(
        h/(uResolution.y * SCALE_FACTOR),
        h/(uResolution.y * SCALE_FACTOR),
        1.0
    );

    vec4 local_pixel_coord = vec4(gl_FragCoord.x, gl_FragCoord.y, 0.0, 1.0);
    vec4 world_coord = look_transform * offset * scaled_transform * transform * local_pixel_coord;

    Ray ray;
    ray.origin = look_from;
    ray.direction = world_coord - look_from;

    return ray;
}

// -----------------------------------
//      ------- BLACK HOLE --------
// -----------------------------------

// relativistic orbital dynamics
// The Newtonian gravity that appears when deriving orbits from 
// schwarzschild metric
vec3 geodesic_equation(vec3 position, float h2){
    return -(3.0/2.0) * h2 * position / pow(length(position), 5.0);
}

vec4 intersect_sphere(Ray ray, float radius){
    float a = dot(ray.direction, ray.direction);
    float b = dot(ray.direction, ray.origin) * 2.0;
    float c = dot(ray.origin, ray.origin) - radius * radius;

    float d = b * b - 4.0 * a * c;
    float q = -0.5 * (b + sign(b) * sqrt(d));

    float r1 = q/a;
    float r2 = c/q;

    float i = max(r1, r2);
    return ray.origin + i * ray.direction;
}

vec4 GetColor(Ray ray){
    vec4 positioned = intersect_sphere(ray, BACKGROUND_DISTANCE);

    // Polar coordinate of the intersection.
    float dist = length(vec2(positioned.x, positioned.z));
    float theta = atan(positioned.x / positioned.z);
    float new_z = positioned.y;
    // map the polar coordinates to the texture
    vec2 new_coord = vec2(theta/PI + 0.5, new_z/(2.0 * BACKGROUND_DISTANCE) + 0.5);

    return texture2D(uCanvasTexture, new_coord);
}

vec4 compute(inout vec3 position, inout vec3 velocity, inout Ray ray){
    // check if an object is in the event horizon or not
    // and perform the integration 
    // we gonna use the Runge kutta integration , because it's more accurate than euler integration

    // angular momentum constants in the geodesic equation
    vec3 perpendicular = cross(position, velocity);
    float mag = length(perpendicular);
    float h2 = pow(mag, 2.0);

    vec4 color = vec4(1.0);

    for(int i = 0; i < uMaxIterations; i++){
        // calculate the distance between the ray and the black hole 
        // assuming the black hole is at : vec3(0, 0, 0);
        float dist = length(position);

        float step_size = dist * dist * uStepSize;
        vec3 rk_delta = velocity * step_size;

        // RK-4 = runge-kutta integration
        vec3 k1 = step_size * geodesic_equation(position, h2);
        vec3 k2 = step_size * geodesic_equation(position + rk_delta + 0.5 * k1, h2);
        vec3 k3 = step_size * geodesic_equation(position + rk_delta + 0.5 * k2, h2);
        vec3 k4 = step_size * geodesic_equation(position + rk_delta + k3, h2);

        vec3 d = (k1 + 2.0 * (k2 + k3) + k4) / 6.0;

        vec3 ray_step = position + rk_delta + d * uStepSize;
        float ray_step_dist = length(ray_step);

        if(uAccretionDisk == 1.0 && dist > innerDiskRadius && dist < outerDiskRadius && ray_step.y * position.y < pow(uStepSize, diskFactor)){
            // ---------------------------------------
            // --------- ACCRETION DISK --------------
            // ---------------------------------------
            float deltaDiskRadius = outerDiskRadius - innerDiskRadius;
            float disk_dist = dist - innerDiskRadius;
            vec3 uvw = vec3( 
                (atan(ray_step.z, abs(ray_step.x)) / (PI * 2.0)) - 
                (disk_flow / sqrt(dist)),

                pow(disk_dist / deltaDiskRadius, 2.0) + ((flow_rate / (PI * 2.0)) / deltaDiskRadius),

                ray_step.y * 0.5 + 0.5
            ) / 2.0;
            float disk_intensity = 1.0 - length(ray_step / vec3(outerDiskRadius, 1.0, outerDiskRadius));
            disk_intensity *= smoothstep(innerDiskRadius, innerDiskRadius + 1.0, dist);
            uvw.y += uCameraTranslate.x;
            uvw.z += uCameraTranslate.x;
            uvw.x -= uCameraTranslate.x;

            // float density_variation = fbm(2.0 * uvw, 5, 2.0, 1.0, 1.0);
            float density_variation = fbm(position + uvw * 2.0, 3, 3.0, 1.2, 1.0);
            disk_intensity *= inversesqrt(dist) * density_variation;
            float dpth = step_size * (float(uMaxIterations) / 10.0) * disk_intensity;
            
            // -------> Doppler Shift
            vec3 shiftD = 0.6 * cross(normalize(ray_step), vec3(0.0, 1.0, 0.0));
            float v = dot(ray.direction.xyz, shiftD);
            float dopplerShift = sqrt((1.0 - v)/(1.0 + v));
            // -------> Gravitational Shift (Redshit)
            float redshift = sqrt((1.0 - 2.0 / dist) / (1.0 - 2.0 / length(camera_pos)));
            
            vec3 color_rgb = vec3(1.0, 0.65, 0.50) * dopplerShift * redshift * dpth ;

            ray.origin = vec4(position, 1.0);
            ray.direction = vec4(velocity, 0.0);

            // Blending the accretion disk with the background
            vec4 disk_color = GetColor(ray) + vec4(color_rgb, 1.0);

            return disk_color;
        }

        if(dist >= BACKGROUND_DISTANCE){
            break;
        }
        // In case the ray falls in the event horizon
        if(dist <= EVENT_HORIZON_RADIUS){
            // return true;
            return vec4(0.0, 0.0, 0.0, 1.0);
        }
        // update the position and velocity
        position += rk_delta;
        velocity += d;
    }

    ray.origin = vec4(position, 1.0);
    ray.direction = vec4(velocity, 0.0);

    return GetColor(ray);
}

void main() {
    vec2 vUv = gl_FragCoord.xy / uResolution;
    Ray ray = pixelToWorldRay();

    vec3 rayOrigin = vec3(ray.origin);
    // تجاوز قيمة Z بـ u_cameraZ (يتحكم في اقتراب الكاميرا)
    rayOrigin.z = u_cameraZ;

    vec3 position = rayOrigin;
    vec3 velocity = SPEED_OF_LIGHT * normalize(vec3(ray.direction));
    
    vec4 color = compute(position, velocity, ray);

    //glow value
    float glow = 0.01/length(ray.origin);
    glow = clamp(glow, 0.0, 1.0) * 12.0;

    vec3 finalColor = (color).rgb + glow;

    // ── Glitch effect يزيد مع u_progress
    float glitchAmt = pow(max(0.0, u_progress - 0.35) / 0.65, 2.0);
    if (glitchAmt > 0.005) {
        float line = step(0.975 - glitchAmt * 0.04,
                        sin(vUv.y * 400.0 + uTime * 40.0));
        finalColor = mix(finalColor, vec3(0.0, 1.0, 0.8) * line, glitchAmt * 0.25);

        // إزاحة أفقية عشوائية
        float shift = (fract(sin(floor(vUv.y * 80.0) * 127.1 + uTime * 10.0) * 43758.5) - 0.5)
                    * glitchAmt * 0.06;
        vec2 shiftedUv = vec2(vUv.x + shift, vUv.y);
        // (اختياري: استخدم shiftedUv لقراءة texture إن وُجد)
    }

    // ── White flash في آخر 15%
    float whiteFade = smoothstep(0.85, 1.0, u_progress);
    finalColor = mix(finalColor, vec3(1.0), whiteFade);

    gl_FragColor = vec4(finalColor, 1.0);
}
`;


