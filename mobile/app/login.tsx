import { useState } from "react";
import { Link, router } from "expo-router";
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { LoginError, useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";

export default function LoginScreen() {
  const { login, loginWithOAuth } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [totpCode, setTotpCode] = useState("");
  const [needsTotp, setNeedsTotp] = useState(false);
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onOAuth = async (provider: "google" | "github") => {
    setError("");
    setLoading(true);
    try {
      await loginWithOAuth(provider);
      router.replace("/play");
    } catch (err) {
      if (err instanceof LoginError && err.code === "TOTP_REQUIRED" && err.oauthCode) {
        router.push({ pathname: "/auth/callback", params: { code: err.oauthCode } });
        return;
      }
      setError(t("login.error.oauth"));
    } finally {
      setLoading(false);
    }
  };

  const onSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password, needsTotp ? totpCode : undefined);
      router.replace("/play");
    } catch (err) {
      if (err instanceof LoginError && err.code === "TOTP_REQUIRED") {
        setNeedsTotp(true);
        setError(t("login.error.totp"));
        return;
      }
      setError(t("login.error.credentials"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>{t("login.title")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("login.username")}
        placeholderTextColor="#666"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder={t("login.password")}
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {needsTotp && (
        <TextInput
          style={styles.input}
          placeholder={t("login.totp")}
          placeholderTextColor="#666"
          keyboardType="number-pad"
          value={totpCode}
          onChangeText={setTotpCode}
        />
      )}
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t("login.submit")}</Text>
        )}
      </Pressable>
      <View style={styles.oauthRow}>
        <Pressable style={[styles.btn, styles.oauthBtn]} onPress={() => onOAuth("google")} disabled={loading}>
          <Text style={styles.btnText}>{t("login.oauthGoogle")}</Text>
        </Pressable>
        <Pressable style={[styles.btn, styles.oauthBtn]} onPress={() => onOAuth("github")} disabled={loading}>
          <Text style={styles.btnText}>{t("login.oauthGithub")}</Text>
        </Pressable>
      </View>
      <Link href="/register" asChild>
        <Pressable style={styles.linkBtn}>
          <Text style={styles.linkText}>{t("login.register")}</Text>
        </Pressable>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    backgroundColor: "#0D1117",
    justifyContent: "center",
    gap: 12,
  },
  title: { fontSize: 28, fontWeight: "800", color: "#D4A017", marginBottom: 8, textAlign: "center" },
  input: {
    backgroundColor: "#161B22",
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 14,
    color: "#fff",
    fontSize: 16,
  },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  oauthRow: { flexDirection: "row", gap: 10 },
  oauthBtn: { flex: 1, backgroundColor: "#21262d" },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  linkBtn: { padding: 12, alignItems: "center" },
  linkText: { color: "#D4A017", fontSize: 14 },
  error: { color: "#E07A5F", textAlign: "center", fontSize: 14 },
});
