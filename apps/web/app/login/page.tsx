"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useState,
} from "react";
import type { CSSProperties } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  BrainCircuit,
  CheckCircle2,
  Eye,
  EyeOff,
  KeyRound,
  LockKeyhole,
  ShieldCheck,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

import styles from "./page.module.css";

/* ------------------------------------------------------------------ */
/* Fonts — local/system stacks only. No next/font/google, no network   */
/* request at build or runtime. Sets the same --font-display /         */
/* --font-body custom properties that page.module.css already expects, */
/* just with literal values instead of a Google-hosted font.           */
/* ------------------------------------------------------------------ */

const fontVariables = {
  "--font-display":
    "'Iowan Old Style', 'Palatino Linotype', Palatino, Georgia, 'Times New Roman', serif",
  "--font-body":
    "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif",
} as CSSProperties;

/* ------------------------------------------------------------------ */
/* Decision states                                                     */
/* ------------------------------------------------------------------ */

type DecisionState =
  | "ACCEPT"
  | "ACCEPT_WITH_WARNING"
  | "WAIT"
  | "RESCHEDULE";

const decisionStates: {
  state: DecisionState;
  label: string;
  description: string;
}[] = [
  {
    state: "ACCEPT",
    label: "Accept",
    description: "Safe immediate capacity",
  },
  {
    state: "ACCEPT_WITH_WARNING",
    label: "Accept carefully",
    description: "Limited downstream impact",
  },
  {
    state: "WAIT",
    label: "Wait",
    description: "Safer slot available",
  },
  {
    state: "RESCHEDULE",
    label: "Protect schedule",
    description: "No safe placement",
  },
];

function decisionNodeClass(state: DecisionState, active: boolean) {
  const classes = [styles.decisionNode];

  if (active) classes.push(styles.decisionNodeActive);
  if (state === "RESCHEDULE") classes.push(styles.decisionNodeReschedule);

  return classes.join(" ");
}

export default function Login() {
  const router = useRouter();

  const [email, setEmail] = useState("owner@salora.demo");
  const [password, setPassword] = useState("Demo@12345");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [capsLock, setCapsLock] = useState(false);
  const [online, setOnline] = useState(true);

  const [activeDecision, setActiveDecision] =
    useState<DecisionState>("ACCEPT");

  useEffect(() => {
    setOnline(navigator.onLine);

    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const interval = window.setInterval(() => {
      setActiveDecision((current) => {
        const currentIndex = decisionStates.findIndex(
          (item) => item.state === current,
        );

        return decisionStates[
          (currentIndex + 1) % decisionStates.length
        ].state;
      });
    }, 3200);

    return () => window.clearInterval(interval);
  }, []);

  useEffect(() => {
    function handleEscape(event: globalThis.KeyboardEvent) {
      if (event.key === "Escape") {
        setError("");
      }
    }

    window.addEventListener("keydown", handleEscape);

    return () => window.removeEventListener("keydown", handleEscape);
  }, []);

  function handlePasswordKeyDown(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  function handlePasswordKeyUp(event: KeyboardEvent<HTMLInputElement>) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

    const cleanEmail = email.trim();

    if (!cleanEmail || !password) {
      setError("Enter your email and password to continue.");
      return;
    }

    if (!online) {
      setError(
        "You appear to be offline. Reconnect to the SALORA command center and try again.",
      );
      return;
    }

    setBusy(true);
    setError("");

    try {
      const response = await fetch("/api/auth/login", {
        method: "POST",
        headers: {
          "content-type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          email: cleanEmail,
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to sign in.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (loginError) {
      setError(
        loginError instanceof Error
          ? loginError.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className={styles.page} style={fontVariables}>
      {/* Atmosphere ------------------------------------------------- */}
      <div className={styles.backdrop} aria-hidden="true">
        <div className={styles.glow} />
        <div className={styles.glowLow} />
        <div className={styles.grid} />
      </div>

      <div className={styles.shell}>
        {/* Nav ------------------------------------------------------ */}
        <nav className={styles.nav} aria-label="Authentication navigation">
          <Link href="/" className={styles.brand} aria-label="SALORA home">
            <span className={styles.brandMark} aria-hidden="true" />
            <span>SALORA</span>
          </Link>

          <div
            className={styles.navStatus}
            aria-label={online ? "Command center online" : "Command center offline"}
          >
            <span
              className={`${styles.statusDot} ${
                online ? "" : styles.statusDotOffline
              }`}
            />
            {online ? "Command center online" : "Connection interrupted"}
          </div>
        </nav>

        {/* Main ------------------------------------------------------ */}
        <section className={styles.layout}>
          {/* Story ---------------------------------------------------- */}
          <div className={styles.story}>
            <div className={styles.kicker}>
              <span className={styles.kickerDot} aria-hidden="true" />
              Salon intelligence
            </div>

            <h1 className={styles.heading}>
              Know before
              <em>you say yes.</em>
            </h1>

            <p className={styles.lead}>
              Make smarter walk-in decisions without putting your booked
              customers at risk.
            </p>

            <div className={styles.intelligence}>
              <div className={styles.intelligenceTop}>
                <div className={styles.intelligenceMeta}>
                  <span className={styles.intelligenceIcon} aria-hidden="true">
                    <BrainCircuit size={16} />
                  </span>
                  <div>
                    <span className={styles.intelligenceLabel}>
                      Decision engine
                    </span>
                    <span className={styles.intelligenceTitle}>
                      Predicting schedule impact
                    </span>
                  </div>
                </div>

                <span className={styles.livePill}>
                  <span className={styles.livePillDot} aria-hidden="true" />
                  Live
                </span>
              </div>

              <div
                className={styles.decisionTrack}
                role="group"
                aria-label="Decision states"
              >
                {decisionStates.map((item) => {
                  const active = item.state === activeDecision;

                  return (
                    <div
                      key={item.state}
                      className={decisionNodeClass(item.state, active)}
                      aria-current={active ? "true" : undefined}
                    >
                      <span className={styles.decisionNodeDot} aria-hidden="true">
                        {active && <span className={styles.decisionNodeDotInner} />}
                      </span>
                      <div>
                        <strong>{item.label}</strong>
                        <small>{item.description}</small>
                      </div>
                    </div>
                  );
                })}
              </div>

              <div className={styles.intelligenceFooter}>
                <Zap size={13} aria-hidden="true" />
                <span>Simulate first. Commit only when the schedule can handle it.</span>
              </div>
            </div>

            <div className={styles.promise}>
              <span className={styles.promiseIcon} aria-hidden="true">
                <CheckCircle2 size={16} />
              </span>
              <div>
                <strong>Predict &rarr; Recommend &rarr; Act</strong>
                <span>Simulate the schedule impact before accepting a walk-in.</span>
              </div>
            </div>
          </div>

          {/* Login panel ------------------------------------------------ */}
          <div className={styles.panel}>
            <div className={styles.panelGlow} aria-hidden="true" />

            <div className={styles.panelInner}>
              <div className={styles.panelHeader}>
                <div>
                  <span className={styles.panelEyebrow}>Staff access</span>
                  <h2 className={styles.panelHeading}>Welcome back.</h2>
                </div>
                <span className={styles.lock} aria-hidden="true">
                  <LockKeyhole size={16} />
                </span>
              </div>

              <p className={styles.panelDescription}>
                Enter your credentials to open the salon command center.
              </p>

              <div
                className={`${styles.connection} ${
                  online ? styles.connectionOnline : styles.connectionOffline
                }`}
                role="status"
                aria-live="polite"
              >
                {online ? <Wifi size={14} /> : <WifiOff size={14} />}
                <span>
                  {online ? "Secure connection ready" : "Waiting for network connection"}
                </span>
              </div>

              <form onSubmit={handleSubmit} className={styles.form} noValidate>
                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Email address</span>
                  <div className={styles.inputWrap}>
                    <input
                      className={styles.input}
                      value={email}
                      onChange={(event) => setEmail(event.target.value)}
                      type="email"
                      autoComplete="email"
                      placeholder="you@salon.com"
                      required
                      disabled={busy}
                      aria-invalid={error ? "true" : "false"}
                    />
                  </div>
                </label>

                <label className={styles.field}>
                  <span className={styles.fieldLabel}>Password</span>
                  <div className={`${styles.inputWrap} ${styles.passwordWrap}`}>
                    <input
                      className={styles.input}
                      value={password}
                      onChange={(event) => setPassword(event.target.value)}
                      onKeyDown={handlePasswordKeyDown}
                      onKeyUp={handlePasswordKeyUp}
                      type={showPassword ? "text" : "password"}
                      autoComplete="current-password"
                      placeholder="Enter your password"
                      required
                      disabled={busy}
                    />
                    <button
                      type="button"
                      className={styles.passwordToggle}
                      onClick={() => setShowPassword((current) => !current)}
                      aria-label={showPassword ? "Hide password" : "Show password"}
                      disabled={busy}
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>

                  {capsLock && (
                    <span className={styles.capsWarning} role="status">
                      <KeyRound size={13} />
                      Caps Lock is on
                    </span>
                  )}
                </label>

                {error && (
                  <div className={styles.errorBox} role="alert" aria-live="assertive">
                    <span className={styles.errorDot} aria-hidden="true" />
                    <div>
                      <strong>Sign-in failed</strong>
                      <p>{error}</p>
                    </div>
                  </div>
                )}

                <button
                  type="submit"
                  className={styles.submit}
                  disabled={busy || !online}
                >
                  <span>{busy ? "Opening command center\u2026" : "Enter SALORA"}</span>
                  {busy ? (
                    <span className={styles.submitSpinner} aria-hidden="true" />
                  ) : (
                    <ArrowRight size={16} />
                  )}
                </button>
              </form>

              <div className={styles.demo}>
                <LockKeyhole size={13} />
                <span>Demo credentials are prefilled</span>
              </div>

              <div className={styles.security}>
                <ShieldCheck size={14} />
                <span>Protected server-side staff session</span>
                <span className={styles.securityPulse}>
                  <span className={styles.securityPulseDot} aria-hidden="true" />
                  Secure
                </span>
              </div>
            </div>
          </div>
        </section>

        {/* Footer ------------------------------------------------------ */}
        <footer className={styles.footer}>
          <span>© 2026 SALORA</span>
          <span>Real-time walk-in decision intelligence</span>
        </footer>
      </div>
    </main>
  );
}