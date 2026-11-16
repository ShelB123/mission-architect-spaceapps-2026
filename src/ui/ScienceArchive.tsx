import { useLanguage } from "../i18n/Language";

/** A visual data-delivery counter, deliberately not a coverage map. */
export function ScienceArchive({ returnedMB, targetMB }: { returnedMB: number; targetMB: number }) {
  const { t } = useLanguage();
  const delivered = Math.min(12, Math.floor(Math.max(0, returnedMB) / targetMB * 12));
  return <section className="science-archive" aria-label={t("Observation archive")}>
    <div className="archive-heading"><strong>{t("Bring the picture home")}</strong><span>{delivered}/12</span></div>
    <div className="archive-tiles" aria-label={`${delivered}/12`}>
      {Array.from({length:12}, (_,index) => <div key={index} className={index < delivered ? "received" : "locked"}>
        <svg viewBox="0 0 90 50" aria-hidden="true"><path d={`M0 ${18+index%3*5} Q25 2 50 27 T100 8 V50 H0Z`} fill="#45806a"/><path d="M20 0 Q75 20 34 50" stroke="#8bd8e3" strokeWidth="10" fill="none"/></svg><span>{index < delivered ? "✓" : "·"}</span>
      </div>)}
    </div><small>{t("Each tile = 1/12 of the data goal received. Fictional illustration, not geographic coverage.")}</small>
  </section>;
}
