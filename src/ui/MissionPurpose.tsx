import { useEffect,useRef,useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/Language";
import "./mission-purpose.css";
const pages=[
 ["Operation Riverwatch","A fictional valley has flooded. The ground team needs satellite observations to study the affected area. Your task: return 250 MB and keep the satellite powered."],
 ["Your engineering challenge","The repair satellite starts with a demanding camera and a small energy supply. Change its hardware, schedule camera-off intervals, or combine both. There is more than one solution."],
 ["Inspired by real Earth observation","NASA and USGS Landsat observations support disaster analysis and flood mapping. This exercise measures delivery of synthetic data; it does not detect floods, calculate coverage, or estimate lives saved."]
];
export function MissionPurpose({onStart,onClose}:{onStart:()=>void;onClose:()=>void}){
 const {t}=useLanguage();const [page,setPage]=useState(0);const panel=useRef<HTMLDivElement>(null);
 useEffect(()=>{const origin=document.activeElement as HTMLElement|null;const cockpit=document.querySelector<HTMLElement>(".cockpit");const was=cockpit?.inert??false;if(cockpit)cockpit.inert=true;panel.current?.querySelector<HTMLButtonElement>("button")?.focus();return()=>{if(cockpit)cockpit.inert=was;origin?.focus();};},[]);
 return createPortal(<div className="purpose-overlay" ref={panel} role="dialog" aria-modal="true" aria-label={t("Flood response briefing")} onKeyDown={e=>{
 if(e.key==="Escape")onClose();
 if(e.key==="Tab"){const items=[...(panel.current?.querySelectorAll<HTMLElement>("button:not(:disabled),a[href]")??[])];const first=items[0],last=items.at(-1);if(e.shiftKey&&document.activeElement===first){e.preventDefault();last?.focus();}else if(!e.shiftKey&&document.activeElement===last){e.preventDefault();first?.focus();}}
 }}><section><header><span className="eyebrow">{t("MISSION REQUEST · FICTIONAL EXERCISE")}</span><button aria-label={t("Close briefing")} onClick={onClose}>✕</button></header>
 <svg className="riverwatch-art" viewBox="0 0 600 120" aria-hidden="true"><rect width="600" height="120" fill="#1d443e"/><path d="M0 20Q180 110 300 45T600 90" fill="none" stroke="#285e79" strokeWidth="70"/><path d="M0 20Q180 110 300 45T600 90" fill="none" stroke="#96dce6" strokeWidth="18"/>{[50,190,330,470].map((x,i)=><g key={x} transform={`translate(${x},${i%2?85:18})`}><rect width="22" height="18" fill="#e1d2a6"/><path d="M-4 0L11 -12L26 0" fill="#c88663"/></g>)}</svg>
 <h2>{t(pages[page][0])}</h2><p>{t(pages[page][1])}</p>
 {page===2&&<a href="https://science.nasa.gov/mission/landsat/benefits/disaster-management/" target="_blank" rel="noreferrer">{t("Read the NASA example ↗")}</a>}
 <nav><button disabled={page===0} onClick={()=>setPage(p=>p-1)}>{t("Previous")}</button><span>{page+1}/3</span><button disabled={page===2} onClick={()=>setPage(p=>p+1)}>{t("Next")}</button></nav>
 <button className="primary" onClick={onStart}>{t("Accept the repair mission")}</button><small>{t("Synthetic challenge · 250 MB · no power outages · same mission rules")}</small>
 </section></div>,document.body);
}
