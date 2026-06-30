import { usersApi } from "@/lib/api";

export interface AnalysisLimits {
  free: number;
  gold: number;
  diamond: number;
}

export interface SubscriptionPlansPayload {
  stripe_enabled?: boolean;
  oauth?: { google?: boolean; github?: boolean };
  analysis_limits?: AnalysisLimits;
  plans?: Array<{ id: string; analysis_moves?: number }>;
}

const DEFAULT_LIMITS: AnalysisLimits = { free: 40, gold: 80, diamond: 120 };

let cachedPlans: SubscriptionPlansPayload | null = null;
let fetchPromise: Promise<SubscriptionPlansPayload> | null = null;

export async function fetchSubscriptionPlans(): Promise<SubscriptionPlansPayload> {
  if (cachedPlans) return cachedPlans;
  if (fetchPromise) return fetchPromise;
  fetchPromise = usersApi
    .subscriptionPlans()
    .then(({ data }) => {
      cachedPlans = data as SubscriptionPlansPayload;
      return cachedPlans;
    })
    .catch(() => ({ analysis_limits: DEFAULT_LIMITS }))
    .finally(() => {
      fetchPromise = null;
    });
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
  if (user?.is_diamond) return null;
  if (user?.is_premium) {
    return t("chess.analysis.limitGold", { limit: limits.gold, diamond: limits.diamond });
  }
  return t("chess.analysis.limitFree", {
    limit: limits.free,
    gold: limits.gold,
    diamond: limits.diamond,
  });
}
