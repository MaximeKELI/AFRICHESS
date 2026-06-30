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
import { usersApi } from "../lib/api";
import { setTokens } from "../lib/storage";
import { useAuth } from "../context/AuthContext";
import { useTranslation } from "../context/LocaleContext";

export default function RegisterScreen() {
  const { refreshProfile } = useAuth();
  const { t } = useTranslation();
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError("");
    if (password !== confirm) {
      setError(t("register.error"));
      return;
    }
    setLoading(true);
    try {
      const { data } = await usersApi.register({
        username: username.trim(),
        email: email.trim(),
        password,
        password_confirm: confirm,
        country: "SN",
      });
      await setTokens(data.access, data.refresh);
      await refreshProfile();
      router.replace("/play");
    } catch {
      setError(t("register.error"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>{t("register.title")}</Text>
      <TextInput
        style={styles.input}
        placeholder={t("register.username")}
        placeholderTextColor="#666"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder={t("register.email")}
        placeholderTextColor="#666"
        autoCapitalize="none"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
      />
      <TextInput
        style={styles.input}
        placeholder={t("register.password")}
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      <TextInput
        style={styles.input}
        placeholder={t("register.confirm")}
        placeholderTextColor="#666"
        secureTextEntry
        value={confirm}
        onChangeText={setConfirm}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={() => void onSubmit()} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>{t("register.submit")}</Text>
        )}
      </Pressable>
      <Link href="/login" style={styles.link}>
        <Text style={styles.linkText}>{t("register.login")}</Text>
      </Link>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 24,
    justifyContent: "center",
    backgroundColor: "#0D1117",
  },
  title: {
    fontSize: 28,
    fontWeight: "700",
    color: "#D4A017",
    marginBottom: 24,
    textAlign: "center",
  },
  input: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 14,
    marginBottom: 12,
    color: "#fff",
    backgroundColor: "#161B22",
  },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 16,
    borderRadius: 12,
    alignItems: "center",
    marginTop: 8,
  },
  btnText: { color: "#fff", fontWeight: "700", fontSize: 16 },
  error: { color: "#E07A5F", marginBottom: 8, textAlign: "center" },
  link: { marginTop: 20, alignSelf: "center" },
  linkText: { color: "#D4A017" },
});
