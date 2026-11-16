import { useEffect, useRef, useState } from "react";
import { useLanguage } from "../i18n/Language";

export interface DetailReport {
  title: string;
  lines: readonly string[];
  source?: { label: string; url: string };
}

/** One explanation per page keeps the complete report available without scrolling. */
export function DetailDialog({ title, lines, source, onClose }: DetailReport & { onClose: () => void }) {
  const { t } = useLanguage();
  const [page, setPage] = useState(0);
  const dialog = useRef<HTMLDivElement>(null);
  const pageText = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    const origin = document.activeElement as HTMLElement | null;
    dialog.current?.querySelector<HTMLButtonElement>("button")?.focus();
    return () => origin?.focus();
  }, []);

  function goToPage(index: number) {
    if (index === 0 || index === lines.length - 1) {
      // The pressed navigation button becomes disabled at this end of the report.
      pageText.current?.focus();
    }
    setPage(index);
  }

  return <div className="detail-overlay" role="dialog" aria-modal="true" aria-label={t(title)} ref={dialog} onKeyDown={e => {
    if (e.key === "Escape") onClose();
    if (e.key === "Tab") {
      const focusable = [...(dialog.current?.querySelectorAll<HTMLElement>("button:not(:disabled), a[href]") ?? [])];
      const first = focusable[0], last = focusable.at(-1);
      if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last?.focus(); }
      else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first?.focus(); }
    }
  }}>
    <section>
      <button className="close-help icon-button" aria-label={t("Close details")} onClick={onClose}>×</button>
      <h2>{t(title)}</h2>
      <p className="detail-page" ref={pageText} tabIndex={-1} aria-live="polite">{t(lines[page] ?? "No additional details.")}</p>
      <nav aria-label={t("Report pages")}>
        <button disabled={page === 0} onClick={() => goToPage(page - 1)}>{t("Previous")}</button>
        <span>{page + 1}/{Math.max(1, lines.length)}</span>
        <button disabled={page >= lines.length - 1} onClick={() => goToPage(page + 1)}>{t("Next")}</button>
      </nav>
      {source && <a className="nasa-source-link" href={source.url} target="_blank" rel="noreferrer">{t(source.label)}</a>}
    </section>
  </div>;
}
