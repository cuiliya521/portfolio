"use client";

import { useEffect, useRef, useState } from "react";
import { gsap } from "gsap";
import BootSequence from "./BootSequence";
import Workspace from "./Workspace";

export default function PortfolioExperience() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [launched, setLaunched] = useState(false);
  const [workspaceVisible, setWorkspaceVisible] = useState(false);

  useEffect(() => {
    if (!rootRef.current) return;
    const ctx = gsap.context(() => {
      gsap.set(".workspace-shell", { opacity: 0 });
    }, rootRef);
    return () => ctx.revert();
  }, []);

  const launch = () => {
    if (launched || !rootRef.current) return;
    setLaunched(true);

    const tl = gsap.timeline({
      defaults: { ease: "power4.inOut" },
      onComplete: () => {
        setWorkspaceVisible(true);
        try {
          localStorage.setItem("cui_workspace_seen", "1");
        } catch {}
      },
    });

    tl.to(".boot-card", {
      scale: 1.035,
      duration: 0.35,
    })
      .to(
        ".boot-card__content",
        {
          opacity: 0,
          y: -18,
          duration: 0.36,
        },
        "<"
      )
      .to(".launch-iris", {
        scale: 1,
        borderRadius: "0%",
        duration: 0.95,
      })
      .to(
        ".boot-shell",
        {
          opacity: 0,
          duration: 0.24,
          pointerEvents: "none",
        },
        "-=0.18"
      )
      .to(
        ".workspace-shell",
        {
          opacity: 1,
          duration: 0.48,
        },
        "-=0.2"
      );
  };

  return (
    <div ref={rootRef} className={launched ? "experience is-launched" : "experience"}>
      <Workspace ready={workspaceVisible} />
      <BootSequence onLaunch={launch} launched={launched} />
    </div>
  );
}
