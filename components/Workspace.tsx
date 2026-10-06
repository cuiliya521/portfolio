"use client";

import { useEffect, useRef } from "react";
import { gsap } from "gsap";
import { projects } from "@/data/projects";

function ProjectVisual({ id }: { id: string }) {
  if (id === "pangu") {
    return (
      <div className="mini-product mini-product--pangu" aria-hidden="true">
        <div className="mini-title">盘古智绘 / 素材生成</div>
        <div className="mini-columns">
          <div className="mini-form">
            {["行业", "场景", "产品主题", "风格", "构图", "平台规格"].map((x, i) => (
              <div className="mini-field" key={x}>
                <span>{x}</span>
                <b style={{ width: `${54 + (i % 3) * 11}%` }} />
              </div>
            ))}
          </div>
          <div className="mini-preview">
            <span>STRUCTURED INPUT</span>
            <strong>→</strong>
            <span>VISUAL OUTPUT</span>
          </div>
        </div>
      </div>
    );
  }

  if (id === "xhs") {
    return (
      <div className="mini-product mini-product--xhs" aria-hidden="true">
        <div className="note note--1">
          <span>HOOK</span>
          <strong>AI 一对一</strong>
          <small>场景钩子 / 同伴感</small>
        </div>
        <div className="note note--2">
          <span>VALUE</span>
          <strong>13–15 岁 · 700/月</strong>
          <small>人群 / 形态 / 价格</small>
        </div>
        <div className="note note--3">
          <span>CONVERSION</span>
          <strong>挑战一个月</strong>
          <small>行动理由</small>
        </div>
      </div>
    );
  }

  return (
    <div className="mini-product mini-product--noteguard" aria-hidden="true">
      <div className="ng-node">
        <span>RULE</span>
        <b>51.25%</b>
      </div>
      <i>→</i>
      <div className="ng-node">
        <span>SEMANTIC</span>
        <b>ARBITRATE</b>
      </div>
      <i>→</i>
      <div className="ng-node">
        <span>HUMAN</span>
        <b>DECIDE</b>
      </div>
      <i>→</i>
      <div className="ng-node ng-node--final">
        <span>RECHECK</span>
        <b>96.25%</b>
      </div>
    </div>
  );
}

export default function Workspace({ ready }: { ready: boolean }) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    if (!ready || !ref.current) return;

    const ctx = gsap.context(() => {
      gsap.fromTo(
        ".workspace-reveal",
        { opacity: 0, y: 26 },
        {
          opacity: 1,
          y: 0,
          duration: 0.9,
          stagger: 0.08,
          ease: "power3.out",
        }
      );
    }, ref);

    return () => ctx.revert();
  }, [ready]);

  return (
    <main ref={ref} className="workspace-shell">
      <header className="workspace-nav">
        <a className="workspace-brand" href="#top">
          <span className="brand-mark">CUI</span>
          <span>AI PRODUCT WORKSPACE</span>
        </a>
        <nav className="workspace-links" aria-label="主要链接">
          <a href="#work">WORK</a>
          <a href="#method">HOW I WORK</a>
          <a href="https://github.com/cuiliya521" target="_blank" rel="noreferrer">
            GITHUB ↗
          </a>
          <a
            href="https://portfolio-beryl-chi-95.vercel.app/%E5%B4%94%E4%B8%BD%E5%A8%85_AI%E4%BA%A7%E5%93%81%E8%BF%90%E8%90%A5%E4%BD%9C%E5%93%81%E9%9B%86_%E6%9C%80%E7%BB%88%E6%8A%95%E9%80%92%E7%89%88.pdf"
            target="_blank"
            rel="noreferrer"
          >
            PDF ↗
          </a>
        </nav>
      </header>

      <section className="workspace-hero" id="top">
        <div className="hero-grid" aria-hidden="true" />
        <div className="hero-copy">
          <div className="hero-overline workspace-reveal">
            <span className="signal-dot signal-dot--dark" />
            AVAILABLE FOR 2027 CAMPUS RECRUITMENT
          </div>
          <h1 className="workspace-reveal">
            把 <em>AI</em> 能力，
            <br />
            做进真实工作里。
          </h1>
          <div className="hero-bottom workspace-reveal">
            <p>
              崔丽娅
              <br />
              AI 产品运营 / 产品运营 / AI 应用产品
            </p>
            <p className="hero-thesis">
              从用户问题出发，把 AI 变成可理解、可验证、可复用的产品与工作流。
            </p>
          </div>
        </div>

        <aside className="hero-status workspace-reveal" aria-label="Portfolio status">
          <div className="status-row">
            <span>CORE PROJECTS</span>
            <strong>03</strong>
          </div>
          <div className="status-row">
            <span>INDEPENDENT AI PRODUCT</span>
            <strong>01</strong>
          </div>
          <div className="status-row">
            <span>FINAL TEST CASES</span>
            <strong>80</strong>
          </div>
          <div className="status-row status-row--live">
            <span>WORKSPACE STATUS</span>
            <strong>LIVE ●</strong>
          </div>
        </aside>

        <a className="scroll-cue workspace-reveal" href="#work">
          <span>SCROLL TO EXPLORE</span>
          <span>↓</span>
        </a>
      </section>

      <section className="method-preview" id="method">
        <p className="section-index">00 / HOW I WORK</p>
        <div className="method-track">
          {["DISCOVER", "FRAME", "BUILD", "TEST", "SHIP", "LEARN"].map((step, i) => (
            <div className="method-step" key={step}>
              <span>{String(i + 1).padStart(2, "0")}</span>
              <strong>{step}</strong>
            </div>
          ))}
        </div>
        <p className="method-note">
          AI 协作不是最后一步的“提效工具”，而是贯穿研究、原型、测试与迭代的工作方式。
        </p>
      </section>

      <section className="project-gateways" id="work">
        <div className="section-head">
          <p className="section-index">01–03 / SELECTED WORK</p>
          <h2>三个项目，三种把 AI 做进真实场景的方法。</h2>
        </div>

        <div className="gateway-list">
          {projects.map((project) => (
            <article
              className="gateway"
              key={project.id}
              style={{ "--project-accent": project.accent } as React.CSSProperties}
            >
              <div className="gateway-copy">
                <div className="gateway-meta">
                  <span>{project.index}</span>
                  <span>{project.eyebrow}</span>
                </div>
                <h3>{project.title}</h3>
                <p className="gateway-statement">{project.statement}</p>
                <p className="gateway-proof">{project.proof}</p>
                <button type="button" className="gateway-button" aria-label={`打开 ${project.title} 案例（下一阶段接入）`}>
                  <span>OPEN CASE</span>
                  <span>↗</span>
                </button>
              </div>

              <div className="gateway-visual">
                <ProjectVisual id={project.id} />
              </div>
            </article>
          ))}
        </div>
      </section>

      <footer className="phase-footer">
        <span>PHASE 01 / EXPERIENCE PROTOTYPE</span>
        <span>PROJECT CASES WILL OPEN IN PHASE 02</span>
      </footer>
    </main>
  );
}
