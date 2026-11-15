import { useId, useState } from "react";
import { createPortal } from "react-dom";
import { useLanguage } from "../i18n/Language";

/** Hover, keyboard focus or touch. Portal avoids clipping inside bounded panels. */
export function InfoTip({ label, text }: { label: string; text: string }) {
  const { t } = useLanguage();
  const id = useId();
  const [position, setPosition] = useState<{ left: number; top: number } | null>(null);
  function show(element: HTMLElement) {
    const box = element.getBoundingClientRect();
    setPosition({ left: Math.max(8, Math.min(box.left, window.innerWidth - 288)), top: Math.max(8, Math.min(box.bottom + 8, window.innerHeight - 180)) });
  }
  return <><button type="button" className="info-tip" aria-label={`${t("Explain")}: ${t(label)}`} aria-describedby={position ? id : undefined}
    onMouseEnter={e => show(e.currentTarget)} onMouseLeave={() => setPosition(null)}
    onFocus={e => show(e.currentTarget)} onBlur={() => setPosition(null)}
    onClick={e => show(e.currentTarget)} onKeyDown={e => { if (e.key === "Escape") setPosition(null); }}>i</button>
    {position && createPortal(<div id={id} role="tooltip" className="info-popup" style={position}><strong>{t(label)}</strong><p>{t(text)}</p></div>, document.body)}</>;
}
