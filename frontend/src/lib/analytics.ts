import { api } from "@/lib/api";

const SESSION_KEY = "africhess_session";
const QUEUE_KEY = "africhess_event_queue";

export type ActivityEventType =
  | "page_view"
  | "click"
  | "search"
  | "other";

export interface QueuedEvent {
  event_type: ActivityEventType;
  session_id: string;
  path: string;
  element?: string;
  label?: string;
  metadata?: Record<string, unknown>;
}

let memoryQueue: QueuedEvent[] = [];
let flushTimer: ReturnType<typeof setTimeout> | null = null;
let flushing = false;

export function getSessionId(): string {
  if (typeof window === "undefined") return "";
  let id = localStorage.getItem(SESSION_KEY);
  if (!id) {
    id = crypto.randomUUID?.() ?? `s-${Date.now()}-${Math.random().toString(36).slice(2)}`;
    localStorage.setItem(SESSION_KEY, id);
  }
  return id;
}

function persistQueue() {
  try {
    localStorage.setItem(QUEUE_KEY, JSON.stringify(memoryQueue.slice(0, 200)));
  } catch {
    /* quota */
  }
}

function restoreQueue() {
  try {
    const raw = localStorage.getItem(QUEUE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as QueuedEvent[];
      if (Array.isArray(parsed)) memoryQueue = parsed;
      localStorage.removeItem(QUEUE_KEY);
    }
  } catch {
    /* ignore */
  }
}

export function trackEvent(
  event_type: ActivityEventType,
  data: Partial<Omit<QueuedEvent, "event_type" | "session_id">> = {}
) {
  if (typeof window === "undefined") return;
  const ev: QueuedEvent = {
    event_type,
    session_id: getSessionId(),
    path: data.path ?? window.location.pathname,
    element: data.element,
    label: data.label,
    metadata: data.metadata,
  };
  memoryQueue.push(ev);
  if (memoryQueue.length >= 25) {
    void flushEvents();
  } else {
    scheduleFlush();
  }
}

export function trackPageView(path: string) {
  trackEvent("page_view", { path, label: document.title?.slice(0, 256) });
}

export function trackClick(target: HTMLElement) {
  const tag = target.tagName.toLowerCase();
  const id = target.id ? `#${target.id}` : "";
  const trackName = target.getAttribute("data-track");
  const classes = target.className
    ? `.${String(target.className).split(/\s+/).slice(0, 2).join(".")}`
    : "";
  const element = trackName || `${tag}${id}${classes}`.slice(0, 256);
  const label = (target.getAttribute("aria-label") || target.textContent || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 100);
  const href = target instanceof HTMLAnchorElement ? target.href : undefined;
  trackEvent("click", {
    element,
    label,
    metadata: {
      tag,
      href,
      x: (target as HTMLElement).offsetLeft,
      y: (target as HTMLElement).offsetTop,
    },
  });
}

function scheduleFlush() {
  if (flushTimer) return;
  flushTimer = setTimeout(() => {
    flushTimer = null;
    void flushEvents();
  }, 3000);
}

export async function flushEvents() {
  if (flushing || memoryQueue.length === 0) return;
  flushing = true;
  const batch = memoryQueue.splice(0, 100);
  try {
    await api.post("/analytics/events/", { events: batch });
  } catch {
    memoryQueue = [...batch, ...memoryQueue].slice(0, 500);
    persistQueue();
  } finally {
    flushing = false;
  }
}

export function initAnalytics() {
  if (typeof window === "undefined") return () => {};
  restoreQueue();
  void flushEvents();

  const onClick = (e: MouseEvent) => {
    const t = e.target;
    if (!(t instanceof HTMLElement)) return;
    const el = t.closest("button, a, [role='button'], [data-track], input[type='submit']") as HTMLElement | null;
    trackClick(el ?? t);
  };

  const onHide = () => {
    if (document.visibilityState === "hidden") {
      persistQueue();
      void flushEvents();
    }
  };

  document.addEventListener("click", onClick, true);
  document.addEventListener("visibilitychange", onHide);
  window.addEventListener("beforeunload", () => persistQueue());

  return () => {
    document.removeEventListener("click", onClick, true);
    document.removeEventListener("visibilitychange", onHide);
  };
}
