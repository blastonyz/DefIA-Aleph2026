import { useRef, useMemo, useCallback, useState } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import * as THREE from "three";

const vertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uAmplitude;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  vec4 permute(vec4 x){ return mod(((x*34.0)+1.0)*x, 289.0); }
  vec4 taylorInvSqrt(vec4 r){ return 1.79284291400159 - 0.85373472095314 * r; }

  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod(i, 289.0);
    vec4 p = permute(permute(permute(
              i.z + vec4(0.0, i1.z, i2.z, 1.0))
            + i.y + vec4(0.0, i1.y, i2.y, 1.0))
            + i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 1.0/7.0;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ * ns.x + ns.yyyy;
    vec4 y = y_ * ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    float slow = uTime * 0.35;
    float n1 = snoise(position * 1.4 + slow);
    float n2 = snoise(position * 2.8 - slow * 0.7) * 0.5;
    float n3 = snoise(position * 5.6 + slow * 1.3) * 0.15;
    float displacement = (n1 + n2 + n3) * uAmplitude;
    vDisplacement = displacement;

    vec3 newPosition = position + normal * displacement;

    // Recompute normal via finite differences for proper lighting
    float eps = 0.001;
    vec3 tangent1 = normalize(cross(normal, vec3(0.0, 1.0, 0.0)));
    if (length(tangent1) < 0.01) tangent1 = normalize(cross(normal, vec3(1.0, 0.0, 0.0)));
    vec3 tangent2 = normalize(cross(normal, tangent1));

    vec3 p1n = position + tangent1 * eps;
    float d1 = (snoise(p1n * 1.4 + slow) + snoise(p1n * 2.8 - slow * 0.7) * 0.5 + snoise(p1n * 5.6 + slow * 1.3) * 0.15) * uAmplitude;
    vec3 p2n = position + tangent2 * eps;
    float d2 = (snoise(p2n * 1.4 + slow) + snoise(p2n * 2.8 - slow * 0.7) * 0.5 + snoise(p2n * 5.6 + slow * 1.3) * 0.15) * uAmplitude;

    vec3 displaced1 = p1n + normal * d1;
    vec3 displaced2 = p2n + normal * d2;
    vNormal = normalize(cross(displaced1 - newPosition, displaced2 - newPosition));
    vWorldNormal = normalize(normalMatrix * vNormal);

    vPosition = (modelMatrix * vec4(newPosition, 1.0)).xyz;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(newPosition, 1.0);
  }
`;

const fragmentShader = /* glsl */ `
  uniform float uTime;
  varying vec3 vNormal;
  varying vec3 vWorldNormal;
  varying vec3 vPosition;
  varying float vDisplacement;

  void main() {
    vec3 viewDir = normalize(cameraPosition - vPosition);
    vec3 n = normalize(vWorldNormal);
    float fresnel = pow(1.0 - max(dot(viewDir, n), 0.0), 3.0);

    // DefIA web palette — dark navy core → purple → cyan peaks
    vec3 deepNavy  = vec3(0.043, 0.071, 0.125);  // #0B1220 darker-bg
    vec3 navy      = vec3(0.043, 0.239, 0.569);  // #0B3D91 navy
    vec3 purple    = vec3(0.486, 0.302, 1.0);    // #7C4DFF purple
    vec3 cyan      = vec3(0.0,   0.898, 1.0);    // #00E5FF cyan
    vec3 lightCyan = vec3(0.600, 0.941, 1.0);    // #99F0FF light cyan

    // Displacement drives color: deep navy → navy → purple → cyan peaks
    float t = vDisplacement * 1.5 + 0.5;
    vec3 baseColor = mix(deepNavy, navy, smoothstep(0.0, 0.4, t));
    baseColor = mix(baseColor, purple, smoothstep(0.4, 0.75, t));
    baseColor = mix(baseColor, cyan,   smoothstep(0.75, 1.0, t));

    // Fresnel rim — cyan edge glow with purple blend
    vec3 rimColor = mix(purple, cyan, fresnel * 0.7);
    vec3 color = mix(baseColor, rimColor, fresnel * 0.65);

    // Subsurface glow — purple inner warmth
    float sss = pow(max(dot(viewDir, -n), 0.0), 2.0) * 0.35;
    color += purple * sss;

    // Main specular — bright cyan highlight
    vec3 lightDir = normalize(vec3(2.0, 3.0, 4.0));
    vec3 halfDir = normalize(lightDir + viewDir);
    float spec = pow(max(dot(n, halfDir), 0.0), 80.0);
    color += lightCyan * spec * 0.8;

    // Secondary specular — fill light (purple tint)
    vec3 lightDir2 = normalize(vec3(-3.0, -1.0, 2.0));
    vec3 halfDir2 = normalize(lightDir2 + viewDir);
    float spec2 = pow(max(dot(n, halfDir2), 0.0), 40.0);
    color += purple * spec2 * 0.4;

    // Third specular — top rim cyan
    vec3 lightDir3 = normalize(vec3(0.0, 4.0, -1.0));
    vec3 halfDir3 = normalize(lightDir3 + viewDir);
    float spec3 = pow(max(dot(n, halfDir3), 0.0), 60.0);
    color += cyan * spec3 * 0.25;

    // Ambient rim glow — cyan
    color += cyan * fresnel * 0.15;

    gl_FragColor = vec4(color, 1.0);
  }
`;

const Sphere = ({ dragRot }: { dragRot: React.RefObject<{ x: number; y: number }> }) => {
  const meshRef = useRef<THREE.Mesh>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uAmplitude: { value: 0.18 },
    }),
    []
  );

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uTime.value = clock.getElapsedTime();

    // Gentle idle rotation + drag offset
    const d = dragRot.current;
    meshRef.current.rotation.y = clock.getElapsedTime() * 0.06 + d.x;
    meshRef.current.rotation.x = Math.sin(clock.getElapsedTime() * 0.12) * 0.08 + d.y;
  });

  return (
    <mesh ref={meshRef}>
      <icosahedronGeometry args={[1.8, 128]} />
      <shaderMaterial
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
      />
    </mesh>
  );
};

const LiquidSphere = () => {
  const dragRot = useRef({ x: 0, y: 0 });
  const isDragging = useRef(false);
  const lastMouse = useRef({ x: 0, y: 0 });
  const [grabbing, setGrabbing] = useState(false);

  const handlePointerDown = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    isDragging.current = true;
    lastMouse.current = { x: e.clientX, y: e.clientY };
    setGrabbing(true);
    (e.target as HTMLElement).setPointerCapture(e.pointerId);
  }, []);

  const handlePointerMove = useCallback((e: React.PointerEvent<HTMLDivElement>) => {
    if (!isDragging.current) return;
    const dx = e.clientX - lastMouse.current.x;
    const dy = e.clientY - lastMouse.current.y;
    dragRot.current.x += dx * 0.008;
    dragRot.current.y += dy * 0.008;
    lastMouse.current = { x: e.clientX, y: e.clientY };
  }, []);

  const handlePointerUp = useCallback(() => {
    isDragging.current = false;
    setGrabbing(false);
  }, []);

  return (
    <div
      className={`w-[420px] h-[420px] md:w-[560px] md:h-[560px] select-none ${grabbing ? "cursor-grabbing" : "cursor-grab"}`}
      onPointerDown={handlePointerDown}
      onPointerMove={handlePointerMove}
      onPointerUp={handlePointerUp}
      onPointerLeave={handlePointerUp}
    >
      <Canvas
        camera={{ position: [0, 0, 5], fov: 45 }}
        gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
        style={{ background: "transparent" }}
        dpr={[1, 2]}
      >
        <ambientLight intensity={0.25} />
        <directionalLight position={[5, 5, 5]} intensity={0.6} />
        <directionalLight position={[-3, -1, 2]} intensity={0.2} />
        <Sphere dragRot={dragRot} />
      </Canvas>
    </div>
  );
};

export default LiquidSphere;