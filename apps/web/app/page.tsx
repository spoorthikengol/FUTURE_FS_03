"use client";

import {
  ArrowDown,
  ArrowRight,
  BrainCircuit,
  CalendarClock,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  GitBranch,
  ShieldCheck,
  Sparkles,
  Target,
  Users,
  Zap,
} from "lucide-react";
import Link from "next/link";
import { ReactNode, useEffect, useState } from "react";

const decisions = [
  {
    number: "01",
    label: "ACCEPT",
    description: "A safe placement exists with no meaningful downstream disruption.",
    tone: "accept",
  },
  {
    number: "02",
    label: "ACCEPT WITH WARNING",
    description: "The walk-in fits but introduces a manageable schedule consequence.",
    tone: "warning",
  },
  {
    number: "03",
    label: "WAIT",
    description: "A safer placement becomes available after a short wait.",
    tone: "wait",
  },
  {
    number: "04",
    label: "RESCHEDULE",
    description: "Accepting now would put existing commitments at unacceptable risk.",
    tone: "reschedule",
  },
];

const intelligence = [
  {
    number: "01",
    title: "LIVE CAPACITY",
    text: "See stylist availability, current bookings and usable time before making a decision.",
    icon: Users,
  },
  {
    number: "02",
    title: "SERVICE FIT",
    text: "Match the requested service against stylist skills and available operating time.",
    icon: Target,
  },
  {
    number: "03",
    title: "CASCADE IMPACT",
    text: "Understand whether accepting now creates delay for appointments already promised.",
    icon: GitBranch,
  },
  {
    number: "04",
    title: "SCHEDULE PROTECTION",
    text: "Protect existing customers instead of treating an empty-looking slot as automatically safe.",
    icon: ShieldCheck,
  },
];

function SectionLabel({
  number,
  children,
}: {
  number: string;
  children: ReactNode;
}) {
  return (
    <div className="salora-section-label">
      <span>{number}</span>
      <i />
      <strong>{children}</strong>
    </div>
  );
}

function EditorialStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="salora-editorial-step salora-reveal">
      <span className="salora-step-number">{number}</span>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>

      <ChevronRight size={16} />
    </article>
  );
}

function TimelineRow({
  time,
  label,
  service,
  state,
}: {
  time: string;
  label: string;
  service: string;
  state: "booked" | "open" | "walkin";
}) {
  return (
    <div className={`salora-timeline-row ${state}`}>
      <span className="salora-time">{time}</span>

      <span className="salora-timeline-marker">
        <i />
      </span>

      <div className="salora-timeline-copy">
        <small>{label}</small>
        <strong>{service}</strong>
      </div>
    </div>
  );
}

function EngineStep({
  number,
  title,
  children,
}: {
  number: string;
  title: string;
  children: ReactNode;
}) {
  return (
    <div className="salora-engine-step">
      <div className="salora-engine-step-number">{number}</div>

      <div>
        <small>{title}</small>
        <span>{children}</span>
      </div>
    </div>
  );
}

function IntelligenceItem({
  number,
  title,
  text,
  icon: Icon,
}: (typeof intelligence)[number]) {
  return (
    <article className="salora-intelligence-item salora-reveal">
      <div className="salora-intelligence-top">
        <span>{number}</span>
        <Icon size={18} strokeWidth={1.4} />
      </div>

      <div className="salora-intelligence-line" />

      <h3>{title}</h3>
      <p>{text}</p>
    </article>
  );
}

export default function HomePage() {
  const [visibleSections, setVisibleSections] = useState(false);

  useEffect(() => {
    const elements = document.querySelectorAll(".salora-reveal");

    if (!("IntersectionObserver" in window)) {
      elements.forEach((element) => element.classList.add("is-visible"));
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            entry.target.classList.add("is-visible");
            observer.unobserve(entry.target);
          }
        });
      },
      {
        threshold: 0.12,
        rootMargin: "0px 0px -60px 0px",
      },
    );

    elements.forEach((element) => observer.observe(element));

    setVisibleSections(true);

    return () => observer.disconnect();
  }, []);

  return (
    <>
      <style>{`
        :root {
          --salora-bg: #0e0c0a;
          --salora-espresso: #1a1410;
          --salora-espresso-2: #211812;
          --salora-charcoal: #171513;
          --salora-panel: rgba(22, 18, 14, .92);
          --salora-gold: #d4af37;
          --salora-gold-light: #f5e6c8;
          --salora-champagne: #f5f0e8;
          --salora-white: #faf7f0;
          --salora-muted: #b9ada0;
          --salora-dim: #82766b;
          --salora-green: #9bc7a7;
          --salora-red: #c56b70;
          --salora-line: rgba(245, 240, 232, .1);
        }

        * {
          box-sizing: border-box;
        }

        html {
          scroll-behavior: smooth;
        }

        body {
          margin: 0;
          background: var(--salora-bg);
          color: var(--salora-white);
        }

        a {
          color: inherit;
          text-decoration: none;
        }

        button,
        a {
          -webkit-tap-highlight-color: transparent;
        }

        .salora-page {
          min-height: 100vh;
          overflow: hidden;
          background:
            radial-gradient(
              circle at 78% 8%,
              rgba(212,175,55,.055),
              transparent 28%
            ),
            var(--salora-bg);
          font-family:
            Inter,
            ui-sans-serif,
            system-ui,
            -apple-system,
            BlinkMacSystemFont,
            "Segoe UI",
            sans-serif;
        }

        .salora-page::selection {
          background: rgba(212,175,55,.3);
          color: var(--salora-white);
        }

        /* =========================================================
           GLOBAL
        ========================================================== */

        .salora-section {
          position: relative;
          padding: 135px 0;
          background: var(--salora-bg);
        }

        .salora-section-inner,
        .salora-principle-inner,
        .salora-cta-inner,
        .salora-footer-inner {
          width: min(100% - 72px, 1240px);
          margin: 0 auto;
        }

        .salora-section-label {
          display: flex;
          align-items: center;
          gap: 13px;
          margin-bottom: 60px;
          color: rgba(245,240,232,.52);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .19em;
        }

        .salora-section-label span {
          color: var(--salora-gold);
          font-variant-numeric: tabular-nums;
        }

        .salora-section-label i {
          display: block;
          width: 34px;
          height: 1px;
          background: rgba(212,175,55,.48);
        }

        .salora-section-label strong {
          font-weight: 700;
        }

        .salora-display-title {
          margin: 0;
          color: var(--salora-champagne);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(56px, 6.3vw, 96px);
          font-weight: 400;
          letter-spacing: -.055em;
          line-height: .94;
        }

        .salora-display-title em {
          color: var(--salora-gold);
          font-style: italic;
        }

        .salora-body {
          max-width: 540px;
          margin: 34px 0 0;
          color: rgba(245,240,232,.58);
          font-size: 14px;
          line-height: 1.85;
        }

        .salora-reveal {
          opacity: 0;
          transform: translateY(35px);
          transition:
            opacity .8s ease,
            transform .9s cubic-bezier(.2,.7,.2,1);
        }

        .salora-reveal.is-visible {
          opacity: 1;
          transform: translateY(0);
        }

        /* =========================================================
           HERO
        ========================================================== */

        .salora-hero {
          position: relative;
          min-height: 100svh;
          isolation: isolate;
          overflow: hidden;
          background: #17110d;
        }

        .salora-hero-image {
          position: absolute;
          inset: -2%;
          z-index: -4;

          /*
           * Slightly brighter than the previous version.
           * The image itself remains visible while the overlays
           * preserve readability.
           */
          background:
            linear-gradient(
              90deg,
              rgba(8,7,6,.40) 0%,
              rgba(10,8,7,.16) 43%,
              rgba(10,8,7,.27) 100%
            ),
            linear-gradient(
              180deg,
              rgba(10,8,7,.18) 0%,
              rgba(10,8,7,.04) 38%,
              rgba(10,8,7,.38) 100%
            ),
            url("/salora-hero-bg.jpg") center center / cover no-repeat;

          filter:
            brightness(1.12)
            saturate(.92)
            contrast(1.02);

          transform: scale(1.015);
          animation: salora-breathe 16s ease-in-out infinite alternate;
        }

        .salora-hero::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -2;
          pointer-events: none;
          background:
            linear-gradient(
              90deg,
              rgba(14,12,10,.55) 0%,
              rgba(14,12,10,.16) 52%,
              rgba(14,12,10,.34) 100%
            ),
            linear-gradient(
              180deg,
              rgba(14,12,10,.12) 0%,
              transparent 42%,
              rgba(14,12,10,.72) 100%
            );
        }

        .salora-noise {
          position: absolute;
          inset: 0;
          z-index: -1;
          pointer-events: none;
          opacity: .035;
          background-image:
            url("data:image/svg+xml,%3Csvg viewBox='0 0 180 180' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='.9' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='.5'/%3E%3C/svg%3E");
        }

        .salora-nav {
          position: relative;
          z-index: 10;
          display: flex;
          align-items: center;
          justify-content: space-between;
          width: min(100% - 72px, 1240px);
          min-height: 86px;
          margin: 0 auto;
          border-bottom: 1px solid rgba(245,240,232,.12);
          animation: salora-nav-in .9s .05s both ease;
        }

        .salora-brand {
          display: flex;
          align-items: center;
          gap: 11px;
          color: var(--salora-champagne);
          font-size: 13px;
          font-weight: 700;
          letter-spacing: .3em;
        }

        .salora-brand-mark {
          display: grid;
          width: 29px;
          height: 29px;
          place-items: center;
          border: 1px solid rgba(212,175,55,.55);
          color: var(--salora-gold);
          font-family: Georgia, serif;
          font-size: 15px;
          transform: rotate(45deg);
          transition:
            transform .45s ease,
            background .45s ease;
        }

        .salora-brand-mark span {
          transform: rotate(-45deg);
        }

        .salora-brand:hover .salora-brand-mark {
          transform: rotate(225deg);
          background: rgba(212,175,55,.08);
        }

        .salora-nav-links {
          display: flex;
          align-items: center;
          gap: 32px;
          margin-left: auto;
          margin-right: 40px;
        }

        .salora-nav-links a {
          position: relative;
          color: rgba(245,240,232,.64);
          font-size: 10px;
          font-weight: 600;
          letter-spacing: .08em;
          transition: color .3s ease;
        }

        .salora-nav-links a::after {
          content: "";
          position: absolute;
          left: 0;
          bottom: -8px;
          width: 0;
          height: 1px;
          background: var(--salora-gold);
          transition: width .35s ease;
        }

        .salora-nav-links a:hover {
          color: var(--salora-white);
        }

        .salora-nav-links a:hover::after {
          width: 100%;
        }

        .salora-command {
          display: flex;
          align-items: center;
          gap: 10px;
          color: var(--salora-champagne);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .12em;
          text-transform: uppercase;
          transition:
            color .3s ease,
            transform .3s ease;
        }

        .salora-command svg {
          transition: transform .3s ease;
        }

        .salora-command:hover {
          color: var(--salora-gold);
          transform: translateX(2px);
        }

        .salora-command:hover svg {
          transform: translateX(4px);
        }

        .salora-hero-inner {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: minmax(0, 1.03fr) minmax(480px, .77fr);
          align-items: center;
          gap: 70px;
          width: min(100% - 72px, 1240px);
          min-height: calc(100svh - 155px);
          margin: 0 auto;
          padding: 72px 0 100px;
        }

        .salora-hero-copy {
          animation: salora-hero-copy-in 1.05s .25s both cubic-bezier(.2,.7,.2,1);
        }

        .salora-eyebrow {
          display: flex;
          align-items: center;
          gap: 9px;
          color: rgba(245,240,232,.68);
          font-size: 9px;
          font-weight: 700;
          letter-spacing: .18em;
          line-height: 1.4;
        }

        .salora-eyebrow-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--salora-gold);
          box-shadow:
            0 0 0 5px rgba(212,175,55,.08),
            0 0 18px rgba(212,175,55,.55);
          animation: salora-pulse 2.8s ease-in-out infinite;
        }

        .salora-title {
          margin: 27px 0 0;
          color: var(--salora-white);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(72px, 8.2vw, 125px);
          font-weight: 400;
          letter-spacing: -.068em;
          line-height: .82;
        }

        .salora-title-line {
          display: block;
        }

        .salora-title-editorial {
          color: var(--salora-gold-light);
          font-style: italic;
          margin-left: .04em;
          animation: salora-title-gold 1.2s 1s both ease;
        }

        .salora-hero-copy-main {
          max-width: 540px;
          margin: 35px 0 0;
          color: rgba(250,247,240,.86);
          font-size: 16px;
          line-height: 1.65;
        }

        .salora-hero-copy-detail {
          max-width: 610px;
          margin: 13px 0 0;
          color: rgba(245,240,232,.55);
          font-size: 11px;
          line-height: 1.8;
        }

        .salora-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 32px;
        }

        .salora-primary-button,
        .salora-secondary-button {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
          gap: 10px;
          min-height: 47px;
          padding: 0 21px;
          overflow: hidden;
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .11em;
          text-transform: uppercase;
          transition:
            transform .35s cubic-bezier(.2,.7,.2,1),
            border-color .35s ease,
            background .35s ease,
            color .35s ease;
        }

        .salora-primary-button {
          border: 1px solid var(--salora-gold);
          background: var(--salora-gold);
          color: #16110b;
          box-shadow: 0 12px 35px rgba(0,0,0,.22);
        }

        .salora-primary-button::before {
          content: "";
          position: absolute;
          top: 0;
          left: -100%;
          width: 60%;
          height: 100%;
          transform: skewX(-20deg);
          background: rgba(255,255,255,.28);
          transition: left .6s ease;
        }

        .salora-primary-button:hover {
          transform: translateY(-3px);
          background: #e0bd45;
        }

        .salora-primary-button:hover::before {
          left: 140%;
        }

        .salora-primary-button svg {
          transition: transform .35s ease;
        }

        .salora-primary-button:hover svg {
          transform: translateX(4px);
        }

        .salora-secondary-button {
          border: 1px solid rgba(245,240,232,.25);
          background: rgba(10,8,7,.18);
          color: var(--salora-champagne);
        }

        .salora-secondary-button:hover {
          transform: translateY(-3px);
          border-color: rgba(212,175,55,.55);
          color: var(--salora-gold-light);
          background: rgba(20,16,12,.5);
        }

        .salora-secondary-button svg {
          transition: transform .35s ease;
        }

        .salora-secondary-button:hover svg {
          transform: translateX(4px);
        }

        .salora-hero-meta {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-top: 30px;
          color: rgba(245,240,232,.46);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .15em;
          text-transform: uppercase;
        }

        .salora-hero-meta > span:nth-child(3),
        .salora-hero-meta > span:nth-child(5) {
          color: rgba(245,240,232,.7);
        }

        .salora-meta-line {
          display: inline-block;
          width: 21px;
          height: 1px;
          margin-right: 7px;
          vertical-align: middle;
          background: var(--salora-gold);
        }

        /* =========================================================
           HERO ENGINE
        ========================================================== */

        .salora-product-wrap {
          position: relative;
          display: flex;
          justify-content: flex-end;
          animation: salora-product-in 1.05s .45s both cubic-bezier(.2,.7,.2,1);
        }

        .salora-product-glow {
          position: absolute;
          right: 8%;
          top: 12%;
          width: 60%;
          height: 65%;
          border-radius: 50%;
          background: rgba(212,175,55,.13);
          filter: blur(75px);
          opacity: .65;
          pointer-events: none;
          animation: salora-light 8s ease-in-out infinite alternate;
        }

        .salora-engine {
          position: relative;
          width: min(100%, 530px);
          overflow: hidden;
          padding: 19px;
          border: 1px solid rgba(245,240,232,.18);
          background:
            linear-gradient(
              135deg,
              rgba(27,21,16,.95),
              rgba(14,12,10,.92)
            );
          box-shadow:
            0 35px 90px rgba(0,0,0,.42),
            inset 0 1px 0 rgba(255,255,255,.04);
          animation: salora-engine-float 7s ease-in-out infinite;
        }

        .salora-engine::after {
          content: "";
          position: absolute;
          inset: 0;
          pointer-events: none;
          background:
            linear-gradient(
              115deg,
              rgba(212,175,55,.05),
              transparent 25%,
              transparent 72%,
              rgba(212,175,55,.035)
            );
        }

        .salora-engine-top {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 16px;
          border-bottom: 1px solid rgba(245,240,232,.09);
        }

        .salora-engine-brand {
          display: flex;
          align-items: center;
          gap: 8px;
          color: rgba(245,240,232,.6);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .14em;
        }

        .salora-engine-brand svg {
          color: var(--salora-gold);
        }

        .salora-live {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--salora-green);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .14em;
        }

        .salora-live i,
        .salora-theater-live i {
          width: 5px;
          height: 5px;
          border-radius: 50%;
          background: var(--salora-green);
          box-shadow: 0 0 11px rgba(155,199,167,.8);
          animation: salora-pulse 2s ease-in-out infinite;
        }

        .salora-engine-question {
          position: relative;
          z-index: 2;
          padding: 34px 6px 25px;
        }

        .salora-engine-question small {
          display: block;
          color: rgba(245,240,232,.45);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: .18em;
        }

        .salora-engine-question h2 {
          margin: 8px 0 0;
          color: var(--salora-champagne);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 38px;
          font-weight: 400;
          letter-spacing: -.04em;
        }

        .salora-request {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 16px;
          border: 1px solid rgba(245,240,232,.08);
          background: rgba(255,255,255,.025);
        }

        .salora-request small {
          display: block;
          margin-bottom: 5px;
          color: rgba(245,240,232,.38);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: .14em;
          text-transform: uppercase;
        }

        .salora-request strong {
          display: block;
          color: var(--salora-white);
          font-family: Georgia, serif;
          font-size: 18px;
          font-weight: 400;
        }

        .salora-request span {
          display: block;
          margin-top: 3px;
          color: rgba(245,240,232,.43);
          font-size: 8px;
        }

        .salora-request-value {
          padding: 6px 9px;
          border: 1px solid rgba(212,175,55,.25);
          color: var(--salora-gold);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .salora-engine-flow {
          position: relative;
          z-index: 2;
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          gap: 8px;
          margin-top: 10px;
        }

        .salora-engine-step {
          position: relative;
          min-height: 100px;
          padding: 13px;
          border: 1px solid rgba(245,240,232,.07);
          background: rgba(255,255,255,.018);
          transition:
            border-color .35s ease,
            transform .35s ease,
            background .35s ease;
        }

        .salora-engine-step:hover {
          transform: translateY(-3px);
          border-color: rgba(212,175,55,.28);
          background: rgba(212,175,55,.035);
        }

        .salora-engine-step-number {
          display: grid;
          width: 25px;
          height: 25px;
          margin-bottom: 14px;
          place-items: center;
          border: 1px solid rgba(212,175,55,.3);
          color: var(--salora-gold);
          font-size: 7px;
          font-weight: 800;
        }

        .salora-engine-step small {
          display: block;
          color: rgba(245,240,232,.72);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .08em;
          text-transform: uppercase;
        }

        .salora-engine-step span {
          display: block;
          margin-top: 6px;
          color: rgba(245,240,232,.39);
          font-size: 8px;
          line-height: 1.55;
        }

        .salora-scan {
          position: absolute;
          left: 0;
          top: 0;
          z-index: 4;
          width: 100%;
          height: 1px;
          background: linear-gradient(
            90deg,
            transparent,
            rgba(212,175,55,.85),
            transparent
          );
          box-shadow: 0 0 14px rgba(212,175,55,.4);
          animation: salora-scan 4.5s ease-in-out infinite;
          pointer-events: none;
        }

        .salora-recommendation {
          position: relative;
          z-index: 2;
          display: flex;
          align-items: stretch;
          justify-content: space-between;
          gap: 24px;
          margin-top: 10px;
          padding: 19px;
          border: 1px solid rgba(212,175,55,.28);
          background:
            linear-gradient(
              100deg,
              rgba(212,175,55,.075),
              rgba(155,199,167,.025)
            );
          overflow: hidden;
        }

        .salora-recommendation::before {
          content: "";
          position: absolute;
          left: 0;
          top: 0;
          bottom: 0;
          width: 2px;
          background: var(--salora-gold);
          box-shadow: 0 0 18px rgba(212,175,55,.35);
        }

        .salora-recommendation-main {
          min-width: 0;
        }

        .salora-recommendation-label {
          display: flex;
          align-items: center;
          gap: 8px;
          margin-bottom: 9px;
          color: rgba(245,240,232,.48);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        .salora-status-dot {
          width: 6px;
          height: 6px;
          border-radius: 50%;
          background: var(--salora-green);
          box-shadow: 0 0 11px rgba(155,199,167,.7);
          animation: salora-pulse 2.2s ease-in-out infinite;
        }

        .salora-recommendation-result {
          display: flex;
          align-items: baseline;
          flex-wrap: wrap;
          gap: 10px;
        }

        .salora-recommendation-result strong {
          color: var(--salora-champagne);
          font-family: Georgia, "Times New Roman", serif;
          font-size: 31px;
          font-weight: 400;
          letter-spacing: -.025em;
          line-height: 1;
        }

        .salora-recommendation-result span {
          color: var(--salora-green);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .16em;
        }

        .salora-recommendation-copy {
          max-width: 320px;
          margin-top: 9px;
          color: rgba(245,240,232,.52);
          font-size: 9px;
          line-height: 1.65;
        }

        .salora-safe {
          flex: 0 0 112px;
          display: flex;
          flex-direction: column;
          justify-content: center;
          align-items: flex-start;
          gap: 5px;
          padding-left: 17px;
          border-left: 1px solid rgba(245,240,232,.09);
          color: var(--salora-green);
        }

        .salora-safe svg {
          margin-bottom: 2px;
          animation: salora-safe-check 2.8s ease-in-out infinite;
        }

        .salora-safe strong {
          color: var(--salora-white);
          font-size: 17px;
          font-weight: 600;
          letter-spacing: -.02em;
          line-height: 1;
        }

        .salora-safe span {
          color: rgba(245,240,232,.4);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: .12em;
          text-transform: uppercase;
        }

        .salora-capabilities {
          position: absolute;
          left: 50%;
          bottom: 0;
          z-index: 5;
          display: grid;
          grid-template-columns: repeat(6, 1fr);
          width: min(100% - 72px, 1240px);
          min-height: 76px;
          transform: translateX(-50%);
          border-top: 1px solid rgba(245,240,232,.12);
          animation: salora-capabilities-in 1s .9s both ease;
        }

        .salora-capability {
          position: relative;
          display: flex;
          flex-direction: column;
          justify-content: center;
          padding: 10px 18px;
          border-right: 1px solid rgba(245,240,232,.08);
          transition:
            background .35s ease,
            transform .35s ease;
        }

        .salora-capability:first-child {
          padding-left: 0;
        }

        .salora-capability:last-child {
          border-right: 0;
        }

        .salora-capability:hover {
          background: rgba(255,255,255,.025);
          transform: translateY(-3px);
        }

        .salora-capability span {
          color: rgba(245,240,232,.33);
          font-size: 6px;
          font-weight: 700;
          letter-spacing: .15em;
        }

        .salora-capability strong {
          margin-top: 5px;
          color: rgba(245,240,232,.78);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .08em;
        }

        /* =========================================================
           PROBLEM
        ========================================================== */

        .salora-problem-grid {
          display: grid;
          grid-template-columns: minmax(0, 1fr) minmax(420px, .75fr);
          align-items: center;
          gap: 100px;
        }

        .salora-question {
          display: flex;
          align-items: center;
          gap: 11px;
          margin-top: 34px;
          color: var(--salora-gold-light);
          font-family: Georgia, serif;
          font-size: 18px;
          font-style: italic;
        }

        .salora-question i {
          width: 22px;
          height: 1px;
          background: var(--salora-gold);
        }

        .salora-schedule {
          position: relative;
          padding: 23px;
          border: 1px solid rgba(245,240,232,.1);
          background:
            linear-gradient(
              135deg,
              rgba(255,255,255,.028),
              rgba(255,255,255,.012)
            );
          overflow: hidden;
        }

        .salora-schedule-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding-bottom: 17px;
          border-bottom: 1px solid rgba(245,240,232,.08);
        }

        .salora-schedule-head strong {
          color: rgba(245,240,232,.62);
          font-size: 8px;
          letter-spacing: .15em;
        }

        .salora-schedule-head span {
          color: rgba(212,175,55,.65);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .salora-timeline {
          position: relative;
          padding-top: 12px;
        }

        .salora-timeline::before {
          content: "";
          position: absolute;
          left: 65px;
          top: 17px;
          bottom: 16px;
          width: 1px;
          background: rgba(245,240,232,.09);
        }

        .salora-timeline-row {
          position: relative;
          display: grid;
          grid-template-columns: 45px 40px 1fr;
          align-items: center;
          min-height: 66px;
        }

        .salora-time {
          color: rgba(245,240,232,.4);
          font-family: ui-monospace, monospace;
          font-size: 8px;
        }

        .salora-timeline-marker {
          position: relative;
          z-index: 2;
          display: grid;
          place-items: center;
        }

        .salora-timeline-marker i {
          width: 7px;
          height: 7px;
          border: 1px solid rgba(245,240,232,.35);
          border-radius: 50%;
          background: var(--salora-bg);
        }

        .salora-timeline-row.open .salora-timeline-marker i {
          border-color: var(--salora-gold);
          background: var(--salora-gold);
          box-shadow: 0 0 14px rgba(212,175,55,.45);
        }

        .salora-timeline-row.walkin .salora-timeline-marker i {
          border-color: var(--salora-green);
          box-shadow: 0 0 12px rgba(155,199,167,.35);
        }

        .salora-timeline-copy small {
          display: block;
          color: rgba(245,240,232,.32);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: .14em;
        }

        .salora-timeline-copy strong {
          display: block;
          margin-top: 5px;
          color: rgba(245,240,232,.7);
          font-size: 9px;
          font-weight: 600;
        }

        .salora-timeline-row.open .salora-timeline-copy strong {
          color: var(--salora-gold-light);
        }

        .salora-timeline-row.walkin .salora-timeline-copy strong {
          color: var(--salora-green);
        }

        .salora-pressure {
          position: absolute;
          left: 65px;
          bottom: 25px;
          width: 38%;
          height: 1px;
          transform-origin: left;
          background: rgba(212,175,55,.6);
          animation: salora-pressure 3.5s ease-in-out infinite;
        }

        /* =========================================================
           DIFFERENCE
        ========================================================== */

        .salora-difference {
          background: #12100e;
        }

        .salora-difference-grid {
          display: grid;
          grid-template-columns: minmax(0, .8fr) minmax(420px, 1fr);
          gap: 110px;
        }

        .salora-difference-intro {
          position: sticky;
          top: 100px;
          align-self: start;
        }

        .salora-step-list {
          border-top: 1px solid var(--salora-line);
        }

        .salora-editorial-step {
          display: grid;
          grid-template-columns: 55px 1fr 20px;
          gap: 20px;
          align-items: start;
          padding: 30px 0;
          border-bottom: 1px solid var(--salora-line);
          transition:
            padding-left .4s ease,
            background .4s ease;
        }

        .salora-editorial-step:hover {
          padding-left: 10px;
        }

        .salora-step-number {
          color: var(--salora-gold);
          font-family: ui-monospace, monospace;
          font-size: 8px;
          letter-spacing: .1em;
        }

        .salora-editorial-step h3 {
          margin: 0;
          color: var(--salora-champagne);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .11em;
        }

        .salora-editorial-step p {
          max-width: 550px;
          margin: 11px 0 0;
          color: rgba(245,240,232,.46);
          font-size: 11px;
          line-height: 1.75;
        }

        .salora-editorial-step > svg {
          color: rgba(245,240,232,.25);
          transition:
            color .3s ease,
            transform .3s ease;
        }

        .salora-editorial-step:hover > svg {
          color: var(--salora-gold);
          transform: translateX(4px);
        }

        /* =========================================================
           ENGINE THEATER
        ========================================================== */

        .salora-engine-section {
          background:
            linear-gradient(
              180deg,
              #12100e 0%,
              #0e0c0a 100%
            );
        }

        .salora-engine-heading {
          display: grid;
          grid-template-columns: 1fr .72fr;
          gap: 100px;
          align-items: end;
        }

        .salora-engine-heading .salora-body {
          margin-bottom: 4px;
        }

        .salora-theater {
          margin-top: 75px;
          border: 1px solid rgba(245,240,232,.12);
          background: rgba(255,255,255,.018);
        }

        .salora-theater-header {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 15px 20px;
          border-bottom: 1px solid rgba(245,240,232,.08);
        }

        .salora-theater-header > span {
          color: rgba(245,240,232,.42);
          font-size: 7px;
          font-weight: 700;
          letter-spacing: .15em;
        }

        .salora-theater-live {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--salora-green);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .salora-theater-grid {
          display: grid;
          grid-template-columns: .78fr 1.22fr;
        }

        .salora-theater-request,
        .salora-cascade {
          padding: 34px;
        }

        .salora-theater-request {
          border-right: 1px solid rgba(245,240,232,.08);
        }

        .salora-theater-request > small,
        .salora-cascade-head small {
          color: rgba(245,240,232,.38);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .15em;
        }

        .salora-theater-request h3 {
          margin: 12px 0 4px;
          color: var(--salora-champagne);
          font-family: Georgia, serif;
          font-size: 40px;
          font-weight: 400;
          letter-spacing: -.04em;
        }

        .salora-theater-request p {
          margin: 0;
          color: rgba(245,240,232,.4);
          font-size: 9px;
        }

        .salora-candidates {
          margin-top: 35px;
          border-top: 1px solid rgba(245,240,232,.08);
        }

        .salora-candidate {
          display: flex;
          align-items: center;
          justify-content: space-between;
          padding: 16px 0;
          border-bottom: 1px solid rgba(245,240,232,.07);
          color: rgba(245,240,232,.45);
          font-size: 8px;
          transition:
            padding-left .3s ease,
            color .3s ease;
        }

        .salora-candidate:hover {
          padding-left: 6px;
          color: var(--salora-champagne);
        }

        .salora-candidate.safe {
          color: var(--salora-green);
        }

        .salora-cascade {
          background: rgba(0,0,0,.13);
        }

        .salora-cascade-head {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 20px;
        }

        .salora-cascade-head strong {
          display: block;
          margin-top: 7px;
          color: rgba(245,240,232,.76);
          font-size: 11px;
          font-weight: 600;
        }

        .salora-cascade-status {
          padding: 7px 9px;
          border: 1px solid rgba(155,199,167,.22);
          color: var(--salora-green);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .salora-impact-grid {
          display: grid;
          grid-template-columns: repeat(3, 1fr);
          margin-top: 40px;
          border-top: 1px solid rgba(245,240,232,.08);
          border-bottom: 1px solid rgba(245,240,232,.08);
        }

        .salora-impact {
          padding: 21px 18px;
          border-right: 1px solid rgba(245,240,232,.08);
        }

        .salora-impact:first-child {
          padding-left: 0;
        }

        .salora-impact:last-child {
          border-right: 0;
        }

        .salora-impact small {
          display: block;
          color: rgba(245,240,232,.33);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .salora-impact strong {
          display: inline-block;
          margin-top: 8px;
          color: var(--salora-champagne);
          font-family: Georgia, serif;
          font-size: 36px;
          font-weight: 400;
        }

        .salora-impact span {
          margin-left: 5px;
          color: rgba(245,240,232,.36);
          font-size: 7px;
        }

        .salora-theater-explanation {
          margin-top: 28px;
          padding: 19px;
          border-left: 1px solid rgba(212,175,55,.45);
          background: rgba(212,175,55,.025);
        }

        .salora-theater-explanation small {
          color: rgba(212,175,55,.7);
          font-size: 6px;
          font-weight: 800;
          letter-spacing: .15em;
        }

        .salora-theater-explanation p {
          margin: 8px 0 0;
          color: rgba(245,240,232,.5);
          font-size: 9px;
          line-height: 1.7;
        }

        .salora-theater-footer {
          display: flex;
          align-items: center;
          justify-content: space-between;
          gap: 15px;
          margin-top: 25px;
        }

        .salora-theater-footer > span {
          color: rgba(245,240,232,.25);
          font-size: 7px;
        }

        .salora-accept {
          display: flex;
          align-items: center;
          gap: 7px;
          color: var(--salora-green);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        /* =========================================================
           DECISIONS
        ========================================================== */

        .salora-decisions {
          margin-top: 90px;
        }

        .salora-decisions > h3 {
          margin-bottom: 22px;
        }

        .salora-decision-list {
          border-top: 1px solid rgba(245,240,232,.1);
        }

        .salora-decision {
          position: relative;
          display: grid;
          grid-template-columns: 55px 260px 1fr 12px;
          gap: 25px;
          align-items: center;
          min-height: 88px;
          border-bottom: 1px solid rgba(245,240,232,.08);
          transition:
            padding-left .35s ease,
            background .35s ease;
        }

        .salora-decision:hover {
          padding-left: 10px;
          background: rgba(255,255,255,.018);
        }

        .salora-decision-number {
          color: rgba(245,240,232,.3);
          font-family: ui-monospace, monospace;
          font-size: 8px;
        }

        .salora-decision-label {
          color: var(--salora-champagne);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .salora-decision-copy {
          color: rgba(245,240,232,.43);
          font-size: 10px;
          line-height: 1.6;
        }

        .salora-decision-marker {
          width: 7px;
          height: 7px;
          border-radius: 50%;
          background: rgba(245,240,232,.3);
        }

        .salora-decision.accept .salora-decision-marker {
          background: var(--salora-green);
          box-shadow: 0 0 11px rgba(155,199,167,.45);
        }

        .salora-decision.warning .salora-decision-marker {
          background: var(--salora-gold);
          box-shadow: 0 0 11px rgba(212,175,55,.4);
        }

        .salora-decision.wait .salora-decision-marker {
          background: #b2a5d4;
        }

        .salora-decision.reschedule .salora-decision-marker {
          background: var(--salora-red);
        }

        /* =========================================================
           PROTECTION
        ========================================================== */

        .salora-protection {
          background: #12100e;
        }

        .salora-protection-grid {
          display: grid;
          grid-template-columns: .82fr 1fr;
          gap: 110px;
          align-items: center;
        }

        .salora-protection-visual {
          min-height: 500px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 1px solid rgba(245,240,232,.08);
          background:
            radial-gradient(
              circle at 50% 50%,
              rgba(212,175,55,.06),
              transparent 60%
            );
        }

        .salora-protection-stack {
          width: 76%;
        }

        .salora-protection-node {
          display: grid;
          grid-template-columns: 42px 1fr;
          gap: 14px;
          align-items: center;
          padding: 16px;
          border: 1px solid rgba(245,240,232,.1);
          background: rgba(255,255,255,.018);
          transition:
            transform .35s ease,
            border-color .35s ease;
        }

        .salora-protection-node:hover {
          transform: translateX(6px);
          border-color: rgba(212,175,55,.3);
        }

        .salora-protection-icon {
          display: grid;
          width: 34px;
          height: 34px;
          place-items: center;
          border: 1px solid rgba(212,175,55,.25);
          color: var(--salora-gold);
        }

        .salora-protection-node strong {
          display: block;
          color: var(--salora-champagne);
          font-size: 8px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .salora-protection-node span {
          display: block;
          margin-top: 5px;
          color: rgba(245,240,232,.37);
          font-size: 8px;
        }

        .salora-protection-arrow {
          display: flex;
          justify-content: center;
          height: 43px;
          color: rgba(212,175,55,.45);
        }

        .salora-protection-safe {
          padding: 20px;
          border: 1px solid rgba(155,199,167,.27);
          background: rgba(155,199,167,.035);
          text-align: center;
          animation: salora-safe-panel 4s ease-in-out infinite;
        }

        .salora-protection-safe small {
          display: block;
          color: var(--salora-green);
          font-size: 7px;
          font-weight: 800;
          letter-spacing: .18em;
        }

        .salora-protection-safe strong {
          display: block;
          margin-top: 7px;
          color: var(--salora-white);
          font-family: Georgia, serif;
          font-size: 23px;
          font-weight: 400;
        }

        /* =========================================================
           INTELLIGENCE
        ========================================================== */

        .salora-intelligence-heading {
          display: grid;
          grid-template-columns: 1fr .7fr;
          gap: 100px;
          align-items: end;
        }

        .salora-intelligence-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-top: 75px;
          border-top: 1px solid rgba(245,240,232,.1);
          border-bottom: 1px solid rgba(245,240,232,.1);
        }

        .salora-intelligence-item {
          min-height: 330px;
          padding: 28px 24px;
          border-right: 1px solid rgba(245,240,232,.08);
          transition:
            background .4s ease,
            transform .4s ease;
        }

        .salora-intelligence-item:first-child {
          padding-left: 0;
        }

        .salora-intelligence-item:last-child {
          border-right: 0;
        }

        .salora-intelligence-item:hover {
          background: rgba(212,175,55,.025);
          transform: translateY(-5px);
        }

        .salora-intelligence-top {
          display: flex;
          align-items: center;
          justify-content: space-between;
        }

        .salora-intelligence-top span {
          color: var(--salora-gold);
          font-family: ui-monospace, monospace;
          font-size: 8px;
        }

        .salora-intelligence-top svg {
          color: rgba(245,240,232,.45);
        }

        .salora-intelligence-line {
          width: 38px;
          height: 1px;
          margin-top: 50px;
          background: var(--salora-gold);
          transform-origin: left;
          animation: salora-line 4s ease-in-out infinite;
        }

        .salora-intelligence-item h3 {
          margin: 22px 0 0;
          color: var(--salora-champagne);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .1em;
        }

        .salora-intelligence-item p {
          margin: 13px 0 0;
          color: rgba(245,240,232,.42);
          font-size: 10px;
          line-height: 1.75;
        }

        /* =========================================================
           LOOP
        ========================================================== */

        .salora-loop {
          background: #12100e;
        }

        .salora-loop-grid {
          display: grid;
          grid-template-columns: repeat(4, 1fr);
          margin-top: 75px;
          border-top: 1px solid rgba(245,240,232,.1);
          border-bottom: 1px solid rgba(245,240,232,.1);
        }

        .salora-loop-item {
          position: relative;
          min-height: 260px;
          padding: 28px;
          border-right: 1px solid rgba(245,240,232,.08);
        }

        .salora-loop-item:first-child {
          padding-left: 0;
        }

        .salora-loop-item:last-child {
          border-right: 0;
        }

        .salora-loop-item > span {
          color: var(--salora-gold);
          font-family: ui-monospace, monospace;
          font-size: 8px;
        }

        .salora-loop-item h3 {
          margin: 60px 0 0;
          color: var(--salora-champagne);
          font-size: 10px;
          font-weight: 800;
          letter-spacing: .12em;
        }

        .salora-loop-item p {
          max-width: 190px;
          margin: 12px 0 0;
          color: rgba(245,240,232,.4);
          font-size: 9px;
          line-height: 1.7;
        }

        .salora-loop-arrow {
          position: absolute;
          top: 28px;
          right: 20px;
          color: rgba(212,175,55,.5);
        }

        .salora-observe-loop {
          display: flex;
          align-items: center;
          justify-content: center;
          gap: 18px;
          margin-top: 58px;
          color: rgba(245,240,232,.6);
          font-family: Georgia, serif;
          font-size: 25px;
          font-style: italic;
        }

        .salora-observe-loop span:nth-child(5) {
          color: var(--salora-gold);
        }

        .salora-observe-loop i {
          display: block;
          width: 30px;
          height: 1px;
          background: rgba(212,175,55,.35);
        }

        /* =========================================================
           PRINCIPLE
        ========================================================== */

        .salora-principle {
          position: relative;
          min-height: 680px;
          display: flex;
          align-items: center;
          overflow: hidden;
          background:
            linear-gradient(
              90deg,
              rgba(14,12,10,.77),
              rgba(14,12,10,.36),
              rgba(14,12,10,.6)
            ),
            url("/salora-hero-bg.jpg") center / cover no-repeat;
          isolation: isolate;
        }

        .salora-principle::after {
          content: "";
          position: absolute;
          inset: 0;
          z-index: -1;
          background:
            linear-gradient(
              180deg,
              rgba(14,12,10,.35),
              transparent 30%,
              rgba(14,12,10,.65)
            );
        }

        .salora-principle-inner {
          position: relative;
          z-index: 2;
        }

        .salora-principle-title {
          max-width: 920px;
          margin: 0;
          color: var(--salora-white);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(65px, 8vw, 122px);
          font-weight: 400;
          letter-spacing: -.065em;
          line-height: .85;
        }

        .salora-principle-title em {
          color: var(--salora-gold-light);
          font-style: italic;
        }

        .salora-principle-copy {
          max-width: 540px;
          margin: 35px 0 0;
          color: rgba(245,240,232,.6);
          font-size: 12px;
          line-height: 1.8;
        }

        /* =========================================================
           CTA
        ========================================================== */

        .salora-cta {
          padding: 150px 0;
          background:
            radial-gradient(
              circle at 50% 25%,
              rgba(212,175,55,.07),
              transparent 35%
            ),
            var(--salora-bg);
        }

        .salora-cta-title {
          margin: 0;
          color: var(--salora-champagne);
          font-family: Georgia, "Times New Roman", serif;
          font-size: clamp(65px, 8.5vw, 125px);
          font-weight: 400;
          letter-spacing: -.065em;
          line-height: .85;
        }

        .salora-cta-title em {
          color: var(--salora-gold);
          font-style: italic;
        }

        .salora-cta-copy {
          max-width: 520px;
          margin: 35px 0 0;
          color: rgba(245,240,232,.48);
          font-size: 12px;
          line-height: 1.8;
        }

        .salora-cta-actions {
          display: flex;
          align-items: center;
          gap: 12px;
          margin-top: 32px;
        }

        /* =========================================================
           FOOTER
        ========================================================== */

        .salora-footer {
          padding: 50px 0 28px;
          border-top: 1px solid rgba(245,240,232,.09);
          background: #0a0908;
        }

        .salora-footer-top {
          display: flex;
          align-items: flex-start;
          justify-content: space-between;
          gap: 50px;
        }

        .salora-footer-brand strong {
          color: var(--salora-champagne);
          font-size: 12px;
          letter-spacing: .27em;
        }

        .salora-footer-brand p {
          margin: 10px 0 0;
          color: rgba(245,240,232,.35);
          font-size: 8px;
          letter-spacing: .08em;
        }

        .salora-footer-links {
          display: flex;
          flex-wrap: wrap;
          gap: 25px;
        }

        .salora-footer-links a {
          color: rgba(245,240,232,.4);
          font-size: 8px;
          font-weight: 700;
          letter-spacing: .08em;
          transition: color .3s ease;
        }

        .salora-footer-links a:hover {
          color: var(--salora-gold);
        }

        .salora-footer-bottom {
          display: flex;
          justify-content: space-between;
          gap: 20px;
          margin-top: 55px;
          padding-top: 18px;
          border-top: 1px solid rgba(245,240,232,.07);
          color: rgba(245,240,232,.24);
          font-size: 7px;
          letter-spacing: .08em;
        }

        /* =========================================================
           ANIMATIONS
        ========================================================== */

        @keyframes salora-nav-in {
          from {
            opacity: 0;
            transform: translateY(-18px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes salora-hero-copy-in {
          from {
            opacity: 0;
            transform: translateY(35px);
          }

          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        @keyframes salora-product-in {
          from {
            opacity: 0;
            transform: translateY(35px) scale(.965);
          }

          to {
            opacity: 1;
            transform: translateY(0) scale(1);
          }
        }

        @keyframes salora-breathe {
          from {
            transform: scale(1.015);
          }

          to {
            transform: scale(1.045);
          }
        }

        @keyframes salora-title-gold {
          from {
            opacity: .3;
            filter: blur(3px);
            transform: translateX(-12px);
          }

          to {
            opacity: 1;
            filter: blur(0);
            transform: translateX(0);
          }
        }

        @keyframes salora-light {
          0%,
          100% {
            transform: translateX(-4%);
            opacity: .45;
          }

          50% {
            transform: translateX(5%);
            opacity: .85;
          }
        }

        @keyframes salora-engine-float {
          0%,
          100% {
            transform: translateY(0);
          }

          50% {
            transform: translateY(-6px);
          }
        }

        @keyframes salora-scan {
          0% {
            top: 0;
            opacity: 0;
          }

          12% {
            opacity: .8;
          }

          70% {
            opacity: .55;
          }

          100% {
            top: 100%;
            opacity: 0;
          }
        }

        @keyframes salora-line {
          0%,
          100% {
            opacity: .25;
            transform: scaleX(.55);
          }

          50% {
            opacity: 1;
            transform: scaleX(1);
          }
        }

        @keyframes salora-pulse {
          0%,
          100% {
            opacity: 1;
            transform: scale(1);
          }

          50% {
            opacity: .45;
            transform: scale(.75);
          }
        }

        @keyframes salora-pressure {
          0%,
          100% {
            transform: scaleX(.35);
            opacity: .25;
          }

          50% {
            transform: scaleX(1);
            opacity: .65;
          }
        }

        @keyframes salora-safe-check {
          0%,
          100% {
            transform: scale(1);
          }

          50% {
            transform: scale(1.12);
          }
        }

        @keyframes salora-safe-panel {
          0%,
          100% {
            border-color: rgba(155,199,167,.2);
          }

          50% {
            border-color: rgba(155,199,167,.42);
          }
        }

        @keyframes salora-capabilities-in {
          from {
            opacity: 0;
            transform: translate(-50%, 20px);
          }

          to {
            opacity: 1;
            transform: translate(-50%, 0);
          }
        }

        :focus-visible {
          outline: 1px solid var(--salora-gold);
          outline-offset: 5px;
        }

        /* =========================================================
           TABLET
        ========================================================== */

        @media (max-width: 1100px) {
          .salora-nav,
          .salora-hero-inner,
          .salora-capabilities,
          .salora-section-inner,
          .salora-principle-inner,
          .salora-cta-inner,
          .salora-footer-inner {
            width: min(100% - 44px, 1240px);
          }

          .salora-nav-links {
            gap: 20px;
            margin-right: 25px;
          }

          .salora-hero-inner {
            grid-template-columns: 1fr;
            min-height: auto;
            padding-top: 85px;
            padding-bottom: 125px;
          }

          .salora-hero-copy {
            max-width: 850px;
          }

          .salora-product-wrap {
            justify-content: flex-start;
          }

          .salora-capabilities {
            grid-template-columns: repeat(3, 1fr);
          }

          .salora-capability:nth-child(3) {
            border-right: 0;
          }

          .salora-capability:nth-child(n + 4) {
            padding-top: 14px;
          }

          .salora-problem-grid,
          .salora-difference-grid,
          .salora-protection-grid {
            gap: 60px;
          }

          .salora-theater-grid {
            grid-template-columns: 1fr;
          }

          .salora-theater-request {
            border-right: 0;
            border-bottom: 1px solid rgba(245,240,232,.08);
          }

          .salora-intelligence-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .salora-intelligence-item:nth-child(2) {
            border-right: 0;
          }

          .salora-intelligence-item:nth-child(-n + 2) {
            border-bottom: 1px solid rgba(245,240,232,.08);
          }
        }

        /* =========================================================
           MOBILE TABLET
        ========================================================== */

        @media (max-width: 800px) {
          .salora-section {
            padding: 95px 0;
          }

          .salora-nav {
            width: calc(100% - 36px);
          }

          .salora-nav-links {
            display: none;
          }

          .salora-command {
            font-size: 8px;
          }

          .salora-hero-inner {
            width: calc(100% - 36px);
            padding-top: 70px;
          }

          .salora-title {
            font-size: clamp(62px, 14vw, 90px);
          }

          .salora-product-wrap {
            width: 100%;
          }

          .salora-engine {
            width: 100%;
          }

          .salora-capabilities {
            width: calc(100% - 36px);
            grid-template-columns: repeat(2, 1fr);
          }

          .salora-capability:nth-child(2n) {
            border-right: 0;
          }

          .salora-capability:nth-child(3) {
            border-right: 1px solid rgba(245,240,232,.08);
          }

          .salora-problem-grid,
          .salora-difference-grid,
          .salora-protection-grid,
          .salora-engine-heading,
          .salora-intelligence-heading {
            grid-template-columns: 1fr;
          }

          .salora-difference-intro {
            position: static;
          }

          .salora-engine-heading .salora-body,
          .salora-intelligence-heading .salora-body {
            margin-top: 25px;
          }

          .salora-protection-visual {
            min-height: 380px;
          }

          .salora-loop-grid {
            grid-template-columns: repeat(2, 1fr);
          }

          .salora-loop-item:nth-child(2) {
            border-right: 0;
          }

          .salora-loop-item:nth-child(-n + 2) {
            border-bottom: 1px solid rgba(245,240,232,.1);
          }

          .salora-loop-arrow {
            display: none;
          }

          .salora-principle {
            min-height: 560px;
          }

          .salora-footer-top {
            display: block;
          }

          .salora-footer-links {
            margin-top: 30px;
          }
        }

        /* =========================================================
           PHONE
        ========================================================== */

        @media (max-width: 560px) {
          .salora-section {
            padding: 78px 0;
          }

          .salora-section-inner,
          .salora-principle-inner,
          .salora-cta-inner,
          .salora-footer-inner {
            width: calc(100% - 32px);
          }

          .salora-nav {
            width: calc(100% - 32px);
            min-height: 72px;
          }

          .salora-command {
            font-size: 7px;
            letter-spacing: .08em;
          }

          .salora-command span {
            display: none;
          }

          .salora-hero-inner {
            width: calc(100% - 32px);
            padding-top: 58px;
            gap: 58px;
          }

          .salora-eyebrow {
            font-size: 7px;
          }

          .salora-title {
            font-size: clamp(52px, 16vw, 78px);
            line-height: .84;
          }

          .salora-hero-copy-main {
            margin-top: 27px;
            font-size: 14px;
          }

          .salora-hero-copy-detail {
            font-size: 10px;
          }

          .salora-actions,
          .salora-cta-actions {
            align-items: stretch;
            flex-direction: column;
            gap: 10px;
          }

          .salora-primary-button,
          .salora-secondary-button {
            width: 100%;
          }

          .salora-secondary-button {
            justify-content: center;
          }

          .salora-hero-meta {
            gap: 9px;
            flex-wrap: wrap;
            margin-top: 28px;
          }

          .salora-engine {
            padding: 14px;
          }

          .salora-engine-question {
            padding: 25px 3px 19px;
          }

          .salora-engine-question h2 {
            font-size: 27px;
          }

          .salora-engine-flow {
            grid-template-columns: 1fr;
          }

          .salora-engine-step {
            min-height: 74px;
          }

          .salora-scan {
            display: none;
          }

          .salora-recommendation {
            align-items: stretch;
            flex-direction: column;
            gap: 18px;
            padding: 17px;
          }

          .salora-recommendation-result strong {
            font-size: 28px;
          }

          .salora-recommendation-copy {
            max-width: none;
          }

          .salora-safe {
            flex: none;
            flex-direction: row;
            align-items: center;
            gap: 10px;
            padding: 14px 0 0;
            border-left: 0;
            border-top: 1px solid rgba(245,240,232,.09);
          }

          .salora-safe svg {
            margin: 0;
          }

          .salora-safe strong {
            font-size: 16px;
          }

          .salora-capabilities {
            width: calc(100% - 32px);
          }

          .salora-capability {
            padding: 12px;
          }

          .salora-capability:first-child {
            padding-left: 0;
          }

          .salora-display-title {
            font-size: clamp(44px, 14vw, 67px);
          }

          .salora-question {
            font-size: 18px;
          }

          .salora-schedule {
            padding: 17px;
          }

          .salora-timeline::before {
            left: 58px;
          }

          .salora-timeline-row {
            grid-template-columns: 38px 40px 1fr;
          }

          .salora-theater-request,
          .salora-cascade {
            padding: 24px;
          }

          .salora-theater-request h3 {
            font-size: 34px;
          }

          .salora-impact-grid {
            grid-template-columns: 1fr;
            gap: 0;
          }

          .salora-impact,
          .salora-impact:first-child {
            padding: 15px 0;
            border-right: 0;
            border-bottom: 1px solid rgba(245,240,232,.07);
          }

          .salora-impact:last-child {
            border-bottom: 0;
          }

          .salora-decision {
            grid-template-columns: 35px 1fr 10px;
            gap: 10px;
            padding: 18px 0;
          }

          .salora-decision-label {
            grid-column: 2;
          }

          .salora-decision-copy {
            grid-column: 2;
            grid-row: 2;
          }

          .salora-decision-marker {
            grid-column: 3;
            grid-row: 1;
          }

          .salora-intelligence-grid {
            grid-template-columns: 1fr;
          }

          .salora-intelligence-item {
            min-height: 205px;
            border-right: 0;
            border-bottom: 1px solid rgba(245,240,232,.08);
          }

          .salora-intelligence-item:last-child {
            border-bottom: 0;
          }

          .salora-loop-grid {
            grid-template-columns: 1fr;
          }

          .salora-loop-item {
            min-height: 160px;
            border-right: 0;
            border-bottom: 1px solid rgba(245,240,232,.1);
          }

          .salora-loop-item:last-child {
            border-bottom: 0;
          }

          .salora-loop-item h3 {
            margin-top: 38px;
          }

          .salora-observe-loop {
            justify-content: flex-start;
            align-items: flex-start;
            flex-direction: column;
            gap: 9px;
            font-size: 21px;
          }

          .salora-observe-loop i {
            width: 20px;
          }

          .salora-protection-visual {
            min-height: 350px;
          }

          .salora-protection-stack {
            width: 88%;
          }

          .salora-principle-title {
            font-size: clamp(47px, 14vw, 72px);
          }

          .salora-cta {
            padding: 95px 0;
          }

          .salora-cta-title {
            font-size: clamp(53px, 15vw, 80px);
          }

          .salora-footer-bottom {
            flex-direction: column;
            gap: 10px;
          }
        }

        @media (max-width: 380px) {
          .salora-brand {
            font-size: 11px;
            letter-spacing: .22em;
          }

          .salora-brand-mark {
            width: 24px;
            height: 24px;
          }

          .salora-title {
            font-size: 51px;
          }

          .salora-engine-question h2 {
            font-size: 24px;
          }

          .salora-engine-brand {
            font-size: 7px;
          }
        }

        /* =========================================================
           REDUCED MOTION
        ========================================================== */

        @media (prefers-reduced-motion: reduce) {
          html {
            scroll-behavior: auto;
          }

          *,
          *::before,
          *::after {
            animation-duration: .001ms !important;
            animation-iteration-count: 1 !important;
            transition-duration: .001ms !important;
          }

          .salora-reveal {
            opacity: 1;
            transform: none;
          }
        }
      `}</style>

      <main className="salora-page">

        {/* =========================================================
            HERO
        ========================================================== */}

        <section className="salora-hero" aria-labelledby="hero-title">

          <div className="salora-hero-image" aria-hidden="true" />
          <div className="salora-noise" aria-hidden="true" />

          <nav className="salora-nav" aria-label="Primary navigation">

            <Link
              href="/"
              className="salora-brand"
              aria-label="SALORA home"
            >
              <span
                className="salora-brand-mark"
                aria-hidden="true"
              >
                <span>S</span>
              </span>

              SALORA
            </Link>

            <div className="salora-nav-links">
              <a href="#decision-engine">
                Decision Engine
              </a>

              <a href="#how-it-works">
                How it works
              </a>

              <a href="#intelligence">
                Intelligence
              </a>
            </div>

            <Link
              href="/login"
              className="salora-command"
            >
              <span>Staff command center</span>
              <ArrowRight size={14} />
            </Link>

          </nav>

          <div className="salora-hero-inner">

            <div className="salora-hero-copy">

              <div className="salora-eyebrow">
                <span className="salora-eyebrow-dot" />
                REAL-TIME WALK-IN DECISION INTELLIGENCE
              </div>

              <h1
                className="salora-title"
                id="hero-title"
              >
                <span className="salora-title-line">
                  Know before
                </span>

                <span className="salora-title-line salora-title-editorial">
                  you say yes.
                </span>
              </h1>

              <p className="salora-hero-copy-main">
                Make every walk-in decision with a clear view
                of what happens next.
              </p>

              <p className="salora-hero-copy-detail">
                SALORA simulates a walk-in against the live salon
                schedule before acceptance — revealing delay,
                wait, affected appointments and the safest
                available option.
              </p>

              <div className="salora-actions">

                <Link
                  href="/login"
                  className="salora-primary-button"
                >
                  Simulate a walk-in
                  <ArrowRight size={15} />
                </Link>

                <a
                  href="#how-it-works"
                  className="salora-secondary-button"
                >
                  See how it works
                  <ChevronRight size={15} />
                </a>

              </div>

              <div className="salora-hero-meta">
                <span>
                  <span className="salora-meta-line" />
                  Predict
                </span>

                <span>→</span>

                <span>Recommend</span>

                <span>→</span>

                <span>Act</span>
              </div>

            </div>

            {/* =====================================================
                HERO DECISION ENGINE
            ====================================================== */}

            <div
              className="salora-product-wrap"
              aria-label="SALORA decision engine preview"
            >

              <div
                className="salora-product-glow"
                aria-hidden="true"
              />

              <div className="salora-engine">

                <div className="salora-engine-top">

                  <div className="salora-engine-brand">
                    <BrainCircuit size={14} />
                    SALORA / DECISION ENGINE
                  </div>

                  <div className="salora-live">
                    <i />
                    LIVE
                  </div>

                </div>

                <div className="salora-engine-question">

                  <small>
                    WHAT IF WE ACCEPT THIS WALK-IN?
                  </small>

                  <h2>
                    Test it first.
                  </h2>

                </div>

                <div className="salora-request">

                  <div>
                    <small>
                      Walk-in request
                    </small>

                    <strong>
                      Haircut
                    </strong>

                    <span>
                      30 min service
                    </span>
                  </div>

                  <div className="salora-request-value">
                    Candidate
                  </div>

                </div>

                <div className="salora-engine-flow">

                  <div
                    className="salora-scan"
                    aria-hidden="true"
                  />

                  <EngineStep
                    number="01"
                    title="Current state"
                  >
                    Live schedule
                  </EngineStep>

                  <EngineStep
                    number="02"
                    title="What-if"
                  >
                    Candidate placement
                  </EngineStep>

                  <EngineStep
                    number="03"
                    title="Impact"
                  >
                    Cascade analysis
                  </EngineStep>

                </div>

                {/* FIXED SAFE DECISION BOX */}

                <div className="salora-recommendation">

                  <div className="salora-recommendation-main">

                    <div className="salora-recommendation-label">
                      <span className="salora-status-dot" />
                      RECOMMENDATION
                    </div>

                    <div className="salora-recommendation-result">
                      <strong>ACCEPT</strong>
                      <span>SAFE TO ACCEPT</span>
                    </div>

                    <p className="salora-recommendation-copy">
                      Candidate fits the current schedule
                      without creating downstream delay.
                    </p>

                  </div>

                  <div className="salora-safe">

                    <CheckCircle2
                      size={16}
                      strokeWidth={2}
                    />

                    <div>
                      <strong>0 MIN</strong>
                      <span>
                        downstream delay
                      </span>
                    </div>

                  </div>

                </div>

              </div>

            </div>

          </div>

          <div
            className="salora-capabilities"
            aria-label="SALORA capabilities"
          >
            {[
              "WALK-INS",
              "LIVE SCHEDULE",
              "CAPACITY",
              "CASCADE IMPACT",
              "PROTECTION",
              "DECISIONS",
            ].map((item) => (
              <div
                className="salora-capability"
                key={item}
              >
                <span>REAL-TIME</span>
                <strong>{item}</strong>
              </div>
            ))}
          </div>

        </section>

        {/* =========================================================
            PROBLEM
        ========================================================== */}

        <section
          className="salora-section"
          id="how-it-works"
        >

          <div className="salora-section-inner">

            <SectionLabel number="01">
              THE PROBLEM
            </SectionLabel>

            <div className="salora-problem-grid">

              <div>

                <h2 className="salora-display-title">
                  A booked schedule
                  <br />
                  doesn&apos;t tell you
                  <br />
                  <em>what happens next.</em>
                </h2>

                <p className="salora-body">
                  A calendar tells a salon what is already
                  booked. It shows appointments, gaps and
                  working hours. But when someone walks
                  through the door, staff still have to make
                  a judgment call.
                </p>

                <div className="salora-question">
                  <i />
                  Can we safely take this walk-in?
                </div>

              </div>

              <div
                className="salora-schedule salora-reveal"
                aria-label="Illustrative salon schedule"
              >

                <div className="salora-schedule-head">
                  <strong>
                    TODAY / LIVE SCHEDULE
                  </strong>

                  <span>
                    ILLUSTRATIVE
                  </span>
                </div>

                <div className="salora-timeline">

                  <TimelineRow
                    time="09:00"
                    label="BOOKED"
                    service="Existing appointment"
                    state="booked"
                  />

                  <TimelineRow
                    time="10:30"
                    label="BOOKED"
                    service="Existing appointment"
                    state="booked"
                  />

                  <TimelineRow
                    time="12:00"
                    label="OPEN"
                    service="Available window"
                    state="open"
                  />

                  <TimelineRow
                    time="12:30"
                    label="BOOKED"
                    service="Existing appointment"
                    state="booked"
                  />

                  <TimelineRow
                    time="13:00"
                    label="WALK-IN REQUEST"
                    service="Haircut · 30 min"
                    state="walkin"
                  />

                </div>

                <div
                  className="salora-pressure"
                  aria-hidden="true"
                />

              </div>

            </div>

          </div>

        </section>

        {/* =========================================================
            DIFFERENCE
        ========================================================== */}

        <section className="salora-section salora-difference">

          <div className="salora-section-inner">

            <SectionLabel number="02">
              THE SALORA DIFFERENCE
            </SectionLabel>

            <div className="salora-difference-grid">

              <div className="salora-difference-intro">

                <h2 className="salora-display-title">
                  Don&apos;t find an
                  <br />
                  empty slot.
                  <br />
                  <em>Find the safest decision.</em>
                </h2>

                <p className="salora-body">
                  SALORA evaluates the live state of the
                  salon before recommending what staff
                  should do next.
                </p>

              </div>

              <div className="salora-step-list">

                <EditorialStep
                  number="01"
                  title="READ THE LIVE STATE"
                  text="Stylist availability, service duration, current bookings, buffers and schedule pressure become part of the decision."
                />

                <EditorialStep
                  number="02"
                  title="SIMULATE THE WHAT-IF"
                  text="Candidate placements are tested against the schedule to reveal downstream consequences before acceptance."
                />

                <EditorialStep
                  number="03"
                  title="ACT WITH EVIDENCE"
                  text="Staff receive one of four clear recommendations: accept, accept with warning, wait or reschedule."
                />

              </div>

            </div>

          </div>

        </section>

        {/* =========================================================
            DECISION ENGINE
        ========================================================== */}

        <section
          className="salora-section salora-engine-section"
          id="decision-engine"
        >

          <div className="salora-section-inner">

            <SectionLabel number="03">
              SIGNATURE DECISION ENGINE
            </SectionLabel>

            <div className="salora-engine-heading">

              <h2 className="salora-display-title">
                What happens
                <br />
                <em>if we say yes?</em>
              </h2>

              <p className="salora-body">
                Instead of asking whether a slot looks empty,
                SALORA tests the decision against the schedule
                that actually exists.
              </p>

            </div>

            <div className="salora-theater salora-reveal">

              <div className="salora-theater-header">

                <span>
                  ILLUSTRATIVE SIMULATION / HAIRCUT
                </span>

                <div className="salora-theater-live">
                  <i />
                  SIMULATION READY
                </div>

              </div>

              <div className="salora-theater-grid">

                <div className="salora-theater-request">

                  <small>
                    WALK-IN REQUEST
                  </small>

                  <h3>
                    Haircut
                  </h3>

                  <p>
                    30 min · illustrative scenario
                  </p>

                  <div className="salora-candidates">

                    <div className="salora-candidate safe">
                      <span>Stylist A</span>
                      <span>10:30 → 11:00</span>
                    </div>

                    <div className="salora-candidate">
                      <span>Stylist B</span>
                      <span>11:00 → 11:30</span>
                    </div>

                    <div className="salora-candidate">
                      <span>Stylist C</span>
                      <span>12:00 → 12:30</span>
                    </div>

                  </div>

                </div>

                <div className="salora-cascade">

                  <div className="salora-cascade-head">

                    <div>
                      <small>
                        CASCADE ANALYSIS
                      </small>

                      <strong>
                        Existing appointment / 12:30
                      </strong>
                    </div>

                    <span className="salora-cascade-status">
                      NO CONFLICT
                    </span>

                  </div>

                  <div className="salora-impact-grid">

                    <div className="salora-impact">
                      <small>
                        POTENTIAL DELAY
                      </small>

                      <strong>0</strong>
                      <span>minutes</span>
                    </div>

                    <div className="salora-impact">
                      <small>
                        AFFECTED BOOKINGS
                      </small>

                      <strong>0</strong>
                      <span>appointments</span>
                    </div>

                    <div className="salora-impact">
                      <small>
                        CUSTOMER WAIT
                      </small>

                      <strong>0</strong>
                      <span>minutes</span>
                    </div>

                  </div>

                  <div className="salora-theater-explanation">

                    <small>
                      WHY THIS RECOMMENDATION?
                    </small>

                    <p>
                      The illustrative candidate fits the
                      current schedule without creating
                      downstream delay for the existing
                      appointment.
                    </p>

                  </div>

                  <div className="salora-theater-footer">

                    <span>
                      Illustrative simulation — not live
                      business data.
                    </span>

                    <div className="salora-accept">
                      <Check size={14} />
                      ACCEPT / SAFE
                    </div>

                  </div>

                </div>

              </div>

            </div>

            <div className="salora-decisions">

              <h3 className="salora-section-label">
                <span>04</span>
                <i />
                <strong>FOUR CLEAR OUTCOMES</strong>
              </h3>

              <div className="salora-decision-list">

                {decisions.map((decision) => (
                  <article
                    className={`salora-decision ${decision.tone}`}
                    key={decision.label}
                  >

                    <div className="salora-decision-number">
                      {decision.number}
                    </div>

                    <div className="salora-decision-label">
                      {decision.label}
                    </div>

                    <div className="salora-decision-copy">
                      {decision.description}
                    </div>

                    <div className="salora-decision-marker" />

                  </article>
                ))}

              </div>

            </div>

          </div>

        </section>

        {/* =========================================================
            PROTECTION
        ========================================================== */}

        <section className="salora-section salora-protection">

          <div className="salora-section-inner">

            <SectionLabel number="05">
              WHAT SALORA PROTECTS
            </SectionLabel>

            <div className="salora-protection-grid">

              <div>

                <h2 className="salora-display-title">
                  The walk-in
                  <br />
                  isn&apos;t the only
                  <br />
                  <em>customer in the room.</em>
                </h2>

                <p className="salora-body">
                  Every new service exists inside a schedule
                  that already has commitments. SALORA
                  evaluates the walk-in together with the
                  customers, stylists and time already on
                  the floor.
                </p>

              </div>

              <div className="salora-protection-visual salora-reveal">

                <div className="salora-protection-stack">

                  <div className="salora-protection-node">

                    <div className="salora-protection-icon">
                      <Users size={15} />
                    </div>

                    <div>
                      <strong>WALK-IN</strong>
                      <span>
                        New revenue opportunity
                      </span>
                    </div>

                  </div>

                  <div className="salora-protection-arrow">
                    <ArrowDown size={15} />
                  </div>

                  <div className="salora-protection-node">

                    <div className="salora-protection-icon">
                      <CalendarClock size={15} />
                    </div>

                    <div>
                      <strong>EXISTING BOOKINGS</strong>
                      <span>
                        Appointments already promised
                      </span>
                    </div>

                  </div>

                  <div className="salora-protection-arrow">
                    <ArrowDown size={15} />
                  </div>

                  <div className="salora-protection-node">

                    <div className="salora-protection-icon">
                      <Clock3 size={15} />
                    </div>

                    <div>
                      <strong>STYLIST CAPACITY</strong>
                      <span>
                        Time, skills and availability
                      </span>
                    </div>

                  </div>

                  <div className="salora-protection-arrow">
                    <ArrowDown size={15} />
                  </div>

                  <div className="salora-protection-safe">
                    <small>SALORA</small>
                    <strong>SAFE DECISION</strong>
                  </div>

                </div>

              </div>

            </div>

          </div>

        </section>

        {/* =========================================================
            INTELLIGENCE
        ========================================================== */}

        <section
          className="salora-section salora-intelligence"
          id="intelligence"
        >

          <div className="salora-section-inner">

            <SectionLabel number="06">
              OPERATIONAL INTELLIGENCE
            </SectionLabel>

            <div className="salora-intelligence-heading">

              <h2 className="salora-display-title">
                See the variables
                <br />
                behind the <em>yes.</em>
              </h2>

              <p className="salora-body">
                SALORA turns the live salon state into a
                decision staff can understand and act on.
              </p>

            </div>

            <div className="salora-intelligence-grid">

              {intelligence.map((item) => (
                <IntelligenceItem
                  key={item.title}
                  {...item}
                />
              ))}

            </div>

          </div>

        </section>

        {/* =========================================================
            LOOP
        ========================================================== */}

        <section className="salora-section salora-loop">

          <div className="salora-section-inner">

            <SectionLabel number="07">
              THE DECISION LOOP
            </SectionLabel>

            <h2 className="salora-display-title">
              From request
              <br />
              to <em>informed action.</em>
            </h2>

            <div className="salora-loop-grid">

              {[
                [
                  "01",
                  "REQUEST",
                  "A walk-in arrives with a service request.",
                ],
                [
                  "02",
                  "SIMULATE",
                  "Candidate placements are tested.",
                ],
                [
                  "03",
                  "UNDERSTAND",
                  "Schedule consequences become visible.",
                ],
                [
                  "04",
                  "ACT",
                  "Staff choose the safest available outcome.",
                ],
              ].map(([number, title, text], index) => (
                <article
                  className="salora-loop-item salora-reveal"
                  key={number}
                >

                  <span>{number}</span>

                  <h3>{title}</h3>

                  <p>{text}</p>

                  {index < 3 && (
                    <div
                      className="salora-loop-arrow"
                      aria-hidden="true"
                    >
                      <ChevronRight size={13} />
                    </div>
                  )}

                </article>
              ))}

            </div>

            <div
              className="salora-observe-loop"
              aria-label="SALORA product evolution"
            >
              <span>Observe</span>
              <i />
              <span>Predict</span>
              <i />
              <span>Recommend</span>
              <i />
              <span>Act</span>
              <i />
              <span>Learn</span>
            </div>

          </div>

        </section>

        {/* =========================================================
            PRINCIPLE
        ========================================================== */}

        <section className="salora-principle">

          <div className="salora-principle-inner">

            <SectionLabel number="08">
              PRODUCT PRINCIPLE
            </SectionLabel>

            <h2 className="salora-principle-title">
              Every &quot;yes&quot;
              <br />
              should be an
              <br />
              <em>informed decision.</em>
            </h2>

            <p className="salora-principle-copy">
              The goal isn&apos;t to accept every walk-in.
              The goal is to know which ones can be accepted
              without creating a problem for someone
              already booked.
            </p>

          </div>

        </section>

        {/* =========================================================
            FINAL CTA
        ========================================================== */}

        <section className="salora-cta">

          <div className="salora-cta-inner">

            <SectionLabel number="09">
              START WITH THE NEXT WALK-IN
            </SectionLabel>

            <h2 className="salora-cta-title">
              Stop guessing.
              <br />
              <em>Start flowing.</em>
            </h2>

            <p className="salora-cta-copy">
              Turn the next walk-in from a scheduling
              question into an evidence-backed operational
              decision.
            </p>

            <div className="salora-cta-actions">

              <Link
                href="/login"
                className="salora-primary-button"
              >
                Open SALORA
                <ArrowRight size={15} />
              </Link>

              <a
                href="#decision-engine"
                className="salora-secondary-button"
              >
                See the decision engine
                <ChevronRight size={15} />
              </a>

            </div>

          </div>

        </section>

        {/* =========================================================
            FOOTER
        ========================================================== */}

        <footer className="salora-footer">

          <div className="salora-footer-inner">

            <div className="salora-footer-top">

              <div className="salora-footer-brand">

                <strong>SALORA</strong>

                <p>
                  Real-Time Walk-In Decision Intelligence
                </p>

              </div>

              <nav
                className="salora-footer-links"
                aria-label="Footer navigation"
              >

                <a href="#decision-engine">
                  Decision Engine
                </a>

                <a href="#how-it-works">
                  How it works
                </a>

                <a href="#intelligence">
                  Intelligence
                </a>

                <Link href="/login">
                  Staff command center
                </Link>

              </nav>

            </div>

            <div className="salora-footer-bottom">

              <span>
                Built for independent salon operations.
              </span>

              <span>
                Predict · Recommend · Act
              </span>

            </div>

          </div>

        </footer>

      </main>
    </>
  );
}