import { useId, useState } from "react";
import { useLanguage } from "../i18n/Language";
import "./briefing-orbit.css";

const earthImage = `${import.meta.env.BASE_URL}textures/briefing-earth.jpg`;

export function BriefingOrbit() {
  const { t } = useLanguage();
  const [paused, setPaused] = useState(false);
  const id = useId();

  return (
    <figure className="briefing-orbit" data-paused={paused}>
      <svg viewBox="0 0 640 386" role="img" aria-label={t("A satellite orbiting Earth")}>
        <defs>
          <clipPath id={`${id}-globe`}><circle cx="320" cy="193" r="131.6" /></clipPath>
          <radialGradient id={`${id}-halo`}>
            <stop offset=".68" stopColor="#2076e1" stopOpacity="0" />
            <stop offset=".78" stopColor="#43aaff" stopOpacity=".28" />
            <stop offset="1" stopColor="#2076e1" stopOpacity="0" />
          </radialGradient>
          <linearGradient id={`${id}-panels`} x2=".8" y2="1">
            <stop stopColor="#81dfff" />
            <stop offset=".24" stopColor="#3477cf" />
            <stop offset="1" stopColor="#14265a" />
          </linearGradient>
          <linearGradient id={`${id}-bus`} x2="1" y2="1">
            <stop stopColor="#f9fcff" />
            <stop offset=".56" stopColor="#b4c5d4" />
            <stop offset="1" stopColor="#687d99" />
          </linearGradient>
        </defs>
        <circle cx="320" cy="193" r="172" fill={`url(#${id}-halo)`} />
        <image href={earthImage} x="187" y="60" width="266" height="266" clipPath={`url(#${id}-globe)`} />
        <g transform="rotate(-14 320 193)">
          <ellipse cx="320" cy="193" rx="272" ry="148" className="briefing-orbit-track" />
          <g className="briefing-orbit-satellite">
            <g transform="rotate(-12)">
              <path d="M-54-12H-16V12H-54Z M16-12H54V12H16Z" fill={`url(#${id}-panels)`} stroke="#9ed6ff" />
              <path d="M-44-12V12M-35-12V12M-26-12V12M26-12V12M35-12V12M44-12V12M-54 0H-16M16 0H54" fill="none" stroke="#a7d9ff" opacity=".63" strokeWidth=".7" />
              <path d="M-16 0H16" stroke="#cdddf2" strokeWidth="3" />
              <path d="M-12-16H12L17-12V13L12 18H-12Z" fill={`url(#${id}-bus)`} stroke="#edf5ff" />
              <path d="M12-16L17-12V13L12 18Z" fill="#51687e" />
              <path d="M-11-5H12V4H-11Z" fill="#d6a74b" />
              <path d="M-5-16L-11-27M1-16L8-29" stroke="#cdddf2" strokeWidth="1.5" strokeLinecap="round" />
              <circle cx="-4" cy="11" r="3.8" fill="#243d5c" stroke="#97dcff" />
              <circle cx="7" cy="-10" r="1.5" fill="#c9fa90" />
            </g>
          </g>
        </g>
      </svg>
      <figcaption>
        <span>{t("Earth imagery: NASA Blue Marble")}</span>
        <button type="button" className="briefing-motion" onClick={() => setPaused(!paused)}>
          <span aria-hidden="true">{paused ? "▶" : "Ⅱ"}</span>
          {t(paused ? "Resume orbit" : "Pause orbit")}
        </button>
      </figcaption>
    </figure>
  );
}
