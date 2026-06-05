import { Text, View, StyleSheet } from "react-native";

export default function PlayScreen() {
  return (
    <View style={styles.box}>
      <Text style={styles.title}>Jouer</Text>
      <Text style={styles.text}>
        Écran de jeu natif à venir. Utilisez la PWA ou le site web pour l'instant, ou branchez
        react-native-chessboard ici.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  box: { flex: 1, padding: 24, justifyContent: "center" },
  title: { fontSize: 24, fontWeight: "700", color: "#D4A017", marginBottom: 12 },
  text: { color: "#ccc", lineHeight: 22 },
});
