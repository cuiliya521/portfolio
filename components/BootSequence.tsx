"use client";

import { useEffect, useMemo, useState } from "react";

const bootLines = [
  ["PANGU", "product / AIGC"],
  ["XHS", "content / operation"],
  ["NOTEGUARD V5", "AI product / HITL"],
  ["FINAL TEST", "96.25%"],
  ["REAL USERS", "validated"],
] as const;

export default function BootSequence({
  onLaunch,
  launched,
}: {
  onLaunch: () => void;
  launched: boolean;
}) {
  const [visibleCount, setVisibleCount] = useState(0);
  const [ready, setReady] = useState(false);
  const [returnVisitor, setReturnVisitor] = useState(false);

  const delays = useMemo(() => [260, 560, 880, 1210, 1510], []);

  useEffect(() => {
    let seen = false;
    try {
      seen = Boolean(localStorage.getItem("cui_workspace_seen"));
    } catch {}
    setReturnVisitor(seen);

    if (seen) {
      setVisibleCount(bootLines.length);
      const timer = window.setTimeout(() => setReady(true), 260);
      return () => window.clearTimeout(timer);
    }

    const timers = delays.map((delay, index) =>
      window.setTimeout(() => setVisibleCount(index + 1), delay)
    );
    const finalTimer = window.setTimeout(() => setReady(true), 1810);

    return () => {
      timers.forEach(window.clearTimeout);
      window.clearTimeout(finalTimer);
    };
  }, [delays]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Enter" && ready && !launched) onLaunch();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [ready, launched, onLaunch]);

  const skip = () => {
    setVisibleCount(bootLines.length);
    setReady(true);
  };

  return (
    <section className="boot-shell" aria-label="Portfolio launch screen">
      <div className="launch-iris" aria-hidden="true" />
      <div className="boot-meta boot-meta--top">
        <span>CUI / 2027</span>
        <span>AI PRODUCT PORTFOLIO</span>
      </div>

      <div className="boot-card">
        <div className="boot-card__content">
          <div className="boot-kicker">
            <span className="signal-dot" />
            CUI / AI PRODUCT SYSTEM
          </div>

          <div className="boot-rule" />

          <p className="boot-loading">
            {returnVisitor ? "Welcome back. Workspace cached." : "Loading real-world work..."}
          </p>

          <div className="boot-lines" aria-live="polite">
            {bootLines.map(([label, value], index) => (
              <div
                key={label}
                className={index < visibleCount ? "boot-line is-visible" : "boot-line"}
              >
                <span>{label}</span>
                <span className="boot-dots" aria-hidden="true" />
                <strong>{value}</strong>
              </div>
            ))}
          </div>

          <div className={ready ? "boot-ready is-visible" : "boot-ready"}>
            <div className="boot-rule" />
            <div className="system-ready">
              <span>SYSTEM READY</span>
              <span className="ready-mark">●</span>
            </div>
            <button className="enter-button" onClick={onLaunch}>
              <span>ENTER WORKSPACE</span>
              <span aria-hidden="true">↗</span>
            </button>
            <p className="enter-hint">Enter ↵</p>
          </div>
        </div>
      </div>

      {!ready && !returnVisitor && (
        <button className="skip-intro" onClick={skip}>
          跳过动画
        </button>
      )}

      <div className="boot-meta boot-meta--bottom">
        <span>AI PRODUCT OPS / AI APPLICATIONS</span>
        <span>BUILT WITH AI, TESTED WITH REAL WORK</span>
      </div>
    </section>
  );
}
