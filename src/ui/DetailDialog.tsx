import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/Language";

/** One explanation per page keeps the complete report available without scrolling. */
export function DetailDialog({ title, lines, onClose }: { title: string; lines: readonly string[]; onClose: () => void }) {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => origin?.focus();
  }, []);
  return <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={t(title)} ref={dialog} onKeyDown={e => {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      const buttons = [...(dialog.current?.querySelectorAll<HTMLButtonElement>("button:not(:disabled)") ?? [])];
      const first = buttons[0], last = buttons.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}><section><button className="close-help icon-button" aria-label={t("Close details")} onClick={onClose}>×</button><h2>{t(title)}</h2><p className="detail-page">{t(lines[page] ?? "No additional details.")}</p><nav aria-label={t("Report pages")}><button disabled={page === 0} onClick={() => setPage(p => p-1)}>{t("Previous")}</button><span>{page+1}/{Math.max(1,lines.length)}</span><button disabled={page >= lines.length-1} onClick={() => setPage(p => p+1)}>{t("Next")}</button></nav></section></div>;
}
