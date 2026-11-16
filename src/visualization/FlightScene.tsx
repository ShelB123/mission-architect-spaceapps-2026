/** Presentation only: normalized scene units, exaggerated spacecraft, no flight dynamics. */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { memo, useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Group } from "three";
import { SpaceNeighborhood, StarField, Sun, SUN_POSITION } from "./SpaceEnvironment";
import type { EnvironmentId } from "./environment";
import { Assembly } from "./SpacecraftScene";
import type { SpacecraftVisualModel } from "./types";
import { displayTurns, useOrbitTween } from "./orbitMotion";

export interface FlightSceneProps {
  model: SpacecraftVisualModel; orbitTurns: number; moving: boolean; eclipse: boolean; contact: boolean;
  view: "onboard" | "chase"; onInspect?: (id: EnvironmentId) => void; onContextLost: () => void;
}

const cameraSettings = { fov: 65, near: .01, far: 200 };
const graphics = { antialias: false, powerPreference: "high-performance" } as const;
const MAX_FLIGHT_PIXELS = 430_000;
const ORBIT_RADIUS = 4.2;

const Exhibit = memo(function Exhibit({ onInspect }: Pick<FlightSceneProps, "onInspect">) {
  return <><StarField/><Sun/><SpaceNeighborhood onInspect={onInspect}/></>;
});
const FlightAssembly = memo(function FlightAssembly({ model }: Pick<FlightSceneProps, "model">) {
  return <group scale={2}><Assembly model={model} schematic={false} reducedMotion/></group>;
});

function World({ model, orbitTurns, moving, eclipse, contact, view, onContextLost, onInspect }: FlightSceneProps) {
  const { camera, gl, invalidate } = useThree();
  const ship = useRef<Group>(null);
  const tween = useOrbitTween(orbitTurns, moving);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); onContextLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  useLayoutEffect(() => { invalidate(); }, [orbitTurns, moving, view, invalidate]);
  useFrame(() => {
    const now = performance.now();
    const phase = displayTurns(tween.current, now) * Math.PI * 2;
    const x = Math.cos(phase), z = Math.sin(phase);
    ship.current?.position.set(ORBIT_RADIUS * x, 0, ORBIT_RADIUS * z);
    if (ship.current) ship.current.rotation.y = Math.PI / 2 - phase;

    if (view === "onboard") {
      camera.position.set(4.12 * x, 0, 4.12 * z);
      camera.up.set(-z, 0, x);
      camera.lookAt(.6 * x - 1.7 * z, 0, .6 * z + 1.7 * x);
    } else {
      camera.position.set(6.3 * x + 2.2 * z, 1.6, 6.3 * z - 2.2 * x);
      camera.up.set(0, 1, 0);
      camera.lookAt(2.94 * x, 0, 2.94 * z);
    }
    if (now < tween.current.endsAt) invalidate();
  });
  return <>
    <color attach="background" args={["#000003"]}/><ambientLight intensity={.045}/><directionalLight position={SUN_POSITION} intensity={3.4} color="#fff6e8"/>
    <hemisphereLight args={["#31517a", "#000000", .12]}/>
    <Exhibit onInspect={onInspect}/>
    <group ref={ship}>
      {view === "chase" && <FlightAssembly model={model}/>}
      {view === "chase" && contact && <mesh rotation={[Math.PI/2,0,0]}><coneGeometry args={[.15,1.1,16,1,true]}/><meshBasicMaterial color="#9fffe0" transparent opacity={.35}/></mesh>}
      <pointLight position={[0,.5,.6]} color={eclipse ? "#6f93c9" : "#ffffff"} intensity={eclipse ? .9 : .5} distance={3}/>
    </group>
  </>;
}
export default function FlightScene(props: FlightSceneProps) {
  const host = useRef<HTMLDivElement>(null);
  const [pixelRatio, setPixelRatio] = useState(1);
  useLayoutEffect(() => {
    const element = host.current;
    if (!element) return;
    const resize = () => {
      const pixels = Math.max(1, element.clientWidth * element.clientHeight);
      setPixelRatio(Math.min(1, Math.sqrt(MAX_FLIGHT_PIXELS / pixels)));
    };
    resize();
    const observer = new ResizeObserver(resize);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);
  return <div ref={host}>
    <Canvas frameloop="demand" dpr={pixelRatio} camera={cameraSettings} gl={graphics}><World {...props}/></Canvas>
  </div>;
}
