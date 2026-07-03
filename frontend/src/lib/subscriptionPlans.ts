import { usersApi } from "@/lib/api";

export interface AnalysisLimits {
  free: number | null;
  gold: number | null;
  diamond: number | null;
}

export interface SubscriptionPlansPayload {
  stripe_enabled?: boolean;
  oauth?: { google?: boolean; github?: boolean };
  analysis_limits?: AnalysisLimits;
  analysis_depth?: { free: number; gold: number; diamond: number };
  plans?: Array<{ id: string; analysis_moves?: number | null; analysis_depth?: number }>;
}

const DEFAULT_LIMITS: AnalysisLimits = { free: null, gold: null, diamond: null };

let cachedPlans: SubscriptionPlansPayload | null = null;
let fetchPromise: Promise<SubscriptionPlansPayload> | null = null;

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlansPayload> {
  if (cachedPlans) return cachedPlans;
  if (!fetchPromise) {
    fetchPromise = usersApi
      .subscriptionPlans()
      .then(({ data }) => {
        cachedPlans = data as SubscriptionPlansPayload;
        return cachedPlans;
      })
      .catch(() => ({ analysis_limits: DEFAULT_LIMITS }));
  }
  return fetchPromise;
}

export function getAnalysisLimits(plans?: SubscriptionPlansPayload | null): AnalysisLimits {
  return plans?.analysis_limits ?? DEFAULT_LIMITS;
}

export function analysisLimitHint(
  t: (key: string, params?: Record<string, string | number>) => string,
  limits: AnalysisLimits,
  user?: { is_premium?: boolean; is_diamond?: boolean } | null
): string | null {
  if (limits.free == null && limits.gold == null) {
    return null;
  }
  if (user?.is_diamond) return null;
  if (user?.is_premium) {
    return t("chess.analysis.limitGold", { limit: limits.gold ?? 0, diamond: limits.diamond ?? 0 });
  }
  return t("chess.analysis.limitFree", {
    limit: limits.free ?? 0,
    gold: limits.gold ?? 0,
    diamond: limits.diamond ?? 0,
  });
}
