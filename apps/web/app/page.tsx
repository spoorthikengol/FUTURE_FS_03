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
            Staff login
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
            accepted safely — before one new booking creates a chain reaction
            across the rest of the day.
          </p>

          <div className="hero-actions">
            <Link href="/login" className="hero-primary">
              Simulate a walk-in
              <ArrowRight size={16} />
            </Link>

            <a href="#engine" className="hero-secondary">
              See how it works
              <ChevronRight size={16} />
            </a>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 12,
              marginTop: 27,
              color: "#8f877e",
              fontSize: 9,
            }}
          >
            <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <CheckCircle2 size={14} color="#65c895" />
              Predict
            </span>

            <span style={{ color: "#4e463d" }}>→</span>

            <span>Recommend</span>

            <span style={{ color: "#4e463d" }}>→</span>

            <span>Act</span>
          </div>

          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 7,
              marginTop: 19,
              color: "#6f675f",
              fontSize: 8,
            }}
          >
            <span className="live-pulse" />
            Built for real-time salon operations
          </div>
        </div>

        {/* =====================================================
            HERO DECISION VISUAL
           ===================================================== */}

        <div className="hero-visual">
          <div className="hero-card">
            <div className="hero-card-head">
              <span>SALORA / DECISION ENGINE</span>

              <span className="live-pill">
                <span className="status-dot" />
                LIVE
              </span>
            </div>

            <div className="hero-engine">
              <small>WHAT IF WE ACCEPT THIS WALK-IN?</small>

              <h3>Test it first.</h3>

              <p>
                SALORA evaluates the current schedule before a receptionist
                commits the appointment.
              </p>

              <div className="hero-flow">
                <div className="hero-flow-item">
                  <div className="hero-flow-number">01</div>

                  <div>
                    <strong>Walk-in request</strong>
                    <span>Hair Color · 120 min · ₹1,800</span>
                  </div>
                </div>

                <div className="hero-flow-arrow" />

                <div className="hero-flow-item">
                  <div className="hero-flow-number">02</div>

                  <div>
                    <strong>Schedule simulation</strong>
                    <span>Candidate placements evaluated</span>
                  </div>
                </div>

                <div className="hero-flow-arrow" />

                <div className="hero-flow-item">
                  <div className="hero-flow-number">03</div>

                  <div>
                    <strong>Downstream impact</strong>
                    <span>Delay · wait · affected appointments</span>
                  </div>
                </div>

                <div className="hero-flow-arrow" />

                <div
                  className="hero-flow-item"
                  style={{
                    borderColor: "#35694f",
                    background: "#142019",
                  }}
                >
                  <div
                    className="hero-flow-number"
                    style={{
                      background: "#193426",
                      color: "#65c895",
                    }}
                  >
                    <Check size={13} />
                  </div>

                  <div>
                    <strong style={{ color: "#75d9a4" }}>
                      SAFE TO ACCEPT
                    </strong>

                    <span>No downstream delay detected</span>
                  </div>
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
        style={{
          borderTop: "1px solid rgba(255,255,255,0.06)",
          borderBottom: "1px solid rgba(255,255,255,0.06)",
          overflow: "hidden",
          background: "rgba(0,0,0,0.14)",
        }}
        aria-label="SALORA capabilities"
      >
        <div
          style={{
            width: "min(1180px, calc(100% - 40px))",
            minHeight: 66,
            margin: "0 auto",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 25,
            overflow: "hidden",
            color: "#625b52",
            font: '800 7px "Manrope", sans-serif',
            letterSpacing: "1.7px",
            whiteSpace: "nowrap",
          }}
        >
          <span>WALK-INS</span>
          <i>•</i>
          <span>SCHEDULES</span>
          <i>•</i>
          <span>CAPACITY</span>
          <i>•</i>
          <span>CASCADE IMPACT</span>
          <i>•</i>
          <span>REVENUE</span>
          <i>•</i>
          <span>DECISIONS</span>
        </div>
      </section>

      {/* =========================================================
          DIFFERENCE
         ========================================================= */}

      <section id="how" className="section section-dark">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">
              <Sparkles size={11} />
              THE SALORA DIFFERENCE
            </div>

            <h2>
              A calendar shows
              <br />
              <em style={{ color: "var(--gold)", fontStyle: "normal" }}>
                what is booked.
              </em>
              <br />
              SALORA shows what happens next.
            </h2>

            <p>
              Independent salons operate with finite chairs, stylist
              availability and constantly changing demand. SALORA turns that
              moving operational state into a decision the front desk can act
              on.
            </p>
          </div>

          <div className="story-grid">
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
              text="Candidate placements are tested before acceptance so downstream consequences are visible before they happen."
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

      <section id="engine" className="section">
        <div className="container">
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "0.8fr 1.2fr",
              gap: 65,
              alignItems: "center",
            }}
          >
            <div>
              <div className="eyebrow">
                <Sparkles size={12} />
                THE SIGNATURE FEATURE
              </div>

              <h2
                style={{
                  margin: "15px 0",
                  font: '600 clamp(42px, 5vw, 68px) var(--font-serif)',
                  lineHeight: 0.95,
                  letterSpacing: "-2px",
                }}
              >
                Don't guess.
                <br />
                <em
                  style={{
                    color: "var(--gold)",
                    fontStyle: "normal",
                  }}
                >
                  Simulate.
                </em>
              </h2>

              <p
                style={{
                  maxWidth: 500,
                  color: "var(--muted)",
                  fontSize: 12,
                  lineHeight: 1.75,
                }}
              >
                A walk-in request should not be a yes-or-no guess. SALORA tests
                the schedule first then gives the front desk a clear
                operational recommendation.
              </p>

              <div
                style={{
                  display: "grid",
                  gap: 10,
                  marginTop: 28,
                }}
              >
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

            {/* =================================================
                SIMULATION PREVIEW
               ================================================= */}

            <div className="hero-card" style={{ width: "100%" }}>
              <div className="hero-card-head">
                <span>SIMULATION THEATER</span>

                <span className="live-pill">
                  <span className="status-dot" />
                  DETERMINISTIC
                </span>
              </div>

              <div style={{ padding: 23 }}>
                <div
                  style={{
                    color: "#817970",
                    font: '700 7px var(--font-display)',
                    letterSpacing: "1.2px",
                  }}
                >
                  WHAT HAPPENS IF WE SAY YES?
                </div>

                <h3
                  style={{
                    margin: "10px 0 6px",
                    font: '800 25px var(--font-display)',
                  }}
                >
                  Hair Color · ₹1,800
                </h3>

                <p
                  style={{
                    margin: 0,
                    color: "#70685f",
                    fontSize: 8,
                  }}
                >
                  120 min service · simulated before commitment
                </p>

                <div
                  style={{
                    marginTop: 22,
                    border: "1px solid #dfe4e0",
                    borderRadius: 13,
                    padding: 15,
                    background: "#f7f8f6",
                    color: "#17201b",
                  }}
                >
                  <div
                    style={{
                      display: "grid",
                      gridTemplateColumns: "65px 1fr",
                      gap: 8,
                      marginBottom: 10,
                      color: "#929a95",
                      font: '600 6px var(--font-display)',
                    }}
                  >
                    <span />
                    <div
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                      }}
                    >
                      <span>4 PM</span>
                      <span>5 PM</span>
                      <span>6 PM</span>
                      <span>7 PM</span>
                    </div>
                  </div>

                  <PreviewRow
                    name="Ananya"
                    service="Haircut"
                    time="04:04"
                  />

                  <PreviewRow
                    name="SALORA"
                    service="Walk-in · Hair Color"
                    time="05:20"
                    simulated
                  />

                  <PreviewRow
                    name="Ananya"
                    service="Color"
                    time="06:04"
                  />
                </div>

                <div
                  style={{
                    marginTop: 11,
                    padding: 14,
                    display: "grid",
                    gridTemplateColumns: "auto 1fr auto",
                    gap: 11,
                    alignItems: "center",
                    border: "1px solid #35694f",
                    borderRadius: 12,
                    background: "#142019",
                  }}
                >
                  <div
                    style={{
                      width: 36,
                      height: 36,
                      display: "grid",
                      placeItems: "center",
                      borderRadius: "50%",
                      background: "#dff5e7",
                      color: "#178654",
                    }}
                  >
                    <CheckCircle2 size={19} />
                  </div>

                  <div>
                    <small
                      style={{
                        display: "block",
                        color: "#6e9e82",
                        font: '800 6px var(--font-display)',
                        letterSpacing: "1px",
                      }}
                    >
                      ENGINE OUTPUT
                    </small>

                    <strong
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "#fff",
                        font: '800 14px var(--font-display)',
                      }}
                    >
                      ACCEPT
                    </strong>

                    <span
                      style={{
                        display: "block",
                        marginTop: 3,
                        color: "#829589",
                        fontSize: 7,
                      }}
                    >
                      Immediate placement · 0 min delay
                    </span>
                  </div>

                  <strong
                    style={{
                      color: "var(--gold)",
                      font: '800 16px var(--font-display)',
                    }}
                  >
                    ₹1,800
                  </strong>
                </div>

                <Link
                  href="/login"
                  className="primary-btn"
                  style={{
                    width: "100%",
                    marginTop: 11,
                  }}
                >
                  Run this for your salon
                  <ArrowRight size={14} />
                </Link>
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
            <div className="eyebrow">OPERATIONAL INTELLIGENCE</div>

            <h2>
              One decision.
              <br />
              <em
                style={{
                  color: "var(--gold)",
                  fontStyle: "normal",
                }}
              >
                Four layers of context.
              </em>
            </h2>

            <p>
              SALORA connects the immediate walk-in decision with the
              operational state surrounding it.
            </p>
          </div>

          <div className="feature-grid">
            <IntelligenceCard
              icon={<Target />}
              title="Capacity"
              label="LIVE STATE"
              text="Understand how much room remains in the current schedule before adding another service."
            />

            <IntelligenceCard
              icon={<GitBranch />}
              title="Cascade"
              label="WHAT-IF IMPACT"
              text="See whether one new service creates downstream pressure across later appointments."
            />

            <IntelligenceCard
              icon={<Clock3 />}
              title="Timing"
              label="BEST WINDOW"
              text="Compare candidate start times instead of accepting the first apparently open slot."
            />

            <IntelligenceCard
              icon={<Zap />}
              title="Opportunity"
              label="DECISION VALUE"
              text="Put service value beside operational risk so the trade-off is visible."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          DECISION LOOP
         ========================================================= */}

      <section className="section">
        <div className="container">
          <div className="section-heading">
            <div className="eyebrow">THE DECISION LOOP</div>

            <h2>
              From a walk-in request
              <br />
              to a confident{" "}
              <em
                style={{
                  color: "var(--gold)",
                  fontStyle: "normal",
                }}
              >
                yes.
              </em>
            </h2>

            <p>
              No guesswork. No manual schedule juggling. Just a repeatable
              decision workflow.
            </p>
          </div>

          <div className="story-grid">
            <FlowStep
              number="01"
              title="Request"
              text="A customer arrives without an appointment."
            />

            <FlowStep
              number="02"
              title="Simulate"
              text="SALORA tests possible placements against the live schedule."
            />

            <FlowStep
              number="03"
              title="Understand"
              text="The engine explains delay, wait, impact and value."
            />
          </div>

          <div style={{ maxWidth: 380, marginTop: 13 }}>
            <FlowStep
              number="04"
              title="Act"
              text="The receptionist accepts a safe option or chooses another path."
            />
          </div>
        </div>
      </section>

      {/* =========================================================
          POSITIONING
         ========================================================= */}

      <section className="section section-dark">
        <div className="container">
          <div
            style={{
              padding: "38px 40px",
              display: "grid",
              gridTemplateColumns: "auto 1fr auto",
              gap: 25,
              alignItems: "center",
              border: "1px solid #493b2b",
              borderRadius: 20,
              background:
                "linear-gradient(135deg, #21180f, #110d09)",
              boxShadow: "var(--shadow-lg)",
            }}
          >
            <div
              style={{
                width: 47,
                height: 47,
                display: "grid",
                placeItems: "center",
                border: "1px solid #5c4930",
                borderRadius: 13,
                background: "#241b11",
                color: "var(--gold)",
              }}
            >
              <Sparkles size={19} />
            </div>

            <div>
              <span
                style={{
                  color: "var(--gold)",
                  font: '800 7px var(--font-display)',
                  letterSpacing: "1.5px",
                }}
              >
                DESIGNED FOR INDEPENDENT SALONS
              </span>

              <h2
                style={{
                  margin: "9px 0 8px",
                  font: '600 clamp(25px, 3vw, 39px) var(--font-serif)',
                  lineHeight: 1,
                }}
              >
                More than a calendar.
                <br />
                Less chaos behind the desk.
              </h2>

              <p
                style={{
                  maxWidth: 650,
                  margin: 0,
                  color: "#82796f",
                  fontSize: 9,
                  lineHeight: 1.7,
                }}
              >
                SALORA is built around one operational question:
                <strong style={{ color: "#c8bfb4" }}>
                  {" "}
                  can we accept this customer without creating a problem for
                  someone already booked?
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

            <Link href="/login">
              Staff command center
              <ArrowRight size={11} />
            </Link>
          </div>
        </div>
      </footer>
    </main>
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
    <article className="story-card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <span className="story-number">{n}</span>

        <div
          style={{
            width: 36,
            height: 36,
            display: "grid",
            placeItems: "center",
            borderRadius: 9,
            background: "rgba(212,175,55,0.08)",
            color: "var(--gold)",
          }}
        >
          {icon}
        </div>
      </div>

      <h3>{title}</h3>

      <p>{text}</p>
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
      style={{
        display: "flex",
        alignItems: "center",
        gap: 11,
        padding: 11,
        border: `1px solid ${palette.border}`,
        borderRadius: 11,
        background: palette.bg,
      }}
    >
      <div
        style={{
          width: 32,
          height: 32,
          flex: "none",
          display: "grid",
          placeItems: "center",
          borderRadius: "50%",
          background: palette.iconBg,
          color: palette.icon,
        }}
      >
        {icon}
      </div>

      <div>
        <strong
          style={{
            display: "block",
            color: "#eee8df",
            font: '800 8px var(--font-display)',
          }}
        >
          {title}
        </strong>

        <span
          style={{
            display: "block",
            marginTop: 3,
            color: "#817970",
            fontSize: 7,
            lineHeight: 1.45,
          }}
        >
          {text}
        </span>
      </div>
    </div>
  );
}

/* =============================================================
   INTELLIGENCE CARD
   ============================================================= */

function IntelligenceCard({
  icon,
  title,
  label,
  text,
}: {
  icon: ReactNode;
  title: string;
  label: string;
  text: string;
}) {
  return (
    <article className="feature-card">
      <div className="feature-icon">{icon}</div>

      <span
        style={{
          display: "block",
          marginTop: 17,
          color: "var(--gold)",
          font: '800 6px var(--font-display)',
          letterSpacing: "1.2px",
        }}
      >
        {label}
      </span>

      <h3>{title}</h3>

      <p>{text}</p>
    </article>
  );
}

/* =============================================================
   FLOW STEP
   ============================================================= */

function FlowStep({
  number,
  title,
  text,
}: {
  number: string;
  title: string;
  text: string;
}) {
  return (
    <article className="story-card">
      <span className="story-number">{number}</span>

      <h3>{title}</h3>

      <p>{text}</p>
    </article>
  );
}

/* =============================================================
   TIMELINE PREVIEW
   ============================================================= */

function PreviewRow({
  name,
  service,
  time,
  simulated = false,
}: {
  name: string;
  service: string;
  time: string;
  simulated?: boolean;
}) {
  return (
    <div
      style={{
        minHeight: 46,
        display: "grid",
        gridTemplateColumns: "47px 1fr auto",
        alignItems: "center",
        gap: 8,
        borderTop: "1px solid #e1e6e2",
      }}
    >
      <span
        style={{
          color: "#858e89",
          font: '600 6px var(--font-display)',
        }}
      >
        {time}
      </span>

      <strong
        style={{
          color: simulated ? "#55420e" : "#36423b",
          font: '800 7px var(--font-display)',
        }}
      >
        {name} · {service}
      </strong>

      <span
        style={{
          padding: "4px 6px",
          borderRadius: 5,
          background: simulated ? "#eadb8e" : "#e5e9e6",
          color: simulated ? "#66500d" : "#7a837e",
          font: '800 5px var(--font-display)',
        }}
      >
        {simulated ? "SIMULATED" : "BOOKED"}
      </span>
    </div>
  );
}