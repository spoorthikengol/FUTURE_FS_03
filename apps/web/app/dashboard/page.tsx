"use client";

import {
  Activity,
  ArrowRight,
  BarChart3,
  CalendarDays,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock3,
  Gauge,
  LogOut,
  RefreshCw,
  ShieldCheck,
  Sparkles,
  Target,
  Timer,
  TrendingDown,
  TrendingUp,
  UserRound,
  Users,
  WalletCards,
  X,
  Zap,
} from "lucide-react";
import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";
import styles from "./page.module.css";

type View = "overview" | "schedule" | "customers";

type DecisionState =
  | "ACCEPT"
  | "ACCEPT_WITH_WARNING"
  | "WAIT"
  | "RESCHEDULE";

type Service = {
  id: string;
  name: string;
  duration_min?: number;
  price_inr?: number;
  duration_minutes: number;
  price: number;
};

type Stylist = {
  id: string;
  name: string;
  status?: string;
  skills?: string[];
};

type Appointment = {
  id: string;
  customer_name?: string;
  customerName?: string;
  service_name?: string;
  serviceName?: string;
  stylist_name?: string;
  stylistName?: string;
  stylist_id?: string;
  stylistId?: string;
  start_time?: string;
  startTime?: string;
  end_time?: string;
  endTime?: string;
  status?: string;
};

type Customer = {
  id: string;
  name: string;
  phone?: string;
  email?: string;
  visit_count?: number;
  visitCount?: number;
};

type Salon = {
  id?: string;
  name?: string;
  timezone?: string;
  currency?: string;
};

type DashboardData = {
  salon?: Salon;

  services?: Service[];

  stylists?: Stylist[];

  appointments?: Appointment[];
  today_appointments?: Appointment[];
  todayAppointments?: Appointment[];

  total_appointments_today?: number;
  totalAppointmentsToday?: number;

  completed_today?: number;
  completedToday?: number;

  waiting_walk_ins?: number;
  waitingWalkIns?: number;

  no_shows_today?: number;
  noShowsToday?: number;

  cancellations_today?: number;
  cancellationsToday?: number;

  today_revenue?: number;
  todayRevenue?: number;

  revenue_potential?: number;
  revenuePotential?: number;

  schedule_pressure?: number;
  schedulePressure?: number;

  schedule_pressure_label?: string;
  schedulePressureLabel?: string;

  schedule_version?: number;
  scheduleVersion?: number;
};

type SimulationOption = {
  id?: string;

  stylist_id?: string;
  stylistId?: string;

  start_time?: string;
  startTime?: string;

  end_time?: string;
  endTime?: string;

  total_delay_minutes?: number;
  totalDelayMinutes?: number;

  maximum_delay_minutes?: number;
  maximumDelayMinutes?: number;

  customer_wait_minutes?: number;
  customerWaitMinutes?: number;

  affected_appointments?: number;
  affectedAppointments?: number;

  revenue?: number;

  valid?: boolean;
};

type Decision = {
  state?: DecisionState;
  recommendation?: DecisionState;
  decision?: DecisionState;

  reason?: string;
  explanation?: string;

  revenue?: number;

  total_delay_minutes?: number;
  totalDelayMinutes?: number;

  maximum_delay_minutes?: number;
  maximumDelayMinutes?: number;

  customer_wait_minutes?: number;
  customerWaitMinutes?: number;

  affected_appointments?: number;
  affectedAppointments?: number;

  recommended_stylist_id?: string;
  recommendedStylistId?: string;

  schedule_version?: number;
  scheduleVersion?: number;

  options?: SimulationOption[];
};

type SimulationResponse = {
  simulation_id?: string;
  simulationId?: string;

  decision?: Decision;
  recommendation?: Decision;

  options?: SimulationOption[];
};

type HistoryItem = {
  id: string;
  customer: string;
  service: string;
  state: DecisionState;
  revenue: number;
  createdAt: string;
};

// Snapshot of a successful acceptance, captured from the already-known
// simulation/decision data at the moment of acceptance — every field
// here traces back to a real API response, never invented at render time.
type AcceptedResult = {
  customer: string;
  service: string;
  stylist: string;
  time: string;
  revenue: number;
  delayMinutes: number;
};

// Visual-only labels for the deterministic simulation pipeline. This is
// a UI representation of real backend work already happening — it does
// not claim AI/ML and does not delay or gate the actual fetch call.
const SIMULATION_STAGES = [
  "INGESTING SALON STATE",
  "SCANNING AVAILABLE SLOTS",
  "SIMULATING PLACEMENT",
  "PROPAGATING SCHEDULE IMPACT",
  "RECOMMENDING SAFEST ACTION",
];

// Safe fallback when a salon record has no currency configured.
// This is NOT an assumption that every salon is Indian or American —
// it only prevents Intl.NumberFormat from throwing when the backend
// hasn't populated dashboard.salon.currency yet. Real, valid salon
// currency codes always take priority over this default.
const DEFAULT_CURRENCY = "USD";

// A small set of currency -> locale mappings so grouping/symbol
// placement looks native for common currencies (e.g. "en-IN" keeps
// the existing INR formatting exactly as it was before this fix).
// Any currency not in this map still formats correctly via Intl's
// default locale resolution; this map only tunes presentation.
const CURRENCY_LOCALES: Record<string, string> = {
  INR: "en-IN",
  USD: "en-US",
  GBP: "en-GB",
  EUR: "en-IE",
  AED: "ar-AE",
  AUD: "en-AU",
  CAD: "en-CA",
  SGD: "en-SG",
};

function normalizeCurrencyCode(
  currency?: string | null,
): string {
  if (!currency || typeof currency !== "string") {
    return DEFAULT_CURRENCY;
  }

  const trimmed = currency.trim().toUpperCase();

  if (!/^[A-Z]{3}$/.test(trimmed)) {
    return DEFAULT_CURRENCY;
  }

  return trimmed;
}

function money(
  value: number | undefined | null,
  currency?: string | null,
) {
  const code = normalizeCurrencyCode(currency);
  const locale = CURRENCY_LOCALES[code];

  try {
    return new Intl.NumberFormat(locale, {
      style: "currency",
      currency: code,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  } catch {
    // Code passed shape validation but Intl still rejected it
    // (extremely rare) — fall back rather than throwing in render.
    return new Intl.NumberFormat(CURRENCY_LOCALES[DEFAULT_CURRENCY], {
      style: "currency",
      currency: DEFAULT_CURRENCY,
      maximumFractionDigits: 0,
    }).format(Number(value || 0));
  }
}

function time(value?: string) {
  if (!value) return "--:--";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "--:--";

  return date.toLocaleTimeString([], {
    hour: "2-digit",
    minute: "2-digit",
  });
}

function dateTime(value?: string) {
  if (!value) return "Unknown";

  const date = new Date(value);

  if (Number.isNaN(date.getTime())) return "Unknown";

  return date.toLocaleString([], {
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function decisionState(decision?: Decision | null): DecisionState {
  return (
    decision?.state ||
    decision?.recommendation ||
    decision?.decision ||
    "WAIT"
  );
}

function stateLabel(state: DecisionState) {
  if (state === "ACCEPT_WITH_WARNING") {
    return "ACCEPT WITH WARNING";
  }

  return state;
}

function stateClass(state: DecisionState) {
  if (state === "ACCEPT") return styles.accept;
  if (state === "ACCEPT_WITH_WARNING") return styles.warning;
  if (state === "WAIT") return styles.wait;

  return styles.reschedule;
}

function normalizeNumber(
  object: Record<string, unknown> | undefined,
  snake: string,
  camel: string,
) {
  return Number(object?.[snake] ?? object?.[camel] ?? 0);
}

function getAppointmentStart(appointment: Appointment) {
  return appointment.startTime || appointment.start_time;
}

function getAppointmentEnd(appointment: Appointment) {
  return appointment.endTime || appointment.end_time;
}

function getAppointmentCustomer(appointment: Appointment) {
  return (
    appointment.customerName ||
    appointment.customer_name ||
    "Customer"
  );
}

function getAppointmentService(appointment: Appointment) {
  return (
    appointment.serviceName ||
    appointment.service_name ||
    "Service"
  );
}

function getAppointmentStylist(appointment: Appointment) {
  return (
    appointment.stylistName ||
    appointment.stylist_name ||
    "Unassigned"
  );
}

function optionDelay(option: SimulationOption) {
  return normalizeNumber(
    option as unknown as Record<string, unknown>,
    "total_delay_minutes",
    "totalDelayMinutes",
  );
}

function optionMaxDelay(option: SimulationOption) {
  return normalizeNumber(
    option as unknown as Record<string, unknown>,
    "maximum_delay_minutes",
    "maximumDelayMinutes",
  );
}

function optionWait(option: SimulationOption) {
  return normalizeNumber(
    option as unknown as Record<string, unknown>,
    "customer_wait_minutes",
    "customerWaitMinutes",
  );
}

function optionAffected(option: SimulationOption) {
  return normalizeNumber(
    option as unknown as Record<string, unknown>,
    "affected_appointments",
    "affectedAppointments",
  );
}

function optionStylistId(option: SimulationOption) {
  return option.stylistId || option.stylist_id;
}

function getOptionStylistName(
  option: SimulationOption,
  stylists: Stylist[],
) {
  const stylist = stylists.find(
    (item) => item.id === optionStylistId(option),
  );

  return stylist?.name || "Unassigned";
}

function statusTone(status?: string) {
  const normalized = status?.toUpperCase();

  if (normalized === "COMPLETED") return "completed";
  if (normalized === "CANCELLED") return "cancelled";
  if (normalized === "NO_SHOW") return "noshow";

  return "booked";
}

export default function DashboardPage() {
  const [view, setView] = useState<View>("overview");

  const [dashboard, setDashboard] =
    useState<DashboardData | null>(null);

  const [customers, setCustomers] = useState<Customer[]>([]);

  const [customerName, setCustomerName] = useState("");

  const [selectedService, setSelectedService] = useState("");

  const [serviceMenuOpen, setServiceMenuOpen] = useState(false);

  const serviceMenuRef = useRef<HTMLDivElement | null>(null);

  const [simulation, setSimulation] =
    useState<SimulationResponse | null>(null);

  const [loading, setLoading] = useState(true);

  const [simulating, setSimulating] = useState(false);

  const [accepting, setAccepting] = useState(false);

  const [error, setError] = useState("");

  const [online, setOnline] = useState(true);

  const [history, setHistory] = useState<HistoryItem[]>([]);

  const [now, setNow] = useState(new Date());

  const [selectedOptionId, setSelectedOptionId] =
    useState<string>("");

  const [scheduleConflict, setScheduleConflict] =
    useState(false);

  const [scheduleConflictMessage, setScheduleConflictMessage] =
    useState("");

  const [acceptedResult, setAcceptedResult] =
    useState<AcceptedResult | null>(null);

  const [lastRefreshedAt, setLastRefreshedAt] =
    useState<Date | null>(null);

  const [simulationStage, setSimulationStage] =
    useState(0);

  const [customerQuery, setCustomerQuery] = useState("");

  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);

      const response = await fetch("/api/dashboard", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) {
        throw new Error("Unable to load dashboard");
      }

      const data = await response.json();

      const normalizedData = {
        ...data,
        services: Array.isArray(data.services)
          ? data.services.map((service: Service) => ({
              ...service,
              duration_minutes: Number(
                service.duration_minutes ??
                  service.duration_min ??
                  0,
              ),
              price: Number(
                service.price ??
                  service.price_inr ??
                  0,
              ),
            }))
          : [],
      };

      setDashboard(normalizedData);
      setError("");

      // Local timestamp captured on successful completion — not a
      // server event time, just when this client last confirmed
      // fresh data. Labeled as "Last refreshed" in the UI for that
      // reason.
      setLastRefreshedAt(new Date());
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to load dashboard",
      );
    } finally {
      setLoading(false);
    }
  }, []);

  const loadCustomers = useCallback(async () => {
    try {
      const response = await fetch("/api/customers", {
        credentials: "include",
        cache: "no-store",
      });

      if (!response.ok) return;

      const data = await response.json();

      setCustomers(
        Array.isArray(data)
          ? data
          : Array.isArray(data.customers)
            ? data.customers
            : [],
      );
    } catch {
      // Customer loading should never break the dashboard.
    }
  }, []);

  useEffect(() => {
    loadDashboard();
    loadCustomers();

    const saved = window.localStorage.getItem(
      "salora_decision_history",
    );

    if (saved) {
      try {
        setHistory(JSON.parse(saved));
      } catch {
        setHistory([]);
      }
    }

    const onlineHandler = () => setOnline(true);
    const offlineHandler = () => setOnline(false);

    window.addEventListener("online", onlineHandler);
    window.addEventListener("offline", offlineHandler);

    const interval = window.setInterval(() => {
      setNow(new Date());
      loadDashboard();
    }, 60000);

    return () => {
      window.removeEventListener("online", onlineHandler);
      window.removeEventListener("offline", offlineHandler);

      window.clearInterval(interval);
    };
  }, [loadDashboard, loadCustomers]);

  useEffect(() => {
    if (!serviceMenuOpen) return;

    const handlePointerDown = (event: MouseEvent) => {
      if (
        serviceMenuRef.current &&
        !serviceMenuRef.current.contains(event.target as Node)
      ) {
        setServiceMenuOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setServiceMenuOpen(false);
      }
    };

    document.addEventListener("mousedown", handlePointerDown);
    document.addEventListener("keydown", handleKeyDown);

    return () => {
      document.removeEventListener("mousedown", handlePointerDown);
      document.removeEventListener("keydown", handleKeyDown);
    };
  }, [serviceMenuOpen]);

  useEffect(() => {
    if (view === "customers") {
      loadCustomers();
    }
  }, [view, loadCustomers]);

  useEffect(() => {
    if (!simulating) {
      setSimulationStage(0);
      return;
    }

    const prefersReducedMotion =
      typeof window !== "undefined" &&
      window.matchMedia?.(
        "(prefers-reduced-motion: reduce)",
      ).matches;

    // This is purely a visual label cycle over an already-in-flight
    // request — it never gates or delays the actual fetch call.
    if (prefersReducedMotion) {
      setSimulationStage(SIMULATION_STAGES.length - 1);
      return;
    }

    const interval = window.setInterval(() => {
      setSimulationStage((stage) =>
        stage < SIMULATION_STAGES.length - 1
          ? stage + 1
          : stage,
      );
    }, 420);

    return () => window.clearInterval(interval);
  }, [simulating]);

  const services = dashboard?.services || [];

  const appointments =
    dashboard?.todayAppointments ||
    dashboard?.today_appointments ||
    dashboard?.appointments ||
    [];

  const stylists = dashboard?.stylists || [];

  const salonName = dashboard?.salon?.name || "SALORA";

  const salonCurrency = dashboard?.salon?.currency;

  const todayAppointments = Number(
    dashboard?.totalAppointmentsToday ??
      dashboard?.total_appointments_today ??
      appointments.length,
  );

  const completedToday = Number(
    dashboard?.completedToday ??
      dashboard?.completed_today ??
      appointments.filter(
        (appointment) =>
          appointment.status?.toUpperCase() === "COMPLETED",
      ).length,
  );

  const waitingWalkIns = Number(
    dashboard?.waitingWalkIns ??
      dashboard?.waiting_walk_ins ??
      0,
  );

  const noShows = Number(
    dashboard?.noShowsToday ??
      dashboard?.no_shows_today ??
      0,
  );

  const cancellations = Number(
    dashboard?.cancellationsToday ??
      dashboard?.cancellations_today ??
      0,
  );

  const todayRevenue = Number(
    dashboard?.todayRevenue ??
      dashboard?.today_revenue ??
      0,
  );

  const revenuePotential = Number(
    dashboard?.revenuePotential ??
      dashboard?.revenue_potential ??
      0,
  );

  const pressure = Math.min(
    100,
    Math.max(
      0,
      Number(
        dashboard?.schedulePressure ??
          dashboard?.schedule_pressure ??
          0,
      ),
    ),
  );

  const pressureLabel =
    dashboard?.schedulePressureLabel ||
    dashboard?.schedule_pressure_label ||
    (pressure >= 80
      ? "High pressure"
      : pressure >= 55
        ? "Building"
        : "Healthy");

  const selectedServiceObject = useMemo(
    () =>
      services.find((service) => service.id === selectedService) ||
      services[0],
    [services, selectedService],
  );

  const activeDecision =
  simulation?.recommendation ||
  simulation?.decision ||
  null;

  const state = decisionState(activeDecision);

  const simulationOptions =
    simulation?.options ||
    activeDecision?.options ||
    [];

  const selectedOption = useMemo(() => {
    if (!simulationOptions.length) return null;

    return (
      simulationOptions.find(
        (option) => option.id === selectedOptionId,
      ) ||
      simulationOptions[0]
    );
  }, [simulationOptions, selectedOptionId]);

  const recommendedStylistId =
    activeDecision?.recommendedStylistId ||
    activeDecision?.recommended_stylist_id;

  const recommendedStylist = stylists.find(
    (stylist) => stylist.id === recommendedStylistId,
  );

  const totalDelay = normalizeNumber(
    activeDecision as unknown as Record<string, unknown>,
    "total_delay_minutes",
    "totalDelayMinutes",
  );

  const maximumDelay = normalizeNumber(
    activeDecision as unknown as Record<string, unknown>,
    "maximum_delay_minutes",
    "maximumDelayMinutes",
  );

  const customerWait = normalizeNumber(
    activeDecision as unknown as Record<string, unknown>,
    "customer_wait_minutes",
    "customerWaitMinutes",
  );

  const affectedAppointments = normalizeNumber(
    activeDecision as unknown as Record<string, unknown>,
    "affected_appointments",
    "affectedAppointments",
  );

  const simulationRevenue = Number(
    activeDecision?.revenue || 0,
  );

  const feasibleOptions = simulationOptions.filter(
    (option) => option.valid !== false,
  );

  const bestOption = useMemo(() => {
    if (!simulationOptions.length) return null;

    return [...simulationOptions].sort((a, b) => {
      if (a.valid === false && b.valid !== false) return 1;
      if (a.valid !== false && b.valid === false) return -1;

      const delayDifference =
        optionDelay(a) - optionDelay(b);

      if (delayDifference !== 0) {
        return delayDifference;
      }

      return optionWait(a) - optionWait(b);
    })[0];
  }, [simulationOptions]);

  const scheduleAppointments = useMemo(() => {
    return [...appointments].sort((a, b) => {
      const aTime = new Date(
        getAppointmentStart(a) || "",
      ).getTime();

      const bTime = new Date(
        getAppointmentStart(b) || "",
      ).getTime();

      if (Number.isNaN(aTime)) return 1;
      if (Number.isNaN(bTime)) return -1;

      return aTime - bTime;
    });
  }, [appointments]);

  const currentAppointmentIndex = useMemo(() => {
    const current = now.getTime();

    const index = scheduleAppointments.findIndex(
      (appointment) => {
        const start = new Date(
          getAppointmentStart(appointment) || "",
        ).getTime();

        const end = new Date(
          getAppointmentEnd(appointment) || "",
        ).getTime();

        return (
          !Number.isNaN(start) &&
          !Number.isNaN(end) &&
          current >= start &&
          current <= end
        );
      },
    );

    return index;
  }, [scheduleAppointments, now]);

  const stylistLoad = useMemo(() => {
    return stylists.map((stylist) => {
      const count = appointments.filter((appointment) => {
        const id =
          appointment.stylistId ||
          appointment.stylist_id;

        if (id && id === stylist.id) {
          return true;
        }

        return (
          !id &&
          getAppointmentStylist(appointment) === stylist.name
        );
      }).length;

      return {
        stylist,
        count,
      };
    });
  }, [stylists, appointments]);

  const busiestStylist = useMemo(() => {
    if (!stylistLoad.length) return null;

    return [...stylistLoad].sort(
      (a, b) => b.count - a.count,
    )[0];
  }, [stylistLoad]);

  const utilization =
    stylists.length > 0
      ? Math.min(
          100,
          Math.round(
            ((completedToday + waitingWalkIns) /
              Math.max(todayAppointments, 1)) *
              100,
          ),
        )
      : 0;

  // Client-side filter against already-loaded, real customer records.
  // No server-side query parameter is assumed here since the API
  // contract for /api/customers filtering isn't available to inspect
  // from this frontend-only context.
  const filteredCustomers = useMemo(() => {
    const query = customerQuery.trim().toLowerCase();

    if (!query) return customers;

    return customers.filter((customer) => {
      const name = customer.name?.toLowerCase() || "";
      const phone = customer.phone?.toLowerCase() || "";
      const email = customer.email?.toLowerCase() || "";

      return (
        name.includes(query) ||
        phone.includes(query) ||
        email.includes(query)
      );
    });
  }, [customers, customerQuery]);

  const simulateWalkIn = async () => {
    if (!selectedServiceObject) {
      setError("Select a service first.");
      return;
    }

    setError("");
    setSimulating(true);
    setSelectedOptionId("");
    setSimulationStage(0);
    setScheduleConflict(false);
    setScheduleConflictMessage("");

    try {
      const response = await fetch(
        "/api/walk-ins/simulate",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
  customerName:
    customerName.trim() || "Walk-in customer",
  serviceId: selectedServiceObject.id,
}),
        },
      );

      const data = await response.json();

      if (!response.ok) {
        throw new Error(
          data?.message ||
            data?.error ||
            "Simulation failed.",
        );
      }

      setSimulation(data);

      const options =
        data?.options ||
        data?.decision?.options ||
        data?.recommendation?.options ||
        [];

      if (options.length > 0) {
        setSelectedOptionId(options[0].id || "");
      }

      const nextState = decisionState(
        data?.decision || data?.recommendation,
      );

      const item: HistoryItem = {
        id:
          data?.simulation_id ||
          data?.simulationId ||
          crypto.randomUUID(),

        customer:
          customerName.trim() || "Walk-in customer",

        service: selectedServiceObject.name,

        state: nextState,

        revenue: Number(
          data?.decision?.revenue ||
            data?.recommendation?.revenue ||
            0,
        ),

        createdAt: new Date().toISOString(),
      };

      const nextHistory = [item, ...history].slice(
        0,
        12,
      );

      setHistory(nextHistory);

      window.localStorage.setItem(
        "salora_decision_history",
        JSON.stringify(nextHistory),
      );
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Simulation failed.",
      );
    } finally {
      setSimulating(false);
    }
  };

  const acceptWalkIn = async () => {
    if (!activeDecision) return;

    setAccepting(true);
    setError("");
    setScheduleConflict(false);
    setScheduleConflictMessage("");

    // Capture the values that will back the success panel BEFORE any
    // state resets happen below. Every field here is already-known,
    // real data from the active decision/simulation — nothing here is
    // invented at acceptance time.
    const optionForStylistName =
      selectedOption ||
      simulationOptions[0] ||
      null;

    const stylistName =
      recommendedStylist?.name ||
      (optionForStylistName
        ? getOptionStylistName(
            optionForStylistName,
            stylists,
          )
        : "Unassigned");

    const optionStart =
      selectedOption?.startTime ||
      selectedOption?.start_time;

    const optionEnd =
      selectedOption?.endTime ||
      selectedOption?.end_time;

    const pendingResult: AcceptedResult = {
      customer:
        customerName.trim() || "Walk-in customer",
      service:
        selectedServiceObject?.name || "Service",
      stylist: stylistName,
      time: optionStart
        ? `${time(optionStart)} — ${time(optionEnd)}`
        : "Time confirmed by salon",
      revenue: simulationRevenue,
      delayMinutes: totalDelay,
    };

    try {
      const idempotencyKey = crypto.randomUUID();

      const response = await fetch(
        "/api/walk-ins/accept",
        {
          method: "POST",
          credentials: "include",
          headers: {
            "Content-Type": "application/json",
            "Idempotency-Key": idempotencyKey,
          },
          body: JSON.stringify({
            customer_name:
              customerName.trim() || "Walk-in customer",

            service_id: selectedServiceObject?.id,

            simulation_id:
              simulation?.simulation_id ||
              simulation?.simulationId,

            option_id:
              selectedOption?.id ||
              simulationOptions[0]?.id,
          }),
        },
      );

      let data: Record<string, unknown> | null = null;

      try {
        data = await response.json();
      } catch {
        data = null;
      }

      // The backend contract for a stale-schedule conflict is not
      // available to inspect from this frontend-only context. HTTP 409
      // is the standard, widely-used status for "the resource you're
      // acting on has changed since you read it" — so it is handled
      // explicitly here without assuming a specific response body
      // shape beyond the optional message/error fields already used
      // for every other error path in this file.
      if (response.status === 409) {
        setScheduleConflict(true);
        setScheduleConflictMessage(
          (data?.message as string | undefined) ||
            (data?.error as string | undefined) ||
            "",
        );
        return;
      }

      if (!response.ok) {
        throw new Error(
          (data?.message as string | undefined) ||
            (data?.error as string | undefined) ||
            "Unable to accept walk-in.",
        );
      }

      await loadDashboard();

      const acceptedCustomer =
        customerName.trim() || "Walk-in customer";

      const acceptedService =
        selectedServiceObject?.name;

      const nextHistory = history.map((item) =>
        item.customer === acceptedCustomer &&
        item.service === acceptedService
          ? {
              ...item,
              state: "ACCEPT" as DecisionState,
            }
          : item,
      );

      setHistory(nextHistory);

      window.localStorage.setItem(
        "salora_decision_history",
        JSON.stringify(nextHistory),
      );

      setAcceptedResult(pendingResult);
      setSimulation(null);
      setCustomerName("");
      setSelectedOptionId("");
    } catch (err) {
      setError(
        err instanceof Error
          ? err.message
          : "Unable to accept walk-in.",
      );
    } finally {
      setAccepting(false);
    }
  };

  const dismissAcceptedResult = () => {
    setAcceptedResult(null);
  };

  const viewUpdatedSchedule = () => {
    setAcceptedResult(null);
    setView("schedule");
  };

  const reSimulateAfterConflict = () => {
    setScheduleConflict(false);
    setScheduleConflictMessage("");
    simulateWalkIn();
  };

  const dismissConflict = () => {
    setScheduleConflict(false);
    setScheduleConflictMessage("");
  };

  const logout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
        credentials: "include",
      });
    } finally {
      window.location.href = "/login";
    }
  };

  const resetSimulation = () => {
    setSimulation(null);
    setSelectedOptionId("");
    setError("");
    setScheduleConflict(false);
    setScheduleConflictMessage("");
  };

  const jumpToEngine = () => {
    document
      .getElementById("decision-engine")
      ?.scrollIntoView({
        behavior: "smooth",
        block: "start",
      });
  };

  if (loading && !dashboard) {
    return (
      <main className={styles.shell}>
        <aside className={styles.sidebar}>
          <div className={styles.brand}>
            <span className={styles.brandMark}>S</span>

            <span>SALORA</span>
          </div>

          <div className={styles.loadingSidebar}>
            <div />
            <div />
            <div />
          </div>
        </aside>

        <section className={styles.content}>
          <div className={styles.loadingPage}>
            <div className={styles.skeletonHero} />

            <div className={styles.skeletonGrid}>
              <div />
              <div />
              <div />
              <div />
            </div>

            <div className={styles.skeletonLarge} />
          </div>
        </section>

        <style jsx global>{globalPremiumStyles}</style>
      </main>
    );
  }

  return (
    <main className={styles.shell}>
      <aside className={styles.sidebar}>
        <div>
          <div className={styles.brand}>
            <span className={styles.brandMark}>S</span>

            <div>
              <div className={styles.brandName}>
                SALORA
              </div>

              <div className={styles.brandCaption}>
                DECISION INTELLIGENCE
              </div>
            </div>
          </div>

          <div className={styles.sidebarSection}>
            <span>WORKSPACE</span>
          </div>

          <nav className={styles.nav}>
            <button
              className={
                view === "overview"
                  ? styles.navItemActive
                  : styles.navItem
              }
              onClick={() => setView("overview")}
              aria-current={
                view === "overview"
                  ? "page"
                  : undefined
              }
            >
              <Activity size={16} />

              <span>Command center</span>
            </button>

            <button
              className={
                view === "schedule"
                  ? styles.navItemActive
                  : styles.navItem
              }
              onClick={() => setView("schedule")}
              aria-current={
                view === "schedule"
                  ? "page"
                  : undefined
              }
            >
              <CalendarDays size={16} />

              <span>Schedule</span>
            </button>

            <button
              className={
                view === "customers"
                  ? styles.navItemActive
                  : styles.navItem
              }
              onClick={() => setView("customers")}
              aria-current={
                view === "customers"
                  ? "page"
                  : undefined
              }
            >
              <Users size={16} />

              <span>Customers</span>
            </button>
          </nav>
        </div>

        <div className={styles.sidebarBottom}>
          <div className={styles.systemStatus}>
            <span
              className={
                online
                  ? styles.statusDot
                  : styles.statusDotOffline
              }
            />

            <div>
              <strong>
                {online
                  ? "System operational"
                  : "Offline"}
              </strong>

              <span>
                {online
                  ? "Live decision engine"
                  : "Connection unavailable"}
              </span>
            </div>
          </div>

          <button
            className={styles.logoutButton}
            onClick={logout}
          >
            <LogOut size={15} />

            Sign out
          </button>
        </div>
      </aside>

      <section className={styles.content}>
        <header className={styles.topbar}>
          <div>
            <div className={styles.breadcrumb}>
              {salonName}

              <span>/</span>

              {view === "overview"
                ? "Command center"
                : view === "schedule"
                  ? "Schedule"
                  : "Customers"}
            </div>

            <div className={styles.topbarDate}>
              {now.toLocaleDateString([], {
                weekday: "long",
                day: "numeric",
                month: "long",
              })}
            </div>
          </div>

          <div className={styles.topbarRight}>
            <div className={styles.livePill}>
              <span />

              LIVE
            </div>

            {lastRefreshedAt && (
              <span
                className={styles.lastRefreshed}
                title={lastRefreshedAt.toLocaleString()}
              >
                Last refreshed{" "}
                {lastRefreshedAt.toLocaleTimeString(
                  [],
                  {
                    hour: "2-digit",
                    minute: "2-digit",
                  },
                )}
              </span>
            )}

            <button
              className={styles.refreshButton}
              onClick={loadDashboard}
              title="Refresh dashboard"
              aria-label="Refresh dashboard"
            >
              <RefreshCw size={15} />
            </button>

            <div className={styles.profile}>
              <span className={styles.avatar}>
                {salonName.charAt(0).toUpperCase()}
              </span>

              <div>
                <strong>{salonName}</strong>

                <span>Operations</span>
              </div>
            </div>
          </div>
        </header>

        {error && (
          <div
            className={styles.errorBanner}
            role="alert"
            aria-live="polite"
          >
            <div>
              <X size={16} />

              <span>
                {error}
                {dashboard && (
                  <>
                    {" "}
                    — showing data last refreshed{" "}
                    {lastRefreshedAt
                      ? lastRefreshedAt.toLocaleTimeString(
                          [],
                          {
                            hour: "2-digit",
                            minute: "2-digit",
                          },
                        )
                      : "earlier"}
                    .
                  </>
                )}
              </span>
            </div>

            <button onClick={() => setError("")}>
              Dismiss
            </button>
          </div>
        )}

        {view === "overview" && (
          <>
            <section className={styles.hero}>
              <div className={styles.heroGlow} />

              <div className={styles.heroContent}>
                <div className={styles.eyebrow}>
                  <span className={styles.signal} />

                  REAL-TIME OPERATING INTELLIGENCE
                </div>

                <h1>
                  Run the day.
                  <br />
                  <em>Protect every appointment.</em>
                </h1>

                <p>
                  SALORA evaluates live capacity before a
                  walk-in becomes a scheduling problem.
                </p>

                <div className={styles.heroActions}>
                  <button
                    className={styles.primaryButton}
                    onClick={jumpToEngine}
                  >
                    <Zap size={16} />

                    Simulate a walk-in

                    <ArrowRight size={15} />
                  </button>

                  <button
                    className={styles.secondaryButton}
                    onClick={() => setView("schedule")}
                  >
                    View today&apos;s schedule
                  </button>
                </div>
              </div>

              <div className={styles.heroSignal}>
                <div className={styles.signalHeader}>
                  <span>
                    <span className={styles.signalLive} />

                    LIVE CAPACITY
                  </span>

                  <span>{pressure}% pressure</span>
                </div>

                <div className={styles.capacityMeter}>
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        Math.max(4, pressure),
                      )}%`,
                    }}
                  />
                </div>

                <div className={styles.signalMain}>
                  <strong>{pressureLabel}</strong>

                  <span>
                    {waitingWalkIns > 0
                      ? `${waitingWalkIns} walk-in${
                          waitingWalkIns > 1 ? "s" : ""
                        } waiting`
                      : "No active walk-in queue"}
                  </span>
                </div>

                <div className={styles.signalFooter}>
                  <span>Schedule integrity</span>

                  <strong>
                    {pressure < 70
                      ? "Protected"
                      : "At risk"}
                  </strong>
                </div>
              </div>
            </section>

            <section className={styles.kpiGrid}>
              <MetricCard
                icon={<CalendarDays size={17} />}
                label="Appointments"
                value={todayAppointments}
                detail={`${completedToday} completed today`}
                tone="neutral"
              />

              <MetricCard
                icon={<WalletCards size={17} />}
                label="Revenue today"
                value={money(todayRevenue, salonCurrency)}
                detail={
                  revenuePotential > 0
                    ? `${money(
                        revenuePotential,
                        salonCurrency,
                      )} potential`
                    : "Tracked revenue"
                }
                tone="gold"
              />

              <MetricCard
                icon={<Users size={17} />}
                label="Walk-ins waiting"
                value={waitingWalkIns}
                detail={
                  waitingWalkIns
                    ? "Requires capacity decision"
                    : "Queue is clear"
                }
                tone={
                  waitingWalkIns
                    ? "warning"
                    : "neutral"
                }
              />

              <MetricCard
                icon={<ShieldCheck size={17} />}
                label="Schedule health"
                value={`${Math.max(
                  0,
                  100 - pressure,
                )}%`}
                detail={`${noShows} no-shows · ${cancellations} cancellations`}
                tone={
                  pressure >= 80
                    ? "danger"
                    : pressure >= 55
                      ? "warning"
                      : "green"
                }
              />
            </section>

            <section className="salora-intelligence-strip">
              <div>
                <span>LIVE FLOOR</span>
                <strong>
                  {stylists.length} stylist
                  {stylists.length === 1 ? "" : "s"}
                </strong>
              </div>

              <div>
                <span>BOOKED LOAD</span>
                <strong>
                  {todayAppointments} appointment
                  {todayAppointments === 1
                    ? ""
                    : "s"}
                </strong>
              </div>

              <div>
                <span>COMPLETED</span>
                <strong>{completedToday}</strong>
              </div>

              <div>
                <span>QUEUE</span>
                <strong>
                  {waitingWalkIns > 0
                    ? `${waitingWalkIns} waiting`
                    : "Clear"}
                </strong>
              </div>

              <div>
                <span>PRESSURE</span>
                <strong>{pressure}%</strong>
              </div>
            </section>

            <section className={styles.dashboardGrid}>
              <div className={styles.schedulePanel}>
                <PanelHeader
                  eyebrow="LIVE SCHEDULE"
                  title="Today&apos;s floor"
                  action={
                    <button
                      onClick={() => setView("schedule")}
                      className={styles.textButton}
                    >
                      Open schedule

                      <ChevronRight size={14} />
                    </button>
                  }
                />

                <div className={styles.scheduleSummary}>
                  <div>
                    <span className={styles.summaryLabel}>
                      Operating load
                    </span>

                    <strong>{utilization}%</strong>

                    <div
                      className={
                        styles.progressTrack
                      }
                    >
                      <div
                        style={{
                          width: `${utilization}%`,
                        }}
                      />
                    </div>

                    <span
                      className={
                        styles.summaryState
                      }
                    >
                      {pressure < 55
                        ? "Healthy capacity"
                        : pressure < 80
                          ? "Capacity tightening"
                          : "High pressure"}
                    </span>
                  </div>

                  <div className="salora-schedule-health">
                    <Gauge size={16} />

                    <div>
                      <span>
                        Schedule pressure
                      </span>

                      <strong>
                        {pressure}%
                      </strong>
                    </div>
                  </div>
                </div>

                <div className="salora-floor-timeline">
                  {scheduleAppointments.length ===
                  0 ? (
                    <EmptyState
                      icon={
                        <CalendarDays size={20} />
                      }
                      title="No appointments loaded"
                      description="Your live schedule will appear here."
                    />
                  ) : (
                    scheduleAppointments
                      .slice(0, 6)
                      .map(
                        (
                          appointment,
                          index,
                        ) => (
                          <AppointmentRow
                            key={
                              appointment.id ||
                              `appointment-${index}`
                            }
                            appointment={
                              appointment
                            }
                            index={index}
                            isCurrent={
                              index ===
                              currentAppointmentIndex
                            }
                          />
                        ),
                      )
                  )}
                </div>
              </div>

              <div
                className={`${styles.enginePanel} ${
                  simulation
                    ? styles.enginePanelActive
                    : ""
                }`}
                id="decision-engine"
              >
                <div className={styles.engineTop}>
                  <div>
                    <div
                      className={
                        styles.eyebrowGold
                      }
                    >
                      <Sparkles size={13} />

                      WALK-IN DECISION ENGINE
                    </div>

                    <h2>
                      Know before
                      <br />
                      you say yes.
                    </h2>

                    <p>
                      Test a walk-in against the
                      live schedule before
                      committing the chair.
                    </p>
                  </div>

                  <div
                    className={styles.engineBadge}
                  >
                    <Target size={14} />

                    Predict
                  </div>
                </div>

                <div className={styles.engineForm}>
                  <label>
                    <span>Customer</span>

                    <div
                      className={
                        styles.inputWrap
                      }
                    >
                      <UserRound size={15} />

                      <input
                        value={customerName}
                        onChange={(event) =>
                          setCustomerName(
                            event.target.value,
                          )
                        }
                        placeholder="Walk-in customer"
                      />
                    </div>
                  </label>

                  <label>
                    <span>
                      Requested service
                    </span>

                    <div
                      className={styles.servicePicker}
                      ref={serviceMenuRef}
                    >
                      <button
                        type="button"
                        className={styles.servicePickerTrigger}
                        role="combobox"
                        aria-expanded={serviceMenuOpen}
                        aria-haspopup="listbox"
                        onClick={() =>
                          setServiceMenuOpen((open) => !open)
                        }
                      >
                        <span className={styles.servicePickerIcon}>
                          <Clock3 size={15} />
                        </span>

                        <span className={styles.servicePickerValue}>
                          {selectedServiceObject ? (
                            <>
                              <strong>
                                {selectedServiceObject.name}
                              </strong>
                              <span>
                                {selectedServiceObject.duration_minutes} min
                                {" · "}
                                {money(
                                  selectedServiceObject.price,
                                  salonCurrency,
                                )}
                              </span>
                            </>
                          ) : (
                            <span className={styles.servicePickerPlaceholder}>
                              Select a service
                            </span>
                          )}
                        </span>

                        <ChevronDown
                          size={16}
                          className={`${styles.servicePickerChevron} ${
                            serviceMenuOpen
                              ? styles.servicePickerChevronOpen
                              : ""
                          }`}
                        />
                      </button>

                      {serviceMenuOpen && (
                        <div
                          className={styles.servicePickerMenu}
                          role="listbox"
                          aria-label="Available services"
                        >
                          {services.map((service) => {
                            const isSelected =
                              service.id === selectedServiceObject?.id;

                            return (
                              <button
                                type="button"
                                key={service.id}
                                role="option"
                                aria-selected={isSelected}
                                className={`${styles.servicePickerOption} ${
                                  isSelected
                                    ? styles.servicePickerOptionSelected
                                    : ""
                                }`}
                                onClick={() => {
                                  setSelectedService(service.id);
                                  setServiceMenuOpen(false);
                                }}
                              >
                                <span>
                                  <strong>{service.name}</strong>
                                  <small>
                                    {service.duration_minutes} min
                                  </small>
                                </span>

                                <span className={styles.servicePickerPrice}>
                                  {money(
                                    service.price,
                                    salonCurrency,
                                  )}
                                </span>
                              </button>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  </label>

                  <button
                    className={
                      styles.simulateButton
                    }
                    onClick={simulateWalkIn}
                    disabled={
                      simulating ||
                      !selectedServiceObject
                    }
                  >
                    {simulating ? (
                      <>
                        <span
                          className={
                            styles.spinner
                          }
                        />

                        {
                          SIMULATION_STAGES[
                            simulationStage
                          ]
                        }
                      </>
                    ) : (
                      <>
                        Simulate impact

                        <ArrowRight
                          size={15}
                        />
                      </>
                    )}
                  </button>

                  {simulating && (
                    <div
                      className={
                        styles.engineStageStatus
                      }
                      role="status"
                      aria-live="polite"
                    >
                      Step {simulationStage + 1} of{" "}
                      {SIMULATION_STAGES.length} —{" "}
                      {
                        SIMULATION_STAGES[
                          simulationStage
                        ]
                      }
                    </div>
                  )}
                </div>

                {acceptedResult && (
                  <div
                    className="salora-success-panel"
                    role="status"
                    aria-live="polite"
                  >
                    <div className="salora-success-top">
                      <div className="salora-success-icon">
                        <CheckCircle2 size={22} />
                      </div>

                      <div>
                        <span>ACCEPTANCE CONFIRMED</span>

                        <h3>Walk-in accepted</h3>
                      </div>
                    </div>

                    <p>
                      SALORA revalidated the schedule
                      before booking — this walk-in is
                      now on the live floor.
                    </p>

                    <div className="salora-success-grid">
                      <div>
                        <span>Customer</span>
                        <strong>
                          {acceptedResult.customer}
                        </strong>
                      </div>

                      <div>
                        <span>Service</span>
                        <strong>
                          {acceptedResult.service}
                        </strong>
                      </div>

                      <div>
                        <span>Stylist</span>
                        <strong>
                          {acceptedResult.stylist}
                        </strong>
                      </div>

                      <div>
                        <span>Scheduled time</span>
                        <strong>
                          {acceptedResult.time}
                        </strong>
                      </div>

                      <div>
                        <span>Revenue</span>
                        <strong>
                          {money(
                            acceptedResult.revenue,
                            salonCurrency,
                          )}
                        </strong>
                      </div>

                      <div>
                        <span>Delay impact</span>
                        <strong>
                          {acceptedResult.delayMinutes ===
                          0
                            ? "None"
                            : `${acceptedResult.delayMinutes}m`}
                        </strong>
                      </div>
                    </div>

                    <div className="salora-success-actions">
                      <button
                        type="button"
                        className={
                          styles.secondaryAction
                        }
                        onClick={viewUpdatedSchedule}
                      >
                        View updated schedule
                      </button>

                      <button
                        type="button"
                        className={
                          styles.primaryButton
                        }
                        onClick={dismissAcceptedResult}
                      >
                        Done
                      </button>
                    </div>
                  </div>
                )}

                {!simulation &&
                  !acceptedResult && (
                  <div className={styles.engineEmpty}>
                    <div
                      className={
                        styles.engineFlow
                      }
                    >
                      <FlowStep
                        number="01"
                        title="Ingest"
                        description="Read the live floor"
                      />

                      <FlowLine />

                      <FlowStep
                        number="02"
                        title="Simulate"
                        description="Test every safe slot"
                      />

                      <FlowLine />

                      <FlowStep
                        number="03"
                        title="Decide"
                        description="Recommend the safest move"
                      />
                    </div>

                    <div
                      className={
                        styles.engineHint
                      }
                    >
                      <ShieldCheck size={15} />

                      Booked customers are always
                      protected first.
                    </div>
                  </div>
                )}

                {!acceptedResult &&
                  simulation &&
                  activeDecision && (
                    <div
                      className="salora-decision-stage"
                      role="status"
                      aria-live="polite"
                    >
                      <div
                        className="salora-decision-top"
                      >
                        <div>
                          <span>
                            DECISION
                          </span>

                          <div
                            className={`${styles.decisionState} ${stateClass(
                              state,
                            )}`}
                          >
                            {state ===
                              "ACCEPT" && (
                              <CheckCircle2
                                size={18}
                              />
                            )}

                            {state ===
                              "ACCEPT_WITH_WARNING" && (
                              <Activity
                                size={18}
                              />
                            )}

                            {state ===
                              "WAIT" && (
                              <Timer
                                size={18}
                              />
                            )}

                            {state ===
                              "RESCHEDULE" && (
                              <TrendingDown
                                size={18}
                              />
                            )}

                            <strong>
                              {stateLabel(
                                state,
                              )}
                            </strong>
                          </div>
                        </div>

                        <button
                          className={
                            styles.closeResult
                          }
                          onClick={
                            resetSimulation
                          }
                          aria-label="Close simulation"
                        >
                          <X size={15} />
                        </button>
                      </div>

                      <div className="salora-decision-banner">
                        <div>
                          <span>
                            RECOMMENDATION
                          </span>

                          <strong>
                            {stateLabel(state)}
                          </strong>
                        </div>

                        <div className="salora-decision-pulse">
                          <span />
                          ENGINE COMPLETE
                        </div>
                      </div>

                      <p
                        className={
                          styles.decisionExplanation
                        }
                      >
                        {activeDecision.explanation ||
                          activeDecision.reason ||
                          "SALORA evaluated the request against current capacity and upcoming appointments."}
                      </p>

                      <div
                        className={
                          styles.impactGrid
                        }
                      >
                        <ImpactMetric
                          label="Revenue"
                          value={money(
                            simulationRevenue,
                            salonCurrency,
                          )}
                          positive={
                            simulationRevenue >
                            0
                          }
                        />

                        <ImpactMetric
                          label="Total delay"
                          value={`${totalDelay}m`}
                          positive={
                            totalDelay === 0
                          }
                        />

                        <ImpactMetric
                          label="Max delay"
                          value={`${maximumDelay}m`}
                          positive={
                            maximumDelay === 0
                          }
                        />

                        <ImpactMetric
                          label="Affected"
                          value={String(
                            affectedAppointments,
                          )}
                          positive={
                            affectedAppointments ===
                            0
                          }
                        />
                      </div>

                      <div className="salora-why-panel">
                        <div className="salora-section-heading">
                          <div>
                            <span>
                              DECISION LOGIC
                            </span>

                            <h3>
                              Why SALORA says this
                            </h3>
                          </div>

                          <ShieldCheck
                            size={17}
                          />
                        </div>

                        <div className="salora-reason-grid">
                          <ReasonItem
                            label="Schedule impact"
                            value={
                              totalDelay === 0
                                ? "No downstream delay"
                                : `${totalDelay}m total delay`
                            }
                            safe={
                              totalDelay === 0
                            }
                          />

                          <ReasonItem
                            label="Customer wait"
                            value={
                              customerWait ===
                              0
                                ? "Immediate placement"
                                : `${customerWait}m wait`
                            }
                            safe={
                              customerWait ===
                              0
                            }
                          />

                          <ReasonItem
                            label="Appointments affected"
                            value={
                              affectedAppointments ===
                              0
                                ? "None"
                                : String(
                                    affectedAppointments,
                                  )
                            }
                            safe={
                              affectedAppointments ===
                              0
                            }
                          />

                          <ReasonItem
                            label="Revenue captured"
                            value={money(
                              simulationRevenue,
                              salonCurrency,
                            )}
                            safe={
                              simulationRevenue >
                              0
                            }
                          />
                        </div>
                      </div>

                      <div className="salora-ripple-panel">
                        <div className="salora-section-heading">
                          <div>
                            <span>
                              SCHEDULE RIPPLE
                            </span>

                            <h3>
                              What happens if you say yes
                            </h3>
                          </div>

                          <span className="salora-live-label">
                            LIVE SIMULATION
                          </span>
                        </div>

                        <RippleVisualization
                          appointments={
                            scheduleAppointments
                          }
                          selectedOption={
                            selectedOption
                          }
                          customerName={
                            customerName.trim() ||
                            "Walk-in"
                          }
                          service={
                            selectedServiceObject
                          }
                        />
                      </div>

                      {simulationOptions.length >
                        0 && (
                        <div className="salora-options-panel">
                          <div className="salora-section-heading">
                            <div>
                              <span>
                                WHAT-IF ANALYSIS
                              </span>

                              <h3>
                                Compare evaluated placements
                              </h3>
                            </div>

                            <span>
                              {
                                feasibleOptions.length
                              }{" "}
                              of{" "}
                              {
                                simulationOptions.length
                              }{" "}
                              feasible
                            </span>
                          </div>

                          <div className="salora-option-grid">
                            {simulationOptions
                              .slice(0, 6)
                              .map(
                                (
                                  option,
                                  index,
                                ) => {
                                  const isSelected =
                                    selectedOption?.id ===
                                    option.id;

                                  const delay =
                                    optionDelay(
                                      option,
                                    );

                                  const maxDelay =
                                    optionMaxDelay(
                                      option,
                                    );

                                  const wait =
                                    optionWait(
                                      option,
                                    );

                                  const affected =
                                    optionAffected(
                                      option,
                                    );

                                  return (
                                    <button
                                      key={
                                        option.id ||
                                        `option-${index}`
                                      }
                                      type="button"
                                      className={`salora-option-card ${
                                        isSelected
                                          ? "is-selected"
                                          : ""
                                      } ${
                                        option.valid ===
                                        false
                                          ? "is-invalid"
                                          : ""
                                      }`}
                                      onClick={() =>
                                        setSelectedOptionId(
                                          option.id ||
                                            "",
                                        )
                                      }
                                    >
                                      <div className="salora-option-number">
                                        0
                                        {index +
                                          1}
                                      </div>

                                      <div className="salora-option-main">
                                        <strong>
                                          {time(
                                            option.startTime ||
                                              option.start_time,
                                          )}
                                          {" — "}
                                          {time(
                                            option.endTime ||
                                              option.end_time,
                                          )}
                                        </strong>

                                        <span>
                                          {getOptionStylistName(
                                            option,
                                            stylists,
                                          )}
                                        </span>
                                      </div>

                                      <div className="salora-option-metrics">
                                        <span>
                                          <b>
                                            {
                                              delay
                                            }
                                          </b>
                                          m delay
                                        </span>

                                        <span>
                                          <b>
                                            {
                                              maxDelay
                                            }
                                          </b>
                                          m max
                                        </span>

                                        <span>
                                          <b>
                                            {
                                              affected
                                            }
                                          </b>
                                          affected
                                        </span>
                                      </div>

                                      <div className="salora-option-status">
                                        {option.valid ===
                                        false ? (
                                          <>
                                            <X
                                              size={
                                                13
                                              }
                                            />

                                            Unsafe
                                          </>
                                        ) : delay ===
                                          0 ? (
                                          <>
                                            <Check
                                              size={
                                                13
                                              }
                                            />

                                            Protected
                                          </>
                                        ) : (
                                          <>
                                            <Activity
                                              size={
                                                13
                                              }
                                            />

                                            Impact
                                          </>
                                        )}
                                      </div>
                                    </button>
                                  );
                                },
                              )}
                          </div>
                        </div>
                      )}

                      {recommendedStylist && (
                        <div
                          className={
                            styles.recommendedRow
                          }
                        >
                          <div
                            className={
                              styles.recommendedIcon
                            }
                          >
                            <UserRound
                              size={16}
                            />
                          </div>

                          <div>
                            <span>
                              Recommended stylist
                            </span>

                            <strong>
                              {
                                recommendedStylist.name
                              }
                            </strong>
                          </div>

                          <Check size={16} />
                        </div>
                      )}

                      {scheduleConflict && (
                        <div
                          className="salora-conflict-panel"
                          role="alert"
                          aria-live="assertive"
                        >
                          <div className="salora-conflict-top">
                            <Activity size={17} />

                            <div>
                              <span>
                                SALON STATE CHANGED
                              </span>

                              <strong>
                                The salon schedule
                                changed while you were
                                deciding.
                              </strong>
                            </div>
                          </div>

                          <p>
                            {scheduleConflictMessage ||
                              "Your simulation may no longer be valid. Re-run the walk-in simulation before accepting."}
                          </p>

                          <div className="salora-conflict-actions">
                            <button
                              type="button"
                              className={
                                styles.primaryButton
                              }
                              onClick={
                                reSimulateAfterConflict
                              }
                            >
                              Re-simulate
                            </button>

                            <button
                              type="button"
                              className={
                                styles.secondaryAction
                              }
                              onClick={
                                dismissConflict
                              }
                            >
                              Dismiss
                            </button>
                          </div>
                        </div>
                      )}

                      {!scheduleConflict && (
                        <div
                          className={
                            styles.resultActions
                          }
                        >
                          {(state === "ACCEPT" ||
                            state ===
                              "ACCEPT_WITH_WARNING") && (
                            <button
                              className={
                                styles.acceptButton
                              }
                              onClick={
                                acceptWalkIn
                              }
                              disabled={accepting}
                            >
                              {accepting ? (
                                <>
                                  <span
                                    className={
                                      styles.spinnerDark
                                    }
                                  />

                                  Applying...
                                </>
                              ) : (
                                <>
                                  <Check
                                    size={16}
                                  />

                                  Accept walk-in
                                </>
                              )}
                            </button>
                          )}

                          <button
                            className={
                              styles.secondaryAction
                            }
                            onClick={
                              resetSimulation
                            }
                          >
                            Run another scenario
                          </button>
                        </div>
                      )}
                    </div>
                  )}
              </div>
            </section>

            <section className={styles.intelligenceGrid}>
              <IntelligenceCard
                icon={<ShieldCheck size={18} />}
                eyebrow="SCHEDULE PROTECTION"
                title="Booked customers stay protected."
                description="SALORA evaluates downstream impact instead of treating a walk-in as an isolated booking."
                metric={`${affectedAppointments || 0}`}
                metricLabel="appointments affected"
              />

              <IntelligenceCard
                icon={<TrendingUp size={18} />}
                eyebrow="REVENUE OPPORTUNITY"
                title="Capture capacity without guessing."
                description="Every accepted walk-in is evaluated against the revenue and schedule cost of saying yes."
                metric={money(
                  revenuePotential ||
                    simulationRevenue,
                  salonCurrency,
                )}
                metricLabel="available potential"
              />

              <IntelligenceCard
                icon={<Timer size={18} />}
                eyebrow="LIVE PRESSURE"
                title="See the schedule tightening."
                description="Capacity pressure makes operational risk visible before the next customer is promised a chair."
                metric={`${pressure}%`}
                metricLabel="schedule pressure"
              />
            </section>

            <section className="salora-capacity-section">
              <PanelHeader
                eyebrow="FLOOR INTELLIGENCE"
                title="Live stylist load"
                action={
                  <span className="salora-panel-note">
                    Based on today&apos;s loaded appointments
                  </span>
                }
              />

              {stylistLoad.length === 0 ? (
                <EmptyState
                  icon={<Users size={20} />}
                  title="No stylists loaded"
                  description="Stylist capacity will appear when the live floor is available."
                />
              ) : (
                <div className="salora-stylist-grid">
                  {stylistLoad.map(
                    ({ stylist, count }) => {
                      const percentage =
                        todayAppointments > 0
                          ? Math.min(
                              100,
                              Math.round(
                                (count /
                                  todayAppointments) *
                                  100,
                              ),
                            )
                          : 0;

                      return (
                        <div
                          className="salora-stylist-card"
                          key={stylist.id}
                        >
                          <div className="salora-stylist-top">
                            <div className="salora-stylist-avatar">
                              {stylist.name
                                .charAt(0)
                                .toUpperCase()}
                            </div>

                            <div>
                              <strong>
                                {stylist.name}
                              </strong>

                              <span>
                                {stylist.status ||
                                  "Available"}
                              </span>
                            </div>

                            <span>
                              {count}
                            </span>
                          </div>

                          <div className="salora-load-track">
                            <div
                              style={{
                                width: `${percentage}%`,
                              }}
                            />
                          </div>

                          <small>
                            {count} booked appointment
                            {count === 1
                              ? ""
                              : "s"}
                          </small>
                        </div>
                      );
                    },
                  )}
                </div>
              )}

              {busiestStylist && (
                <div className="salora-floor-note">
                  <Gauge size={15} />

                  <span>
                    Current highest booked load:
                  </span>

                  <strong>
                    {busiestStylist.stylist.name}
                  </strong>

                  <span>
                    with {busiestStylist.count} appointment
                    {busiestStylist.count === 1
                      ? ""
                      : "s"}{" "}
                    loaded today.
                  </span>
                </div>
              )}
            </section>

            <section className={styles.historyPanel}>
              <PanelHeader
                eyebrow="DECISION HISTORY"
                title="Recent simulations"
                action={
                  <span
                    className={styles.panelMeta}
                  >
                    Local session history
                  </span>
                }
              />

              {history.length === 0 ? (
                <div
                  className={
                    styles.historyEmpty
                  }
                >
                  <Sparkles size={18} />

                  <span>
                    Your simulated walk-ins will
                    appear here.
                  </span>
                </div>
              ) : (
                <div
                  className={
                    styles.historyList
                  }
                >
                  {history
                    .slice(0, 6)
                    .map((item) => (
                      <div
                        className={
                          styles.historyRow
                        }
                        key={item.id}
                      >
                        <div
                          className={
                            styles.historyIcon
                          }
                        >
                          {item.state ===
                          "ACCEPT" ? (
                            <Check size={15} />
                          ) : (
                            <Target
                              size={15}
                            />
                          )}
                        </div>

                        <div
                          className={
                            styles.historyMain
                          }
                        >
                          <strong>
                            {item.customer}
                          </strong>

                          <span>
                            {item.service} ·{" "}
                            {dateTime(
                              item.createdAt,
                            )}
                          </span>
                        </div>

                        <span
                          className={`${styles.historyState} ${stateClass(
                            item.state,
                          )}`}
                        >
                          {stateLabel(
                            item.state,
                          )}
                        </span>

                        <strong
                          className={
                            styles.historyRevenue
                          }
                        >
                          {money(
                            item.revenue,
                            salonCurrency,
                          )}
                        </strong>

                        <ChevronRight
                          size={15}
                        />
                      </div>
                    ))}
                </div>
              )}
            </section>
          </>
        )}

        {view === "schedule" && (
          <section className={styles.fullPage}>
            <PageTitle
              eyebrow="LIVE SCHEDULE"
              title="Today&apos;s operating floor"
              description="A clear view of the appointments SALORA is protecting."
              action={
                <button
                  className={
                    styles.primaryButton
                  }
                  onClick={() =>
                    setView("overview")
                  }
                >
                  <Sparkles size={15} />

                  Open decision engine
                </button>
              }
            />

            <div className={styles.scheduleOverview}>
              <div
                className={
                  styles.scheduleHeroMetric
                }
              >
                <span>
                  Schedule pressure
                </span>

                <strong>{pressure}%</strong>

                <div
                  className={
                    styles.largeMeter
                  }
                >
                  <div
                    style={{
                      width: `${Math.min(
                        100,
                        pressure,
                      )}%`,
                    }}
                  />
                </div>

                <small>
                  {pressureLabel}
                </small>
              </div>

              <div
                className={
                  styles.scheduleStats
                }
              >
                <MiniStat
                  label="Appointments"
                  value={String(
                    todayAppointments,
                  )}
                />

                <MiniStat
                  label="Completed"
                  value={String(
                    completedToday,
                  )}
                />

                <MiniStat
                  label="No-shows"
                  value={String(
                    noShows,
                  )}
                />

                <MiniStat
                  label="Cancellations"
                  value={String(
                    cancellations,
                  )}
                />
              </div>
            </div>

            <div className="salora-schedule-board">
              <div className="salora-schedule-board-header">
                <div>
                  <span>
                    OPERATING FLOOR
                  </span>

                  <strong>
                    {scheduleAppointments.length} loaded
                    appointment
                    {scheduleAppointments.length ===
                    1
                      ? ""
                      : "s"}
                  </strong>
                </div>

                <div>
                  <span className="salora-live-label">
                    <span />

                    LIVE
                  </span>
                </div>
              </div>

              {scheduleAppointments.length ===
              0 ? (
                <EmptyState
                  icon={
                    <CalendarDays size={20} />
                  }
                  title="No appointments"
                  description="There are no appointments in the current schedule."
                />
              ) : (
                <div className="salora-schedule-rows">
                  {scheduleAppointments.map(
                    (
                      appointment,
                      index,
                    ) => (
                      <ScheduleBoardRow
                        key={
                          appointment.id ||
                          `schedule-${index}`
                        }
                        appointment={
                          appointment
                        }
                        index={index}
                        isCurrent={
                          index ===
                          currentAppointmentIndex
                        }
                      />
                    ),
                  )}
                </div>
              )}
            </div>

            <div className="salora-schedule-insight-grid">
              <InsightCard
                icon={<ShieldCheck size={17} />}
                eyebrow="PROTECTION"
                title="Appointments remain the constraint"
                text="The schedule view is designed around preserving booked commitments while making capacity pressure visible."
              />

              <InsightCard
                icon={<BarChart3 size={17} />}
                eyebrow="LOAD"
                title="See the floor before accepting"
                text="Stylist load is grounded in the appointments currently returned by the live dashboard."
              />

              <InsightCard
                icon={<Zap size={17} />}
                eyebrow="ACTION"
                title="Decision engine stays one step away"
                text="When a walk-in arrives, move directly from the schedule to simulation rather than guessing."
              />
            </div>
          </section>
        )}

        {view === "customers" && (
          <section className={styles.fullPage}>
            <PageTitle
              eyebrow="CUSTOMER DIRECTORY"
              title="People behind the schedule"
              description="Customer context available to the front desk."
              action={
                <button
                  className={
                    styles.secondaryButton
                  }
                  onClick={loadCustomers}
                >
                  <RefreshCw size={15} />

                  Refresh
                </button>
              }
            />

            <div
              className={
                styles.customerStats
              }
            >
              <MiniStat
                label="Customers"
                value={String(
                  customers.length,
                )}
              />

              <MiniStat
                label="Appointments today"
                value={String(
                  todayAppointments,
                )}
              />

              <MiniStat
                label="Walk-ins waiting"
                value={String(
                  waitingWalkIns,
                )}
              />
            </div>

            <div className="salora-customer-search">
              <div className={styles.inputWrap}>
                <Users size={15} />

                <input
                  value={customerQuery}
                  onChange={(event) =>
                    setCustomerQuery(
                      event.target.value,
                    )
                  }
                  placeholder="Search by name, phone or email"
                  aria-label="Search customers"
                />
              </div>

              {customerQuery && (
                <button
                  type="button"
                  className={styles.textButton}
                  onClick={() =>
                    setCustomerQuery("")
                  }
                >
                  Clear search
                </button>
              )}
            </div>

            <div
              className={
                styles.customerGrid
              }
            >
              {customers.length === 0 ? (
                <EmptyState
                  icon={<Users size={20} />}
                  title="No customers loaded"
                  description="Customer records will appear here."
                />
              ) : filteredCustomers.length === 0 ? (
                <EmptyState
                  icon={<Users size={20} />}
                  title="No matching customers"
                  description={`Nothing in the directory matches "${customerQuery}".`}
                />
              ) : (
                filteredCustomers.map(
                  (customer) => (
                    <div
                      className={
                        styles.customerCard
                      }
                      key={customer.id}
                    >
                      <div
                        className={
                          styles.customerAvatar
                        }
                      >
                        {customer.name
                          .charAt(0)
                          .toUpperCase()}
                      </div>

                      <div
                        className={
                          styles.customerInfo
                        }
                      >
                        <strong>
                          {customer.name}
                        </strong>

                        <span>
                          {customer.phone ||
                            customer.email ||
                            "No contact details"}
                        </span>

                        <small>
                          {customer.visitCount ??
                            customer.visit_count ??
                            0}{" "}
                          visits
                        </small>
                      </div>

                      <ChevronRight
                        size={16}
                      />
                    </div>
                  ),
                )
              )}
            </div>
          </section>
        )}
      </section>

      <style jsx global>
        {globalPremiumStyles}
      </style>
    </main>
  );
}

function MetricCard({
  icon,
  label,
  value,
  detail,
  tone,
}: {
  icon: ReactNode;
  label: string;
  value: string | number;
  detail: string;
  tone:
    | "neutral"
    | "gold"
    | "warning"
    | "danger"
    | "green";
}) {
  return (
    <div
      className={`${styles.metricCard} ${styles[tone]}`}
    >
      <div className={styles.metricTop}>
        <div className={styles.metricIcon}>
          {icon}
        </div>

        <span>{label}</span>
      </div>

      <strong>{value}</strong>

      <small>{detail}</small>
    </div>
  );
}

function PanelHeader({
  eyebrow,
  title,
  action,
}: {
  eyebrow: string;
  title: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.panelHeader}>
      <div>
        <span>{eyebrow}</span>

        <h3>{title}</h3>
      </div>

      {action}
    </div>
  );
}

function AppointmentRow({
  appointment,
  index,
  isCurrent,
}: {
  appointment: Appointment;
  index: number;
  isCurrent: boolean;
}) {
  const status =
    appointment.status?.toUpperCase() ||
    "BOOKED";

  return (
    <div
      className={`${styles.appointmentRow} ${
        isCurrent
          ? "salora-appointment-current"
          : ""
      }`}
    >
      <div className={styles.appointmentTime}>
        {time(getAppointmentStart(appointment))}
      </div>

      <div className={styles.appointmentLine}>
        <span
          className={
            isCurrent
              ? styles.timelineActive
              : index === 0
                ? styles.timelineActive
                : styles.timelineDot
          }
        />
      </div>

      <div
        className={
          styles.appointmentCustomer
        }
      >
        <strong>
          {getAppointmentCustomer(
            appointment,
          )}
        </strong>

        <span>
          {getAppointmentService(
            appointment,
          )}
        </span>
      </div>

      <div
        className={
          styles.appointmentStylist
        }
      >
        {getAppointmentStylist(
          appointment,
        )}
      </div>

      <span className={styles.statusTag}>
        {status}
      </span>
    </div>
  );
}

function ImpactMetric({
  label,
  value,
  positive,
}: {
  label: string;
  value: string;
  positive: boolean;
}) {
  return (
    <div className={styles.impactMetric}>
      <span>{label}</span>

      <strong>{value}</strong>

      <small
        className={
          positive
            ? styles.good
            : styles.bad
        }
      >
        {positive
          ? "Protected"
          : "Impact detected"}
      </small>
    </div>
  );
}

function FlowStep({
  number,
  title,
  description,
}: {
  number: string;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.flowStep}>
      <span>{number}</span>

      <strong>{title}</strong>

      <small>{description}</small>
    </div>
  );
}

function FlowLine() {
  return (
    <div className={styles.flowLine}>
      <ArrowRight size={13} />
    </div>
  );
}

function IntelligenceCard({
  icon,
  eyebrow,
  title,
  description,
  metric,
  metricLabel,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  description: string;
  metric: string;
  metricLabel: string;
}) {
  return (
    <article
      className={
        styles.intelligenceCard
      }
    >
      <div
        className={
          styles.intelligenceIcon
        }
      >
        {icon}
      </div>

      <span
        className={
          styles.intelligenceEyebrow
        }
      >
        {eyebrow}
      </span>

      <h3>{title}</h3>

      <p>{description}</p>

      <div
        className={
          styles.intelligenceMetric
        }
      >
        <strong>{metric}</strong>

        <span>{metricLabel}</span>
      </div>
    </article>
  );
}

function EmptyState({
  icon,
  title,
  description,
}: {
  icon: ReactNode;
  title: string;
  description: string;
}) {
  return (
    <div className={styles.emptyState}>
      <div>{icon}</div>

      <strong>{title}</strong>

      <span>{description}</span>
    </div>
  );
}

function MiniStat({
  label,
  value,
}: {
  label: string;
  value: string;
}) {
  return (
    <div className={styles.miniStat}>
      <span>{label}</span>

      <strong>{value}</strong>
    </div>
  );
}

function PageTitle({
  eyebrow,
  title,
  description,
  action,
}: {
  eyebrow: string;
  title: string;
  description: string;
  action?: ReactNode;
}) {
  return (
    <div className={styles.pageTitle}>
      <div>
        <span>{eyebrow}</span>

        <h1>{title}</h1>

        <p>{description}</p>
      </div>

      {action}
    </div>
  );
}

function ReasonItem({
  label,
  value,
  safe,
}: {
  label: string;
  value: string;
  safe: boolean;
}) {
  return (
    <div className="salora-reason-item">
      <div>
        <span>{label}</span>

        <strong>{value}</strong>
      </div>

      <span
        className={
          safe
            ? "salora-reason-check"
            : "salora-reason-warning"
        }
      >
        {safe ? (
          <Check size={12} />
        ) : (
          <Activity size={12} />
        )}
      </span>
    </div>
  );
}

function RippleVisualization({
  appointments,
  selectedOption,
  customerName,
  service,
}: {
  appointments: Appointment[];
  selectedOption: SimulationOption | null;
  customerName: string;
  service?: Service;
}) {
  const visibleAppointments =
    appointments.slice(0, 5);

  const delay = selectedOption
    ? optionDelay(selectedOption)
    : 0;

  const start =
    selectedOption?.startTime ||
    selectedOption?.start_time;

  const end =
    selectedOption?.endTime ||
    selectedOption?.end_time;

  return (
    <div className="salora-ripple">
      {delay > 0 && visibleAppointments.length > 0 && (
        <div className="salora-ripple-disclaimer">
          Aggregate downstream impact shown below —
          per-appointment impact detail isn&apos;t
          provided by the current simulation data, so no
          individual row is marked as affected.
        </div>
      )}

      <div className="salora-ripple-track">
        {visibleAppointments.length ===
        0 ? (
          <div className="salora-ripple-empty">
            No scheduled appointments available
            for the visual comparison.
          </div>
        ) : (
          visibleAppointments.map(
            (appointment, index) => (
              <div
                className="salora-ripple-row"
                key={
                  appointment.id ||
                  `ripple-${index}`
                }
              >
                <div className="salora-ripple-time">
                  {time(
                    getAppointmentStart(
                      appointment,
                    ),
                  )}
                </div>

                <div className="salora-ripple-lane">
                  <span />

                  <div
                    className={`salora-ripple-block ${
                      delay === 0
                        ? "is-protected"
                        : ""
                    }`}
                  >
                    <strong>
                      {getAppointmentCustomer(
                        appointment,
                      )}
                    </strong>

                    <small>
                      {getAppointmentService(
                        appointment,
                      )}
                    </small>
                  </div>
                </div>

                <div className="salora-ripple-status">
                  {delay === 0 ? (
                    <>
                      <Check size={12} />

                      Protected
                    </>
                  ) : (
                    <>
                      <Clock3 size={12} />

                      Scheduled
                    </>
                  )}
                </div>
              </div>
            ),
          )
        )}
      </div>

      <div className="salora-insert-card">
        <div className="salora-insert-marker">
          +
        </div>

        <div>
          <span>
            PROPOSED WALK-IN
          </span>

          <strong>
            {customerName}
          </strong>

          <small>
            {service?.name || "Requested service"}
            {" · "}
            {start
              ? `${time(start)} — ${time(end)}`
              : "Placement being evaluated"}
          </small>
        </div>

        <div className="salora-insert-impact">
          <strong>
            {delay === 0
              ? "NO RIPPLE"
              : `+${delay}m`}
          </strong>

          <span>
            {delay === 0
              ? "Booked schedule protected"
              : "Downstream impact detected"}
          </span>
        </div>
      </div>
    </div>
  );
}

function ScheduleBoardRow({
  appointment,
  index,
  isCurrent,
}: {
  appointment: Appointment;
  index: number;
  isCurrent: boolean;
}) {
  const status =
    appointment.status?.toUpperCase() ||
    "BOOKED";

  const tone = statusTone(status);

  return (
    <div
      className={`salora-board-row ${
        isCurrent
          ? "is-current"
          : ""
      }`}
    >
      <div className="salora-board-time">
        {isCurrent && (
          <span className="salora-now-dot" />
        )}

        {time(
          getAppointmentStart(
            appointment,
          ),
        )}
      </div>

      <div className="salora-board-customer">
        <span className="salora-board-avatar">
          {getAppointmentCustomer(
            appointment,
          )
            .charAt(0)
            .toUpperCase()}
        </span>

        <div>
          <strong>
            {getAppointmentCustomer(
              appointment,
            )}
          </strong>

          <span>
            {getAppointmentService(
              appointment,
            )}
          </span>
        </div>
      </div>

      <div className="salora-board-stylist">
        {getAppointmentStylist(
          appointment,
        )}
      </div>

      <div className="salora-board-end">
        {time(
          getAppointmentEnd(
            appointment,
          ),
        )}
      </div>

      <div
        className={`salora-board-status ${tone}`}
      >
        {status}
      </div>

      <div className="salora-board-index">
        {String(index + 1).padStart(2, "0")}
      </div>
    </div>
  );
}

function InsightCard({
  icon,
  eyebrow,
  title,
  text,
}: {
  icon: ReactNode;
  eyebrow: string;
  title: string;
  text: string;
}) {
  return (
    <article className="salora-insight-card">
      <div className="salora-insight-icon">
        {icon}
      </div>

      <span>{eyebrow}</span>

      <h3>{title}</h3>

      <p>{text}</p>
    </article>
  );
}

const globalPremiumStyles = `
  .salora-intelligence-strip {
    display: grid;
    grid-template-columns: repeat(5, minmax(0, 1fr));
    margin: 18px 0 24px;
    border: 1px solid rgba(212, 175, 55, .14);
    background:
      linear-gradient(
        180deg,
        rgba(255,255,255,.035),
        rgba(255,255,255,.012)
      );
    box-shadow:
      0 20px 60px rgba(0,0,0,.16);
    overflow: hidden;
  }

  .salora-intelligence-strip > div {
    min-height: 82px;
    padding: 17px 20px;
    border-right: 1px solid rgba(255,255,255,.07);
    display: flex;
    flex-direction: column;
    justify-content: center;
    gap: 5px;
    transition:
      background .25s ease,
      transform .25s ease;
  }

  .salora-intelligence-strip > div:last-child {
    border-right: 0;
  }

  .salora-intelligence-strip > div:hover {
    background: rgba(212,175,55,.045);
    transform: translateY(-1px);
  }

  .salora-intelligence-strip span,
  .salora-panel-note {
    font-size: 9px;
    letter-spacing: .18em;
    text-transform: uppercase;
    color: rgba(245,230,200,.48);
  }

  .salora-intelligence-strip strong {
    color: #f5e6c8;
    font-size: 16px;
    font-weight: 600;
  }

  .salora-schedule-health {
    display: flex;
    align-items: center;
    gap: 10px;
    min-width: 145px;
    color: #d4af37;
  }

  .salora-schedule-health > div {
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .salora-schedule-health span {
    color: rgba(245,230,200,.44);
    font-size: 9px;
    letter-spacing: .13em;
    text-transform: uppercase;
  }

  .salora-schedule-health strong {
    color: #f5e6c8;
    font-size: 14px;
  }

  .salora-floor-timeline {
    position: relative;
  }

  .salora-appointment-current {
    background:
      linear-gradient(
        90deg,
        rgba(212,175,55,.07),
        transparent
      );
  }

  .salora-decision-stage {
    animation: saloraDecisionReveal .55s cubic-bezier(.2,.8,.2,1);
  }

  .salora-decision-top {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 20px;
    margin-top: 20px;
  }

  .salora-decision-top > div > span {
    display: block;
    color: rgba(245,230,200,.42);
    font-size: 9px;
    letter-spacing: .18em;
    text-transform: uppercase;
    margin-bottom: 8px;
  }

  .salora-decision-banner {
    margin-top: 17px;
    min-height: 72px;
    padding: 15px 17px;
    border: 1px solid rgba(212,175,55,.22);
    background:
      linear-gradient(
        100deg,
        rgba(212,175,55,.10),
        rgba(255,255,255,.018)
      );
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 20px;
    position: relative;
    overflow: hidden;
  }

  .salora-decision-banner::after {
    content: "";
    position: absolute;
    inset: 0;
    background:
      linear-gradient(
        90deg,
        transparent,
        rgba(245,230,200,.07),
        transparent
      );
    transform: translateX(-100%);
    animation: saloraSweep 2.8s ease-in-out infinite;
    pointer-events: none;
  }

  .salora-decision-banner > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .salora-decision-banner span {
    color: rgba(245,230,200,.42);
    font-size: 8px;
    letter-spacing: .17em;
  }

  .salora-decision-banner strong {
    color: #f5e6c8;
    font-size: 17px;
    letter-spacing: .02em;
  }

  .salora-decision-pulse {
    display: flex;
    align-items: center;
    gap: 7px;
    color: rgba(245,230,200,.5);
    font-size: 8px;
    letter-spacing: .13em;
    white-space: nowrap;
  }

  .salora-decision-pulse span,
  .salora-live-label span {
    width: 6px;
    height: 6px;
    border-radius: 50%;
    background: #d4af37;
    box-shadow: 0 0 0 4px rgba(212,175,55,.08);
    animation: saloraLivePulse 1.8s ease-in-out infinite;
  }

  .salora-why-panel,
  .salora-ripple-panel,
  .salora-options-panel {
    margin-top: 18px;
    border-top: 1px solid rgba(255,255,255,.075);
    padding-top: 18px;
  }

  .salora-ripple-disclaimer {
    margin-bottom: 10px;
    padding: 9px 12px;
    border: 1px solid rgba(212,175,55,.16);
    background: rgba(212,175,55,.035);
    color: rgba(245,230,200,.5);
    font-size: 10px;
    line-height: 1.6;
  }

  .salora-conflict-panel {
    margin-top: 17px;
    padding: 17px;
    border: 1px solid rgba(201,149,104,.32);
    background:
      linear-gradient(
        100deg,
        rgba(198,138,85,.09),
        rgba(255,255,255,.014)
      );
    animation: saloraDecisionReveal .45s cubic-bezier(.2,.8,.2,1);
  }

  .salora-conflict-top {
    display: flex;
    align-items: flex-start;
    gap: 12px;
    color: #c68a55;
  }

  .salora-conflict-top > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .salora-conflict-top span {
    font-size: 9px;
    letter-spacing: .16em;
    color: #c68a55;
  }

  .salora-conflict-top strong {
    color: #f5e6c8;
    font-size: 13px;
    font-weight: 600;
    line-height: 1.5;
  }

  .salora-conflict-panel p {
    margin: 12px 0 0;
    color: rgba(245,230,200,.6);
    font-size: 11px;
    line-height: 1.7;
  }

  .salora-conflict-actions {
    display: flex;
    gap: 10px;
    margin-top: 15px;
    flex-wrap: wrap;
  }

  .salora-success-panel {
    margin-top: 17px;
    padding: 20px;
    border: 1px solid rgba(212,175,55,.3);
    background:
      linear-gradient(
        135deg,
        rgba(212,175,55,.1),
        rgba(255,255,255,.015)
      );
    animation: saloraDecisionReveal .5s cubic-bezier(.2,.8,.2,1);
  }

  .salora-success-top {
    display: flex;
    align-items: center;
    gap: 14px;
  }

  .salora-success-icon {
    width: 44px;
    height: 44px;
    flex: 0 0 auto;
    display: grid;
    place-items: center;
    border: 1px solid rgba(212,175,55,.4);
    background: rgba(212,175,55,.12);
    color: #d4af37;
  }

  .salora-success-top > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .salora-success-top span {
    font-size: 9px;
    letter-spacing: .18em;
    color: rgba(212,175,55,.75);
  }

  .salora-success-top h3 {
    margin: 0;
    color: #f5e6c8;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 19px;
    font-weight: 400;
  }

  .salora-success-panel > p {
    margin: 14px 0 0;
    color: rgba(245,230,200,.55);
    font-size: 11px;
    line-height: 1.7;
  }

  .salora-success-grid {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 12px;
    margin-top: 16px;
  }

  .salora-success-grid > div {
    padding: 12px;
    border: 1px solid rgba(255,255,255,.07);
    background: rgba(0,0,0,.14);
    display: flex;
    flex-direction: column;
    gap: 5px;
  }

  .salora-success-grid span {
    color: rgba(245,230,200,.4);
    font-size: 8px;
    letter-spacing: .14em;
    text-transform: uppercase;
  }

  .salora-success-grid strong {
    color: #f5e6c8;
    font-size: 13px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .salora-success-actions {
    display: flex;
    gap: 10px;
    margin-top: 18px;
    flex-wrap: wrap;
  }

  .salora-customer-search {
    display: flex;
    align-items: center;
    gap: 12px;
    margin: 18px 0;
  }

  .salora-customer-search > div {
    max-width: 360px;
    flex: 1;
  }

  .salora-section-heading {
    display: flex;
    align-items: flex-start;
    justify-content: space-between;
    gap: 15px;
    margin-bottom: 13px;
  }

  .salora-section-heading > div {
    min-width: 0;
  }

  .salora-section-heading > div > span {
    display: block;
    color: rgba(245,230,200,.4);
    font-size: 8px;
    letter-spacing: .18em;
    margin-bottom: 5px;
  }

  .salora-section-heading h3 {
    margin: 0;
    color: #f5e6c8;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 19px;
    font-weight: 400;
  }

  .salora-section-heading > svg {
    color: #d4af37;
    flex: 0 0 auto;
  }

  .salora-section-heading > span:last-child {
    color: rgba(245,230,200,.4);
    font-size: 9px;
    letter-spacing: .1em;
    white-space: nowrap;
  }

  .salora-live-label {
    display: inline-flex;
    align-items: center;
    gap: 7px;
    color: rgba(245,230,200,.48) !important;
  }

  .salora-reason-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0, 1fr));
    gap: 8px;
  }

  .salora-reason-item {
    min-height: 67px;
    border: 1px solid rgba(255,255,255,.065);
    background: rgba(0,0,0,.12);
    padding: 11px 12px;
    display: flex;
    align-items: center;
    justify-content: space-between;
    gap: 10px;
    transition:
      border-color .25s ease,
      transform .25s ease,
      background .25s ease;
  }

  .salora-reason-item:hover {
    border-color: rgba(212,175,55,.2);
    background: rgba(212,175,55,.025);
    transform: translateY(-1px);
  }

  .salora-reason-item > div {
    display: flex;
    flex-direction: column;
    gap: 4px;
    min-width: 0;
  }

  .salora-reason-item span:first-child {
    color: rgba(245,230,200,.4);
    font-size: 8px;
    letter-spacing: .1em;
    text-transform: uppercase;
  }

  .salora-reason-item strong {
    color: #f5e6c8;
    font-size: 12px;
    font-weight: 600;
  }

  .salora-reason-check,
  .salora-reason-warning {
    width: 25px;
    height: 25px;
    display: grid;
    place-items: center;
    border-radius: 50%;
    flex: 0 0 auto;
  }

  .salora-reason-check {
    color: #d4af37;
    background: rgba(212,175,55,.08);
    border: 1px solid rgba(212,175,55,.16);
  }

  .salora-reason-warning {
    color: #e3b26d;
    background: rgba(227,178,109,.08);
    border: 1px solid rgba(227,178,109,.14);
  }

  .salora-ripple {
    border: 1px solid rgba(255,255,255,.065);
    background: rgba(0,0,0,.12);
    overflow: hidden;
  }

  .salora-ripple-track {
    padding: 9px 0;
  }

  .salora-ripple-empty {
    padding: 28px 16px;
    text-align: center;
    color: rgba(245,230,200,.4);
    font-size: 11px;
    line-height: 1.7;
  }

  .salora-ripple-row {
    display: grid;
    grid-template-columns: 52px minmax(0,1fr) auto;
    align-items: center;
    gap: 10px;
    min-height: 56px;
    padding: 0 12px;
    border-bottom: 1px solid rgba(255,255,255,.045);
  }

  .salora-ripple-time {
    color: rgba(245,230,200,.58);
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
  }

  .salora-ripple-lane {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 9px;
  }

  .salora-ripple-lane > span {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: rgba(245,230,200,.35);
    flex: 0 0 auto;
  }

  .salora-ripple-block {
    min-width: 0;
    flex: 1;
    padding: 8px 10px;
    border-left: 2px solid rgba(245,230,200,.16);
    background: rgba(255,255,255,.025);
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .salora-ripple-block.is-protected {
    border-left-color: rgba(212,175,55,.5);
  }

  .salora-ripple-block strong {
    color: #f5e6c8;
    font-size: 11px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .salora-ripple-block small {
    color: rgba(245,230,200,.38);
    font-size: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .salora-ripple-status {
    display: inline-flex;
    align-items: center;
    gap: 5px;
    color: rgba(245,230,200,.4);
    font-size: 8px;
    letter-spacing: .08em;
    text-transform: uppercase;
    white-space: nowrap;
  }

  .salora-insert-card {
    display: grid;
    grid-template-columns: 32px minmax(0,1fr) auto;
    align-items: center;
    gap: 10px;
    margin: 11px;
    padding: 11px;
    border: 1px solid rgba(212,175,55,.25);
    background:
      linear-gradient(
        90deg,
        rgba(212,175,55,.08),
        rgba(212,175,55,.025)
      );
    animation: saloraInsertPulse 2.8s ease-in-out infinite;
  }

  .salora-insert-marker {
    width: 28px;
    height: 28px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(212,175,55,.3);
    color: #d4af37;
    font-size: 17px;
  }

  .salora-insert-card > div:nth-child(2) {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .salora-insert-card > div:nth-child(2) > span {
    color: rgba(245,230,200,.38);
    font-size: 7px;
    letter-spacing: .15em;
  }

  .salora-insert-card strong {
    color: #f5e6c8;
    font-size: 11px;
  }

  .salora-insert-card small {
    color: rgba(245,230,200,.4);
    font-size: 9px;
  }

  .salora-insert-impact {
    display: flex;
    flex-direction: column;
    align-items: flex-end;
    gap: 2px;
  }

  .salora-insert-impact strong {
    color: #d4af37;
    font-size: 10px;
    letter-spacing: .08em;
  }

  .salora-insert-impact span {
    color: rgba(245,230,200,.35);
    font-size: 8px;
    text-align: right;
  }

  .salora-option-grid {
    display: grid;
    grid-template-columns: repeat(2, minmax(0,1fr));
    gap: 8px;
  }

  .salora-option-card {
    appearance: none;
    border: 1px solid rgba(255,255,255,.065);
    background: rgba(0,0,0,.13);
    color: inherit;
    text-align: left;
    padding: 11px;
    display: grid;
    grid-template-columns: 27px minmax(0,1fr);
    gap: 9px;
    cursor: pointer;
    position: relative;
    overflow: hidden;
    transition:
      border-color .25s ease,
      transform .25s ease,
      background .25s ease,
      box-shadow .25s ease;
  }

  .salora-option-card:hover {
    transform: translateY(-2px);
    border-color: rgba(212,175,55,.2);
    background: rgba(212,175,55,.025);
  }

  .salora-option-card:focus-visible {
    outline: 2px solid #d4af37;
    outline-offset: 2px;
  }

  .salora-option-card.is-selected {
    border-color: rgba(212,175,55,.5);
    background: rgba(212,175,55,.07);
    box-shadow:
      inset 0 0 0 1px rgba(212,175,55,.06),
      0 10px 35px rgba(0,0,0,.14);
  }

  .salora-option-card.is-invalid {
    opacity: .62;
  }

  .salora-option-number {
    width: 27px;
    height: 27px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(245,230,200,.12);
    color: rgba(245,230,200,.46);
    font-size: 8px;
    letter-spacing: .05em;
  }

  .salora-option-main {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .salora-option-main strong {
    color: #f5e6c8;
    font-size: 12px;
  }

  .salora-option-main span {
    color: rgba(245,230,200,.42);
    font-size: 9px;
  }

  .salora-option-metrics {
    grid-column: 1 / -1;
    display: flex;
    gap: 12px;
    padding-top: 8px;
    border-top: 1px solid rgba(255,255,255,.05);
  }

  .salora-option-metrics span {
    color: rgba(245,230,200,.36);
    font-size: 8px;
  }

  .salora-option-metrics b {
    color: #f5e6c8;
    font-weight: 600;
  }

  .salora-option-status {
    grid-column: 1 / -1;
    display: flex;
    align-items: center;
    gap: 5px;
    color: #d4af37;
    font-size: 8px;
    letter-spacing: .08em;
    text-transform: uppercase;
  }

  .salora-capacity-section {
    margin-top: 22px;
    padding: 21px;
    border: 1px solid rgba(255,255,255,.07);
    background: rgba(0,0,0,.14);
    box-shadow: 0 25px 65px rgba(0,0,0,.14);
  }

  .salora-stylist-grid {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 10px;
  }

  .salora-stylist-card {
    border: 1px solid rgba(255,255,255,.065);
    background: rgba(255,255,255,.018);
    padding: 13px;
    transition:
      transform .25s ease,
      border-color .25s ease,
      background .25s ease;
  }

  .salora-stylist-card:hover {
    transform: translateY(-2px);
    border-color: rgba(212,175,55,.2);
    background: rgba(212,175,55,.025);
  }

  .salora-stylist-top {
    display: grid;
    grid-template-columns: 31px minmax(0,1fr) auto;
    align-items: center;
    gap: 9px;
  }

  .salora-stylist-avatar {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(212,175,55,.2);
    color: #d4af37;
    font-size: 10px;
  }

  .salora-stylist-top > div:nth-child(2) {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 2px;
  }

  .salora-stylist-top strong {
    color: #f5e6c8;
    font-size: 11px;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
  }

  .salora-stylist-top span {
    color: rgba(245,230,200,.38);
    font-size: 8px;
  }

  .salora-stylist-top > span:last-child {
    color: #d4af37;
    font-size: 15px;
    font-weight: 600;
  }

  .salora-load-track {
    height: 3px;
    margin-top: 14px;
    background: rgba(255,255,255,.06);
    overflow: hidden;
  }

  .salora-load-track div {
    height: 100%;
    background: #d4af37;
    box-shadow: 0 0 14px rgba(212,175,55,.28);
    transition: width .8s cubic-bezier(.2,.8,.2,1);
  }

  .salora-stylist-card small {
    display: block;
    margin-top: 7px;
    color: rgba(245,230,200,.3);
    font-size: 8px;
  }

  .salora-floor-note {
    margin-top: 13px;
    padding-top: 12px;
    border-top: 1px solid rgba(255,255,255,.055);
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 6px;
    color: rgba(245,230,200,.4);
    font-size: 9px;
  }

  .salora-floor-note svg {
    color: #d4af37;
  }

  .salora-floor-note strong {
    color: #f5e6c8;
  }

  .salora-schedule-board {
    margin-top: 24px;
    border: 1px solid rgba(255,255,255,.07);
    background: rgba(0,0,0,.14);
    box-shadow: 0 25px 65px rgba(0,0,0,.14);
    overflow: hidden;
  }

  .salora-schedule-board-header {
    min-height: 74px;
    padding: 16px 19px;
    border-bottom: 1px solid rgba(255,255,255,.065);
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .salora-schedule-board-header > div:first-child {
    display: flex;
    flex-direction: column;
    gap: 4px;
  }

  .salora-schedule-board-header span:first-child {
    color: rgba(245,230,200,.36);
    font-size: 8px;
    letter-spacing: .16em;
  }

  .salora-schedule-board-header strong {
    color: #f5e6c8;
    font-size: 16px;
    font-weight: 500;
  }

  .salora-schedule-board-header .salora-live-label {
    display: flex;
    align-items: center;
    gap: 6px;
    color: rgba(245,230,200,.42);
    font-size: 8px;
    letter-spacing: .12em;
  }

  .salora-schedule-rows {
    position: relative;
  }

  .salora-board-row {
    min-height: 76px;
    display: grid;
    grid-template-columns: 70px minmax(0,1.7fr) minmax(110px,1fr) 75px 130px 34px;
    align-items: center;
    gap: 12px;
    padding: 0 18px;
    border-bottom: 1px solid rgba(255,255,255,.045);
    position: relative;
    transition:
      background .25s ease,
      transform .25s ease;
  }

  .salora-board-row:hover {
    background: rgba(212,175,55,.025);
  }

  .salora-board-row.is-current {
    background:
      linear-gradient(
        90deg,
        rgba(212,175,55,.09),
        transparent
      );
  }

  .salora-board-row.is-current::before {
    content: "";
    position: absolute;
    left: 0;
    top: 0;
    bottom: 0;
    width: 2px;
    background: #d4af37;
    box-shadow: 0 0 18px rgba(212,175,55,.45);
  }

  .salora-board-time {
    display: flex;
    align-items: center;
    gap: 7px;
    color: rgba(245,230,200,.56);
    font-family: "IBM Plex Mono", monospace;
    font-size: 10px;
  }

  .salora-now-dot {
    width: 5px;
    height: 5px;
    border-radius: 50%;
    background: #d4af37;
    animation: saloraLivePulse 1.8s ease-in-out infinite;
  }

  .salora-board-customer {
    min-width: 0;
    display: flex;
    align-items: center;
    gap: 10px;
  }

  .salora-board-avatar {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(245,230,200,.12);
    color: rgba(245,230,200,.65);
    font-size: 10px;
    flex: 0 0 auto;
  }

  .salora-board-customer > div {
    min-width: 0;
    display: flex;
    flex-direction: column;
    gap: 3px;
  }

  .salora-board-customer strong {
    color: #f5e6c8;
    font-size: 11px;
    font-weight: 600;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .salora-board-customer span {
    color: rgba(245,230,200,.36);
    font-size: 9px;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  .salora-board-stylist,
  .salora-board-end {
    color: rgba(245,230,200,.46);
    font-size: 10px;
  }

  .salora-board-status {
    justify-self: start;
    padding: 5px 7px;
    border: 1px solid rgba(255,255,255,.08);
    color: rgba(245,230,200,.5);
    font-size: 7px;
    letter-spacing: .11em;
  }

  .salora-board-status.completed {
    color: #d4af37;
    border-color: rgba(212,175,55,.2);
    background: rgba(212,175,55,.05);
  }

  .salora-board-status.cancelled,
  .salora-board-status.noshow {
    color: #c99568;
    border-color: rgba(201,149,104,.2);
    background: rgba(201,149,104,.04);
  }

  .salora-board-index {
    color: rgba(245,230,200,.18);
    font-family: "IBM Plex Mono", monospace;
    font-size: 9px;
    text-align: right;
  }

  .salora-schedule-insight-grid {
    display: grid;
    grid-template-columns: repeat(3,minmax(0,1fr));
    gap: 10px;
    margin-top: 18px;
  }

  .salora-insight-card {
    min-height: 190px;
    padding: 17px;
    border: 1px solid rgba(255,255,255,.065);
    background: rgba(0,0,0,.12);
    transition:
      transform .25s ease,
      border-color .25s ease;
  }

  .salora-insight-card:hover {
    transform: translateY(-3px);
    border-color: rgba(212,175,55,.18);
  }

  .salora-insight-icon {
    width: 31px;
    height: 31px;
    display: grid;
    place-items: center;
    border: 1px solid rgba(212,175,55,.18);
    color: #d4af37;
    margin-bottom: 19px;
  }

  .salora-insight-card > span {
    color: rgba(245,230,200,.38);
    font-size: 8px;
    letter-spacing: .16em;
  }

  .salora-insight-card h3 {
    color: #f5e6c8;
    font-family: Georgia, "Times New Roman", serif;
    font-size: 20px;
    font-weight: 400;
    margin: 8px 0;
  }

  .salora-insight-card p {
    color: rgba(245,230,200,.4);
    font-size: 10px;
    line-height: 1.7;
    margin: 0;
  }

  @keyframes saloraDecisionReveal {
    from {
      opacity: 0;
      transform: translateY(9px);
    }

    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  @keyframes saloraSweep {
    0%,
    35% {
      transform: translateX(-100%);
    }

    65%,
    100% {
      transform: translateX(100%);
    }
  }

  @keyframes saloraInsertPulse {
    0%,
    100% {
      border-color: rgba(212,175,55,.22);
    }

    50% {
      border-color: rgba(212,175,55,.42);
    }
  }

  @media (max-width: 1050px) {
    .salora-intelligence-strip {
      grid-template-columns: repeat(3,minmax(0,1fr));
    }

    .salora-intelligence-strip > div:nth-child(3) {
      border-right: 0;
    }

    .salora-intelligence-strip > div:nth-child(4),
    .salora-intelligence-strip > div:nth-child(5) {
      border-top: 1px solid rgba(255,255,255,.07);
    }

    .salora-stylist-grid {
      grid-template-columns: repeat(2,minmax(0,1fr));
    }

    .salora-board-row {
      grid-template-columns:
        65px
        minmax(0,1.5fr)
        minmax(100px,1fr)
        65px
        110px
        30px;
    }
  }

  @media (max-width: 800px) {
    .salora-intelligence-strip {
      grid-template-columns: repeat(2,minmax(0,1fr));
    }

    .salora-intelligence-strip > div {
      border-right: 0;
    }

    .salora-intelligence-strip > div:nth-child(n+3) {
      border-top: 1px solid rgba(255,255,255,.07);
    }

    .salora-option-grid,
    .salora-reason-grid,
    .salora-stylist-grid,
    .salora-schedule-insight-grid {
      grid-template-columns: 1fr;
    }

    .salora-board-row {
      grid-template-columns:
        60px
        minmax(0,1fr)
        auto;
      padding: 11px 13px;
      gap: 9px;
    }

    .salora-board-stylist,
    .salora-board-end,
    .salora-board-index {
      display: none;
    }

    .salora-board-status {
      grid-column: 3;
      grid-row: 1;
    }

    .salora-insert-card {
      grid-template-columns: 30px minmax(0,1fr);
    }

    .salora-insert-impact {
      grid-column: 2;
      align-items: flex-start;
      padding-top: 4px;
    }

    .salora-insert-impact span {
      text-align: left;
    }
  }

  @media (max-width: 560px) {
    .salora-intelligence-strip {
      grid-template-columns: 1fr 1fr;
    }

    .salora-intelligence-strip > div {
      min-height: 70px;
      padding: 12px;
    }

    .salora-decision-banner {
      align-items: flex-start;
      flex-direction: column;
      gap: 9px;
    }

    .salora-ripple-row {
      grid-template-columns: 43px minmax(0,1fr);
      padding: 0 9px;
    }

    .salora-ripple-status {
      display: none;
    }

    .salora-section-heading {
      align-items: flex-start;
    }

    .salora-section-heading h3 {
      font-size: 17px;
    }

    .salora-option-metrics {
      gap: 7px;
      flex-wrap: wrap;
    }

    .salora-capacity-section {
      padding: 15px;
    }
  }

  @media (max-width: 390px) {
    .salora-intelligence-strip {
      grid-template-columns: 1fr;
    }

    .salora-intelligence-strip > div:nth-child(n) {
      border-top: 1px solid rgba(255,255,255,.07);
      border-right: 0;
    }

    .salora-intelligence-strip > div:first-child {
      border-top: 0;
    }

    .salora-ripple-block {
      padding: 7px;
    }
  }

  @media (prefers-reduced-motion: reduce) {
    .salora-decision-stage,
    .salora-decision-banner::after,
    .salora-insert-card,
    .salora-live-label span,
    .salora-decision-pulse span,
    .salora-now-dot {
      animation: none !important;
    }

    .salora-intelligence-strip > div,
    .salora-option-card,
    .salora-stylist-card,
    .salora-insight-card {
      transition: none !important;
    }
  }
`;