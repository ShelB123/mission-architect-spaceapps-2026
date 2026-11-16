import { useLanguage } from "../i18n/Language";
import type { MissionFrame } from "../engine/game";
import { BriefingOrbit } from "./BriefingOrbit";

export function MissionOrbit({ frame, compact = false }: { frame?: MissionFrame; compact?: boolean }) {
  if (compact) return <BriefingOrbit />;
  return <OrbitSchematic frame={frame} />;
}

function OrbitSchematic({ frame }: { frame?: MissionFrame }) {
  const { t } = useLanguage();
  const angle = (frame?.orbitFraction ?? 0.08) * Math.PI * 2;
  const x = 320 + 238 * Math.cos(angle), y = 260 - 202 * Math.sin(angle);
  const linked = Boolean(frame?.contact && !frame.stationOffline && frame.batteryWh > 0);
  return <div className="orbit-stage">
    <svg viewBox="0 0 640 520" role="img" aria-label={t("Schematic orbital plane. Sunlight from the right, Earth's shadow to the left.")}>
      <defs>
        <radialGradient id="ocean"><stop stopColor="#1f7189"/><stop offset=".75" stopColor="#153f60"/><stop offset="1" stopColor="#101e36"/></radialGradient>
        <linearGradient id="night"><stop stopColor="#020a15" stopOpacity=".94"/><stop offset=".58" stopColor="#020a15" stopOpacity=".2"/><stop offset="1" stopColor="#7ae9ff" stopOpacity=".08"/></linearGradient>
        <radialGradient id="atmos"><stop offset=".7" stopColor="#51dfea" stopOpacity="0"/><stop offset=".83" stopColor="#51dfea" stopOpacity=".15"/><stop offset="1" stopColor="#51dfea" stopOpacity="0"/></radialGradient>
        <clipPath id="globe"><circle cx="320" cy="260" r="110"/></clipPath>
      </defs>
      <path d="M0 150H320V370H0Z" fill="#020611" opacity=".56"/>
      <ellipse cx="320" cy="260" rx="238" ry="202" fill="none" stroke="#4d7784" strokeWidth="1" strokeDasharray="3 8"/>
      <ellipse cx="320" cy="260" rx="254" ry="216" fill="none" stroke="#203340" strokeWidth=".6"/>
      <circle cx="320" cy="260" r="136" fill="url(#atmos)"/>
      <circle cx="320" cy="260" r="110" fill="url(#ocean)" stroke="#4ba4b5"/>
      <g clipPath="url(#globe)" fill="#3b877a" opacity=".8">
        <path d="M242 176l30-11 17 14 31-5 8 26-25 18-8 27-24-5-5-25-22-7-12-19Z"/>
        <path d="M287 248l34 1 25 28-9 28-17 33-12 24-11-12-4-40-19-30Z"/>
        <path d="M348 170l42 10 31 27-9 18-27-1-7 21-29-5-12-31Z"/>
        <path d="M355 250l35 8 16 32-22 39-21-23-16-30Z"/>
      </g>
      <circle cx="320" cy="260" r="110" fill="url(#night)"/>
      <path d="M566 168h46m-38 30h38m-47 30h47" stroke="#c7ba78" opacity=".5"/>
      <text x="564" y="150" fill="#c7ba78" fontSize="10" letterSpacing="2">{t("SUN")}</text>
      <text x="32" y="260" fill="#688496" fontSize="10" letterSpacing="2">{t("ECLIPSE")}</text>
      {linked && <path d={`M${x} ${y}L355 352`} stroke="#a9ef63" strokeWidth="2" strokeDasharray="5 6" className="downlink-beam"/>}
      <g transform={`translate(${x} ${y}) rotate(${-angle * 180 / Math.PI})`}>
        <circle r="27" fill={frame?.eclipse ? "#6077ab" : "#9cea65"} opacity=".08"/>
        <rect x="-27" y="-9" width="18" height="18" rx="2" fill="#234d75" stroke="#7dc5f2"/>
        <rect x="9" y="-9" width="18" height="18" rx="2" fill="#234d75" stroke="#7dc5f2"/>
        <rect x="-8" y="-11" width="16" height="22" rx="3" fill="#dbc9a1" stroke="#fff3c4"/>
        <path d="M-22-9V9m8-18V9M14-9V9m8-18V9" stroke="#7dc5f2" strokeWidth=".5"/>
      </g>
      <text x="320" y="458" textAnchor="middle" fill="#83a0ac" fontSize="10" letterSpacing="2">{t("ORBIT SCHEMATIC • NOT TO SCALE")}</text>
    </svg>
    <div className="orbit-badges"><span className={frame?.eclipse ? "tag amber" : "tag"}>{t(frame?.eclipse ? "In eclipse" : "Sunlit")}</span><span className={linked ? "tag lime" : "tag muted"}>{t(frame?.stationOffline ? "Station offline" : linked ? "Downlink window" : "Awaiting contact")}</span></div>
  </div>;
}
