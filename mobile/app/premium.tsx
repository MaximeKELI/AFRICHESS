import { useEffect, useState } from "react";
import { Link, router } from "expo-router";
import {
  ActivityIndicator,
  Linking,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";
import { usersApi } from "../lib/api";

interface Plan {
  id: string;
  price_eur: number;
  features: string[];
}

export default function PremiumScreen() {
  const { user, loading: authLoading, refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [status, setStatus] = useState<{
    tier: string;
    is_premium: boolean;
    has_billing_portal?: boolean;
  } | null>(null);
  const [loading, setLoading] = useState(true);
  const [msg, setMsg] = useState("");
  const [error, setError] = useState("");
  const [subscribing, setSubscribing] = useState<string | null>(null);
  const [portalLoading, setPortalLoading] = useState(false);

  useEffect(() => {
    if (!authLoading && !user) {
      router.replace("/login");
    }
  }, [authLoading, user]);

  useEffect(() => {
    usersApi
      .subscriptionPlans()
      .then(({ data }) => setPlans(data.plans ?? []))
      .catch(() => setError(t("premium.error.load")))
      .finally(() => setLoading(false));
  }, [t]);

  useEffect(() => {
    if (!user) return;
    usersApi.subscriptionStatus().then(({ data }) => setStatus(data)).catch(() => {});
  }, [user]);

  const subscribe = async (planId: "gold" | "diamond") => {
    if (!user) return;
    setSubscribing(planId);
    setError("");
    try {
      const { data } = await usersApi.subscribe(planId);
      if (data.checkout_url) {
        await Linking.openURL(data.checkout_url);
        return;
      }
      setStatus({ tier: data.tier ?? planId, is_premium: Boolean(data.is_premium) });
      setMsg(data.message ?? t("premium.active", { tier: planId }));
      await refreshProfile();
    } catch {
      setError(t("premium.error.subscribe"));
    } finally {
      setSubscribing(null);
    }
  };

  const openPortal = async () => {
    setPortalLoading(true);
    setError("");
    try {
      const { data } = await usersApi.billingPortal();
      if (data.portal_url) await Linking.openURL(data.portal_url);
    } catch {
      setError(t("premium.error.portal"));
    } finally {
      setPortalLoading(false);
    }
  };

  if (authLoading || !user) {
    return (
      <View style={styles.center}>
        <ActivityIndicator color="#D4A017" />
      </View>
    );
  }

  return (
    <ScrollView contentContainerStyle={styles.container}>
      <Text style={styles.title}>{t("premium.title")}</Text>
      <Text style={styles.subtitle}>{t("premium.subtitle")}</Text>

      {status?.is_premium && (
        <View style={styles.activeRow}>
          <Text style={styles.active}>{t("premium.active", { tier: status.tier })}</Text>
          {status.has_billing_portal && (
            <Pressable style={styles.portalBtn} onPress={() => void openPortal()} disabled={portalLoading}>
              {portalLoading ? (
                <ActivityIndicator color="#D4A017" />
              ) : (
                <Text style={styles.portalText}>{t("premium.manage")}</Text>
              )}
            </Pressable>
          )}
        </View>
      )}
      {msg ? <Text style={styles.msg}>{msg}</Text> : null}
      {error ? <Text style={styles.error}>{error}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#D4A017" />
      ) : (
        plans
          .filter((p) => p.id !== "free")
          .map((plan) => (
            <View key={plan.id} style={styles.card}>
              <Text style={styles.planName}>{plan.id.toUpperCase()}</Text>
              <Text style={styles.price}>{plan.price_eur > 0 ? `${plan.price_eur} €/mois` : "Demo"}</Text>
              {plan.features.slice(0, 4).map((f) => (
                <Text key={f} style={styles.feature}>
                  · {f}
                </Text>
              ))}
              <Pressable
                style={styles.btn}
                disabled={Boolean(subscribing) || status?.tier === plan.id}
                onPress={() => void subscribe(plan.id as "gold" | "diamond")}
              >
                {subscribing === plan.id ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={styles.btnText}>
                    {status?.tier === plan.id ? t("premium.current") : t("premium.subscribe")}
                  </Text>
                )}
              </Pressable>
            </View>
          ))
      )}

      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>←</Text>
      </Link>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  container: { padding: 24, backgroundColor: "#0D1117", gap: 16 },
  title: { fontSize: 28, fontWeight: "800", color: "#D4A017" },
  subtitle: { color: "#aaa", marginBottom: 8 },
  activeRow: { gap: 8 },
  active: { color: "#1B7A3D", fontWeight: "600" },
  portalBtn: {
    alignSelf: "flex-start",
    borderWidth: 1,
    borderColor: "#D4A017",
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
  },
  portalText: { color: "#D4A017", fontWeight: "600" },
  msg: { color: "#1B7A3D" },
  error: { color: "#E07A5F" },
  card: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 12,
    padding: 16,
    gap: 8,
  },
  planName: { fontSize: 18, fontWeight: "700", color: "#fff" },
  price: { color: "#D4A017", fontWeight: "600" },
  feature: { color: "#ccc", fontSize: 13 },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 14,
    borderRadius: 10,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700" },
  link: { alignSelf: "center", marginTop: 16 },
  linkText: { color: "#D4A017" },
});
