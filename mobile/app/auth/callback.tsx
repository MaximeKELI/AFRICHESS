import { useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import * as WebBrowser from "expo-web-browser";
import { LoginError, useAuth } from "../context/AuthContext";
import { parseOAuthCode } from "../lib/oauth";

WebBrowser.maybeCompleteAuthSession();

export default function OAuthCallbackScreen() {
  const { completeOAuth } = useAuth();
  const [error, setError] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [totpCode, setTotpCode] = useState("");
  const [code, setCode] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    // Deep link handled by expo-router params — also support manual mount
  }, []);

  const exchange = async (oauthCode: string, totp?: string) => {
    setLoading(true);
    setError("");
    try {
      await completeOAuth(oauthCode, totp);
      router.replace("/play");
    } catch (err) {
      if (err instanceof LoginError && err.code === "TOTP_REQUIRED") {
        setCode(oauthCode);
        setNeedsTotp(true);
        return;
      }
      setError("Échec de la connexion OAuth.");
    } finally {
      setLoading(false);
    }
  };

  // Route params from deep link: africhess://auth/callback?code=...
  useEffect(() => {
    const sub = require("expo-linking").addEventListener("url", ({ url }: { url: string }) => {
      const c = parseOAuthCode(url);
      if (c) void exchange(c);
    });
    return () => sub.remove();
  }, []);

  useEffect(() => {
    const { getInitialURL } = require("expo-linking");
    void getInitialURL().then((url: string | null) => {
      if (!url) return;
      const c = parseOAuthCode(url);
      if (c && !needsTotp) void exchange(c);
    });
  }, [needsTotp]);

  if (needsTotp && code) {
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Code 2FA</Text>
        <TextInput
          style={styles.input}
          placeholder="6 chiffres"
          keyboardType="number-pad"
          maxLength={6}
          value={totpCode}
          onChangeText={(v) => setTotpCode(v.replace(/\D/g, "").slice(0, 6))}
        />
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Pressable
          style={styles.btn}
          disabled={loading || totpCode.length < 6}
          onPress={() => void exchange(code, totpCode)}
        >
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.btnText}>Valider</Text>}
        </Pressable>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : <ActivityIndicator color="#D4A017" />}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    padding: 24,
    backgroundColor: "#0D1117",
  },
  title: { fontSize: 22, fontWeight: "700", color: "#D4A017", marginBottom: 16 },
  input: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    color: "#fff",
    backgroundColor: "#161B22",
    width: "100%",
  },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    width: "100%",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  error: { color: "#E07A5F", textAlign: "center" },
});
