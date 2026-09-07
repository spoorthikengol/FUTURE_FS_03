"use client";

import {
  Activity,
  AlertTriangle,
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
import { useEffect, useMemo, useRef, useState } from "react";

type DecisionState =
  | "ACCEPT"
  | "ACCEPT_WITH_WARNING"
  | "WAIT"
  | "RESCHEDULE";

type Decision = {
  state: DecisionState;
  confidence?: number;
  message?: string;
  explanation?: string;
};

type Service = {
  id: string;
  name: string;
  duration_minutes: number;
  price: number;
};

type Stylist = {
  id: string;
  name: string;
  active: boolean;
};

type Appointment = {
  id: string;
  customer_name?: string;
  service_name?: string;
  stylist_name?: string;
  scheduled_start: string;
  scheduled_end: string;
  status: string;
  price?: number;
};

type Salon = {
  id: string;
  name: string;
  timezone?: string;
  opening_time?: string;
  closing_time?: string;
};

type DashboardData = {
  salon: Salon;
  services: Service[];
  stylists: Stylist[];
  appointments: Appointment[];
  decision?: Decision | null;
  metrics?: {
    today_revenue?: number;
    today_appointments?: number;
    completed_today?: number;
    cancelled_today?: number;
    no_show_today?: number;
  };
};

type HistoryItem = {
  id: string;
  createdAt: string;
  customerName: string;
  serviceName: string;
  decision: DecisionState;
  price: number;
  delay: number;
};

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  created_at?: string;
};

type ActiveView = "overview" | "schedule" | "customers";

type SimulationResponse = {
  simulation_id?: string;
  decision?: Decision;
  recommendation?: Decision;
  selected_option?: {
    id?: string;
    stylist_id?: string;
    start?: string;
    end?: string;
    revenue?: number;
    total_delay?: number;
    max_delay?: number;
    affected_appointments?: number;
    customer_wait?: number;
  };
  options?: Array<{
    id?: string;
    stylist_id?: string;
    stylist_name?: string;
    start?: string;
    end?: string;
    revenue?: number;
    total_delay?: number;
    max_delay?: number;
    affected_appointments?: number;
    customer_wait?: number;
    decision?: DecisionState;
  }>;
  explanation?: string;
};

type AcceptResponse = {
  appointment?: Appointment;
  decision?: Decision;
  message?: string;
};

const HISTORY_KEY = "salora_decision_history";

const DECISION_STATES: DecisionState[] = [
  "ACCEPT",
  "ACCEPT_WITH_WARNING",
  "WAIT",
  "RESCHEDULE",
];

function formatCurrency(value: number) {
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    maximumFractionDigits: 0,
  }).format(value || 0);
}

function formatTime(value: string | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleTimeString("en-IN", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function formatDateTime(value: string | undefined) {
  if (!value) return "—";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleString("en-IN", {
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function stateLabel(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "Accept";
    case "ACCEPT_WITH_WARNING":
      return "Accept with warning";
    case "WAIT":
      return "Wait";
    case "RESCHEDULE":
      return "Reschedule";
    default:
      return state;
  }
}

function stateClass(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "decision-good";
    case "ACCEPT_WITH_WARNING":
      return "decision-warning";
    case "WAIT":
      return "decision-wait";
    case "RESCHEDULE":
      return "decision-danger";
    default:
      return "";
  }
}

function statusIcon(status: string) {
  const normalized = status.toUpperCase();

  if (normalized === "COMPLETED") {
    return <CheckCircle2 size={14} />;
  }

  if (normalized === "CANCELLED") {
    return <X size={14} />;
  }

  if (normalized === "NO_SHOW") {
    return <AlertTriangle size={14} />;
  }

  return <Clock3 size={14} />;
}

function statusDescription(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "The walk-in can be served without disrupting booked customers.";
    case "ACCEPT_WITH_WARNING":
      return "The walk-in is possible but creates a manageable downstream impact.";
    case "WAIT":
      return "The current schedule is temporarily tight. Waiting preserves the safer slot.";
    case "RESCHEDULE":
      return "The current schedule cannot safely absorb this request.";
    default:
      return "";
  }
}

function decisionHeadline(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "Safe to accept";
    case "ACCEPT_WITH_WARNING":
      return "Accept carefully";
    case "WAIT":
      return "Wait for capacity";
    case "RESCHEDULE":
      return "Protect the schedule";
    default:
      return "Decision";
  }
}

function decisionTone(state: DecisionState) {
  switch (state) {
    case "ACCEPT":
      return "positive";
    case "ACCEPT_WITH_WARNING":
      return "warning";
    case "WAIT":
      return "wait";
    case "RESCHEDULE":
      return "danger";
    default:
      return "neutral";
  }
}

function loadHistory(): HistoryItem[] {
  if (typeof window === "undefined") return [];

  try {
    const stored = window.localStorage.getItem(HISTORY_KEY);

    if (!stored) return [];

    const parsed = JSON.parse(stored);

    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function saveHistory(items: HistoryItem[]) {
  if (typeof window === "undefined") return;

  try {
    window.localStorage.setItem(
      HISTORY_KEY,
      JSON.stringify(items.slice(0, 30)),
    );
  } catch {
    // Local storage may be unavailable.
  }
}

export default function DashboardPage() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [customers, setCustomers] = useState<Customer[]>([]);
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [activeView, setActiveView] = useState<ActiveView>("overview");

  const [customerName, setCustomerName] = useState("");
  const [serviceId, setServiceId] = useState("");

  const [simulation, setSimulation] =
    useState<SimulationResponse | null>(null);

  const [selectedOptionId, setSelectedOptionId] = useState<string | null>(
    null,
  );

  const [loading, setLoading] = useState(true);
  const [customersLoading, setCustomersLoading] = useState(false);
  const [simulating, setSimulating] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [loggingOut, setLoggingOut] = useState(false);

  const [error, setError] = useState("");
  const [online, setOnline] = useState(true);

  const [currentTime, setCurrentTime] = useState(new Date());

  const [simulationStage, setSimulationStage] = useState(0);

  const serviceInputRef = useRef<HTMLSelectElement | null>(null);
  const theaterRef = useRef<HTMLDivElement | null>(null);

  const simulationStages = [
    "Reading current salon state",
    "Generating candidate placements",
    "Simulating downstream impact",
    "Checking hard constraints",
    "Ranking safe outcomes",
  ];

  async function loadDashboard() {
    try {
      setError("");

      const response = await fetch("/api/dashboard", {
        credentials: "include",
        cache: "no-store",
      });

      if (response.status === 401) {
        window.location.href = "/login";
        return;
      }

      if (!response.ok) {
        throw new Error("Unable to load dashboard.");
      }

      const data = (await response.json()) as DashboardData;

      setDashboard(data);

      if (!serviceId && data.services?.length) {
        setServiceId(data.services[0].id);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load dashboard.",
      );
    } finally {
      setLoading(false);
    }
  }

  async function loadCustomers() {
    try {
      setCustomersLoading(true);

      const response = await fetch("/api/customers", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load customers.");
      }

      const data = await response.json();

      if (Array.isArray(data)) {
        setCustomers(data);
      } else if (Array.isArray(data.customers)) {
        setCustomers(data.customers);
      } else {
        setCustomers([]);
      }
    } catch (err) {
      setError(
        err instanceof Error ? err.message : "Unable to load customers.",
      );
    } finally {
      setCustomersLoading(false);
    }
  }

  useEffect(() => {
    setHistory(loadHistory());
    void loadDashboard();
  }, []);

  useEffect(() => {
    const handleOnline = () => setOnline(true);
    const handleOffline = () => setOnline(false);

    setOnline(navigator.onLine);

    window.addEventListener("online", handleOnline);
    window.addEventListener("offline", handleOffline);

    return () => {
      window.removeEventListener("online", handleOnline);
      window.removeEventListener("offline", handleOffline);
    };
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      setCurrentTime(new Date());
    }, 1000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    const timer = window.setInterval(() => {
      void loadDashboard();
    }, 60_000);

    return () => window.clearInterval(timer);
  }, []);

  useEffect(() => {
    if (activeView === "customers" && customers.length === 0) {
      void loadCustomers();
    }
  }, [activeView]);

  useEffect(() => {
    if (!simulating) {
      setSimulationStage(0);
      return;
    }

    const timer = window.setInterval(() => {
      setSimulationStage((current) => {
        if (current >= simulationStages.length - 1) {
          return current;
        }

        return current + 1;
      });
    }, 500);

    return () => window.clearInterval(timer);
  }, [simulating]);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if (
        event.key === "/" &&
        !["INPUT", "TEXTAREA", "SELECT"].includes(
          document.activeElement?.tagName || "",
        )
      ) {
        event.preventDefault();
        serviceInputRef.current?.focus();
      }

      if (event.key === "Escape") {
        setSimulation(null);
        setSelectedOptionId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);

    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const selectedService = useMemo(() => {
    return dashboard?.services?.find((service) => service.id === serviceId);
  }, [dashboard?.services, serviceId]);

  const appointments = useMemo(() => {
    return dashboard?.appointments ?? [];
  }, [dashboard?.appointments]);

  const stylists = useMemo(() => {
    return dashboard?.stylists ?? [];
  }, [dashboard?.stylists]);

  const todayAppointments = useMemo(() => {
    return appointments.filter((appointment) => {
      const date = new Date(appointment.scheduled_start);

      if (Number.isNaN(date.getTime())) return false;

      const now = new Date();

      return (
        date.getFullYear() === now.getFullYear() &&
        date.getMonth() === now.getMonth() &&
        date.getDate() === now.getDate()
      );
    });
  }, [appointments]);

  const utilization = useMemo(() => {
    if (!stylists.length) return 0;

    const activeStylists = stylists.filter((stylist) => stylist.active);

    if (!activeStylists.length) return 0;

    const now = currentTime.getTime();

    const activeAppointments = appointments.filter((appointment) => {
      const start = new Date(appointment.scheduled_start).getTime();
      const end = new Date(appointment.scheduled_end).getTime();

      return (
        appointment.status !== "CANCELLED" &&
        appointment.status !== "NO_SHOW" &&
        appointment.status !== "COMPLETED" &&
        start <= now &&
        end > now
      );
    });

    return Math.min(
      100,
      Math.round((activeAppointments.length / activeStylists.length) * 100),
    );
  }, [appointments, stylists, currentTime]);

  const capacityLabel = useMemo(() => {
    if (utilization >= 90) return "Very high";
    if (utilization >= 70) return "High";
    if (utilization >= 45) return "Balanced";
    return "Open";
  }, [utilization]);

  const pressureLabel = useMemo(() => {
    if (utilization >= 90) return "Critical";
    if (utilization >= 75) return "Tight";
    if (utilization >= 50) return "Moderate";
    return "Healthy";
  }, [utilization]);

  const pressureClass = useMemo(() => {
    if (utilization >= 90) return "pressure-danger";
    if (utilization >= 75) return "pressure-warning";
    if (utilization >= 50) return "pressure-neutral";
    return "pressure-good";
  }, [utilization]);

  const recommendedStylist = useMemo(() => {
    const selected = simulation?.selected_option;

    if (!selected?.stylist_id) return null;

    return stylists.find((stylist) => stylist.id === selected.stylist_id) ?? null;
  }, [simulation?.selected_option, stylists]);

  const recommendationIndex = useMemo(() => {
    const options = simulation?.options ?? [];

    if (!options.length) return -1;

    if (!selectedOptionId) return 0;

    return options.findIndex((option) => option.id === selectedOptionId);
  }, [simulation?.options, selectedOptionId]);

  const filteredCustomers = useMemo(() => {
    const query = customerName.trim().toLowerCase();

    if (!query) return customers.slice(0, 8);

    return customers
      .filter((customer) => {
        return (
          customer.name.toLowerCase().includes(query) ||
          customer.phone?.toLowerCase().includes(query) ||
          customer.email?.toLowerCase().includes(query)
        );
      })
      .slice(0, 8);
  }, [customers, customerName]);

  const timelineBounds = useMemo(() => {
    const dates = appointments
      .flatMap((appointment) => [
        new Date(appointment.scheduled_start),
        new Date(appointment.scheduled_end),
      ])
      .filter((date) => !Number.isNaN(date.getTime()));

    if (!dates.length) {
      const start = new Date(currentTime);
      start.setHours(9, 0, 0, 0);

      const end = new Date(start);
      end.setHours(21, 0, 0, 0);

      return {
        start: start.getTime(),
        end: end.getTime(),
      };
    }

    const min = Math.min(...dates.map((date) => date.getTime()));
    const max = Math.max(...dates.map((date) => date.getTime()));

    const start = new Date(min);
    start.setMinutes(0, 0, 0);

    const end = new Date(max);
    end.setMinutes(0, 0, 0);
    end.setHours(end.getHours() + 1);

    return {
      start: start.getTime(),
      end: end.getTime(),
    };
  }, [appointments, currentTime]);

  const timelineMarks = useMemo(() => {
    const start = new Date(timelineBounds.start);
    const end = new Date(timelineBounds.end);

    const marks: Date[] = [];

    const cursor = new Date(start);

    while (cursor <= end) {
      marks.push(new Date(cursor));
      cursor.setMinutes(cursor.getMinutes() + 60);
    }

    return marks;
  }, [timelineBounds]);

  const timelinePosition = (value: string) => {
    const date = new Date(value);

    if (Number.isNaN(date.getTime())) return 0;

    const total = timelineBounds.end - timelineBounds.start;

    if (total <= 0) return 0;

    return Math.min(
      100,
      Math.max(
        0,
        ((date.getTime() - timelineBounds.start) / total) * 100,
      ),
    );
  };

  const timelineWidth = (start: string, end: string) => {
    const startDate = new Date(start);
    const endDate = new Date(end);

    if (
      Number.isNaN(startDate.getTime()) ||
      Number.isNaN(endDate.getTime())
    ) {
      return 0;
    }

    const total = timelineBounds.end - timelineBounds.start;

    if (total <= 0) return 0;

    return Math.max(
      2,
      Math.min(
        100,
        ((endDate.getTime() - startDate.getTime()) / total) * 100,
      ),
    );
  };

  async function simulateWalkIn() {
    if (!selectedService) {
      setError("Choose a service first.");
      return;
    }

    setError("");
    setSimulation(null);
    setSelectedOptionId(null);
    setSimulating(true);
    setSimulationStage(0);

    try {
      const response = await fetch("/api/walk-ins/simulate", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          customer_name: customerName.trim() || "Walk-in customer",
          service_id: selectedService.id,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Simulation failed.",
        );
      }

      const result = data as SimulationResponse;

      const decision = result.decision ?? result.recommendation;

      setSimulation({
        ...result,
        decision,
      });

      if (result.options?.length) {
        const firstOption = result.options[0];

        if (firstOption.id) {
          setSelectedOptionId(firstOption.id);
        }
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : "Simulation failed.");
    } finally {
      setSimulating(false);
    }
  }

  async function acceptWalkIn() {
    if (!simulation) {
      setError("Run a simulation before accepting.");
      return;
    }

    if (!selectedService) {
      setError("Choose a service first.");
      return;
    }

    const decision = simulation.decision ?? simulation.recommendation;

    if (!decision) {
      setError("No decision is available.");
      return;
    }

    if (
      decision.state !== "ACCEPT" &&
      decision.state !== "ACCEPT_WITH_WARNING"
    ) {
      setError("This walk-in is not currently safe to accept.");
      return;
    }

    setError("");
    setAccepting(true);

    try {
      const idempotencyKey = crypto.randomUUID();

      const response = await fetch("/api/walk-ins/accept", {
        method: "POST",
        credentials: "include",
        headers: {
          "Content-Type": "application/json",
          "Idempotency-Key": idempotencyKey,
        },
        body: JSON.stringify({
          customer_name: customerName.trim() || "Walk-in customer",
          service_id: selectedService.id,
          simulation_id: simulation.simulation_id,
          option_id:
            selectedOptionId ??
            simulation.selected_option?.id ??
            undefined,
        }),
      });

      const data = (await response.json()) as AcceptResponse & {
        error?: string;
      };

      if (!response.ok) {
        throw new Error(
          data?.message || data?.error || "Unable to accept walk-in.",
        );
      }

      const newAppointment = data.appointment;

      const historyItem: HistoryItem = {
        id: crypto.randomUUID(),
        createdAt: new Date().toISOString(),
        customerName: customerName.trim() || "Walk-in customer",
        serviceName: selectedService.name,
        decision:
          data.decision?.state ??
          decision.state,
        price:
          newAppointment?.price ??
          selectedService.price ??
          simulation.selected_option?.revenue ??
          0,
        delay:
          simulation.selected_option?.max_delay ??
          0,
      };

      const nextHistory = [historyItem, ...history].slice(0, 30);

      setHistory(nextHistory);
      saveHistory(nextHistory);

      setSimulation(null);
      setSelectedOptionId(null);
      setCustomerName("");

      await loadDashboard();
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to accept walk-in.",
      );
    } finally {
      setAccepting(false);
    }
  }

  async function logout() {
    setLoggingOut(true);

    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/login";
    }
  }

  function resetDecision() {
    setSimulation(null);
    setSelectedOptionId(null);
    setError("");
  }

  function scrollToTheater() {
    theaterRef.current?.scrollIntoView({
      behavior: "smooth",
      block: "center",
    });
  }

  if (loading) {
    return (
      <main className="dashboard-shell dashboard-loading">
        <div className="loading-orb">
          <Sparkles size={22} />
        </div>

        <p>Loading SALORA intelligence…</p>
      </main>
    );
  }

  if (!dashboard) {
    return (
      <main className="dashboard-shell dashboard-error">
        <div className="error-panel">
          <AlertTriangle size={28} />

          <div>
            <h1>Dashboard unavailable</h1>
            <p>{error || "Something went wrong while loading SALORA."}</p>
          </div>

          <button
            type="button"
            className="button button-primary"
            onClick={() => {
              setLoading(true);
              void loadDashboard();
            }}
          >
            <RefreshCw size={16} />
            Retry
          </button>
        </div>
      </main>
    );
  }

  const activeDecision =
    simulation?.decision ?? simulation?.recommendation ?? null;

  const canAccept =
    activeDecision?.state === "ACCEPT" ||
    activeDecision?.state === "ACCEPT_WITH_WARNING";

  const selectedOption =
    simulation?.options?.find(
      (option) => option.id === selectedOptionId,
    ) ??
    simulation?.selected_option ??
    null;

  const todayRevenue =
    dashboard.metrics?.today_revenue ??
    todayAppointments.reduce(
      (total, appointment) => total + (appointment.price ?? 0),
      0,
    );

  const completedToday =
    dashboard.metrics?.completed_today ??
    todayAppointments.filter(
      (appointment) => appointment.status === "COMPLETED",
    ).length;

  const cancelledToday =
    dashboard.metrics?.cancelled_today ??
    todayAppointments.filter(
      (appointment) => appointment.status === "CANCELLED",
    ).length;

  const noShowToday =
    dashboard.metrics?.no_show_today ??
    todayAppointments.filter(
      (appointment) => appointment.status === "NO_SHOW",
    ).length;

  return (
    <main className="dashboard-shell">
      <header className="dashboard-header">
        <div className="dashboard-brand">
          <div className="brand-mark">
            <Sparkles size={18} />
          </div>

          <div>
            <span className="brand-name">SALORA</span>
            <span className="brand-subtitle">
              Walk-In Decision Intelligence
            </span>
          </div>
        </div>

        <div className="dashboard-header-actions">
          <div
            className={`connection-status ${
              online ? "is-online" : "is-offline"
            }`}
          >
            <span className="status-dot" />
            {online ? "Live" : "Offline"}
          </div>

          <div className="dashboard-clock">
            {currentTime.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
            })}
          </div>

          <button
            type="button"
            className="icon-button"
            title="Refresh dashboard"
            onClick={() => {
              setLoading(true);
              void loadDashboard();
            }}
          >
            <RefreshCw size={17} />
          </button>

          <button
            type="button"
            className="logout-button"
            onClick={() => void logout()}
            disabled={loggingOut}
          >
            <LogOut size={16} />
            {loggingOut ? "Signing out…" : "Sign out"}
          </button>
        </div>
      </header>

      <div className="dashboard-layout">
        <aside className="dashboard-sidebar">
          <div className="salon-context">
            <span className="eyebrow">ACTIVE SALON</span>
            <strong>{dashboard.salon.name}</strong>

            {dashboard.salon.timezone && (
              <span>{dashboard.salon.timezone}</span>
            )}
          </div>

          <nav className="dashboard-nav">
            <button
              type="button"
              className={activeView === "overview" ? "active" : ""}
              onClick={() => setActiveView("overview")}
            >
              <Activity size={17} />
              Overview
            </button>

            <button
              type="button"
              className={activeView === "schedule" ? "active" : ""}
              onClick={() => setActiveView("schedule")}
            >
              <CalendarDays size={17} />
              Schedule
            </button>

            <button
              type="button"
              className={activeView === "customers" ? "active" : ""}
              onClick={() => setActiveView("customers")}
            >
              <Users size={17} />
              Customers
            </button>
          </nav>

          <div className="sidebar-bottom">
            <div className="sidebar-security">
              <ShieldCheck size={17} />
              <div>
                <strong>Protected session</strong>
                <span>Tenant-isolated workspace</span>
              </div>
            </div>
          </div>
        </aside>

        <section className="dashboard-content">
          {error && (
            <div className="dashboard-alert">
              <AlertTriangle size={17} />
              <span>{error}</span>

              <button
                type="button"
                onClick={() => setError("")}
                aria-label="Dismiss error"
              >
                <X size={16} />
              </button>
            </div>
          )}

          {activeView === "overview" && (
            <>
              <section className="dashboard-intro">
                <div>
                  <span className="eyebrow">TODAY&apos;S SALON INTELLIGENCE</span>

                  <h1>
                    Run the day.
                    <br />
                    <span>Protect every appointment.</span>
                  </h1>

                  <p>
                    SALORA evaluates walk-ins against your live schedule before
                    you commit to them.
                  </p>
                </div>

                <div className="intro-action">
                  <button
                    type="button"
                    className="button button-primary"
                    onClick={scrollToTheater}
                  >
                    <Zap size={17} />
                    Simulate a walk-in
                  </button>
                </div>
              </section>

              <section className="intelligence-strip">
                <div className="intelligence-strip-main">
                  <div className="intelligence-icon">
                    <BrainIcon />
                  </div>

                  <div>
                    <span className="eyebrow">DECISION ENGINE</span>
                    <strong>
                      {activeDecision
                        ? decisionHeadline(activeDecision.state)
                        : "Ready for a what-if"}
                    </strong>
                    <p>
                      {activeDecision
                        ? statusDescription(activeDecision.state)
                        : "Test a walk-in before it changes your schedule."}
                    </p>
                  </div>
                </div>

                <div className={`pressure-chip ${pressureClass}`}>
                  <span className="status-dot" />
                  Schedule pressure: {pressureLabel}
                </div>
              </section>

              <section className="kpi-grid">
                <K
                  icon={<WalletCards size={18} />}
                  label="Today revenue"
                  value={formatCurrency(todayRevenue)}
                  note="Booked + completed value"
                  trend={<TrendingUp size={14} />}
                />

                <K
                  icon={<CalendarDays size={18} />}
                  label="Appointments"
                  value={String(todayAppointments.length)}
                  note={`${completedToday} completed today`}
                  trend={<Activity size={14} />}
                />

                <K
                  icon={<Users size={18} />}
                  label="Active stylists"
                  value={String(stylists.filter((stylist) => stylist.active).length)}
                  note={`${capacityLabel} capacity`}
                  trend={<Users size={14} />}
                />

                <K
                  icon={<Timer size={18} />}
                  label="Schedule pressure"
                  value={pressureLabel}
                  note={`${utilization}% current utilization`}
                  trend={
                    utilization >= 75 ? (
                      <TrendingUp size={14} />
                    ) : (
                      <TrendingDown size={14} />
                    )
                  }
                />
              </section>

              <section className="pulse-grid">
                <PulseCard
                  title="Recovery room"
                  value={`${Math.max(0, 100 - utilization)}%`}
                  description="Estimated open capacity"
                  icon={<Activity size={17} />}
                />

                <PulseCard
                  title="Cancellations"
                  value={String(cancelledToday)}
                  description="Today"
                  icon={<X size={17} />}
                />

                <PulseCard
                  title="No-shows"
                  value={String(noShowToday)}
                  description="Today"
                  icon={<AlertTriangle size={17} />}
                />

                <PulseCard
                  title="Decision mode"
                  value="Live"
                  description="Deterministic simulation"
                  icon={<ShieldCheck size={17} />}
                />
              </section>

              <section
                className="what-if-theater"
                ref={theaterRef}
              >
                <div className="theater-header">
                  <div>
                    <span className="eyebrow">WHAT-IF DECISION ENGINE</span>

                    <h2>
                      Know before
                      <br />
                      <span>you say yes.</span>
                    </h2>

                    <p>
                      Enter a walk-in request. SALORA simulates the schedule
                      impact before you accept it.
                    </p>
                  </div>

                  <div className="theater-badge">
                    <Sparkles size={15} />
                    Predict → Recommend → Act
                  </div>
                </div>

                <div className="request-panel">
                  <div className="request-panel-heading">
                    <div>
                      <span className="eyebrow">WALK-IN REQUEST</span>
                      <h3>What does the customer need?</h3>
                    </div>

                    <span className="keyboard-hint">
                      Press <kbd>/</kbd>
                    </span>
                  </div>

                  <div className="request-grid">
                    <label className="field">
                      <span>Customer</span>

                      <div className="field-input-wrap">
                        <UserRound size={16} />

                        <input
                          type="text"
                          value={customerName}
                          onChange={(event) =>
                            setCustomerName(event.target.value)
                          }
                          placeholder="Walk-in customer"
                        />
                      </div>
                    </label>

                    <label className="field">
                      <span>Service</span>

                      <div className="field-input-wrap">
                        <CalendarDays size={16} />

                        <select
                          ref={serviceInputRef}
                          value={serviceId}
                          onChange={(event) =>
                            setServiceId(event.target.value)
                          }
                        >
                          {dashboard.services.map((service) => (
                            <option
                              key={service.id}
                              value={service.id}
                            >
                              {service.name} · {service.duration_minutes} min ·{" "}
                              {formatCurrency(service.price)}
                            </option>
                          ))}
                        </select>

                        <ChevronDown size={15} />
                      </div>
                    </label>

                    <button
                      type="button"
                      className="simulate-button"
                      onClick={() => void simulateWalkIn()}
                      disabled={simulating || !selectedService}
                    >
                      {simulating ? (
                        <>
                          <span className="button-spinner" />
                          Simulating…
                        </>
                      ) : (
                        <>
                          <Zap size={17} />
                          Simulate
                        </>
                      )}
                    </button>
                  </div>

                  {simulating && (
                    <div className="analysis-progress">
                      <div className="analysis-progress-top">
                        <span>
                          {simulationStages[simulationStage]}
                        </span>

                        <span>
                          {Math.min(
                            100,
                            Math.round(
                              ((simulationStage + 1) /
                                simulationStages.length) *
                                100,
                            ),
                          )}
                          %
                        </span>
                      </div>

                      <div className="analysis-progress-bar">
                        <span
                          style={{
                            width: `${
                              ((simulationStage + 1) /
                                simulationStages.length) *
                              100
                            }%`,
                          }}
                        />
                      </div>

                      <div className="analysis-stages">
                        {simulationStages.map((stage, index) => (
                          <div
                            key={stage}
                            className={
                              index <= simulationStage ? "done" : ""
                            }
                          >
                            <span>{index + 1}</span>
                            {stage}
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                <div className="theater-divider">
                  <span>LIVE SCHEDULE IMPACT</span>
                </div>

                <div className="schedule-theater">
                  <div className="timeline-axis">
                    {timelineMarks.map((mark) => (
                      <span key={mark.toISOString()}>
                        {mark.toLocaleTimeString("en-IN", {
                          hour: "numeric",
                          minute: "2-digit",
                        })}
                      </span>
                    ))}
                  </div>

                  {stylists.map((stylist) => {
                    const stylistAppointments = appointments.filter(
                      (appointment) => {
                        return (
                          appointment.stylist_name === stylist.name ||
                          appointment.stylist_name === stylist.id
                        );
                      },
                    );

                    return (
                      <div
                        className="stylist-timeline-row"
                        key={stylist.id}
                      >
                        <div className="stylist-label">
                          <span className="stylist-avatar">
                            {stylist.name.charAt(0).toUpperCase()}
                          </span>

                          <div>
                            <strong>{stylist.name}</strong>
                            <span>
                              {stylist.active ? "Available" : "Inactive"}
                            </span>
                          </div>
                        </div>

                        <div className="timeline-track">
                          {timelineMarks.map((mark) => (
                            <span
                              className="timeline-grid-line"
                              style={{
                                left: `${timelinePosition(
                                  mark.toISOString(),
                                )}%`,
                              }}
                              key={mark.toISOString()}
                            />
                          ))}

                          {stylistAppointments.map((appointment) => (
                            <div
                              className="booked-block"
                              key={appointment.id}
                              style={{
                                left: `${timelinePosition(
                                  appointment.scheduled_start,
                                )}%`,
                                width: `${timelineWidth(
                                  appointment.scheduled_start,
                                  appointment.scheduled_end,
                                )}%`,
                              }}
                              title={`${appointment.customer_name ?? "Customer"} · ${
                                appointment.service_name ?? "Appointment"
                              }`}
                            >
                              <span>
                                {appointment.customer_name ?? "Customer"}
                              </span>

                              <small>
                                {appointment.service_name ?? "Appointment"}
                              </small>
                            </div>
                          ))}

                          {selectedOption?.stylist_id === stylist.id &&
                            selectedOption.start &&
                            selectedOption.end && (
                              <div
                                className="walk-in-block"
                                style={{
                                  left: `${timelinePosition(
                                    selectedOption.start,
                                  )}%`,
                                  width: `${timelineWidth(
                                    selectedOption.start,
                                    selectedOption.end,
                                  )}%`,
                                }}
                              >
                                <Sparkles size={12} />
                                <span>WALK-IN</span>
                              </div>
                            )}
                        </div>
                      </div>
                    );
                  })}

                  {!stylists.length && (
                    <div className="empty-state">
                      <Users size={22} />
                      <span>No stylist schedule available.</span>
                    </div>
                  )}
                </div>

                {simulation && activeDecision && (
                  <div className="decision-result">
                    <div
                      className={`decision-orb ${decisionTone(
                        activeDecision.state,
                      )}`}
                    >
                      {activeDecision.state === "ACCEPT" ? (
                        <CheckCircle2 size={27} />
                      ) : activeDecision.state ===
                        "ACCEPT_WITH_WARNING" ? (
                        <AlertTriangle size={27} />
                      ) : activeDecision.state === "WAIT" ? (
                        <Clock3 size={27} />
                      ) : (
                        <X size={27} />
                      )}
                    </div>

                    <div className="decision-copy">
                      <span className="eyebrow">RECOMMENDATION</span>

                      <h3>
                        {decisionHeadline(activeDecision.state)}
                      </h3>

                      <p>
                        {activeDecision.message ||
                          activeDecision.explanation ||
                          statusDescription(activeDecision.state)}
                      </p>
                    </div>

                    <div
                      className={`decision-state ${stateClass(
                        activeDecision.state,
                      )}`}
                    >
                      {stateLabel(activeDecision.state)}
                    </div>
                  </div>
                )}

                {simulation && selectedOption && (
                  <div className="impact-metrics">
                    <ImpactMetric
                      label="Revenue"
                      value={formatCurrency(
                        selectedOption.revenue ??
                          selectedService?.price ??
                          0,
                      )}
                      icon={<WalletCards size={16} />}
                    />

                    <ImpactMetric
                      label="Total delay"
                      value={`${selectedOption.total_delay ?? 0} min`}
                      icon={<Timer size={16} />}
                    />

                    <ImpactMetric
                      label="Maximum delay"
                      value={`${selectedOption.max_delay ?? 0} min`}
                      icon={<Clock3 size={16} />}
                    />

                    <ImpactMetric
                      label="Affected"
                      value={`${selectedOption.affected_appointments ?? 0}`}
                      icon={<Users size={16} />}
                    />

                    <ImpactMetric
                      label="Customer wait"
                      value={`${selectedOption.customer_wait ?? 0} min`}
                      icon={<UserRound size={16} />}
                    />
                  </div>
                )}

                {simulation?.options &&
                  simulation.options.length > 0 && (
                    <div className="alternatives-section">
                      <div className="section-heading-row">
                        <div>
                          <span className="eyebrow">
                            ALTERNATIVES
                          </span>
                          <h3>Other safe possibilities</h3>
                        </div>

                        <span className="muted-count">
                          {simulation.options.length} options
                        </span>
                      </div>

                      <div className="alternatives-list">
                        {simulation.options.map((option, index) => {
                          const optionDecision =
                            option.decision ?? activeDecision?.state;

                          const isSelected =
                            option.id === selectedOptionId ||
                            (!selectedOptionId && index === 0);

                          return (
                            <button
                              type="button"
                              className={`alternative-row ${
                                isSelected ? "selected" : ""
                              }`}
                              key={option.id ?? `${option.start}-${index}`}
                              onClick={() => {
                                if (option.id) {
                                  setSelectedOptionId(option.id);
                                }
                              }}
                            >
                              <div className="alternative-index">
                                {index + 1}
                              </div>

                              <div className="alternative-main">
                                <strong>
                                  {option.stylist_name ||
                                    stylists.find(
                                      (stylist) =>
                                        stylist.id ===
                                        option.stylist_id,
                                    )?.name ||
                                    "Available stylist"}
                                </strong>

                                <span>
                                  {option.start
                                    ? formatTime(option.start)
                                    : "Flexible time"}
                                  {option.end
                                    ? ` → ${formatTime(option.end)}`
                                    : ""}
                                </span>
                              </div>

                              <div className="alternative-impact">
                                <span>
                                  {formatCurrency(option.revenue ?? 0)}
                                </span>

                                <small>
                                  {option.total_delay ?? 0} min delay
                                </small>
                              </div>

                              <div
                                className={`alternative-state ${
                                  optionDecision
                                    ? stateClass(optionDecision)
                                    : ""
                                }`}
                              >
                                {optionDecision
                                  ? stateLabel(optionDecision)
                                  : "Review"}
                              </div>

                              <ChevronRight size={17} />
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                {simulation && recommendedStylist && (
                  <div className="capacity-panel">
                    <div className="capacity-panel-copy">
                      <span className="eyebrow">
                        RECOMMENDED CAPACITY
                      </span>

                      <h3>{recommendedStylist.name}</h3>

                      <p>
                        SALORA selected this placement because it offers
                        the strongest safe outcome for the current schedule.
                      </p>
                    </div>

                    <div className="capacity-meter">
                      <div className="capacity-meter-top">
                        <span>Current utilization</span>
                        <strong>{utilization}%</strong>
                      </div>

                      <div className="capacity-meter-track">
                        <span
                          style={{
                            width: `${utilization}%`,
                          }}
                        />
                      </div>

                      <div className="capacity-meter-footer">
                        <span>Open</span>
                        <span>Balanced</span>
                        <span>High</span>
                        <span>Critical</span>
                      </div>
                    </div>
                  </div>
                )}

                {simulation && canAccept && (
                  <div className="decision-actions">
                    <button
                      type="button"
                      className="button button-primary accept-button"
                      onClick={() => void acceptWalkIn()}
                      disabled={accepting}
                    >
                      {accepting ? (
                        <>
                          <span className="button-spinner" />
                          Accepting…
                        </>
                      ) : (
                        <>
                          <CheckCircle2 size={17} />
                          Accept walk-in
                        </>
                      )}
                    </button>

                    <button
                      type="button"
                      className="button button-secondary"
                      onClick={resetDecision}
                    >
                      Start over
                    </button>
                  </div>
                )}

                {simulation &&
                  !canAccept &&
                  activeDecision && (
                    <div className="decision-protection">
                      <ShieldCheck size={19} />

                      <div>
                        <strong>
                          Protect the booked schedule
                        </strong>

                        <p>
                          SALORA recommends keeping this request outside
                          the current acceptance path.
                        </p>
                      </div>

                      <button
                        type="button"
                        className="button button-secondary"
                        onClick={resetDecision}
                      >
                        Try another request
                      </button>
                    </div>
                  )}
              </section>

              <section className="decision-loop-section">
                <div className="section-heading">
                  <span className="eyebrow">THE SALORA LOOP</span>

                  <h2>
                    One decision.
                    <br />
                    <span>Three intelligent steps.</span>
                  </h2>
                </div>

                <div className="decision-loop">
                  <LoopStep
                    number="01"
                    icon={<Activity size={19} />}
                    title="Predict"
                    description="Model the request against the salon's current state."
                  />

                  <LoopConnector />

                  <LoopStep
                    number="02"
                    icon={<Sparkles size={19} />}
                    title="Recommend"
                    description="Rank feasible placements by revenue and schedule impact."
                  />

                  <LoopConnector />

                  <LoopStep
                    number="03"
                    icon={<CheckCircle2 size={19} />}
                    title="Act"
                    description="Accept only after the selected outcome is revalidated."
                  />
                </div>
              </section>

              <section className="history-section">
                <div className="section-heading-row">
                  <div>
                    <span className="eyebrow">RECENT DECISIONS</span>
                    <h2>Decision history</h2>
                  </div>

                  <span className="muted-count">
                    {history.length} saved locally
                  </span>
                </div>

                {history.length ? (
                  <div className="history-list">
                    {history.slice(0, 6).map((item) => (
                      <div className="history-row" key={item.id}>
                        <div className="history-icon">
                          <History size={16} />
                        </div>

                        <div className="history-main">
                          <strong>{item.customerName}</strong>

                          <span>
                            {item.serviceName} ·{" "}
                            {formatDateTime(item.createdAt)}
                          </span>
                        </div>

                        <div className="history-value">
                          {formatCurrency(item.price)}
                        </div>

                        <div
                          className={`history-state ${stateClass(
                            item.decision,
                          )}`}
                        >
                          {stateLabel(item.decision)}
                        </div>

                        <span className="history-delay">
                          {item.delay} min impact
                        </span>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state history-empty">
                    <History size={22} />
                    <span>
                      Your completed walk-in decisions will appear here.
                    </span>
                  </div>
                )}
              </section>

              <section className="bottom-pulse">
                <div>
                  <span className="eyebrow">SALON PULSE</span>

                  <h3>
                    {utilization < 50
                      ? "You have room to capture more demand."
                      : utilization < 75
                        ? "Your schedule is balanced."
                        : utilization < 90
                          ? "Demand is approaching capacity."
                          : "Protect your remaining appointment capacity."}
                  </h3>
                </div>

                <div className="pulse-value">
                  <strong>{utilization}%</strong>
                  <span>utilized</span>
                </div>
              </section>
            </>
          )}

          {activeView === "schedule" && (
            <section className="view-section">
              <div className="view-heading">
                <div>
                  <span className="eyebrow">TODAY</span>

                  <h1>Schedule</h1>

                  <p>
                    Your current appointment timeline and operational state.
                  </p>
                </div>

                <div className="view-heading-meta">
                  <CalendarDays size={17} />
                  {todayAppointments.length} appointments
                </div>
              </div>

              <div className="schedule-card">
                <div className="schedule-card-header">
                  <div>
                    <span className="eyebrow">LIVE TIMELINE</span>
                    <h2>Today&apos;s appointments</h2>
                  </div>

                  <div className="schedule-legend">
                    <span>
                      <i className="legend-dot booked" />
                      Booked
                    </span>

                    <span>
                      <i className="legend-dot walkin" />
                      Walk-in
                    </span>
                  </div>
                </div>

                {todayAppointments.length ? (
                  <div className="appointment-list">
                    {todayAppointments
                      .sort(
                        (a, b) =>
                          new Date(a.scheduled_start).getTime() -
                          new Date(b.scheduled_start).getTime(),
                      )
                      .map((appointment) => (
                        <div
                          className="appointment-row"
                          key={appointment.id}
                        >
                          <div className="appointment-time">
                            <strong>
                              {formatTime(appointment.scheduled_start)}
                            </strong>

                            <span>
                              {formatTime(appointment.scheduled_end)}
                            </span>
                          </div>

                          <div className="appointment-service">
                            <strong>
                              {appointment.service_name ||
                                "Appointment"}
                            </strong>

                            <span>
                              {appointment.customer_name ||
                                "Customer"}
                            </span>
                          </div>

                          <div className="appointment-stylist">
                            <UserRound size={14} />
                            {appointment.stylist_name || "Unassigned"}
                          </div>

                          <div
                            className={`appointment-status status-${appointment.status.toLowerCase()}`}
                          >
                            {statusIcon(appointment.status)}
                            {appointment.status.replace("_", " ")}
                          </div>

                          {typeof appointment.price === "number" && (
                            <div className="appointment-price">
                              {formatCurrency(appointment.price)}
                            </div>
                          )}
                        </div>
                      ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <CalendarDays size={24} />
                    <span>No appointments scheduled today.</span>
                  </div>
                )}
              </div>
            </section>
          )}

          {activeView === "customers" && (
            <section className="view-section">
              <div className="view-heading">
                <div>
                  <span className="eyebrow">CUSTOMER BASE</span>

                  <h1>Customers</h1>

                  <p>
                    Quickly find customers while handling walk-in demand.
                  </p>
                </div>

                <div className="view-heading-meta">
                  <Users size={17} />
                  {customers.length} customers
                </div>
              </div>

              <div className="customer-search-panel">
                <div className="field">
                  <span>Search customers</span>

                  <div className="field-input-wrap">
                    <UserRound size={16} />

                    <input
                      type="text"
                      value={customerName}
                      onChange={(event) =>
                        setCustomerName(event.target.value)
                      }
                      placeholder="Search by name, phone or email"
                    />
                  </div>
                </div>
              </div>

              <div className="customer-list-card">
                {customersLoading ? (
                  <div className="empty-state">
                    <span className="button-spinner" />
                    <span>Loading customers…</span>
                  </div>
                ) : filteredCustomers.length ? (
                  <div className="customer-list">
                    {filteredCustomers.map((customer) => (
                      <div
                        className="customer-row"
                        key={customer.id}
                      >
                        <div className="customer-avatar">
                          {customer.name.charAt(0).toUpperCase()}
                        </div>

                        <div className="customer-main">
                          <strong>{customer.name}</strong>

                          <span>
                            {customer.phone ||
                              customer.email ||
                              "No contact details"}
                          </span>
                        </div>

                        <button
                          type="button"
                          className="customer-use-button"
                          onClick={() => {
                            setCustomerName(customer.name);
                            setActiveView("overview");
                            window.setTimeout(
                              () => serviceInputRef.current?.focus(),
                              100,
                            );
                          }}
                        >
                          Use for simulation
                          <ChevronRight size={15} />
                        </button>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="empty-state">
                    <Users size={24} />
                    <span>No customers match this search.</span>
                  </div>
                )}
              </div>
            </section>
          )}
        </section>
      </div>
    </main>
  );
}

function BrainIcon() {
  return (
    <svg
      width="21"
      height="21"
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M9.5 4.5A3.5 3.5 0 0 0 6 8c0 .35.05.69.15 1.01A3.5 3.5 0 0 0 5 15.5c.32 0 .63-.04.92-.12A3.5 3.5 0 0 0 12 18.5V7.5a3 3 0 0 0-2.5-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M14.5 4.5A3.5 3.5 0 0 1 18 8c0 .35-.05.69-.15 1.01A3.5 3.5 0 0 1 19 15.5c-.32 0-.63-.04-.92-.12A3.5 3.5 0 0 1 12 18.5V7.5a3 3 0 0 1 2.5-3Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      <path
        d="M8.5 10.5c1 .1 1.7.5 2.1 1.2M15.5 10.5c-1 .1-1.7.5-2.1 1.2M8.8 14c.8-.05 1.5.2 2 .7M15.2 14c-.8-.05-1.5.2-2 .7"
        stroke="currentColor"
        strokeWidth="1.4"
        strokeLinecap="round"
      />
    </svg>
  );
}

function K({
  icon,
  label,
  value,
  note,
  trend,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  note: string;
  trend: React.ReactNode;
}) {
  return (
    <div className="kpi-v2">
      <div className="kpi-v2-top">
        <span className="kpi-icon">{icon}</span>
        <span className="kpi-trend">{trend}</span>
      </div>

      <span className="kpi-label">{label}</span>

      <strong className="kpi-value">{value}</strong>

      <span className="kpi-note">{note}</span>
    </div>
  );
}

function PulseCard({
  title,
  value,
  description,
  icon,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="pulse-card">
      <div className="pulse-card-icon">{icon}</div>

      <div>
        <span>{title}</span>
        <strong>{value}</strong>
        <small>{description}</small>
      </div>
    </div>
  );
}

function ImpactMetric({
  label,
  value,
  icon,
}: {
  label: string;
  value: string;
  icon: React.ReactNode;
}) {
  return (
    <div className="impact-metric">
      <span className="impact-metric-icon">{icon}</span>

      <div>
        <span>{label}</span>
        <strong>{value}</strong>
      </div>
    </div>
  );
}

function LoopStep({
  number,
  icon,
  title,
  description,
}: {
  number: string;
  icon: React.ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className="loop-step">
      <div className="loop-step-top">
        <span className="loop-number">{number}</span>
        <span className="loop-icon">{icon}</span>
      </div>

      <h3>{title}</h3>

      <p>{description}</p>
    </div>
  );
}

function LoopConnector() {
  return (
    <div className="loop-connector" aria-hidden="true">
      <span />
      <ChevronRight size={17} />
    </div>
  );
}