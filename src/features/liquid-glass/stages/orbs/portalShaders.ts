/**
 * src/features/liquid-glass/stages/orbs/portalShaders.ts
 *
 * WebGL GLSL Shaders & Uniform configuration for the Quad-Lens Liquid Glass Portal.
 */

export const GLASS_CONFIG = {
  tint: [0.99, 0.995, 1.0] as const,
  saturation: 1.18,
  distortion: 1.45,
  blurOrbMode: 0.35,
  blurWindowRim: 0.55,
  chromaticAberration: 1.35,
  shadowIntensity: 0.22,
  shadowOffsetX: 0,
  shadowOffsetY: 14,
  shadowBlur: 28,
  cornerRadiusDesktop: 32,
  cornerRadiusMobile: 24,
  autoAdvanceOnEnded: true,
} as const;

export const VERTEX_SHADER_SOURCE = `
  attribute vec2 a_position;
  attribute vec2 a_texCoord;
  varying vec2 v_texCoord;

  void main() {
    gl_Position = vec4(a_position, 0.0, 1.0);
    v_texCoord = a_texCoord;
  }
`;

export function buildFragmentShaderSource(): string {
  return `
    #ifdef GL_FRAGMENT_PRECISION_HIGH
    precision highp float;
    #else
    precision mediump float;
    #endif

    uniform float u_time;
    uniform vec2 u_resolution;
    uniform vec2 u_lightShift;
    uniform sampler2D u_texture;

    uniform vec2 u_centerA;
    uniform vec2 u_sizeA;
    uniform float u_cornerA;
    uniform float u_wobbleA;
    uniform float u_alphaA;

    uniform vec2 u_centerB;
    uniform vec2 u_sizeB;
    uniform float u_cornerB;
    uniform float u_wobbleB;
    uniform float u_alphaB;

    uniform vec2 u_centerC;
    uniform vec2 u_sizeC;
    uniform float u_cornerC;
    uniform float u_wobbleC;
    uniform float u_alphaC;

    uniform vec2 u_centerD;
    uniform vec2 u_sizeD;
    uniform float u_cornerD;
    uniform float u_wobbleD;
    uniform float u_alphaD;

    uniform vec3 u_tint;
    uniform float u_saturation;
    uniform float u_distortion;
    uniform float u_blur;
    uniform float u_imageAspect;
    uniform float u_canvasAspect;
    uniform float u_shadowIntensity;
    uniform vec2 u_shadowOffset;
    uniform float u_shadowBlur;
    uniform float u_chromaticAberration;

    varying vec2 v_texCoord;

    vec2 getCoverUV(vec2 uv, float imageAspect, float canvasAspect) {
      vec2 coverUV = uv;
      if (imageAspect > canvasAspect) {
        float scale = canvasAspect / max(imageAspect, 0.0001);
        coverUV.x = (uv.x - 0.5) * scale + 0.5;
      } else {
        float scale = imageAspect / max(canvasAspect, 0.0001);
        coverUV.y = (uv.y - 0.5) * scale + 0.5;
      }
      return clamp(coverUV, 0.001, 0.999);
    }

    float sdRoundedRect(vec2 pos, vec2 halfSize, vec4 cornerRadius) {
      cornerRadius.xy = (pos.x > 0.0) ? cornerRadius.xy : cornerRadius.zw;
      cornerRadius.x = (pos.y > 0.0) ? cornerRadius.x : cornerRadius.y;
      vec2 q = abs(pos) - halfSize + cornerRadius.x;
      return min(max(q.x, q.y), 0.0) + length(max(q, 0.0)) - cornerRadius.x;
    }

    float sdLiquidShape(vec2 pos, vec2 halfSize, float radius, float wobbleAmp, float t, float phase) {
      float base = sdRoundedRect(pos, halfSize, vec4(radius));
      if (wobbleAmp <= 0.001) return base;
      float ang = atan(pos.y, pos.x);
      float minDim = min(halfSize.x, halfSize.y);
      float wave =
        sin(ang * 2.0 + t * 1.65 + phase) * 0.44 +
        cos(ang * 3.0 - t * 2.15 - phase * 0.7) * 0.34 +
        sin(ang * 4.0 + t * 1.25 + phase * 1.3) * 0.22;
      return base + wave * minDim * 0.042 * wobbleAmp;
    }

    vec3 sampleCleanDispersion(vec2 uv, vec2 refractVec, float aberrationStrength) {
      vec2 coverUV = getCoverUV(uv, u_imageAspect, u_canvasAspect);
      vec2 disp = refractVec * aberrationStrength * 0.18;
      float r = texture2D(u_texture, clamp(coverUV + disp * 1.15, 0.001, 0.999)).r;
      float g = texture2D(u_texture, clamp(coverUV, 0.001, 0.999)).g;
      float b = texture2D(u_texture, clamp(coverUV - disp * 1.15, 0.001, 0.999)).b;
      return vec3(r, g, b);
    }

    vec3 sampleCrystalGlass(vec2 uv, vec2 refractVec, float rimBlurRadius) {
      vec2 stepUV = vec2(rimBlurRadius) / max(u_resolution, vec2(1.0));
      vec3 c0 = sampleCleanDispersion(uv, refractVec, u_chromaticAberration);
      if (rimBlurRadius <= 0.05) return c0;
      vec3 c1 = sampleCleanDispersion(uv + vec2( stepUV.x,  0.0), refractVec, u_chromaticAberration);
      vec3 c2 = sampleCleanDispersion(uv + vec2(-stepUV.x,  0.0), refractVec, u_chromaticAberration);
      vec3 c3 = sampleCleanDispersion(uv + vec2( 0.0,  stepUV.y), refractVec, u_chromaticAberration);
      vec3 c4 = sampleCleanDispersion(uv + vec2( 0.0, -stepUV.y), refractVec, u_chromaticAberration);
      return c0 * 0.44 + (c1 + c2 + c3 + c4) * 0.14;
    }

    vec3 saturateColor(vec3 color, float factor) {
      float gray = dot(color, vec3(0.299, 0.587, 0.114));
      return mix(vec3(gray), color, factor);
    }

    void main() {
      vec2 fragCoord = v_texCoord * u_resolution;

      float sdfA = (u_alphaA > 0.01)
        ? sdLiquidShape(fragCoord - u_centerA, u_sizeA, u_cornerA, u_wobbleA, u_time, 0.0)
        : 1e5;
      float sdfB = (u_alphaB > 0.01)
        ? sdLiquidShape(fragCoord - u_centerB, u_sizeB, u_cornerB, u_wobbleB, u_time, 2.094)
        : 1e5;
      float sdfC = (u_alphaC > 0.01)
        ? sdLiquidShape(fragCoord - u_centerC, u_sizeC, u_cornerC, u_wobbleC, u_time, 4.188)
        : 1e5;
      float sdfD = (u_alphaD > 0.01)
        ? sdLiquidShape(fragCoord - u_centerD, u_sizeD, u_cornerD, u_wobbleD, u_time, 1.047)
        : 1e5;

      vec2 coverUV = getCoverUV(v_texCoord, u_imageAspect, u_canvasAspect);
      vec3 baseTex = texture2D(u_texture, coverUV).rgb;

      float shDistA = (u_alphaA > 0.01)
        ? sdLiquidShape((fragCoord - u_centerA) - u_shadowOffset, u_sizeA, u_cornerA, u_wobbleA, u_time, 0.0)
        : 1e5;
      float shDistB = (u_alphaB > 0.01)
        ? sdLiquidShape((fragCoord - u_centerB) - u_shadowOffset, u_sizeB, u_cornerB, u_wobbleB, u_time, 2.094)
        : 1e5;
      float shDistC = (u_alphaC > 0.01)
        ? sdLiquidShape((fragCoord - u_centerC) - u_shadowOffset, u_sizeC, u_cornerC, u_wobbleC, u_time, 4.188)
        : 1e5;
      float shDistD = (u_alphaD > 0.01)
        ? sdLiquidShape((fragCoord - u_centerD) - u_shadowOffset, u_sizeD, u_cornerD, u_wobbleD, u_time, 1.047)
        : 1e5;

      float shAlphaA = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistA)) * u_shadowIntensity * u_alphaA;
      float shAlphaB = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistB)) * u_shadowIntensity * u_alphaB;
      float shAlphaC = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistC)) * u_shadowIntensity * u_alphaC;
      float shAlphaD = (1.0 - smoothstep(-u_shadowBlur * 0.25, max(u_shadowBlur, 1.0), shDistD)) * u_shadowIntensity * u_alphaD;
      float shadowAlpha = max(max(shAlphaA, shAlphaB), max(shAlphaC, shAlphaD));
      vec3 shadowedBackground = baseTex * (1.0 - shadowAlpha);

      int activeIdx = 0;
      float sdf = sdfA;
      if (sdfB < sdf) { sdf = sdfB; activeIdx = 1; }
      if (sdfC < sdf) { sdf = sdfC; activeIdx = 2; }
      if (sdfD < sdf) { sdf = sdfD; activeIdx = 3; }

      float bubbleAlpha = (activeIdx == 1) ? u_alphaB : (activeIdx == 2) ? u_alphaC : (activeIdx == 3) ? u_alphaD : u_alphaA;

      if (sdf > 1.5 || bubbleAlpha <= 0.01) {
        gl_FragColor = vec4(shadowedBackground, 1.0);
        return;
      }

      vec2 activeCenter = (activeIdx == 1) ? u_centerB : (activeIdx == 2) ? u_centerC : (activeIdx == 3) ? u_centerD : u_centerA;
      vec2 activeSize = (activeIdx == 1) ? u_sizeB : (activeIdx == 2) ? u_sizeC : (activeIdx == 3) ? u_sizeD : u_sizeA;
      float activeCorner = (activeIdx == 1) ? u_cornerB : (activeIdx == 2) ? u_cornerC : (activeIdx == 3) ? u_cornerD : u_cornerA;
      float activeWobble = (activeIdx == 1) ? u_wobbleB : (activeIdx == 2) ? u_wobbleC : (activeIdx == 3) ? u_wobbleD : u_wobbleA;
      float activePhase = (activeIdx == 1) ? 2.094 : (activeIdx == 2) ? 4.188 : (activeIdx == 3) ? 1.047 : 0.0;

      float minHalfDim = max(min(activeSize.x, activeSize.y), 1.0);
      float normalizedInside = clamp((sdf / minHalfDim) + 1.0, 0.0, 1.0);
      float rimCurve = pow(normalizedInside, 3.8);
      float outerMeniscus = pow(normalizedInside, 8.5);

      float eps = 2.0;
      vec2 h = vec2(eps, 0.0);
      float sdf1 = sdLiquidShape((fragCoord + h.xy) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      float sdf2 = sdLiquidShape((fragCoord - h.xy) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      float sdf3 = sdLiquidShape((fragCoord + h.yx) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      float sdf4 = sdLiquidShape((fragCoord - h.yx) - activeCenter, activeSize, activeCorner, activeWobble, u_time, activePhase);
      vec2 grad = normalize(vec2(sdf1 - sdf2, sdf3 - sdf4) + vec2(1e-5));

      vec2 refractVec = grad * (-0.042 * u_distortion * rimCurve) + u_lightShift * 0.003 * rimCurve;
      vec2 sampleUV = v_texCoord + refractVec;

      float rimBlurPx = outerMeniscus * 2.4 * u_blur;
      vec3 glassTex = sampleCrystalGlass(sampleUV, refractVec, rimBlurPx);
      glassTex = mix(glassTex, saturateColor(glassTex, u_saturation), rimCurve * 0.55);

      vec3 activeTint = (activeIdx == 1)
        ? vec3(1.0, 0.985, 0.96)
        : u_tint;
      glassTex *= activeTint;

      float causticAngle = u_time * 0.55 + activePhase;
      vec2 lightDir1 = normalize(vec2(-0.707, -0.707) + u_lightShift * 0.35 + vec2(cos(causticAngle), sin(causticAngle)) * 0.18 * activeWobble);
      vec2 lightDir2 = normalize(vec2(0.65, 0.75) - u_lightShift * 0.25);
      float spec1 = pow(max(dot(grad, lightDir1), 0.0), 3.2);
      float spec2 = pow(max(dot(grad, lightDir2), 0.0), 4.0) * 0.55;

      float rimHighlight = smoothstep(-5.5, -0.6, sdf) * (1.0 - smoothstep(-0.6, 1.2, sdf));
      vec3 fresnelTint = (activeIdx == 1)
        ? mix(vec3(1.0, 0.90, 0.74), vec3(1.0, 0.97, 0.90), spec1)
        : mix(vec3(0.84, 0.95, 1.0), vec3(1.0, 0.96, 0.99), spec1);
      glassTex += fresnelTint * ((spec1 + spec2) * outerMeniscus * 0.36 + rimHighlight * 0.32);

      float boxMask = (1.0 - smoothstep(-0.85, 0.85, sdf)) * bubbleAlpha;
      gl_FragColor = vec4(mix(shadowedBackground, glassTex, boxMask), 1.0);
    }
  `;
}

export function initQuadLensGlContext(gl: WebGLRenderingContext) {
  const compileShader = (type: number, src: string): WebGLShader | null => {
    const sh = gl.createShader(type);
    if (!sh) return null;
    gl.shaderSource(sh, src);
    gl.compileShader(sh);
    if (!gl.getShaderParameter(sh, gl.COMPILE_STATUS)) {
      gl.deleteShader(sh);
      return null;
    }
    return sh;
  };

  const vs = compileShader(gl.VERTEX_SHADER, VERTEX_SHADER_SOURCE);
  const fs = compileShader(gl.FRAGMENT_SHADER, buildFragmentShaderSource());
  if (!vs || !fs) return null;

  const program = gl.createProgram();
  if (!program) return null;
  gl.attachShader(program, vs);
  gl.attachShader(program, fs);
  gl.linkProgram(program);
  if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
    gl.deleteProgram(program);
    return null;
  }

  gl.useProgram(program);
  const quad = new Float32Array([-1, -1, 0, 1, 1, -1, 1, 1, -1, 1, 0, 0, 1, 1, 1, 0]);
  const vbo = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, vbo);
  gl.bufferData(gl.ARRAY_BUFFER, quad, gl.STATIC_DRAW);

  const aPos = gl.getAttribLocation(program, 'a_position');
  const aUv = gl.getAttribLocation(program, 'a_texCoord');
  gl.enableVertexAttribArray(aPos);
  gl.enableVertexAttribArray(aUv);
  gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 16, 0);
  gl.vertexAttribPointer(aUv, 2, gl.FLOAT, false, 16, 8);

  const u = (name: string) => gl.getUniformLocation(program, name);
  const locs = {
    u_time: u('u_time'),
    u_resolution: u('u_resolution'),
    u_lightShift: u('u_lightShift'),
    u_texture: u('u_texture'),
    u_centerA: u('u_centerA'),
    u_sizeA: u('u_sizeA'),
    u_cornerA: u('u_cornerA'),
    u_wobbleA: u('u_wobbleA'),
    u_alphaA: u('u_alphaA'),
    u_centerB: u('u_centerB'),
    u_sizeB: u('u_sizeB'),
    u_cornerB: u('u_cornerB'),
    u_wobbleB: u('u_wobbleB'),
    u_alphaB: u('u_alphaB'),
    u_centerC: u('u_centerC'),
    u_sizeC: u('u_sizeC'),
    u_cornerC: u('u_cornerC'),
    u_wobbleC: u('u_wobbleC'),
    u_alphaC: u('u_alphaC'),
    u_centerD: u('u_centerD'),
    u_sizeD: u('u_sizeD'),
    u_cornerD: u('u_cornerD'),
    u_wobbleD: u('u_wobbleD'),
    u_alphaD: u('u_alphaD'),
    u_tint: u('u_tint'),
    u_saturation: u('u_saturation'),
    u_distortion: u('u_distortion'),
    u_blur: u('u_blur'),
    u_imageAspect: u('u_imageAspect'),
    u_canvasAspect: u('u_canvasAspect'),
    u_shadowIntensity: u('u_shadowIntensity'),
    u_shadowOffset: u('u_shadowOffset'),
    u_shadowBlur: u('u_shadowBlur'),
    u_chromaticAberration: u('u_chromaticAberration'),
  };

  const texture = gl.createTexture();
  gl.bindTexture(gl.TEXTURE_2D, texture);
  gl.texImage2D(
    gl.TEXTURE_2D,
    0,
    gl.RGBA,
    1,
    1,
    0,
    gl.RGBA,
    gl.UNSIGNED_BYTE,
    new Uint8Array([12, 16, 24, 255]),
  );
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);
  gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);

  return { program, vs, fs, vbo, texture, locs };
}

