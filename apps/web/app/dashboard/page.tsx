"use client";

import {
  Activity,
  AlertTriangle,
  ArrowUpRight,
  CalendarDays,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  History,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Timer,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";

type DecisionState =
  | "ACCEPT"
  | "ACCEPT_WITH_WARNING"
  | "WAIT"
  | "RESCHEDULE";

type Decision = {
  state: DecisionState;
  stylistId: string;
  start: string;
  end: string;
  revenue: number;
  totalDelay: number;
  maxDelay: number;
  wait: number;
  affected: number;
  reason: string;
};

type Service = {
  id: string;
  name: string;
  duration_min: number;
  price_inr: number;
  buffer_min: number;
};

type Stylist = {
  id: string;
  name: string;
};

type Appointment = {
  id: string;
  customer?: string;
  service: string;
  stylist: string;
  stylist_id?: string;
  scheduled_start: string;
  scheduled_end?: string;
  status: string;
};

type Salon = {
  name: string;
  timezone: string;
  open_time?: string;
  close_time?: string;
};

type DashboardData = {
  salon: Salon;
  services: Service[];
  stylists: Stylist[];
  appointments: Appointment[];

  bookedMinutes?: number;
  availableCapacityMinutes?: number;
  utilizationPercent?: number;
  schedulePressure?: number;

  acceptedWalkInsToday?: number;
  acceptedWalkInRevenueToday?: number;
  simulationCountToday?: number;

  noShowsToday?: number;
  cancellationsToday?: number;

  todayRevenuePotential?: number;
};

type HistoryItem = {
  id: string;
  service: string;
  state: DecisionState;
  stylist: string;
  start: string;
  revenue: number;
  delay: number;
  affected: number;
  createdAt: string;
};

function formatCurrency(value: number) {
  return `₹${Math.round(value).toLocaleString("en-IN")}`;
}

function formatTime(value: string) {
  return new Date(value).toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stateLabel(state: DecisionState) {
  return state.replaceAll("_", " ");
}

function stateClass(state: DecisionState) {
  return state.toLowerCase().replaceAll("_", "-");
}

function statusIcon(state: DecisionState) {
  if (state === "ACCEPT") {
    return <CheckCircle2 size={19} />;
  }

  if (state === "WAIT") {
    return <Timer size={19} />;
  }

  if (state === "ACCEPT_WITH_WARNING") {
    return <AlertTriangle size={19} />;
  }

  return <ShieldCheck size={19} />;
}

function statusDescription(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "Immediate placement with no scheduled customer delay.";

    case "ACCEPT_WITH_WARNING":
      return "Placement is feasible but creates measurable downstream delay.";

    case "WAIT":
      return "A safer placement becomes available after a short wait.";

    case "RESCHEDULE":
      return "Current constraints do not support a safe placement.";
  }
}

function stateAccent(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "sage";

    case "ACCEPT_WITH_WARNING":
      return "warning";

    case "WAIT":
      return "wait";

    case "RESCHEDULE":
      return "danger";
  }
}

export default function Dashboard() {
  const [d, setD] = useState<DashboardData | null>(null);

  const [svc, setSvc] = useState("");
  const [customerName, setCustomerName] = useState("");

  const [dec, setDec] = useState<Decision | null>(null);
  const [candidates, setCandidates] = useState<Decision[]>([]);

  const [busy, setBusy] = useState(false);
  const [accepted, setAccepted] = useState(false);
  const [error, setError] = useState("");

  const [stage, setStage] = useState(0);
  const [theaterActive, setTheaterActive] = useState(false);

  const [activeView, setActiveView] = useState<
    "overview" | "schedule" | "customers"
  >("overview");

  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [showHistory, setShowHistory] = useState(false);
  const [showAlternatives, setShowAlternatives] = useState(false);

  const load = async () => {
    try {
      setError("");

      const response = await fetch("/api/dashboard", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        window.location.href = "/login";
        return;
      }

      const data = await response.json();

      setD(data);
    } catch {
      setError("Could not load the live salon state.");
    }
  };

  useEffect(() => {
    load();
  }, []);

  useEffect(() => {
    if (!busy) return;

    setStage(0);

    const timer = window.setInterval(() => {
      setStage((value) => Math.min(value + 1, 4));
    }, 300);

    return () => window.clearInterval(timer);
  }, [busy]);

  const selected = useMemo(
    () => d?.services?.find((service) => service.id === svc),
    [d, svc],
  );

  const appointments = d?.appointments ?? [];

  const actualUtilization = useMemo(() => {
    if (typeof d?.utilizationPercent === "number") {
      return Math.min(
        100,
        Math.max(0, Math.round(d.utilizationPercent)),
      );
    }

    if (typeof d?.schedulePressure === "number") {
      return Math.min(
        100,
        Math.max(0, Math.round(d.schedulePressure)),
      );
    }

    const stylistCount = Math.max(
      1,
      d?.stylists?.length ?? 1,
    );

    return Math.min(
      100,
      Math.round(
        (appointments.length / (stylistCount * 4)) * 100,
      ),
    );
  }, [d, appointments.length]);

  const bookedMinutes = d?.bookedMinutes ?? 0;

  const availableMinutes =
    d?.availableCapacityMinutes ??
    Math.max(0, d?.stylists?.length ?? 0) * 8 * 60 -
      bookedMinutes;

  const acceptedWalkIns =
    d?.acceptedWalkInsToday ?? 0;

  const acceptedWalkInRevenue =
    d?.acceptedWalkInRevenueToday ?? 0;

  const noShows = d?.noShowsToday ?? 0;

  const cancellations =
    d?.cancellationsToday ?? 0;

  const simulationCount =
    d?.simulationCountToday ?? 0;

  const stylistRows = useMemo(() => {
    if (!d?.stylists) return [];

    return d.stylists.map((stylist) => ({
      id: stylist.id,
      name: stylist.name,
      appointments: appointments
        .filter(
          (appointment) =>
            appointment.stylist_id === stylist.id ||
            appointment.stylist === stylist.name,
        )
        .sort(
          (a, b) =>
            new Date(a.scheduled_start).getTime() -
            new Date(b.scheduled_start).getTime(),
        ),
    }));
  }, [d, appointments]);

  const timelineBounds = useMemo(() => {
    const now = Date.now();

    const starts = appointments.map((appointment) =>
      new Date(
        appointment.scheduled_start,
      ).getTime(),
    );

    const ends = appointments.map((appointment) =>
      appointment.scheduled_end
        ? new Date(
            appointment.scheduled_end,
          ).getTime()
        : new Date(
            appointment.scheduled_start,
          ).getTime() +
          45 * 60 * 1000,
    );

    if (dec) {
      starts.push(new Date(dec.start).getTime());
      ends.push(new Date(dec.end).getTime());
    }

    const baseStart = Math.min(
      starts.length ? Math.min(...starts) : now,
      now,
    );

    const baseEnd = Math.max(
      ends.length
        ? Math.max(...ends)
        : now + 3 * 60 * 60 * 1000,
      now + 2 * 60 * 60 * 1000,
    );

    return {
      start: baseStart - 30 * 60 * 1000,
      end: baseEnd + 30 * 60 * 1000,
    };
  }, [appointments, dec]);

  const timelinePosition = (
    start: string,
    end?: string,
  ) => {
    const total =
      timelineBounds.end -
      timelineBounds.start;

    const startMs = new Date(start).getTime();

    const endMs = end
      ? new Date(end).getTime()
      : startMs + 45 * 60 * 1000;

    const left =
      ((startMs - timelineBounds.start) /
        total) *
      100;

    const width =
      ((endMs - startMs) / total) * 100;

    return {
      left: `${Math.max(0, left)}%`,
      width: `${Math.max(
        5,
        Math.min(width, 94),
      )}%`,
    };
  };

  const timeMarks = useMemo(() => {
    const marks: number[] = [];
    const hour = 60 * 60 * 1000;

    let current =
      Math.ceil(
        timelineBounds.start / hour,
      ) * hour;

    while (current <= timelineBounds.end) {
      marks.push(current);
      current += hour;
    }

    return marks;
  }, [timelineBounds]);

  const pressureLabel = useMemo(() => {
    if (actualUtilization >= 85) {
      return "High pressure";
    }

    if (actualUtilization >= 65) {
      return "Moderate pressure";
    }

    return "Healthy capacity";
  }, [actualUtilization]);

  const pressureClass = useMemo(() => {
    if (actualUtilization >= 85) {
      return "pressure-high";
    }

    if (actualUtilization >= 65) {
      return "pressure-medium";
    }

    return "pressure-low";
  }, [actualUtilization]);

  const recommendedStylist = useMemo(() => {
    if (!dec || !d) return null;

    return (
      d.stylists.find(
        (stylist) =>
          stylist.id === dec.stylistId,
      ) ?? null
    );
  }, [dec, d]);

  async function simulate() {
    if (!svc || busy) return;

    setBusy(true);
    setError("");
    setAccepted(false);
    setTheaterActive(false);
    setShowAlternatives(false);

    try {
      const response = await fetch(
        "/api/walk-ins/simulate",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
          },
          credentials: "include",
          body: JSON.stringify({
            serviceId: svc,
            now: new Date().toISOString(),
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Simulation failed.",
        );
      }

      setDec(result.recommendation ?? null);
      setCandidates(result.candidates ?? []);

      window.setTimeout(() => {
        setTheaterActive(true);
      }, 500);
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Simulation failed.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function accept() {
    if (!dec || !svc || busy) return;

    setBusy(true);
    setError("");

    try {
      const response = await fetch(
        "/api/walk-ins/accept",
        {
          method: "POST",
          headers: {
            "content-type": "application/json",
            "idempotency-key":
              crypto.randomUUID(),
          },
          credentials: "include",
          body: JSON.stringify({
            serviceId: svc,
            stylistId: dec.stylistId,
            startAt: dec.start,
            decisionState: dec.state,
            customerName:
              customerName.trim() ||
              undefined,
          }),
        },
      );

      const result = await response.json();

      if (!response.ok) {
        throw new Error(
          result.error ||
            "Acceptance failed. Please simulate again.",
        );
      }

      const stylistName =
        d?.stylists?.find(
          (stylist) =>
            stylist.id ===
            dec.stylistId,
        )?.name ??
        "Recommended stylist";

      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        service:
          selected?.name ??
          "Walk-in service",
        state: dec.state,
        stylist: stylistName,
        start: dec.start,
        revenue: dec.revenue,
        delay: dec.maxDelay,
        affected: dec.affected,
        createdAt:
          new Date().toISOString(),
      };

      setHistory((items) =>
        [historyItem, ...items].slice(
          0,
          10,
        ),
      );

      setAccepted(true);
      setDec(null);
      setCandidates([]);
      setTheaterActive(false);
      setCustomerName("");
      setSvc("");

      await load();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Acceptance failed. Please simulate again.",
      );
    } finally {
      setBusy(false);
    }
  }

  async function logout() {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/";
    }
  }

  function resetSimulation() {
    setSvc("");
    setCustomerName("");
    setDec(null);
    setCandidates([]);
    setTheaterActive(false);
    setAccepted(false);
    setError("");
    setShowAlternatives(false);
  }

  function changeView(
    view:
      | "overview"
      | "schedule"
      | "customers",
  ) {
    setActiveView(view);

    if (view !== "overview") {
      setShowAlternatives(false);
    }
  }

  if (!d) {
    return (
      <div className="loading">
        <div className="loading-shell">
          <div className="spinner" />

          <b>
            Loading SALORA command center…
          </b>

          <span>
            Synchronizing the live salon state
          </span>
        </div>
      </div>
    );
  }

  return (
    <main className="dash-v2 salora-command">
      <aside className="sidebar-v2">
        <div>
          <button
            className="brand white brand-button"
            onClick={() =>
              changeView("overview")
            }
            aria-label="SALORA command center"
          >
            <i />
            SALORA
          </button>

          <div className="side-label">
            COMMAND CENTER
          </div>

          <nav>
            <button
              className={
                activeView === "overview"
                  ? "side-active"
                  : ""
              }
              onClick={() =>
                changeView("overview")
              }
            >
              <Activity />
              <span>Overview</span>
            </button>

            <button
              className={
                activeView === "schedule"
                  ? "side-active"
                  : ""
              }
              onClick={() =>
                changeView("schedule")
              }
            >
              <CalendarDays />
              <span>Schedule</span>
            </button>

            <button
              className={
                activeView === "customers"
                  ? "side-active"
                  : ""
              }
              onClick={() =>
                changeView("customers")
              }
            >
              <Users />
              <span>Customers</span>
            </button>
          </nav>
        </div>

        <div className="side-bottom">
          <div className="engine-status">
            <span className="status-dot" />

            <div>
              <small>
                DECISION ENGINE
              </small>

              <b>Operational</b>
            </div>
          </div>

          <button
            className="side-signout"
            onClick={logout}
          >
            <LogOut />
            Sign out
          </button>
        </div>
      </aside>

      <section className="dash-main">
        <header className="dash-header">
          <div>
            <div className="eyebrow">
              <span className="live-pulse" />
              TODAY · LIVE OPERATIONS
            </div>

            <h1>
              {activeView === "overview"
                ? "Know before you say yes."
                : activeView === "schedule"
                  ? "See the schedule clearly."
                  : "Know your customers."}
            </h1>

            <p>
              {d.salon.name} ·{" "}
              {d.salon.timezone}
            </p>
          </div>

          <div className="head-actions">
            <span className="live-pill">
              <span />
              LIVE
            </span>

            <button
              className="iconbtn"
              onClick={load}
              title="Refresh live salon state"
              aria-label="Refresh live salon state"
            >
              <RefreshCw size={16} />
            </button>
          </div>
        </header>

        {error && (
          <div
            className="alert-v2"
            role="alert"
          >
            <AlertTriangle size={16} />

            <span>{error}</span>

            <button
              onClick={() =>
                setError("")
              }
              aria-label="Dismiss error"
            >
              <X size={15} />
            </button>
          </div>
        )}

        {accepted && (
          <div
            className="success-v2"
            role="status"
          >
            <CheckCircle2 size={16} />

            <span>
              Walk-in accepted and added
              to the live schedule.
            </span>

            <button
              onClick={() =>
                setAccepted(false)
              }
            >
              Dismiss
            </button>
          </div>
        )}

        {activeView === "overview" && (
          <>
            <section className="command-intelligence">
              <div className="command-intro">
                <span className="gold-kicker">
                  <Sparkles size={13} />
                  SALORA INTELLIGENCE
                </span>

                <h2>
                  The salon,
                  <br />
                  at a glance.
                </h2>

                <p>
                  Live operational signals
                  built from your actual
                  schedule.
                </p>
              </div>

              <div className="intelligence-signal">
                <div
                  className={`pressure-ring ${pressureClass}`}
                >
                  <strong>
                    {actualUtilization}%
                  </strong>

                  <span>LOAD</span>
                </div>

                <div>
                  <small>
                    SCHEDULE PRESSURE
                  </small>

                  <b>{pressureLabel}</b>

                  <span>
                    {availableMinutes.toLocaleString(
                      "en-IN",
                    )}{" "}
                    min available
                  </span>
                </div>
              </div>

              <div className="command-signal-note">
                <span>
                  <Activity size={14} />
                  ENGINE STATUS
                </span>

                <strong>
                  Monitoring live capacity
                </strong>

                <small>
                  Every simulation uses
                  the current schedule.
                </small>
              </div>
            </section>

            <div className="kpis-v2 premium-kpis">
              <K
                icon={<CalendarDays />}
                v={appointments.length}
                t="Appointments today"
                sub="Live schedule"
              />

              <K
                icon={<Users />}
                v={d.stylists.length}
                t="Stylists active"
                sub="Salon team"
              />

              <K
                icon={<WalletCards />}
                v={formatCurrency(
                  acceptedWalkInRevenue,
                )}
                t="Walk-in revenue"
                sub={
                  acceptedWalkIns
                    ? `${acceptedWalkIns} accepted today`
                    : "No accepted walk-ins yet"
                }
              />

              <K
                icon={<Activity />}
                v={`${actualUtilization}%`}
                t="Schedule utilization"
                sub={`${bookedMinutes} booked min`}
              />
            </div>

            <section className="pulse-grid">
              <PulseCard
                icon={<Zap />}
                label="AVAILABLE CAPACITY"
                value={`${availableMinutes} min`}
                description="Capacity still open in today's operating window."
              />

              <PulseCard
                icon={<TrendingUp />}
                label="CAPTURED TODAY"
                value={formatCurrency(
                  acceptedWalkInRevenue,
                )}
                description="Revenue from accepted walk-ins."
              />

              <PulseCard
                icon={<AlertTriangle />}
                label="NO-SHOWS"
                value={noShows}
                description={
                  noShows
                    ? "Released capacity may be recoverable."
                    : "No no-shows recorded today."
                }
              />

              <PulseCard
                icon={<Clock3 />}
                label="SIMULATIONS"
                value={simulationCount}
                description="Decision simulations run today."
              />
            </section>

            <section
              className={`whatif-theater ${
                theaterActive
                  ? "theater-live"
                  : ""
              }`}
            >
              <div className="theater-header-v3">
                <div>
                  <div className="theater-kicker">
                    <span className="theater-live-dot" />
                    WALK-IN DECISION ENGINE
                  </div>

                  <h2>
                    What happens if you
                    <em> say yes?</em>
                  </h2>

                  <p>
                    SALORA tests the request
                    against the current schedule
                    before anything changes.
                  </p>
                </div>

                <div className="simulation-state">
                  <span
                    className={
                      busy
                        ? "state-analyzing"
                        : dec
                          ? "state-result"
                          : "state-ready"
                    }
                  >
                    {busy
                      ? "SIMULATING"
                      : dec
                        ? "DECISION READY"
                        : "READY"}
                  </span>
                </div>
              </div>

              <div className="theater-body-v3">
                <div className="walkin-request-panel">
                  <div className="request-heading">
                    <div>
                      <span>
                        WALK-IN REQUEST
                      </span>

                      <b>
                        Test a customer
                        before committing
                        the schedule.
                      </b>
                    </div>

                    <Zap size={18} />
                  </div>

                  <div className="request-fields">
                    <label>
                      <span>Customer</span>

                      <div className="input-shell">
                        <UserRound size={15} />

                        <input
                          value={customerName}
                          onChange={(event) =>
                            setCustomerName(
                              event.target.value,
                            )
                          }
                          placeholder="Optional customer name"
                          disabled={busy}
                        />
                      </div>
                    </label>

                    <label>
                      <span>Service</span>

                      <div className="input-shell">
                        <CalendarDays size={15} />

                        <select
                          value={svc}
                          onChange={(event) => {
                            setSvc(
                              event.target.value,
                            );

                            setDec(null);
                            setCandidates([]);
                            setTheaterActive(false);
                            setShowAlternatives(false);
                          }}
                          disabled={busy}
                        >
                          <option value="">
                            Choose a service…
                          </option>

                          {d.services.map(
                            (service) => (
                              <option
                                key={service.id}
                                value={service.id}
                              >
                                {service.name} ·{" "}
                                {
                                  service.duration_min
                                }{" "}
                                min ·{" "}
                                {formatCurrency(
                                  Number(
                                    service.price_inr,
                                  ),
                                )}
                              </option>
                            ),
                          )}
                        </select>

                        <ChevronDown size={15} />
                      </div>
                    </label>
                  </div>

                  {selected && (
                    <div className="service-intelligence">
                      <div>
                        <Clock3 size={13} />

                        <span>
                          {selected.duration_min} min
                        </span>
                      </div>

                      <div>
                        <WalletCards size={13} />

                        <span>
                          {formatCurrency(
                            Number(
                              selected.price_inr,
                            ),
                          )}
                        </span>
                      </div>

                      <div>
                        <ShieldCheck size={13} />

                        <span>
                          {selected.buffer_min} min
                          buffer
                        </span>
                      </div>
                    </div>
                  )}

                  <div className="request-actions">
                    <button
                      className="theater-simulate"
                      disabled={!svc || busy}
                      onClick={simulate}
                    >
                      {busy ? (
                        <>
                          <span className="btn-spinner" />
                          Running live
                          simulation…
                        </>
                      ) : (
                        <>
                          Simulate this
                          walk-in
                          <Sparkles size={15} />
                        </>
                      )}
                    </button>

                    {(dec || svc) &&
                      !busy && (
                        <button
                          className="secondary-action"
                          onClick={
                            resetSimulation
                          }
                        >
                          Reset
                        </button>
                      )}
                  </div>

                  <div className="request-principle">
                    <ShieldCheck size={13} />

                    <span>
                      Simulation only · your
                      schedule changes only
                      after acceptance.
                    </span>
                  </div>
                </div>

                {busy && (
                  <div className="theater-analysis">
                    <div className="analysis-top">
                      <span>
                        SALORA IS THINKING
                      </span>

                      <b>
                        {Math.min(
                          100,
                          stage * 25 + 25,
                        )}
                        %
                      </b>
                    </div>

                    <div className="analysis-progress">
                      <i
                        style={{
                          width: `${Math.min(
                            100,
                            stage * 25 + 25,
                          )}%`,
                        }}
                      />
                    </div>

                    <div className="analysis-stages">
                      {[
                        "Reading live schedule",
                        "Testing safe placements",
                        "Propagating downstream impact",
                        "Ranking opportunities",
                        "Building explanation",
                      ].map(
                        (item, index) => (
                          <span
                            className={
                              index <= stage
                                ? "active"
                                : ""
                            }
                            key={item}
                          >
                            {index <= stage
                              ? "✓"
                              : "○"}{" "}
                            {item}
                          </span>
                        ),
                      )}
                    </div>
                  </div>
                )}

                <div className="timeline-theater">
                  <div className="timeline-top">
                    <div className="timeline-title">
                      <span>
                        WHAT-IF TIMELINE
                      </span>

                      <small>
                        {dec
                          ? "SIMULATED PLACEMENT"
                          : "CURRENT SCHEDULE"}
                      </small>
                    </div>

                    <div className="timeline-legend">
                      <span>
                        <i className="legend-booked" />
                        Booked
                      </span>

                      <span>
                        <i className="legend-walkin" />
                        What-if
                      </span>

                      <span>
                        <i className="legend-open" />
                        Open
                      </span>
                    </div>
                  </div>

                  <div className="timeline-axis">
                    <div />

                    <div className="axis-track">
                      {timeMarks.map(
                        (time) => {
                          const left =
                            ((time -
                              timelineBounds.start) /
                              (timelineBounds.end -
                                timelineBounds.start)) *
                            100;

                          return (
                            <span
                              key={time}
                              style={{
                                left: `${left}%`,
                              }}
                            >
                              {new Date(
                                time,
                              ).toLocaleTimeString(
                                [],
                                {
                                  hour: "numeric",
                                  minute: "2-digit",
                                },
                              )}
                            </span>
                          );
                        },
                      )}
                    </div>
                  </div>

                  {stylistRows.length ===
                  0 ? (
                    <div className="timeline-empty">
                      No stylist schedule
                      available.
                    </div>
                  ) : (
                    stylistRows.map(
                      (row) => (
                        <div
                          className="timeline-row"
                          key={row.id}
                        >
                          <div className="stylist-label">
                            <span>
                              {row.name}
                            </span>

                            <small>
                              {
                                row
                                  .appointments
                                  .length
                              }{" "}
                              booked
                            </small>
                          </div>

                          <div className="timeline-track">
                            {timeMarks.map(
                              (time) => {
                                const left =
                                  ((time -
                                    timelineBounds.start) /
                                    (timelineBounds.end -
                                      timelineBounds.start)) *
                                  100;

                                return (
                                  <i
                                    className="grid-line"
                                    key={time}
                                    style={{
                                      left: `${left}%`,
                                    }}
                                  />
                                );
                              },
                            )}

                            {row.appointments.map(
                              (
                                appointment,
                              ) => {
                                const position =
                                  timelinePosition(
                                    appointment.scheduled_start,
                                    appointment.scheduled_end,
                                  );

                                return (
                                  <div
                                    className="timeline-block booked-block"
                                    key={
                                      appointment.id
                                    }
                                    style={
                                      position
                                    }
                                  >
                                    <b>
                                      {
                                        appointment.service
                                      }
                                    </b>

                                    <small>
                                      {appointment.customer ||
                                        "Booked customer"}
                                    </small>

                                    <em>
                                      {formatTime(
                                        appointment.scheduled_start,
                                      )}
                                    </em>
                                  </div>
                                );
                              },
                            )}

                            {dec &&
                              dec.stylistId ===
                                row.id && (
                                <div
                                  className={`timeline-block walkin-block ${
                                    theaterActive
                                      ? "walkin-enter"
                                      : ""
                                  }`}
                                  style={timelinePosition(
                                    dec.start,
                                    dec.end,
                                  )}
                                >
                                  <div className="walkin-glow" />

                                  <b>
                                    WALK-IN
                                  </b>

                                  <small>
                                    {selected?.name ||
                                      "Simulation"}
                                  </small>

                                  <em>
                                    {formatTime(
                                      dec.start,
                                    )}
                                  </em>
                                </div>
                              )}

                            {!dec && (
                              <div className="capacity-window">
                                OPEN CAPACITY
                              </div>
                            )}
                          </div>
                        </div>
                      ),
                    )
                  )}
                </div>

                {dec && !busy && (
                  <div
                    className={`theater-impact decision-${stateClass(
                      dec.state,
                    )}`}
                  >
                    <div className="impact-header-v3">
                      <div className="impact-decision">
                        <div className="impact-icon">
                          {statusIcon(
                            dec.state,
                          )}
                        </div>

                        <div>
                          <small>
                            SALORA RECOMMENDS
                          </small>

                          <strong>
                            {stateLabel(
                              dec.state,
                            )}
                          </strong>

                          <p>
                            {dec.reason}
                          </p>
                        </div>
                      </div>

                      <div className="recommendation-time">
                        <small>
                          RECOMMENDED START
                        </small>

                        <strong>
                          {formatTime(
                            dec.start,
                          )}
                        </strong>

                        <span>
                          {recommendedStylist
                            ?.name ??
                            "Recommended stylist"}
                        </span>
                      </div>
                    </div>

                    <div className="decision-summary">
                      <span>
                        {statusDescription(
                          dec.state,
                        )}
                      </span>

                      <span className="decision-confidence">
                        <ShieldCheck size={13} />
                        Constraint checked
                      </span>
                    </div>

                    <div className="impact-grid-v3">
                      <ImpactMetric
                        value={formatCurrency(
                          dec.revenue,
                        )}
                        label="Service value"
                        positive
                      />

                      <ImpactMetric
                        value={`${Math.round(
                          dec.wait,
                        )} min`}
                        label="Customer wait"
                      />

                      <ImpactMetric
                        value={`${Math.round(
                          dec.maxDelay,
                        )} min`}
                        label="Maximum delay"
                        warning={
                          dec.maxDelay > 0
                        }
                      />

                      <ImpactMetric
                        value={`${dec.affected}`}
                        label="Appointments affected"
                        warning={
                          dec.affected > 0
                        }
                      />
                    </div>

                    <div className="impact-explanation">
                      <Zap size={14} />

                      <span>
                        {dec.affected ===
                        0
                          ? "This placement fits without affecting the visible schedule."
                          : `This placement affects ${dec.affected} appointment${
                              dec.affected ===
                              1
                                ? ""
                                : "s"
                            } and creates ${Math.round(
                              dec.totalDelay,
                            )} minutes of downstream delay.`}
                      </span>
                    </div>

                    <div className="decision-actions">
                      {dec.state !==
                        "RESCHEDULE" && (
                        <button
                          className="theater-accept"
                          disabled={busy}
                          onClick={accept}
                        >
                          <CheckCircle2
                            size={16}
                          />
                          Accept this
                          walk-in
                          <ChevronRight
                            size={16}
                          />
                        </button>
                      )}

                      <button
                        className="secondary-action"
                        onClick={() =>
                          setShowAlternatives(
                            (value) =>
                              !value,
                          )
                        }
                      >
                        {showAlternatives
                          ? "Hide alternatives"
                          : "Compare alternatives"}

                        <ChevronDown
                          size={15}
                          className={
                            showAlternatives
                              ? "rotate-180"
                              : ""
                          }
                        />
                      </button>
                    </div>
                  </div>
                )}

                {showAlternatives &&
                  candidates.length >
                    1 && (
                    <div className="theater-alternatives">
                      <div className="alternatives-heading">
                        <div>
                          <span>
                            OTHER SIMULATED
                            PLACEMENTS
                          </span>

                          <small>
                            REAL ENGINE OPTIONS
                          </small>
                        </div>

                        <Sparkles size={16} />
                      </div>

                      <div className="alternative-grid">
                        {candidates
                          .slice(1, 5)
                          .map(
                            (
                              candidate,
                              index,
                            ) => (
                              <div
                                className={`theater-alt alt-${stateClass(
                                  candidate.state,
                                )}`}
                                key={`${candidate.stylistId}-${candidate.start}-${index}`}
                              >
                                <span>
                                  {
                                    stateLabel(
                                      candidate.state,
                                    )
                                  }
                                </span>

                                <b>
                                  {formatTime(
                                    candidate.start,
                                  )}
                                </b>

                                <small>
                                  {Math.round(
                                    candidate.wait,
                                  )}{" "}
                                  min wait
                                </small>

                                <em>
                                  {Math.round(
                                    candidate.maxDelay,
                                  )}{" "}
                                  min delay
                                </em>
                              </div>
                            ),
                          )}
                      </div>
                    </div>
                  )}
              </div>
            </section>

            <section className="operations-grid">
              <div className="operations-card">
                <div className="operations-card-header">
                  <div>
                    <span>
                      LIVE CAPACITY
                    </span>

                    <h3>
                      Where the day stands.
                    </h3>
                  </div>

                  <Activity size={18} />
                </div>

                <div className="capacity-meter">
                  <div className="capacity-meter-top">
                    <b>
                      {actualUtilization}%
                    </b>

                    <span>
                      schedule utilization
                    </span>
                  </div>

                  <div className="capacity-track">
                    <i
                      style={{
                        width: `${actualUtilization}%`,
                      }}
                    />
                  </div>

                  <div className="capacity-footer">
                    <span>
                      {bookedMinutes} booked
                      minutes
                    </span>

                    <span>
                      {availableMinutes} available
                    </span>
                  </div>
                </div>
              </div>

              <div className="operations-card">
                <div className="operations-card-header">
                  <div>
                    <span>
                      RECOVERY SIGNAL
                    </span>

                    <h3>
                      Released capacity.
                    </h3>
                  </div>

                  <TrendingUp size={18} />
                </div>

                <div className="recovery-content">
                  <div className="recovery-number">
                    {noShows}
                  </div>

                  <div>
                    <b>
                      {noShows
                        ? "No-show capacity detected"
                        : "No recovery event yet"}
                    </b>

                    <p>
                      {noShows
                        ? "Run a walk-in simulation to test whether the released slot can be safely recovered."
                        : "When a customer does not arrive, SALORA can use the released capacity for a new decision."}
                    </p>
                  </div>
                </div>
              </div>
            </section>

            <section className="history-panel">
              <button
                className="history-header"
                onClick={() =>
                  setShowHistory(
                    (value) =>
                      !value,
                  )
                }
              >
                <div>
                  <History size={17} />

                  <div>
                    <span>
                      SESSION DECISION
                      HISTORY
                    </span>

                    <small>
                      {history.length
                        ? `${history.length} decision${
                            history.length ===
                            1
                              ? ""
                              : "s"
                          } recorded`
                        : "No decisions recorded in this session"}
                    </small>
                  </div>
                </div>

                <ChevronDown
                  size={16}
                  className={
                    showHistory
                      ? "rotate-180"
                      : ""
                  }
                />
              </button>

              {showHistory && (
                <div className="history-list">
                  {history.length ===
                  0 ? (
                    <div className="history-empty">
                      <History size={18} />

                      <span>
                        Accepted walk-ins
                        from this
                        session will
                        appear here.
                      </span>
                    </div>
                  ) : (
                    history.map(
                      (item) => (
                        <div
                          className="history-row"
                          key={item.id}
                        >
                          <div
                            className={`history-state history-${stateClass(
                              item.state,
                            )}`}
                          >
                            {statusIcon(
                              item.state,
                            )}

                            <span>
                              {stateLabel(
                                item.state,
                              )}
                            </span>
                          </div>

                          <div className="history-service">
                            <b>
                              {
                                item.service
                              }
                            </b>

                            <small>
                              {
                                item.stylist
                              }{" "}
                              ·{" "}
                              {formatTime(
                                item.start,
                              )}
                            </small>
                          </div>

                          <strong>
                            {formatCurrency(
                              item.revenue,
                            )}
                          </strong>

                          <span>
                            {item.delay
                              ? `${Math.round(
                                  item.delay,
                                )}m delay`
                              : "No delay"}
                          </span>
                        </div>
                      ),
                    )
                  )}
                </div>
              )}
            </section>

            <div className="bottom-strip">
              <div>
                <span>
                  <Zap size={13} />
                  SALORA PULSE
                </span>

                <b>
                  Real-time capacity
                  intelligence
                </b>
              </div>

              <div className="pulse-bar">
                <i
                  style={{
                    width: `${Math.max(
                      4,
                      actualUtilization,
                    )}%`,
                  }}
                />
              </div>

              <span>
                {pressureLabel}
              </span>
            </div>
          </>
        )}

        {activeView === "schedule" && (
          <section className="secondary-view">
            <div className="secondary-view-header">
              <div>
                <span>
                  LIVE SCHEDULE
                </span>

                <h2>
                  Today's salon flow.
                </h2>

                <p>
                  A direct view of the
                  current schedule without
                  simulation overlays.
                </p>
              </div>

              <button
                className="secondary-action"
                onClick={load}
              >
                <RefreshCw size={15} />
                Refresh
              </button>
            </div>

            <div className="schedule-list-v2">
              {appointments.length ===
              0 ? (
                <div className="empty-state-v2">
                  <CalendarDays size={24} />

                  <b>
                    No appointments today.
                  </b>

                  <span>
                    The schedule is
                    currently open.
                  </span>
                </div>
              ) : (
                appointments.map(
                  (appointment) => (
                    <div
                      className="schedule-item-v2"
                      key={appointment.id}
                    >
                      <div className="schedule-time">
                        {formatTime(
                          appointment.scheduled_start,
                        )}

                        <span>
                          {appointment.scheduled_end
                            ? formatTime(
                                appointment.scheduled_end,
                              )
                            : ""}
                        </span>
                      </div>

                      <div className="schedule-service">
                        <b>
                          {
                            appointment.service
                          }
                        </b>

                        <span>
                          {appointment.customer ||
                            "Booked customer"}
                        </span>
                      </div>

                      <div className="schedule-stylist">
                        <UserRound size={14} />

                        {
                          appointment.stylist
                        }
                      </div>

                      <span className="schedule-status">
                        {
                          appointment.status
                        }
                      </span>
                    </div>
                  ),
                )
              )}
            </div>
          </section>
        )}

        {activeView === "customers" && (
          <section className="secondary-view">
            <div className="secondary-view-header">
              <div>
                <span>
                  CUSTOMER OPERATIONS
                </span>

                <h2>
                  Customer context.
                </h2>

                <p>
                  Customer records remain
                  connected to the
                  operational workflow.
                </p>
              </div>
            </div>

            <div className="customer-placeholder">
              <Users size={28} />

              <h3>
                Customer management
              </h3>

              <p>
                Customer records are kept
                separate from the Decision
                Engine so SALORA stays
                focused on operational
                intelligence rather than
                becoming a generic CRM.
              </p>

              <button
                className="secondary-action"
                onClick={() =>
                  changeView(
                    "overview",
                  )
                }
              >
                Return to command center
                <ChevronRight size={15} />
              </button>
            </div>
          </section>
        )}
      </section>
    </main>
  );
}

function K({
  icon,
  v,
  t,
  sub,
}: {
  icon: React.ReactNode;
  v: string | number;
  t: string;
  sub: string;
}) {
  return (
    <div className="kpi-v2 premium-kpi">
      <div className="kpi-icon">
        {icon}
      </div>

      <strong>{v}</strong>

      <span>{t}</span>

      <small>{sub}</small>
    </div>
  );
}

function PulseCard({
  icon,
  label,
  value,
  description,
}: {
  icon: React.ReactNode;
  label: string;
  value: string | number;
  description: string;
}) {
  return (
    <div className="pulse-card">
      <div className="pulse-card-icon">
        {icon}
      </div>

      <div className="pulse-card-content">
        <span>{label}</span>

        <strong>{value}</strong>

        <p>{description}</p>
      </div>
    </div>
  );
}

function ImpactMetric({
  value,
  label,
  positive = false,
  warning = false,
}: {
  value: string;
  label: string;
  positive?: boolean;
  warning?: boolean;
}) {
  return (
    <div
      className={`impact-metric-v3 ${
        positive
          ? "metric-positive"
          : ""
      } ${
        warning
          ? "metric-warning"
          : ""
      }`}
    >
      <strong>{value}</strong>

      <span>{label}</span>

      {positive && (
        <TrendingUp size={12} />
      )}

      {warning && (
        <TrendingDown size={12} />
      )}
    </div>
  );
}