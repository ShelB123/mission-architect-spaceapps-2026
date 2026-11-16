import { useEffect, useRef, useState } from "react";
import type { MissionDecision } from "../engine/missionDecisions";
import type { DecisionPreview } from "./decisionPreview";
import type { MissionFrame } from "../engine/game";
import { useLanguage } from "../i18n/Language";

const content = {
  eclipse: { title: "Eclipse ahead: you have the controls", body: "The panels now produce 0 W. Keep collecting data using the battery, or turn the camera off to reduce consumption.", a: "Keep observing", b: "Protect the battery" },
  sunrise: { title: "Back in sunlight", body: "The panels generate again. Resume observations, or keep the camera off longer to build up the energy reserve.", a: "Resume science", b: "Recharge first" },
  "station-offline": { title: "The ground station is offline", body: "This synthetic outage blocks transmission. Store more observations for later, or pause the camera to save energy. You cannot repair the ground station from orbit.", a: "Keep collecting", b: "Wait with camera off" },
  contact: { title: "Earth is listening", body: "The radio automatically transmits stored data during contact. Keep observing, or stop acquisition to reduce load. Switching the camera off does not make the radio faster.", a: "Observe and transmit", b: "Transmit stored data only" },
  calibration: { title: "Instrument calibration", body: "This synthetic event pauses acquisition. Leave the camera powered to resume automatically afterwards, or switch it off to save energy and restart it yourself later.", a: "Keep it ready", b: "Switch camera off" },
};
export function DecisionCard({ decision, onChoose, onCompare, frame }: { decision: MissionDecision; onChoose: (cameraOn: boolean) => void; onCompare?: () => DecisionPreview; frame?: MissionFrame }) {
  const { t } = useLanguage();
  const [preview,setPreview]=useState<DecisionPreview|null>(null);
  const [previewError,setPreviewError]=useState(false);
  useEffect(()=>{setPreview(null);setPreviewError(false);},[decision.id]);
  const card = useRef<HTMLElement>(null);
  const text = content[decision.kind];
  useEffect(() => { card.current?.focus(); }, [decision.id]);
  return <section className="decision-card" data-comparing={Boolean(preview)} ref={card} tabIndex={-1} role="region" aria-label={t("Your decision")}>
    <div className="eyebrow">{t("TIME FROZEN · YOUR DECISION")}</div><h2>{t(text.title)}</h2><p className="decision-body">{t(text.body)}</p>
    <div className="decision-options"><button onClick={() => onChoose(true)}><span>◉</span>{t(text.a)}<small>{t("Camera powered · more energy demand")}</small></button><button onClick={() => onChoose(false)}><span>☾</span>{t(text.b)}<small>{t("Less load · no new observations")}</small></button></div>
    {onCompare && <button className="secondary decision-preview-toggle" aria-expanded={Boolean(preview)} onClick={()=>{if(preview){setPreview(null);return;}try{setPreview(onCompare());setPreviewError(false);}catch{setPreviewError(true);}}}>{t(preview ? "Hide comparison" : "Compare before deciding")}</button>}
    {previewError && <p role="status">{t("Comparison unavailable. You can still choose an order.")}</p>}
    {preview && frame && <><div className="decision-preview" role="region" aria-label={t("Calculated comparison")}>
      {([["Camera on",preview.observing],["Camera off",preview.saving]] as const).map(([label,end])=><div key={label}><strong>{t(label)}</strong><span>{end.batteryWh.toFixed(1)} Wh · {t("battery at end")}</span><span>+{Math.max(0,end.producedMB-frame.producedMB).toFixed(1)} MB · {t("collected")}</span><span>+{Math.max(0,end.transmittedMB-frame.transmittedMB).toFixed(1)} MB · {t("delivered")}</span></div>)}
    </div><p className="decision-assumption">{t("Calculated horizon:")} {((preview.untilSeconds-frame.timeSeconds)/60).toFixed(1)} {t("min. Hold each setting; no later orders. Inspecting does not issue a command.")}</p></>}
  </section>;
}
