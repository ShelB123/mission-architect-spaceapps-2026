import { Canvas, useThree } from "@react-three/fiber";
import { useEffect } from "react";
import { PerspectiveCamera, Vector3 } from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls.js";
import { EnvironmentModel } from "./SpaceEnvironment";
import type { EnvironmentId } from "./environment";

interface Props { id: EnvironmentId; angle: number; onContextLost: () => void }
function Controls({id,onContextLost}: Pick<Props,"id"|"onContextLost">) {
  const {camera,gl,size,invalidate} = useThree();
  useEffect(()=>{
    if(!(camera instanceof PerspectiveCamera)) return;
    const radius=id === "earth" ? 3.1 : id === "iss" ? 3 : id === "satellite" ? 1.6 : 1.35;
    const halfFov=Math.min(camera.fov*Math.PI/360,Math.atan(Math.tan(camera.fov*Math.PI/360)*size.width/Math.max(1,size.height)));
    camera.position.copy(new Vector3(.6,.35,1).normalize().multiplyScalar(radius/Math.sin(halfFov)*1.12));
    camera.lookAt(0,0,0);camera.updateProjectionMatrix();invalidate();
  },[id,camera,size.width,size.height,invalidate]);
  useEffect(()=>{
    const controls=new OrbitControls(camera,gl.domElement);
    controls.enablePan=false;controls.enableZoom=false;controls.enableDamping=false;
    controls.addEventListener("change",()=>invalidate());
    const lost=(event:Event)=>{event.preventDefault();onContextLost();};
    gl.domElement.addEventListener("webglcontextlost",lost);
    return()=>{controls.dispose();gl.domElement.removeEventListener("webglcontextlost",lost);};
  },[camera,gl,invalidate,onContextLost]);
  return null;
}
export default function EnvironmentScene({id,angle,onContextLost}:Props) {
  return <Canvas frameloop="demand" dpr={[1,1.5]} camera={{fov:38,near:.1,far:100}}>
    <color attach="background" args={["#06111d"]}/><ambientLight intensity={.85}/><directionalLight position={[7,4,6]} intensity={2}/>
    <Controls id={id} onContextLost={onContextLost}/>
    <group rotation={[0,angle,0]}><EnvironmentModel id={id}/></group>
  </Canvas>;
}
