import { useCallback, useEffect, useState } from "react";
import { router } from "expo-router";
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { type FriendRow, socialApi } from "../lib/api";

export default function FriendsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<FriendRow[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");

  const load = useCallback(() => {
    setLoading(true);
    Promise.all([socialApi.friends(), socialApi.pending()])
      .then(([f, p]) => {
        setFriends(Array.isArray(f.data) ? f.data : []);
        setPending(Array.isArray(p.data) ? p.data : []);
      })
      .catch(() => setStatus("Impossible de charger les amis"))
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (!authLoading && !user) router.replace("/login");
  }, [authLoading, user]);

  useEffect(() => {
    if (user) load();
  }, [user, load]);

  const sendRequest = async () => {
    if (!username.trim()) return;
    setStatus("");
    try {
      await socialApi.request(username.trim());
      setUsername("");
      setStatus("Demande envoyée");
      load();
    } catch {
      setStatus("Utilisateur introuvable ou demande déjà envoyée");
    }
  };

  const accept = async (id: number) => {
    try {
      await socialApi.accept(id);
      load();
    } catch {
      setStatus("Acceptation impossible");
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
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Nom d'utilisateur"
        placeholderTextColor="#666"
        value={username}
        onChangeText={setUsername}
        autoCapitalize="none"
      />
      <Pressable style={styles.btn} onPress={sendRequest}>
        <Text style={styles.btnText}>Ajouter un ami</Text>
      </Pressable>
      {status ? <Text style={styles.status}>{status}</Text> : null}

      {loading ? (
        <ActivityIndicator color="#D4A017" style={{ marginTop: 24 }} />
      ) : (
        <>
          {pending.length > 0 && (
            <>
              <Text style={styles.section}>Demandes en attente</Text>
              <FlatList
                data={pending}
                keyExtractor={(item) => String(item.id)}
                renderItem={({ item }) => (
                  <View style={styles.card}>
                    <Text style={styles.name}>
                      {item.user?.display_name || item.user?.username}
                    </Text>
                    <Pressable style={styles.accept} onPress={() => accept(item.id)}>
                      <Text style={styles.acceptText}>Accepter</Text>
                    </Pressable>
                  </View>
                )}
              />
            </>
          )}
          <Text style={styles.section}>Mes amis ({friends.length})</Text>
          <FlatList
            data={friends}
            keyExtractor={(item) => String(item.id)}
            ListEmptyComponent={<Text style={styles.empty}>Aucun ami pour l'instant</Text>}
            renderItem={({ item }) => {
              const other =
                item.user?.id === user.id ? item.friend : item.user;
              return (
                <View style={styles.card}>
                  <Text style={styles.name}>
                    {other?.display_name || other?.username}
                  </Text>
                </View>
              );
            }}
          />
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  center: { flex: 1, justifyContent: "center", alignItems: "center", backgroundColor: "#0D1117" },
  container: { flex: 1, padding: 16, backgroundColor: "#0D1117" },
  input: {
    borderWidth: 1,
    borderColor: "#30363d",
    borderRadius: 10,
    padding: 12,
    color: "#fff",
    backgroundColor: "#161B22",
    marginBottom: 8,
  },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  btnText: { color: "#fff", fontWeight: "700" },
  status: { color: "#aaa", textAlign: "center", marginVertical: 8, fontSize: 13 },
  section: { color: "#D4A017", fontWeight: "700", marginTop: 20, marginBottom: 8 },
  card: {
    backgroundColor: "#161B22",
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
    borderWidth: 1,
    borderColor: "#30363d",
    flexDirection: "row",
    justifyContent: "space-between",
    alignItems: "center",
  },
  name: { color: "#fff", fontWeight: "600" },
  accept: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1B7A3D", borderRadius: 6 },
  acceptText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 20 },
});
