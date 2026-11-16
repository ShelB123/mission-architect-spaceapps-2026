/** Presentation only: normalized scene units, exaggerated spacecraft, no flight dynamics. */
import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { Vector3 } from "three";
import { SpaceNeighborhood, StarField, Sun, SUN_POSITION } from "./SpaceEnvironment";
import type { EnvironmentId } from "./environment";
import { Assembly } from "./SpacecraftScene";
import type { SpacecraftVisualModel } from "./types";

export interface FlightSceneProps {
  model: SpacecraftVisualModel; orbitFraction: number; eclipse: boolean; contact: boolean;
  view: "onboard" | "chase"; onInspect?: (id: EnvironmentId) => void; onContextLost: () => void;
}

function ViewCamera({ phase, view, onContextLost }: { phase: number; view: FlightSceneProps["view"]; onContextLost: () => void }) {
  const { camera, gl, invalidate } = useThree();
  useEffect(() => {
    const radial = new Vector3(Math.cos(phase), 0, Math.sin(phase));
    const tangent = new Vector3(-Math.sin(phase), 0, Math.cos(phase));
    const satellite = radial.clone().multiplyScalar(4.2);
    if (view === "onboard") {
      camera.position.copy(satellite.clone().addScaledVector(radial, -.08));
      camera.up.copy(tangent);
      camera.lookAt(radial.clone().multiplyScalar(.6).addScaledVector(tangent,1.7));
    } else {
      camera.position.copy(satellite.clone().addScaledVector(radial, 2.1).addScaledVector(tangent, -2.2));
      camera.position.y = 1.6;
      camera.up.set(0, 1, 0);
      camera.lookAt(satellite.clone().multiplyScalar(.7));
    }
    invalidate();
  }, [camera, phase, view, invalidate]);
  useEffect(() => {
    const canvas = gl.domElement;
    const lost = (e: Event) => { e.preventDefault(); onContextLost(); };
    canvas.addEventListener("webglcontextlost", lost);
    return () => canvas.removeEventListener("webglcontextlost", lost);
  }, [gl, onContextLost]);
  return null;
}


function World({ model, orbitFraction, eclipse, contact, view, onContextLost, onInspect }: FlightSceneProps) {
  const phase = orbitFraction * Math.PI * 2;
  return <><ViewCamera phase={phase} view={view} onContextLost={onContextLost}/>
    <color attach="background" args={["#000003"]}/><ambientLight intensity={.045}/><directionalLight position={SUN_POSITION} intensity={3.4} color="#fff6e8"/>
    <hemisphereLight args={["#31517a", "#000000", .12]}/>
    <StarField/><Sun/>
    <SpaceNeighborhood onInspect={onInspect} phase={phase}/>
    <group position={[4.2*Math.cos(phase),0,4.2*Math.sin(phase)]} rotation={[0,-phase+Math.PI/2,0]}>
      {view === "chase" && <group scale={2}><Assembly model={model} schematic={false} reducedMotion/></group>}
      {view === "chase" && contact && <mesh rotation={[Math.PI/2,0,0]}><coneGeometry args={[.15,1.1,16,1,true]}/><meshBasicMaterial color="#9fffe0" transparent opacity={.35}/></mesh>}
      <pointLight position={[0,.5,.6]} color={eclipse ? "#6f93c9" : "#ffffff"} intensity={eclipse ? .9 : .5} distance={3}/>
    </group>
  </>;
}
export default function FlightScene(props: FlightSceneProps) {
  return <Canvas frameloop="demand" dpr={[1,1.5]} camera={{fov:65,near:.01,far:200}} gl={{antialias:true,powerPreference:"default"}}><World {...props}/></Canvas>;
}
