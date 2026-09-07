import type { ReactNode } from "react";
import Link from "next/link";
import {
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
  TrendingUp,
  Users,
  Target,
  Zap,
} from "lucide-react";

export default function Home() {
  return (
    <main className="site cinematic-bg">
      {/* =========================================================
          NAVIGATION
      ========================================================= */}

      <nav className="navbar" aria-label="Main navigation">
        <Link href="/" className="brand" aria-label="SALORA home">
          <i />
          SALORA
        </Link>

        <div className="nav-links">
          <a href="#engine">Decision Engine</a>
          <a href="#how">How it works</a>
          <a href="#intelligence">Intelligence</a>

          <Link href="/login" className="nav-cta">
            Staff command center
            <ArrowRight size={13} />
          </Link>
        </div>
      </nav>

      {/* =========================================================
          HERO
      ========================================================= */}

      <section className="hero">
        <div className="hero-content">
          <div className="hero-kicker">
            <Sparkles size={12} />
            REAL-TIME WALK-IN DECISION INTELLIGENCE
          </div>

          <h1>
            Know before
            <br />
            <em>you say yes.</em>
          </h1>

          <p className="hero-copy">
            SALORA helps independent salons decide whether a walk-in can be
            accepted safely before one new service creates a chain reaction
            across the rest of the day.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="hero-primary">
              Simulate a walk-in
              <ArrowRight size={16} />
            </Link>

            <a href="#engine" className="hero-secondary">
              See the decision engine
              <ChevronRight size={16} />
            </a>
          </div>

          <div
            className="hero-process"
            aria-label="SALORA decision process"
          >
            <span className="hero-process-active">
              <CheckCircle2 size={14} />
              Predict
            </span>

            <span className="hero-process-arrow">→</span>

            <span>Recommend</span>

            <span className="hero-process-arrow">→</span>

            <span>Act</span>
          </div>

          <div className="hero-live">
            <span className="live-pulse" />
            Built around real-time salon operations
          </div>
        </div>

        {/* =====================================================
            HERO DECISION VISUAL
        ===================================================== */}

        <div className="hero-visual">
          <div className="hero-card hero-card-premium">
            <div className="hero-card-head">
              <div>
                <span className="hero-card-label">
                  SALORA / DECISION ENGINE
                </span>

                <span className="hero-card-caption">
                  Live operational simulation
                </span>
              </div>

              <span className="live-pill">
                <span className="status-dot" />
                LIVE
              </span>
            </div>

            <div className="hero-engine">
              <div className="engine-question">
                <span>WHAT IF WE ACCEPT THIS WALK-IN?</span>
                <span className="engine-live-line" />
              </div>

              <h3>Test it first.</h3>

              <p>
                SALORA evaluates candidate placements against the current
                schedule then explains the operational consequence.
              </p>

              <div className="hero-flow">
                <HeroFlow
                  number="01"
                  title="Walk-in request"
                  description="Service request captured"
                />

                <div className="hero-flow-arrow" />

                <HeroFlow
                  number="02"
                  title="Schedule simulation"
                  description="Candidate placements evaluated"
                />

                <div className="hero-flow-arrow" />

                <HeroFlow
                  number="03"
                  title="Cascade analysis"
                  description="Delay · wait · affected bookings"
                />

                <div className="hero-flow-arrow" />

                <div className="hero-flow-item hero-flow-success">
                  <div className="hero-flow-number success-number">
                    <Check size={13} />
                  </div>

                  <div>
                    <strong>SAFE TO ACCEPT</strong>
                    <span>
                      Recommendation generated from live state
                    </span>
                  </div>
                </div>
              </div>

              <div className="hero-simulation-bar">
                <div className="simulation-bar-top">
                  <span>SIMULATION COMPLETE</span>
                  <span>DECISION READY</span>
                </div>

                <div className="simulation-track">
                  <span className="simulation-fill" />
                  <span className="simulation-marker" />
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          CAPABILITY STRIP
      ========================================================= */}

      <section
        className="capability-strip"
        aria-label="SALORA capabilities"
      >
        <div className="capability-inner">
          <Capability label="WALK-INS" />
          <Capability label="LIVE SCHEDULE" />
          <Capability label="CAPACITY" />
          <Capability label="CASCADE IMPACT" />
          <Capability label="REVENUE" />
          <Capability label="DECISIONS" />
        </div>
      </section>

      {/* =========================================================
          DIFFERENCE
      ========================================================= */}

      <section id="how" className="section section-dark">
        <div className="container">
          <div className="section-heading section-heading-wide">
            <div className="eyebrow">
              <Sparkles size={11} />
              THE SALORA DIFFERENCE
            </div>

            <h2>
              A calendar shows
              <br />
              <em>what is booked.</em>
              <br />
              SALORA shows what happens next.
            </h2>

            <p>
              A salon&apos;s schedule is not static. Customers arrive early
              or late, services take different amounts of time and walk-ins
              appear without warning. SALORA turns that changing operational
              state into a decision the front desk can actually use.
            </p>
          </div>

          <div className="story-grid story-grid-three">
            <Feature
              n="01"
              icon={<CalendarClock />}
              title="Read the live state"
              text="Appointments, service duration, stylist availability and current schedule pressure become one operational snapshot."
            />

            <Feature
              n="02"
              icon={<BrainCircuit />}
              title="Simulate the what-if"
              text="Possible placements are tested before acceptance so downstream consequences become visible before they happen."
            />

            <Feature
              n="03"
              icon={<ShieldCheck />}
              title="Act with evidence"
              text="Every recommendation exposes wait, delay, affected appointments and service value behind the decision."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          DECISION ENGINE
      ========================================================= */}

      <section id="engine" className="section engine-section">
        <div className="container">
          <div className="engine-intro">
            <div>
              <div className="eyebrow">
                <Sparkles size={12} />
                THE SIGNATURE FEATURE
              </div>

              <h2>
                Don&apos;t guess.
                <br />
                <em>Simulate.</em>
              </h2>

              <p>
                The question is simple:{" "}
                <strong>what happens if we say yes?</strong>
              </p>

              <p className="engine-intro-copy">
                SALORA tests the request against the current operational state
                and ranks possible placements. Instead of asking the
                receptionist to manually calculate the consequences, the
                system provides a clear recommendation.
              </p>

              <Link href="/login" className="text-link">
                Open the command center
                <ArrowRight size={14} />
              </Link>
            </div>

            {/* Decision states */}

            <div className="decision-state-list">
              <Decision
                color="green"
                icon={<Check size={13} />}
                title="ACCEPT"
                text="Immediate placement with no scheduled customer delay."
              />

              <Decision
                color="amber"
                icon={<Target size={13} />}
                title="ACCEPT WITH WARNING"
                text="Feasible placement with a controlled downstream impact."
              />

              <Decision
                color="wait"
                icon={<Clock3 size={13} />}
                title="WAIT"
                text="Protect the schedule by offering a later safe window."
              />

              <Decision
                color="red"
                icon={<ShieldCheck size={13} />}
                title="RESCHEDULE"
                text="No safe placement satisfies the current constraints."
              />
            </div>
          </div>

          {/* =====================================================
              SIMULATION THEATER
          ===================================================== */}

          <div className="simulation-theater">
            <div className="theater-header">
              <div>
                <span className="theater-kicker">
                  WHAT-IF SCHEDULE THEATER
                </span>

                <h3>See the consequence before committing.</h3>
              </div>

              <div className="theater-status">
                <span className="status-dot" />
                DETERMINISTIC ENGINE
              </div>
            </div>

            <div className="theater-body">
              <div className="theater-request">
                <div className="request-icon">
                  <Users size={17} />
                </div>

                <div>
                  <span>WALK-IN REQUEST</span>
                  <strong>Service request</strong>
                  <small>
                    Duration and service value evaluated
                  </small>
                </div>

                <div className="request-tag">WHAT IF?</div>
              </div>

              <div className="theater-grid">
                <div className="theater-labels">
                  <span>STYLIST</span>
                  <span>TIME</span>
                </div>

                <TheaterRow
                  stylist="Stylist"
                  role="Existing appointment"
                  start="CURRENT"
                  end="NEXT"
                  booked
                />

                <TheaterRow
                  stylist="SALORA"
                  role="Simulated walk-in"
                  start="SAFE"
                  end="WINDOW"
                  simulated
                />

                <TheaterRow
                  stylist="Stylist"
                  role="Downstream appointment"
                  start="NEXT"
                  end="LATER"
                  booked
                />
              </div>

              <div className="theater-impact">
                <div className="impact-icon">
                  <CheckCircle2 size={20} />
                </div>

                <div className="impact-copy">
                  <span>ENGINE RECOMMENDATION</span>
                  <strong>DECISION READY</strong>
                  <small>
                    The engine explains whether the request can be accepted
                    safely.
                  </small>
                </div>

                <div className="impact-value">
                  <span>DECISION BASIS</span>
                  <strong>LIVE STATE</strong>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          INTELLIGENCE
      ========================================================= */}

      <section id="intelligence" className="section section-dark">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Sparkles size={11} />
              OPERATIONAL INTELLIGENCE
            </div>

            <h2>
              One decision.
              <br />
              <em>Multiple layers of context.</em>
            </h2>

            <p>
              SALORA does not stop at finding an empty slot. It evaluates the
              operational consequences surrounding that slot.
            </p>
          </div>

          <div className="feature-grid intelligence-grid-premium">
            <IntelligenceCard
              icon={<Target />}
              number="01"
              title="Capacity"
              label="LIVE STATE"
              text="Understand how much room remains in the current schedule before another service is introduced."
            />

            <IntelligenceCard
              icon={<GitBranch />}
              number="02"
              title="Cascade"
              label="WHAT-IF IMPACT"
              text="See whether one new service creates downstream pressure across later appointments."
            />

            <IntelligenceCard
              icon={<Clock3 />}
              number="03"
              title="Timing"
              label="BEST WINDOW"
              text="Compare candidate start times instead of accepting the first apparently open slot."
            />

            <IntelligenceCard
              icon={<TrendingUp />}
              number="04"
              title="Opportunity"
              label="DECISION VALUE"
              text="Put service value beside operational risk so the trade-off is visible."
            />

            <IntelligenceCard
              icon={<ShieldCheck />}
              number="05"
              title="Protection"
              label="CONSTRAINTS"
              text="Protect existing appointments with skill, buffer, overlap, wait and delay constraints."
            />

            <IntelligenceCard
              icon={<Zap />}
              number="06"
              title="Action"
              label="OPERATIONAL RESPONSE"
              text="Move from recommendation to a controlled acceptance action without losing the audit trail."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          DECISION LOOP
      ========================================================= */}

      <section className="section decision-loop-section">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Sparkles size={11} />
              THE DECISION LOOP
            </div>

            <h2>
              From a walk-in request
              <br />
              to a confident <em>yes.</em>
            </h2>

            <p>
              A repeatable workflow designed for the person standing behind
              the front desk.
            </p>
          </div>

          <div className="decision-loop">
            <LoopStep
              number="01"
              title="Request"
              text="Capture the walk-in service and customer requirement."
            />

            <LoopConnector />

            <LoopStep
              number="02"
              title="Simulate"
              text="Evaluate candidate placements against the live schedule."
            />

            <LoopConnector />

            <LoopStep
              number="03"
              title="Understand"
              text="See delay, wait, affected appointments and service value."
            />

            <LoopConnector />

            <LoopStep
              number="04"
              title="Act"
              text="Accept a safe option or choose a safer alternative."
              active
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          PRODUCT PRINCIPLE
      ========================================================= */}

      <section className="section section-dark">
        <div className="container">
          <div className="principle-panel">
            <div className="principle-mark">
              <Sparkles size={20} />
            </div>

            <div className="principle-copy">
              <span>THE SALORA PRINCIPLE</span>

              <h2>
                Every &quot;yes&quot; should be
                <br />
                an informed decision.
              </h2>

              <p>
                The goal is not to accept every walk-in. The goal is to know
                which ones can be accepted{" "}
                <strong>
                  without creating a problem for someone already booked.
                </strong>
              </p>
            </div>

            <Link href="/login" className="primary-btn">
              Enter SALORA
              <ArrowRight size={14} />
            </Link>
          </div>
        </div>
      </section>

      {/* =========================================================
          FINAL CTA
      ========================================================= */}

      <section className="section final-cta-section">
        <div className="container">
          <div className="final-cta">
            <div className="final-orbit orbit-one" />
            <div className="final-orbit orbit-two" />

            <div className="final-cta-content">
              <div className="eyebrow">
                <Sparkles size={11} />
                SALORA
              </div>

              <h2>
                Stop guessing.
                <br />
                <em>Start flowing.</em>
              </h2>

              <p>
                Turn the next walk-in from a scheduling question into an
                evidence-backed operational decision.
              </p>

              <Link href="/login" className="hero-primary">
                Open SALORA
                <ArrowRight size={16} />
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* =========================================================
          FOOTER
      ========================================================= */}

      <footer className="footer">
        <div className="footer-inner">
          <div>
            <Link href="/" className="brand">
              <i />
              SALORA
            </Link>

            <p>Real-Time Walk-In Decision Intelligence</p>
          </div>

          <div className="footer-links">
            <a href="#engine">Decision Engine</a>
            <a href="#how">How it works</a>
            <a href="#intelligence">Intelligence</a>

            <Link href="/login">
              Staff command center
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>

        <div className="footer-bottom">
          <span>Built for independent salon operations.</span>
          <span>Predict · Recommend · Act</span>
        </div>
      </footer>
    </main>
  );
}

/* =============================================================
   HERO FLOW
============================================================= */

function HeroFlow({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className="hero-flow-item">
      <div className="hero-flow-number">{number}</div>

      <div>
        <strong>{title}</strong>
        <span>{description}</span>
      </div>
    </div>
  );
}

/* =============================================================
   CAPABILITY
============================================================= */

function Capability({ label }: { label: string }) {
  return (
    <>
      <span>{label}</span>
      <i>•</i>
    </>
  );
}

/* =============================================================
   FEATURE
============================================================= */

function Feature({
  n,
  icon,
  title,
  text,
}: {
  n: string;
  icon: ReactNode;
  title: string;
  text: string;
}) {
  return (
    <article className="story-card premium-story-card">
      <div className="story-card-top">
        <span className="story-number">{n}</span>

        <div className="story-icon">{icon}</div>
      </div>

      <div className="story-card-line" />

      <h3>{title}</h3>

      <p>{text}</p>

      <span className="story-card-arrow">
        <ArrowRight size={13} />
      </span>
    </article>
  );
}

/* =============================================================
   DECISION
============================================================= */

function Decision({
  color,
  icon,
  title,
  text,
}: {
  color: "green" | "amber" | "wait" | "red";
  icon: ReactNode;
  title: string;
  text: string;
}) {
  const palette = {
    green: {
      border: "#35694f",
      bg: "#142019",
      iconBg: "#dff5e7",
      icon: "#178654",
    },
    amber: {
      border: "#715d32",
      bg: "#211b13",
      iconBg: "#f4e4bd",
      icon: "#a3761b",
    },
    wait: {
      border: "#70552d",
      bg: "#1d1710",
      iconBg: "#f2e3c4",
      icon: "#9b722b",
    },
    red: {
      border: "#704348",
      bg: "#211617",
      iconBg: "#f4dddd",
      icon: "#b74f58",
    },
  }[color];

  return (
    <div
      className={`decision-card decision-${color}`}
      style={{
        borderColor: palette.border,
        background: palette.bg,
      }}
    >
      <div
        className="decision-icon"
        style={{
          background: palette.iconBg,
          color: palette.icon,
        }}
      >
        {icon}
      </div>

      <div>
        <strong>{title}</strong>
        <span>{text}</span>
      </div>

      <ChevronRight size={13} className="decision-chevron" />
    </div>
  );
}

/* =============================================================
   INTELLIGENCE CARD
============================================================= */

function IntelligenceCard({
  icon,
  number,
  title,
  label,
  text,
}: {
  icon: ReactNode;
  number: string;
  title: string;
  label: string;
  text: string;
}) {
  return (
    <article className="feature-card intelligence-card-premium">
      <div className="feature-card-head">
        <div className="feature-icon">{icon}</div>
        <span>{number}</span>
      </div>

      <div className="feature-card-label">{label}</div>

      <h3>{title}</h3>

      <p>{text}</p>

      <div className="feature-card-line" />
    </article>
  );
}

/* =============================================================
   THEATER ROW
============================================================= */

function TheaterRow({
  stylist,
  role,
  start,
  end,
  simulated = false,
  booked = false,
}: {
  stylist: string;
  role: string;
  start: string;
  end: string;
  simulated?: boolean;
  booked?: boolean;
}) {
  return (
    <div
      className={`theater-row ${
        simulated ? "theater-row-simulated" : ""
      }`}
    >
      <div className="theater-stylist">
        <div className="theater-avatar">
          {simulated ? <Sparkles size={11} /> : stylist.charAt(0)}
        </div>

        <div>
          <strong>{stylist}</strong>
          <span>{role}</span>
        </div>
      </div>

      <div className="theater-time">
        <span>{start}</span>

        <div className="theater-duration">
          <span />
        </div>

        <span>{end}</span>
      </div>

      <div
        className={`theater-badge ${
          simulated ? "simulated-badge" : booked ? "booked-badge" : ""
        }`}
      >
        {simulated ? "SIMULATED" : "BOOKED"}
      </div>
    </div>
  );
}

/* =============================================================
   LOOP STEP
============================================================= */

function LoopStep({
  number,
  title,
  text,
  active = false,
}: {
  number: string;
  title: string;
  text: string;
  active?: boolean;
}) {
  return (
    <div className={`loop-step ${active ? "loop-step-active" : ""}`}>
      <div className="loop-number">{number}</div>

      <div>
        <h3>{title}</h3>
        <p>{text}</p>
      </div>
    </div>
  );
}

/* =============================================================
   LOOP CONNECTOR
============================================================= */

function LoopConnector() {
  return (
    <div className="loop-connector" aria-hidden="true">
      <ArrowRight size={14} />
    </div>
  );
}