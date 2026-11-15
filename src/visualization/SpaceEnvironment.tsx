import { useEffect, useState } from "react";
import { useThree } from "@react-three/fiber";
import { BackSide, SRGBColorSpace, TextureLoader, type Texture } from "three";
import type { EnvironmentId } from "./environment";

/** Local texture failure degrades only the surface, never the mission or entire scene. */
function useSurface(url: string) {
  const [texture, setTexture] = useState<Texture | null>(null);
  const { invalidate } = useThree();
  useEffect(() => {
    let active = true;
    const loaded = new TextureLoader().load(import.meta.env.BASE_URL + url, image => {
      if (!active) { image.dispose(); return; }
      image.colorSpace = SRGBColorSpace;
      image.anisotropy = 4;
      setTexture(image); invalidate();
    }, undefined, () => { if(active) { setTexture(null); invalidate(); } });
    return () => { active = false; loaded.dispose(); };
  }, [url, invalidate]);
  return texture;
}
export function Earth() {
  const texture = useSurface("textures/earth-blue-marble.jpg");
  return <group rotation={[0,-Math.PI/2,0]}>
    <mesh><sphereGeometry args={[3,96,64]}/><meshStandardMaterial key={texture ? "textured" : "plain"} map={texture} color={texture ? "#ffffff" : "#26577e"} roughness={.95}/></mesh>
    <mesh><sphereGeometry args={[3.045,64,40]}/><meshBasicMaterial side={BackSide} color="#438fcc" transparent opacity={.35} depthWrite={false}/></mesh>
  </group>;
}
export function Moon() {
  const texture = useSurface("textures/moon-lroc.jpg");
  return <mesh><sphereGeometry args={[1,64,40]}/><meshStandardMaterial key={texture ? "textured" : "plain"} map={texture} color={texture ? "#ffffff" : "#999895"} roughness={1}/></mesh>;
}
function Panel({x,z,wide=false}: {x:number;z:number;wide?:boolean}) {
  return <group position={[x,0,z]}>
    <mesh><boxGeometry args={[wide ? .65 : .45,.035,1.6]}/><meshStandardMaterial color="#916737" metalness={.4} roughness={.65}/></mesh>
    {Array.from({length:8},(_,i)=><mesh key={i} position={[0,.022,-.7+i*.2]}><boxGeometry args={[wide ? .61 : .41,.008,.17]}/><meshStandardMaterial color="#30374d" metalness={.25} roughness={.5}/></mesh>)}
  </group>;
}
export function Station() {
  return <group rotation={[.2,0,.1]}>
    <mesh><boxGeometry args={[4.2,.1,.1]}/><meshStandardMaterial color="#a0abb7" metalness={.6} roughness={.45}/></mesh>
    {[-1.8,-1.1,1.1,1.8].flatMap(x=>[-1,1].map(side=><Panel key={x+":"+side} x={x} z={side*1.05}/>))}
    {[-.65,0,.65].map(z=><mesh key={z} position={[0,.16,z]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.17,.17,.6,16]}/><meshStandardMaterial color="#e2e3da" roughness={.6} metalness={.2}/></mesh>)}
    <mesh position={[.36,.16,.2]} rotation={[0,0,Math.PI/2]}><cylinderGeometry args={[.14,.14,.7,16]}/><meshStandardMaterial color="#d9dedb"/></mesh>
    {[-.65,.65].map(x=><mesh key={x} position={[x,.1,0]}><boxGeometry args={[.32,.035,1.3]}/><meshStandardMaterial color="#ecece2"/></mesh>)}
    <mesh position={[-.4,.45,.2]} rotation={[0,0,-.7]}><cylinderGeometry args={[.025,.025,.8,8]}/><meshStandardMaterial color="#e7e1c3"/></mesh>
  </group>;
}
export function OtherSatellite() {
  return <group>
    <mesh><boxGeometry args={[.6,.65,.6]}/><meshStandardMaterial color="#beaa69" metalness={.65} roughness={.35}/></mesh>
    <Panel x={-1} z={0} wide/><Panel x={1} z={0} wide/>
    <mesh><boxGeometry args={[2,.04,.04]}/><meshStandardMaterial color="#b6c1ca"/></mesh>
    <mesh position={[0,.48,0]}><cylinderGeometry args={[.2,.09,.25,24]}/><meshStandardMaterial color="#e0e6ea"/></mesh>
    <mesh position={[0,0,.4]} rotation={[Math.PI/2,0,0]}><cylinderGeometry args={[.15,.15,.25,16]}/><meshStandardMaterial color="#204f69"/></mesh>
  </group>;
}
export function Debris() {
  return <group rotation={[.4,.4,.3]}>
    <mesh rotation={[0,0,1.1]}><cylinderGeometry args={[.3,.3,1.25,16,1,true]}/><meshStandardMaterial color="#aaa9a0" metalness={.5} roughness={.8}/></mesh>
    <mesh position={[.8,.4,.1]} rotation={[.2,.4,.5]}><boxGeometry args={[.45,.04,.6]}/><meshStandardMaterial color="#4b596f"/></mesh>
    <mesh position={[-.7,.5,-.2]} rotation={[.6,.3,.8]}><boxGeometry args={[.3,.2,.2]}/><meshStandardMaterial color="#afa083"/></mesh>
  </group>;
}
export function EnvironmentModel({id}: {id:EnvironmentId}) {
  if(id === "earth") return <Earth/>;
  if(id === "moon") return <Moon/>;
  if(id === "iss") return <Station/>;
  if(id === "debris") return <Debris/>;
  return <OtherSatellite/>;
}
/** Static exhibition positions: deliberately not real spacecraft tracking or conjunctions. */
export function SpaceNeighborhood({onInspect}: {onInspect?:(id:EnvironmentId)=>void}) {
  const select=(id:EnvironmentId)=>(e:{stopPropagation:()=>void})=>{e.stopPropagation();onInspect?.(id);};
  return <>
    <group onClick={select("earth")}><Earth/></group>
    <group position={[11,4,-13]} scale={1.25} onClick={select("moon")}><Moon/></group>
    <group position={[2.5,1.4,3.6]} scale={.33} rotation={[0,.4,.3]} onClick={select("iss")}><Station/></group>
    <group position={[-3.8,1.1,2]} scale={.3} onClick={select("satellite")}><OtherSatellite/></group>
    <group position={[-2.8,-1.8,-3.3]} scale={.22} onClick={select("satellite")}><OtherSatellite/></group>
    <group position={[3.2,-1.5,-2.7]} scale={.3} onClick={select("debris")}><Debris/></group>
  </>;
}
