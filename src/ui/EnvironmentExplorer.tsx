import { Component, lazy, Suspense, useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/Language";
import { environmentEntries, type EnvironmentId } from "../visualization/environment";
import "./environment-explorer.css";
const Scene=lazy(()=>import("../visualization/EnvironmentScene"));
class SceneBoundary extends Component<{children:ReactNode;fallback:ReactNode;onFailure:()=>void},{failed:boolean}> {
  state={failed:false};
  static getDerivedStateFromError(){return {failed:true};}
  componentDidCatch(){this.props.onFailure();}
  render(){return this.state.failed ? this.props.fallback : this.props.children;}
}
export function EnvironmentExplorer({initialId,supported,onClose}: {initialId:EnvironmentId;supported:boolean;onClose:()=>void}) {
  const {language}=useLanguage();const es=language === "es";
  const [id,setId]=useState(initialId);const [angle,setAngle]=useState(0);const [lost,setLost]=useState(false);
  const [page,setPage]=useState<"fact"|"lesson">("fact");
  const dialog=useRef<HTMLDivElement>(null);
  const entry=environmentEntries.find(e=>e.id === id)!;
  const contextLost=useCallback(()=>setLost(true),[]);
  useEffect(()=>{
    const origin=document.activeElement as HTMLElement|null;
    const cockpit=document.querySelector<HTMLElement>(".cockpit");
    const wasInert=cockpit?.inert ?? false;
    if(cockpit)cockpit.inert=true;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return()=>{if(cockpit)cockpit.inert=wasInert;origin?.focus();};
  },[]);
  const fallback=<div className="environment-fallback"><span aria-hidden="true">{id === "earth" ? "🌍" : id === "moon" ? "☾" : "◇"}</span><p>{es ? "Vista 3D no disponible. Las fichas siguen accesibles." : "3D unavailable. The reference cards remain accessible."}</p></div>;
  return createPortal(<div ref={dialog} className="environment-overlay" role="dialog" aria-modal="true" aria-label={es ? "Explorar el espacio" : "Explore space"} onKeyDown={event=>{
    if(event.key === "Escape"){event.stopPropagation();onClose();}
    if(event.key === "Tab"){
      const items=[...(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]") ?? [])];
      const first=items[0],last=items.at(-1);
      if(event.shiftKey && document.activeElement === first){event.preventDefault();last?.focus();}
      else if(!event.shiftKey && document.activeElement === last){event.preventDefault();first?.focus();}
    }
  }}>
    <section className="environment-window">
      <header><div><span className="eyebrow">{es ? "EXPLORADOR · MISIÓN EN PAUSA" : "EXPLORER · MISSION PAUSED"}</span><h2>{es ? "Conoce tu vecindario espacial" : "Meet your space neighborhood"}</h2></div><button onClick={onClose} aria-label={es ? "Volver a la misión" : "Return to mission"}>✕</button></header>
      <nav aria-label={es ? "Objetos espaciales" : "Space objects"}>{environmentEntries.map(item=><button key={item.id} aria-pressed={id === item.id} onClick={()=>{setId(item.id);setAngle(0);setPage("fact");}}>{item.id === "iss" ? "ISS" : item.name[language]}</button>)}</nav>
      <div className="environment-body">
        <div className="environment-preview" role="group" aria-label={entry.name[language]}>
          {!supported || lost ? fallback : <SceneBoundary fallback={fallback} onFailure={contextLost}><Suspense fallback={<p className="environment-loading">{es ? "Preparando vista…" : "Preparing view…"}</p>}><Scene id={id} angle={angle} onContextLost={contextLost}/></Suspense></SceneBoundary>}
          {supported && !lost && <div className="environment-rotate"><button aria-label={es ? "Girar a la izquierda" : "Rotate left"} onClick={()=>setAngle(a=>a-.4)}>↶</button><span>{es ? "Arrastra para girar" : "Drag to rotate"}</span><button aria-label={es ? "Girar a la derecha" : "Rotate right"} onClick={()=>setAngle(a=>a+.4)}>↷</button></div>}
        </div>
        <article className="environment-card" aria-live="polite"><span className="eyebrow">{es ? "BITÁCORA ESPACIAL" : "SPACE FIELD GUIDE"}</span><h3>{entry.name[language]}</h3>
          <div className="environment-pages"><button aria-pressed={page === "fact"} onClick={()=>setPage("fact")}>{es ? "Qué es" : "What is it?"}</button><button aria-pressed={page === "lesson"} onClick={()=>setPage("lesson")}>{es ? "Tu misión" : "Your mission"}</button></div>
          <p>{entry[page][language]}</p><a href={entry.source} target="_blank" rel="noreferrer">{es ? "Fuente NASA ↗" : "NASA source ↗"}</a><small>{entry.credit}</small>
        </article>
      </div>
      <footer>{es ? "Escena ilustrativa, sin posiciones reales ni colisiones calculadas. Escalas adaptadas. Cierra y reanuda cuando quieras." : "Illustrative scene, no live positions or calculated collisions. Adapted scales. Close and resume when ready."}</footer>
    </section>
  </div>,document.body);
}
