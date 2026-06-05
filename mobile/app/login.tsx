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
import { useAuth } from "../context/AuthContext";

export default function LoginScreen() {
  const { login } = useAuth();
  const [username, setUsername] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const onSubmit = async () => {
    setError("");
    setLoading(true);
    try {
      await login(username.trim(), password);
      router.replace("/play");
    } catch {
      setError("Identifiants incorrects ou serveur indisponible.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === "ios" ? "padding" : undefined}
    >
      <Text style={styles.title}>Connexion</Text>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
        placeholderTextColor="#666"
        autoCapitalize="none"
        value={username}
        onChangeText={setUsername}
      />
      <TextInput
        style={styles.input}
        placeholder="Mot de passe"
        placeholderTextColor="#666"
        secureTextEntry
        value={password}
        onChangeText={setPassword}
      />
      {error ? <Text style={styles.error}>{error}</Text> : null}
      <Pressable style={styles.btn} onPress={onSubmit} disabled={loading}>
        {loading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.btnText}>Se connecter</Text>
        )}
      </Pressable>
      <Link href="/" style={styles.link}>
        <Text style={styles.linkText}>Retour</Text>
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
