"use client";

import { FormEvent, useState } from "react";
import { useRouter } from "next/navigation";
import {
  ArrowRight,
  CheckCircle2,
  LockKeyhole,
  ShieldCheck,
  Sparkles,
} from "lucide-react";

export default function Login() {
  const [email, setEmail] = useState("owner@salora.demo");
  const [password, setPassword] = useState("Demo@12345");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const router = useRouter();

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (busy) return;

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
          email: email.trim(),
          password,
        }),
      });

      const data = await response.json().catch(() => ({}));

      if (!response.ok) {
        throw new Error(data.error || "Unable to sign in.");
      }

      router.push("/dashboard");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Something went wrong. Please try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <main className="auth-page">
      <div className="auth-background" aria-hidden="true">
        <div className="auth-light auth-light-one" />
        <div className="auth-light auth-light-two" />
        <div className="auth-grid" />
      </div>

      <nav className="auth-nav">
        <a href="/" className="auth-brand" aria-label="SALORA home">
          <span className="auth-brand-mark">
            <span />
            <span />
          </span>

          <span>SALORA</span>
        </a>

        <div className="auth-nav-status">
          <span className="status-dot" />
          Command center
        </div>
      </nav>

      <section className="auth-layout">
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
            Make smarter walk-in decisions without putting your booked
            customers at risk.
          </p>

          <div className="auth-promise">
            <div className="auth-promise-icon">
              <CheckCircle2 size={18} />
            </div>

            <div>
              <strong>Predict → Recommend → Act</strong>
              <span>
                Simulate the schedule impact before accepting a walk-in.
              </span>
            </div>
          </div>
        </div>

        <div className="auth-panel">
          <div className="auth-panel-glow" />

          <div className="auth-panel-inner">
            <div className="auth-panel-header">
              <div>
                <small>STAFF ACCESS</small>
                <h2>Welcome back.</h2>
              </div>

              <div className="auth-lock">
                <LockKeyhole size={18} />
              </div>
            </div>

            <p className="auth-panel-description">
              Enter your credentials to open the salon command center.
            </p>

            <form onSubmit={handleSubmit} className="auth-form">
              <label>
                <span>Email address</span>
                <input
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  type="email"
                  autoComplete="email"
                  placeholder="you@salon.com"
                  required
                  disabled={busy}
                />
              </label>

              <label>
                <span>Password</span>
                <input
                  value={password}
                  onChange={(event) => setPassword(event.target.value)}
                  type="password"
                  autoComplete="current-password"
                  placeholder="Enter your password"
                  required
                  disabled={busy}
                />
              </label>

              {error && (
                <div className="auth-error" role="alert">
                  <span />
                  {error}
                </div>
              )}

              <button
                type="submit"
                className="auth-submit"
                disabled={busy}
              >
                <span>{busy ? "Opening command center…" : "Enter SALORA"}</span>
                <ArrowRight size={17} />
              </button>
            </form>

            <div className="auth-demo">
              <LockKeyhole size={14} />
              <span>Demo credentials are prefilled</span>
            </div>

            <div className="auth-security">
              <ShieldCheck size={15} />
              <span>Protected staff session</span>
            </div>
          </div>
        </div>
      </section>

      <footer className="auth-footer">
        <span>© 2026 SALORA</span>
        <span>Real-time walk-in decision intelligence</span>
      </footer>
    </main>
  );
}