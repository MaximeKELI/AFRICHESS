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
import { type FriendRow, friendPeer, socialApi } from "../lib/api";

export default function FriendsScreen() {
  const { user, loading: authLoading } = useAuth();
  const [friends, setFriends] = useState<FriendRow[]>([]);
  const [pending, setPending] = useState<FriendRow[]>([]);
  const [username, setUsername] = useState("");
  const [loading, setLoading] = useState(true);
  const [status, setStatus] = useState("");
  const [dmUser, setDmUser] = useState<string | null>(null);
  const [dmMessages, setDmMessages] = useState<{ id: number; content: string; sender: { username: string } }[]>([]);
  const [dmText, setDmText] = useState("");

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

  useEffect(() => {
    if (!dmUser) return;
    socialApi
      .directMessages(dmUser)
      .then(({ data }) => setDmMessages(Array.isArray(data) ? data : []))
      .catch(() => setDmMessages([]));
  }, [dmUser]);

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

  const challenge = async (name: string) => {
    try {
      const { data } = await socialApi.challengeFriend(name, "blitz");
      if (data.id) router.push(`/play?game=${data.id}`);
      else setStatus("Défi envoyé");
    } catch {
      setStatus("Défi impossible");
    }
  };

  const sendDm = async () => {
    if (!dmUser || !dmText.trim()) return;
    try {
      await socialApi.sendDirectMessage(dmUser, dmText.trim());
      setDmText("");
      const { data } = await socialApi.directMessages(dmUser);
      setDmMessages(data.messages ?? []);
    } catch {
      setStatus("Message impossible");
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

      {dmUser && (
        <View style={styles.dmBox}>
          <Text style={styles.section}>DM — {dmUser}</Text>
          <FlatList
            data={dmMessages}
            keyExtractor={(m) => String(m.id)}
            style={{ maxHeight: 160 }}
            renderItem={({ item }) => (
              <Text style={styles.dmLine}>
                <Text style={styles.dmAuthor}>{item.sender.username}: </Text>
                {item.content}
              </Text>
            )}
          />
          <View style={styles.dmRow}>
            <TextInput
              style={[styles.input, styles.flex]}
              placeholder="Message…"
              placeholderTextColor="#666"
              value={dmText}
              onChangeText={setDmText}
            />
            <Pressable style={styles.smallBtn} onPress={() => void sendDm()}>
              <Text style={styles.btnText}>→</Text>
            </Pressable>
          </View>
          <Pressable onPress={() => setDmUser(null)}>
            <Text style={styles.link}>Fermer</Text>
          </Pressable>
        </View>
      )}

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
                      {item.from_user?.display_name || item.from_user?.username}
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
              const other = friendPeer(item, user.id);
              const name = other.username;
              return (
                <View style={styles.card}>
                  <Text style={styles.name}>{other.display_name || name}</Text>
                  <View style={styles.actions}>
                    <Pressable style={styles.actionBtn} onPress={() => void challenge(name)}>
                      <Text style={styles.actionText}>Défi</Text>
                    </Pressable>
                    <Pressable style={styles.actionBtn} onPress={() => setDmUser(name)}>
                      <Text style={styles.actionText}>DM</Text>
                    </Pressable>
                  </View>
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
  flex: { flex: 1 },
  btn: {
    backgroundColor: "#1B7A3D",
    padding: 12,
    borderRadius: 10,
    alignItems: "center",
  },
  smallBtn: {
    backgroundColor: "#1B7A3D",
    paddingHorizontal: 14,
    paddingVertical: 12,
    borderRadius: 10,
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
  name: { color: "#fff", fontWeight: "600", flex: 1 },
  actions: { flexDirection: "row", gap: 6 },
  actionBtn: { paddingHorizontal: 8, paddingVertical: 4, borderWidth: 1, borderColor: "#D4A017", borderRadius: 6 },
  actionText: { color: "#D4A017", fontSize: 12, fontWeight: "600" },
  accept: { paddingHorizontal: 10, paddingVertical: 6, backgroundColor: "#1B7A3D", borderRadius: 6 },
  acceptText: { color: "#fff", fontSize: 12, fontWeight: "600" },
  empty: { color: "#666", textAlign: "center", marginTop: 20 },
  dmBox: {
    marginTop: 12,
    padding: 12,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: "#30363d",
    backgroundColor: "#161B22",
    gap: 8,
  },
  dmRow: { flexDirection: "row", gap: 8, alignItems: "center" },
  dmLine: { color: "#ccc", fontSize: 13, marginBottom: 4 },
  dmAuthor: { color: "#D4A017", fontWeight: "600" },
  link: { color: "#888", fontSize: 12, textAlign: "center" },
});
