"use client";

import {
  FormEvent,
  KeyboardEvent,
  useEffect,
  useState,
} from "react";
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
  Sparkles,
  Wifi,
  WifiOff,
  Zap,
} from "lucide-react";

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

function decisionClass(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "accept";

    case "ACCEPT_WITH_WARNING":
      return "warning";

    case "WAIT":
      return "wait";

    case "RESCHEDULE":
      return "reschedule";
  }
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

    return () =>
      window.removeEventListener("keydown", handleEscape);
  }, []);

  function handlePasswordKeyDown(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  function handlePasswordKeyUp(
    event: KeyboardEvent<HTMLInputElement>,
  ) {
    setCapsLock(event.getModifierState("CapsLock"));
  }

  async function handleSubmit(
    event: FormEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    if (busy) {
      return;
    }

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
        throw new Error(
          data.error || "Unable to sign in.",
        );
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
    <main className="auth-page">
      {/* ------------------------------------------------------------------ */}
      {/* Atmospheric background                                             */}
      {/* ------------------------------------------------------------------ */}

      <div
        className="auth-background"
        aria-hidden="true"
      >
        <div className="auth-light auth-light-one" />
        <div className="auth-light auth-light-two" />
        <div className="auth-grid" />
        <div className="auth-grain" />
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* Navigation                                                         */}
      {/* ------------------------------------------------------------------ */}

      <nav
        className="auth-nav"
        aria-label="Authentication navigation"
      >
        <Link
          href="/"
          className="auth-brand"
          aria-label="SALORA home"
        >
          <span className="auth-brand-mark">
            <span />
            <span />
          </span>

          <span>SALORA</span>
        </Link>

        <div
          className="auth-nav-status"
          aria-label={
            online
              ? "Command center online"
              : "Command center offline"
          }
        >
          <span
            className={`status-dot ${
              online ? "" : "status-dot-offline"
            }`}
          />

          {online
            ? "Command center"
            : "Connection interrupted"}
        </div>
      </nav>

      {/* ------------------------------------------------------------------ */}
      {/* Main authentication experience                                    */}
      {/* ------------------------------------------------------------------ */}

      <section className="auth-layout">
        {/* ---------------------------------------------------------------- */}
        {/* Brand story                                                      */}
        {/* ---------------------------------------------------------------- */}

        <div className="auth-story">
          <div className="auth-kicker">
            <Sparkles size={14} />
            SALON INTELLIGENCE
          </div>

          <h1>
            Know before
            <br />
            <em>you say yes.</em>
          </h1>

          <p>
            Make smarter walk-in decisions without putting
            your booked customers at risk.
          </p>

          {/* Decision intelligence preview */}

          <div className="auth-intelligence-preview">
            <div className="auth-intelligence-top">
              <div className="auth-intelligence-icon">
                <BrainCircuit size={18} />
              </div>

              <div>
                <span className="auth-intelligence-label">
                  DECISION ENGINE
                </span>

                <strong>
                  Predicting schedule impact
                </strong>
              </div>

              <span className="auth-live-pill">
                <span />
                LIVE
              </span>
            </div>

            <div className="auth-decision-track">
              {decisionStates.map((item) => {
                const active =
                  item.state === activeDecision;

                return (
                  <div
                    key={item.state}
                    className={`auth-decision-node ${
                      active ? "active" : ""
                    } ${decisionClass(item.state)}`}
                  >
                    <span className="auth-decision-node-dot">
                      {active && <span />}
                    </span>

                    <div>
                      <strong>{item.label}</strong>
                      <small>{item.description}</small>
                    </div>
                  </div>
                );
              })}
            </div>

            <div className="auth-intelligence-footer">
              <Zap size={13} />
              <span>
                Simulate first. Commit only when the schedule
                can handle it.
              </span>
            </div>
          </div>

          {/* Core product promise */}

          <div className="auth-promise">
            <div className="auth-promise-icon">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <strong>
                Predict → Recommend → Act
              </strong>

              <span>
                Simulate the schedule impact before accepting
                a walk-in.
              </span>
            </div>
          </div>
        </div>

        {/* ---------------------------------------------------------------- */}
        {/* Login panel                                                      */}
        {/* ---------------------------------------------------------------- */}

        <div className="auth-panel">
          <div className="auth-panel-glow" />

          <div className="auth-panel-inner">
            <div className="auth-panel-header">
              <div>
                <small>STAFF ACCESS</small>

                <h2>Welcome back.</h2>
              </div>

              <div
                className="auth-lock"
                aria-hidden="true"
              >
                <LockKeyhole size={18} />
              </div>
            </div>

            <p className="auth-panel-description">
              Enter your credentials to open the salon
              command center.
            </p>

            {/* Connection indicator */}

            <div
              className={`auth-connection ${
                online
                  ? "auth-connection-online"
                  : "auth-connection-offline"
              }`}
              role="status"
              aria-live="polite"
            >
              {online ? (
                <Wifi size={14} />
              ) : (
                <WifiOff size={14} />
              )}

              <span>
                {online
                  ? "Secure connection ready"
                  : "Waiting for network connection"}
              </span>
            </div>

            <form
              onSubmit={handleSubmit}
              className="auth-form"
              noValidate
            >
              {/* Email */}

              <label className="auth-field">
                <span>Email address</span>

                <div className="auth-input-wrap">
                  <input
                    value={email}
                    onChange={(event) =>
                      setEmail(event.target.value)
                    }
                    type="email"
                    autoComplete="email"
                    placeholder="you@salon.com"
                    required
                    disabled={busy}
                    aria-invalid={
                      error ? "true" : "false"
                  }
                  />
                </div>
              </label>

              {/* Password */}

              <label className="auth-field">
                <span>Password</span>

                <div className="auth-input-wrap auth-password-wrap">
                  <input
                    value={password}
                    onChange={(event) =>
                      setPassword(event.target.value)
                    }
                    onKeyDown={handlePasswordKeyDown}
                    onKeyUp={handlePasswordKeyUp}
                    type={
                      showPassword
                        ? "text"
                        : "password"
                    }
                    autoComplete="current-password"
                    placeholder="Enter your password"
                    required
                    disabled={busy}
                  />

                  <button
                    type="button"
                    className="auth-password-toggle"
                    onClick={() =>
                      setShowPassword(
                        (current) => !current,
                      )
                    }
                    aria-label={
                      showPassword
                        ? "Hide password"
                        : "Show password"
                    }
                    disabled={busy}
                  >
                    {showPassword ? (
                      <EyeOff size={17} />
                    ) : (
                      <Eye size={17} />
                    )}
                  </button>
                </div>

                {capsLock && (
                  <span
                    className="auth-caps-warning"
                    role="status"
                  >
                    <KeyRound size={13} />
                    Caps Lock is on
                  </span>
                )}
              </label>

              {/* Error */}

              {error && (
                <div
                  className="auth-error"
                  role="alert"
                  aria-live="assertive"
                >
                  <span />
                  <div>
                    <strong>Sign-in failed</strong>
                    <p>{error}</p>
                  </div>
                </div>
              )}

              {/* Submit */}

              <button
                type="submit"
                className={`auth-submit ${
                  busy ? "auth-submit-busy" : ""
                }`}
                disabled={busy || !online}
              >
                <span>
                  {busy
                    ? "Opening command center…"
                    : "Enter SALORA"}
                </span>

                {busy ? (
                  <span
                    className="auth-submit-spinner"
                    aria-hidden="true"
                  />
                ) : (
                  <ArrowRight size={17} />
                )}
              </button>
            </form>

            {/* Demo access */}

            <div className="auth-demo">
              <LockKeyhole size={14} />

              <span>
                Demo credentials are prefilled
              </span>
            </div>

            {/* Security signal */}

            <div className="auth-security">
              <ShieldCheck size={15} />

              <span>
                Protected server-side staff session
              </span>

              <span className="auth-security-pulse">
                <span />
                Secure
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* ------------------------------------------------------------------ */}
      {/* Footer                                                             */}
      {/* ------------------------------------------------------------------ */}

      <footer className="auth-footer">
        <span>© 2026 SALORA</span>

        <span>
          Real-time walk-in decision intelligence
        </span>
      </footer>
    </main>
  );
}