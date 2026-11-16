import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react";
import { useThree } from "@react-three/fiber";
import { AdditiveBlending, CanvasTexture, Color, DoubleSide, FrontSide, Object3D, SRGBColorSpace, TextureLoader, Vector3, type InstancedMesh, type Texture } from "three";
import type { EnvironmentId } from "./environment";

/**
 * Illustrative space environment. Every mesh here is synthetic project
 * geometry (not NASA CAD) and every position is an exhibition layout, not
 * tracking data. Nothing in this file feeds the engines.
 */
type V3 = [number, number, number];
export const SUN_POSITION: V3 = [20, 4, 0];

/** Deterministic pseudo-random stream so the sky and debris never change between renders. */
function seeded(seed: number) {
  let state = seed >>> 0;
  return () => {
    state = (state + 0x6d2b79f5) >>> 0;
    let value = Math.imul(state ^ (state >>> 15), state | 1);
    value ^= value + Math.imul(value ^ (value >>> 7), value | 61);
    return ((value ^ (value >>> 14)) >>> 0) / 4294967296;
  };
}

interface Shape { p?: V3; r?: V3; c: string; me?: number; ro?: number; flat?: boolean; double?: boolean }
const Mat = ({ c, me = 0.35, ro = 0.6, flat, double }: Shape) => <meshStandardMaterial color={c} metalness={me} roughness={ro} flatShading={flat} side={double ? DoubleSide : FrontSide}/>;
const Box = ({ s, ...m }: Shape & { s: V3 }) => <mesh position={m.p} rotation={m.r}><boxGeometry args={s}/><Mat {...m}/></mesh>;
/** d = [top radius, bottom radius, height]. */
const Cyl = ({ d, seg = 20, open, ...m }: Shape & { d: V3; seg?: number; open?: boolean }) => <mesh position={m.p} rotation={m.r}><cylinderGeometry args={[d[0], d[1], d[2], seg, 1, open]}/><Mat {...m} double={open}/></mesh>;
const Chunk = ({ size, detail = 0, ...m }: Shape & { size: V3; detail?: number }) => <mesh position={m.p} rotation={m.r} scale={size}><icosahedronGeometry args={[1, detail]}/><Mat {...m} flat/></mesh>;
const HALF = Math.PI / 2;

/** Local texture failure degrades only the surface, never the mission or entire scene. */
function useSurface(url: string) {
  const [texture, setTexture] = useState<Texture | null>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    let active = true;
    const loaded = new TextureLoader().load(import.meta.env.BASE_URL + url, image => {
      if (!active) { image.dispose(); return; }
      image.colorSpace = SRGBColorSpace;
      image.anisotropy = 8;
      setTexture(image); invalidate();
    }, undefined, () => { if(active) { setTexture(null); invalidate(); } });
    return () => { active = false; loaded.dispose(); };
  }, [url, invalidate]);
  return texture;
}

const ATMOSPHERE_VERTEX = `varying vec3 vWorldNormal; varying vec3 vNormal; varying vec3 vView;
void main(){ vec4 mv = modelViewMatrix * vec4(position,1.0); vNormal = normalize(normalMatrix * normal); vView = normalize(-mv.xyz);
  vWorldNormal = normalize(mat3(modelMatrix) * normal); gl_Position = projectionMatrix * mv; }`;
const ATMOSPHERE_FRAGMENT = `uniform vec3 sunDirection; varying vec3 vWorldNormal; varying vec3 vNormal; varying vec3 vView;
void main(){ float rim = pow(1.0 - max(dot(vNormal, vView), 0.0), 2.6); float day = smoothstep(-0.3, 0.35, dot(vWorldNormal, sunDirection));
  vec3 tint = mix(vec3(1.0,0.45,0.2), vec3(0.32,0.62,1.0), smoothstep(0.0,0.5,day)); gl_FragColor = vec4(tint * rim * day * 1.25, rim * day); }`;

/** Blue Marble surface with a thin sunlit atmosphere rim; the night side stays dark. */
export function Earth({ sun = SUN_POSITION, inFlight = false }: { sun?: V3; inFlight?: boolean }) {
  const texture = useSurface("textures/earth-blue-marble.jpg");
  const uniforms = useMemo(() => ({ sunDirection: { value: new Vector3(...sun).normalize() } }), [sun[0], sun[1], sun[2]]);
  return <group>
    <mesh rotation={[0,-HALF,0]}>
      <sphereGeometry args={[3, inFlight ? 64 : 128, inFlight ? 40 : 96]}/>
      {inFlight
        ? <meshLambertMaterial key={texture ? "textured" : "plain"} map={texture} color={texture ? "#ffffff" : "#26577e"}/>
        : <meshStandardMaterial key={texture ? "textured" : "plain"} map={texture} color={texture ? "#ffffff" : "#26577e"} roughness={.85} metalness={.05}/>}
    </mesh>
    <mesh><sphereGeometry args={[3.07,inFlight ? 48 : 96,inFlight ? 32 : 64]}/><shaderMaterial vertexShader={ATMOSPHERE_VERTEX} fragmentShader={ATMOSPHERE_FRAGMENT} uniforms={uniforms} transparent blending={AdditiveBlending} depthWrite={false}/></mesh>
  </group>;
}
/** LROC colour map, reused as a relief map so craters catch the sunlight. */
export function Moon({ inFlight = false }: { inFlight?: boolean } = {}) {
  const texture = useSurface("textures/moon-lroc.jpg");
  return <mesh>
    <sphereGeometry args={[1, inFlight ? 24 : 96, inFlight ? 16 : 64]}/>
    {inFlight
      ? <meshLambertMaterial key={texture ? "textured" : "plain"} map={texture} color={texture ? "#ffffff" : "#999895"}/>
      : <meshStandardMaterial key={texture ? "textured" : "plain"} map={texture} bumpMap={texture} bumpScale={2.2} color={texture ? "#ffffff" : "#999895"} roughness={1} metalness={0}/>}
  </mesh>;
}

function sunGlowTexture() {
  const canvas = document.createElement("canvas"); canvas.width = canvas.height = 256;
  const context = canvas.getContext("2d");
  if (context) {
    const gradient = context.createRadialGradient(128,128,0,128,128,128);
    gradient.addColorStop(0,"rgba(255,255,255,1)"); gradient.addColorStop(.08,"rgba(255,246,214,.95)");
    gradient.addColorStop(.22,"rgba(255,214,140,.28)"); gradient.addColorStop(.55,"rgba(255,180,90,.06)"); gradient.addColorStop(1,"rgba(0,0,0,0)");
    context.fillStyle = gradient; context.fillRect(0,0,256,256);
  }
  return new CanvasTexture(canvas);
}
/** Visual Sun placed along the scene light direction. Size and distance are not to scale. */
export function Sun({ position = SUN_POSITION }: { position?: V3 }) {
  const glow = useMemo(sunGlowTexture, []);
  useEffect(() => () => glow.dispose(), [glow]);
  const place = useMemo(() => new Vector3(...position).normalize().multiplyScalar(70).toArray() as V3, [position[0], position[1], position[2]]);
  return <sprite position={place} scale={[26,26,1]}><spriteMaterial map={glow} blending={AdditiveBlending} depthWrite={false} transparent/></sprite>;
}

/** About 3,000 stars with a denser band; colours follow rough stellar temperature classes. Decorative, not a star catalogue. */
export function StarField({ radius = 80 }: { radius?: number }) {
  const { positions, colors, bright, brightColors } = useMemo(() => {
    const random = seeded(2026), tints = ["#9bb7ff", "#cfdcff", "#ffffff", "#fff3d6", "#ffd9a0", "#ffb080"];
    const make = (count: number, low: number, high: number) => {
      const points: number[] = [], shades: number[] = [], tint = new Color();
      for (let i = 0; i < count; i++) {
        const band = random() < 0.45;
        const longitude = random() * Math.PI * 2;
        const latitude = band ? (random() + random() + random() - 1.5) * 0.28 : Math.asin(2 * random() - 1);
        const direction = new Vector3(Math.cos(latitude) * Math.cos(longitude), Math.sin(latitude), Math.cos(latitude) * Math.sin(longitude)).applyAxisAngle(new Vector3(1, 0, 0.3).normalize(), 1.05);
        points.push(direction.x * radius, direction.y * radius, direction.z * radius);
        tint.set(tints[Math.floor(random() * tints.length)]).multiplyScalar(low + (high - low) * random() ** 2.5);
        shades.push(tint.r, tint.g, tint.b);
      }
      return [new Float32Array(points), new Float32Array(shades)] as const;
    };
    const [positions, colors] = make(2800, 0.18, 0.75), [bright, brightColors] = make(160, 0.8, 1.6);
    return { positions, colors, bright, brightColors };
  }, [radius]);
  return <>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[positions,3]}/><bufferAttribute attach="attributes-color" args={[colors,3]}/></bufferGeometry><pointsMaterial size={1.5} sizeAttenuation={false} vertexColors/></points>
    <points><bufferGeometry><bufferAttribute attach="attributes-position" args={[bright,3]}/><bufferAttribute attach="attributes-color" args={[brightColors,3]}/></bufferGeometry><pointsMaterial size={2.6} sizeAttenuation={false} vertexColors/></points>
  </>;
}

/** Solar wing: gold-backed blanket with rows of dark-blue cells and a centre mast. */
function Wing({ p, length = 1.6, width = .45, r }: { p: V3; length?: number; width?: number; r?: V3 }) {
  const rows = Math.round(length / .1);
  return <group position={p} rotation={r}>
    <Box s={[width,.02,length]} c="#8a6a2c" me={.55} ro={.5}/>
    {Array.from({length:rows},(_,i)=><Box key={i} p={[0,.013,-length/2+(i+.5)*(length/rows)]} s={[width*.94,.006,length/rows*.86]} c={i%5===2 ? "#1a2748" : "#111d3d"} me={.5} ro={.28}/>)}
    <Cyl p={[0,-.016,0]} r={[HALF,0,0]} d={[.014,.014,length]} seg={8} c="#c9ced6" me={.7} ro={.35}/>
  </group>;
}
function Module({ p, length, radius = .17, c = "#e4e4da", r }: { p: V3; length: number; radius?: number; c?: string; r?: V3 }) {
  return <group position={p} rotation={r}>
    <Cyl d={[radius,radius,length]} seg={24} c={c} me={.25} ro={.62}/>
    {[-.5,.5].map(side=><Cyl key={side} p={[0,side*(length/2+.03),0]} d={side>0 ? [radius*.6,radius,.06] : [radius,radius*.6,.06]} seg={24} c="#bfc4c0" me={.4} ro={.5}/>)}
    {[-.3,0,.3].map(band=><Cyl key={band} p={[0,band*length,0]} d={[radius*1.03,radius*1.03,.012]} seg={24} c="#8d949b" me={.6} ro={.4}/>)}
  </group>;
}
/** Synthetic space-station sketch: lattice truss, eight wings, radiators, modules and a docked capsule. */
export function Station() {
  return <group rotation={[.2,0,.1]}>
    <Box s={[4.5,.09,.09]} c="#7f8892" me={.65} ro={.42}/>
    {Array.from({length:23},(_,i)=><Box key={i} p={[-2.2+i*.2,0,0]} r={[0,0,i%2 ? .6 : -.6]} s={[.02,.2,.13]} c="#aab3bd" me={.7} ro={.38}/>)}
    {[-2.05,-1.4,1.4,2.05].flatMap(x=>[-1,1].map(side=><group key={x+":"+side}><Wing p={[x,0,side*1.05]}/><Cyl p={[x,0,side*.16]} r={[HALF,0,0]} d={[.03,.03,.2]} seg={10} c="#c9ced6" me={.7}/></group>))}
    {[-.75,.75].flatMap(x=>[0,1,2].map(i=><Box key={x+":"+i} p={[x+(i-1)*.02,-.02,-.36-i*.3]} r={[i%2 ? .16 : -.16,0,0]} s={[.3,.012,.3]} c="#f1f3f4" me={.1} ro={.85}/>))}
    <Module p={[0,-.22,.75]} r={[HALF,0,0]} length={.7}/>
    <Module p={[0,-.22,.1]} r={[HALF,0,0]} length={.5} radius={.19} c="#d9d6c6"/>
    <Module p={[0,-.22,-.55]} r={[HALF,0,0]} length={.7} c="#e9e9e2"/>
    <Module p={[.42,-.22,.1]} r={[0,0,HALF]} length={.55} radius={.15} c="#dfe3e6"/>
    <Module p={[-.45,-.22,.1]} r={[0,0,HALF]} length={.6} radius={.16} c="#e6e0cf"/>
    <Cyl p={[0,-.43,.1]} d={[.11,.07,.1]} seg={6} c="#3b4753" me={.5} ro={.3}/>
    <group position={[0,-.22,1.27]} rotation={[HALF,0,0]}>
      <Cyl d={[.12,.12,.22]} c="#f3f3ee" me={.2}/><Cyl p={[0,.18,0]} d={[.05,.12,.14]} c="#d8d8d0" me={.2}/>
      <Cyl p={[0,-.14,0]} d={[.12,.1,.06]} c="#5b6470" me={.5}/>
      {[-1,1].map(side=><Box key={side} p={[side*.26,-.08,0]} s={[.28,.008,.1]} c="#16224a" me={.5} ro={.3}/>)}
    </group>
    <Cyl p={[-.4,.3,.2]} r={[0,0,-.7]} d={[.018,.018,.6]} seg={8} c="#e7e1c3"/>
    <Cyl p={[-.62,.5,.2]} r={[0,0,.5]} d={[.014,.014,.4]} seg={8} c="#e7e1c3"/>
    <Cyl p={[.5,.2,-.2]} d={[.01,.01,.36]} seg={6} c="#c9ced6" me={.7}/>
    <Cyl p={[.5,.4,-.2]} r={[.5,0,0]} d={[.12,.02,.06]} seg={20} open c="#f0f2f4" me={.2}/>
  </group>;
}
/** Synthetic Earth-observation satellite: foil-wrapped bus, telescope, dish, star trackers, thrusters and two wings. */
export function OtherSatellite() {
  return <group>
    <Box s={[.6,.7,.6]} c="#b8923a" me={.75} ro={.38} flat/>
    {[-1,1].map(side=><Box key={side} p={[0,.02,side*.305]} s={[.5,.5,.012]} c="#eef1f3" me={.1} ro={.8}/>)}
    {[-.2,0,.2].map(y=><Box key={y} p={[0,y,0]} s={[.61,.012,.61]} c="#6c5a2a" me={.7} ro={.45}/>)}
    <Box p={[0,.36,0]} s={[.64,.03,.64]} c="#8d949b" me={.6} ro={.4}/><Box p={[0,-.36,0]} s={[.64,.03,.64]} c="#8d949b" me={.6} ro={.4}/>
    <group position={[0,-.05,.3]} rotation={[HALF,0,0]}>
      <Cyl p={[0,.26,0]} d={[.2,.2,.5]} seg={28} c="#f1f1ec" me={.15} ro={.7}/><Cyl p={[0,.5,0]} d={[.215,.215,.05]} seg={28} c="#22282f" me={.4}/>
      <Cyl p={[0,.5,0]} d={[.18,.18,.052]} seg={28} c="#0a1626" me={.9} ro={.12}/>
      <Cyl p={[.24,.56,0]} r={[0,0,-1.1]} d={[.2,.2,.012]} seg={28} c="#d9d9d2" me={.2}/>
    </group>
    {[-1,1].map(side=><group key={side} position={[side*.16,.42,-.16]} rotation={[-.5,0,side*.35]}><Cyl d={[.05,.04,.14]} c="#14181d" me={.3} ro={.6}/><Cyl p={[0,.071,0]} d={[.04,.04,.004]} c="#2a5d8a" me={.9} ro={.1}/></group>)}
    <Cyl p={[.1,.5,.14]} d={[.012,.012,.26]} seg={8} c="#c9ced6" me={.7}/><Cyl p={[.1,.68,.14]} r={[.35,0,-.2]} d={[.22,.03,.09]} seg={28} open c="#f2f4f5" me={.15}/>
    <Cyl p={[.1,.74,.16]} r={[.35,0,-.2]} d={[.008,.008,.12]} seg={6} c="#c9ced6" me={.7}/>
    <Cyl p={[-.18,.39,.16]} d={[.05,.05,.02]} c="#d9c38a" me={.5}/><Box p={[.2,.385,-.02]} s={[.06,.02,.06]} c="#101418" me={.2} ro={.3}/>
    {[-1,1].map(side=><group key={side}>
      <Cyl p={[side*.42,0,0]} r={[0,0,HALF]} d={[.018,.018,.26]} seg={8} c="#c9ced6" me={.7}/>
      <Box p={[side*.5,0,0]} s={[.03,.12,.03]} c="#6b7480" me={.6}/>
      <Wing p={[side*.86,0,0]} length={.62} width={.66} r={[0,HALF,0]}/><Wing p={[side*1.54,0,0]} length={.62} width={.66} r={[0,HALF,0]}/>
    </group>)}
    {[[-.25,-.25],[.25,-.25],[-.25,.25],[.25,.25]].map(([x,z])=><Cyl key={x+":"+z} p={[x,-.4,z]} d={[.012,.03,.05]} seg={12} open c="#565f6a" me={.7}/>)}
    <Cyl p={[0,-.43,0]} d={[.05,.12,.12]} seg={24} open c="#4a525c" me={.75} ro={.35}/>
  </group>;
}
const FRAGMENTS = (() => {
  const random = seeded(77), tones = ["#8f8c84", "#5b6470", "#b3a58a", "#3d4652", "#c9ced6", "#6f5b3a"];
  return Array.from({length:22}, () => ({
    p: [(random()-.5)*2.6, (random()-.5)*1.9, (random()-.5)*2.1] as V3, r: [random()*6, random()*6, random()*6] as V3,
    size: [.03+random()*.07, .015+random()*.05, .02+random()*.08] as V3, c: tones[Math.floor(random()*tones.length)],
  }));
})();
/** Synthetic debris cluster: a spent upper stage, a torn panel, insulation shreds and fragments. */
export function Debris() {
  return <group rotation={[.4,.4,.3]}>
    <group rotation={[0,0,1.1]}>
      <Cyl d={[.3,.3,1.2]} seg={28} c="#b9b8ae" me={.45} ro={.72}/>
      {[-.42,-.1,.25].map(y=><Cyl key={y} p={[0,y,0]} d={[.306,.306,.035]} seg={28} c="#4d5258" me={.55} ro={.6}/>)}
      <Cyl p={[0,.3,0]} d={[.303,.303,.26]} seg={28} c="#2b2d2f" me={.3} ro={.95}/>
      <Cyl p={[0,-.68,0]} d={[.09,.09,.18]} c="#5b6470" me={.7} ro={.4}/><Cyl p={[0,-.9,0]} d={[.1,.24,.3]} seg={28} open c="#3a3f45" me={.8} ro={.4}/>
      {Array.from({length:9},(_,i)=>{ const a=i/9*Math.PI*2; return <Box key={i} p={[Math.cos(a)*.29,.6+(i%3)*.035,Math.sin(a)*.29]} r={[(i%2 ? .5 : -.35),-a,(i%3-1)*.4]} s={[.012,.12+(i%4)*.04,.14]} c="#9a988f" me={.5} ro={.7}/>; })}
      <Cyl p={[.2,-.62,.1]} r={[.6,0,.9]} d={[.008,.008,.34]} seg={6} c="#c08a3a" me={.6}/>
    </group>
    <group position={[.85,.45,.1]} rotation={[.2,.4,.5]}><Wing p={[0,0,0]} length={.6} width={.42}/><Wing p={[.3,.05,.2]} length={.22} width={.2} r={[.5,.7,.3]}/></group>
    {[[-.75,.5,-.2,.6,.3,.8],[-.3,-.75,.4,1.2,.4,.2],[.55,-.55,-.4,.3,1.4,.9]].map(([x,y,z,a,b,c],i)=><Box key={i} p={[x,y,z]} r={[a,b,c]} s={[.26,.006,.2]} c="#d1a62e" me={.85} ro={.3} flat/>)}
    {FRAGMENTS.map((fragment,i)=><Chunk key={i} {...fragment} me={.55} ro={.6}/>)}
  </group>;
}
export function EnvironmentModel({id, sun}: {id:EnvironmentId; sun?: V3}) {
  if(id === "earth") return <Earth sun={sun}/>;
  if(id === "moon") return <Moon/>;
  if(id === "iss") return <Station/>;
  if(id === "debris") return <Debris/>;
  return <OtherSatellite/>;
}

const FIELD_COUNT = 100;
/** Static exhibition marks, with the detailed object available through the explorer. */
function DebrisField() {
  const mesh = useRef<InstancedMesh>(null);
  const fragments = useMemo(() => {
    const random = seeded(4242), tones = ["#9a988f", "#5b6470", "#c9ced6", "#b08d3c", "#3d4652", "#d8d8d0"];
    return Array.from({length:FIELD_COUNT}, () => {
      const radius = 3.35 + random() ** 1.6 * 2.3;
      return { radius, angle: random()*Math.PI*2, inclination: (random()-.5)*2.4, node: random()*Math.PI*2,
        spin: [random()*6, random()*6, random()*6] as V3, size: [.006+random()*.022, .004+random()*.014, .006+random()*.026] as V3, color: tones[Math.floor(random()*tones.length)] };
    });
  }, []);
  useLayoutEffect(() => {
    const target = mesh.current; if (!target) return;
    const dummy = new Object3D(), tint = new Color(), tilt = new Vector3(1,0,0), up = new Vector3(0,1,0);
    fragments.forEach((fragment, i) => {
      const angle = fragment.angle;
      dummy.position.set(Math.cos(angle)*fragment.radius, 0, Math.sin(angle)*fragment.radius).applyAxisAngle(tilt, fragment.inclination).applyAxisAngle(up, fragment.node);
      dummy.rotation.set(fragment.spin[0] + angle*3, fragment.spin[1] + angle*2, fragment.spin[2]);
      dummy.scale.set(...fragment.size); dummy.updateMatrix();
      target.setMatrixAt(i, dummy.matrix); target.setColorAt(i, tint.set(fragment.color));
    });
    target.instanceMatrix.needsUpdate = true;
    if (target.instanceColor) target.instanceColor.needsUpdate = true;
  }, [fragments]);
  return <instancedMesh ref={mesh} args={[undefined, undefined, FIELD_COUNT]} frustumCulled={false}><icosahedronGeometry args={[1,0]}/><meshStandardMaterial metalness={.6} roughness={.5} flatShading/></instancedMesh>;
}

/** Static exhibition positions: deliberately not real spacecraft tracking or conjunctions. */
export function SpaceNeighborhood({onInspect}: {onInspect?:(id:EnvironmentId)=>void}) {
  const select=(id:EnvironmentId)=>(e:{stopPropagation:()=>void})=>{e.stopPropagation();onInspect?.(id);};
  return <>
    <group onClick={select("earth")}><Earth inFlight/></group>
    <group position={[13,5,-16]} scale={1.3} rotation={[0,2.4,0]} onClick={select("moon")}><Moon inFlight/></group>
    <group position={[2.5,1.4,3.6]} scale={.33} rotation={[0,.4,.3]} onClick={select("iss")}>
      <Box s={[4.4,.13,.13]} c="#bfc4ce"/>
      <Cyl d={[.22,.22,1.6]} seg={10} r={[HALF,0,0]} c="#e6e6db"/>
      {[-2.05,-1.4,1.4,2.05].map(x => <Box key={x} p={[x,0,0]} s={[.42,.045,3.7]} c="#595f85"/>)}
    </group>
    <group position={[-3.8,1.1,2]} scale={.3} rotation={[.3,.8,0]} onClick={select("satellite")}>
      <Box s={[.6,.55,.55]} c="#c3c7ca"/>
      <Box s={[2.5,.04,.55]} c="#284675"/>
    </group>
    <group position={[3.2,-1.5,-2.7]} scale={.3} onClick={select("debris")}>
      <Cyl d={[.28,.36,.63]} seg={9} r={[.7,.5,0]} c="#9e988d"/>
    </group>
    <group onClick={select("debris")}><DebrisField/></group>
  </>;
}
