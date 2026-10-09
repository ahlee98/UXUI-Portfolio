// 볼록렌즈 + 젤리 형태를 그래픽 카드(WebGL)로 그린다. 픽셀마다 같은 계산을 하지만 GPU라서 레티나 해상도로도 가볍고,
// 이미지를 주변 픽셀과 섞어 가져와(선형 보간) 확대해도 깨지지 않는다. 캔버스 하나를 공유해 그린 뒤 각 원·카드의 2D 캔버스로 옮긴다.
const VERT = 'attribute vec2 p;void main(){gl_Position=vec4(p,0.,1.);}';
const FRAG = `precision highp float;
uniform sampler2D tex;
uniform sampler2D tex2;  // 렌즈 원 안에 비쳐 보일 다른 이미지(없으면 tex와 같음)
uniform float reveal;     // 다른 이미지가 비치는 정도(0~1)
uniform float maskR;      // 다른 이미지가 보이는 원 반지름(렌즈 반지름 이하)
uniform float feather;    // 원 반지름 중 바깥쪽 몇 %를 부드럽게 섞을지(0~1)
uniform vec2 size;   // 캔버스(형태 + 여백) 크기
uniform vec2 src;    // 원본 이미지 크기(= 원래 형태 크기)
uniform vec2 straight; // 알약 모양의 곧은 부분 절반(원은 0,0). 'half'는 GLSL 예약어라 쓸 수 없다
uniform float r;     // 둥근 끝 반지름
uniform vec2 dir;    // 늘어나는 방향(단위 벡터)
uniform float A;     // 늘어나는 정도
uniform vec2 lens;   // 렌즈 중심(원본 이미지 좌표)
uniform float LR;    // 렌즈 반지름
uniform float k;     // 렌즈 세기(0~1)
uniform float lmin;  // 렌즈 가운데 배율의 역수
void main(){
  vec2 d = vec2(gl_FragCoord.x, size.y - gl_FragCoord.y) - size * .5;
  float dl = max(length(d), 1e-3), proj = dot(d, dir) / dl;
  float st = 1. + (proj > 0. ? A * proj * proj : A * .3 * proj);   // 커서 쪽은 늘어나고 반대쪽은 살짝 줄어든다
  vec2 q = d / st, qq = abs(q) - straight;
  float sd = length(max(qq, 0.)) + min(max(qq.x, qq.y), 0.) - r;   // 알약(원) 모양 안쪽인지
  float alpha = clamp(.5 - sd * st, 0., 1.);
  if (alpha <= 0.) { gl_FragColor = vec4(0.); return; }
  vec2 uv = q + src * .5, e = uv - lens;
  float el = length(e);
  if (el < LR) { float t = el / LR; uv = lens + e * (1. - k * (1. - lmin) * (1. - t) * (1. - t)); } // 볼록렌즈: 가운데일수록 크게
  vec2 uvc = clamp(uv / src, 0., 1.);
  vec4 c = texture2D(tex, uvc);
  if (reveal > 0.) {                                                 // 렌즈 원 안쪽만 다른 이미지(같은 볼록렌즈로 확대). 원 바깥쪽으로 갈수록 서서히 옅어져 원래 이미지로 스며든다
    float m = reveal * (1. - smoothstep(maskR * (1. - feather), maskR, el));
    c = mix(c, texture2D(tex2, uvc), m);
  }
  gl_FragColor = c * alpha;                                          // 미리 곱한 알파
}`;

export function createLensGL() {
  const canvas = document.createElement('canvas');
  const gl = canvas.getContext('webgl', { premultipliedAlpha: true, alpha: true, antialias: false, preserveDrawingBuffer: true });
  if (!gl) return null;
  const sh = (type, code) => { const s = gl.createShader(type); gl.shaderSource(s, code); gl.compileShader(s); if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) throw new Error(gl.getShaderInfoLog(s)); return s; };
  const prog = gl.createProgram();
  try { gl.attachShader(prog, sh(gl.VERTEX_SHADER, VERT)); gl.attachShader(prog, sh(gl.FRAGMENT_SHADER, FRAG)); } catch (err) { console.warn(err); return null; }
  gl.linkProgram(prog); gl.useProgram(prog);
  const buf = gl.createBuffer(); gl.bindBuffer(gl.ARRAY_BUFFER, buf);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]), gl.STATIC_DRAW);
  const loc = gl.getAttribLocation(prog, 'p'); gl.enableVertexAttribArray(loc); gl.vertexAttribPointer(loc, 2, gl.FLOAT, false, 0, 0);
  const U = {}; for (const n of ['tex', 'tex2', 'reveal', 'maskR', 'feather', 'size', 'src', 'straight', 'r', 'dir', 'A', 'lens', 'LR', 'k', 'lmin']) U[n] = gl.getUniformLocation(prog, n);
  gl.uniform1i(U.tex, 0); gl.uniform1i(U.tex2, 1);
  gl.pixelStorei(gl.UNPACK_PREMULTIPLY_ALPHA_WEBGL, true);
  const textures = new WeakMap();                 // 원본 이미지(캔버스)마다 텍스처는 한 번만 올린다
  const texFor = source => {
    let t = textures.get(source); if (t) return t;
    t = gl.createTexture(); gl.bindTexture(gl.TEXTURE_2D, t);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, source);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.LINEAR);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE); gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    textures.set(source, t); return t;
  };
  // ctx: 결과를 옮길 2D 캔버스, source: 원본 이미지 캔버스, p: 형태·렌즈 값(모두 캔버스 픽셀 단위). p.source2가 있으면 렌즈 원 안에 그 이미지가 비친다
  return function draw(ctx, source, p) {
    const W = ctx.canvas.width, H = ctx.canvas.height;
    if (canvas.width !== W || canvas.height !== H) { canvas.width = W; canvas.height = H; }
    gl.viewport(0, 0, W, H);
    gl.activeTexture(gl.TEXTURE1); gl.bindTexture(gl.TEXTURE_2D, texFor(p.source2 ?? source));  // 비쳐 보일 이미지
    gl.activeTexture(gl.TEXTURE0); gl.bindTexture(gl.TEXTURE_2D, texFor(source));
    gl.uniform2f(U.size, W, H); gl.uniform2f(U.src, source.width, source.height); gl.uniform2f(U.straight, p.hx, p.hy); gl.uniform1f(U.r, p.r);
    gl.uniform2f(U.dir, p.ux, p.uy); gl.uniform1f(U.A, p.A); gl.uniform2f(U.lens, p.mx, p.my); gl.uniform1f(U.LR, p.LR); gl.uniform1f(U.k, p.k); gl.uniform1f(U.lmin, p.lmin);
    gl.uniform1f(U.reveal, p.source2 ? p.reveal ?? 0 : 0); gl.uniform1f(U.maskR, p.maskR ?? p.LR); gl.uniform1f(U.feather, p.feather ?? 0.5);
    gl.clearColor(0, 0, 0, 0); gl.clear(gl.COLOR_BUFFER_BIT);
    gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    ctx.clearRect(0, 0, W, H); ctx.drawImage(canvas, 0, 0);
  };
}
