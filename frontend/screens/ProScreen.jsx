import { View, Text, TouchableOpacity, StyleSheet, Alert } from "react-native";
import { Crown, Infinity, Clock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function ProScreen({ navigation }) {
  async function subscrever() {
    try {
      const token = await AsyncStorage.getItem("token");

      const resposta = await fetch(`${API_URL}/pro`, {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        Alert.alert("Erro", dados.erro);
        return;
      }

      Alert.alert("IronEye Pro", dados.mensagem);
    } catch (erro) {
      Alert.alert("Erro", "Não foi possível ligar ao servidor.");
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Crown color="#000" size={40} />
      </View>

      <Text style={styles.titulo}>
        Unlock <Text style={styles.destaque}>more scans</Text>
      </Text>
      <Text style={styles.subtitulo}>
        You've used all 4 free scans. Go Pro to scan up to 15 machines a day.
      </Text>

      <View style={styles.beneficios}>
        <View style={styles.linha}>
          <View style={styles.iconeBeneficio}>
            <Infinity color="#FF7A1A" size={18} />
          </View>
          <View>
            <Text style={styles.linhaTitulo}>15 scans per day</Text>
            <Text style={styles.linhaTexto}>5x more than the free plan</Text>
          </View>
        </View>
        <View style={styles.linha}>
          <View style={styles.iconeBeneficio}>
            <Clock color="#FF7A1A" size={18} />
          </View>
          <View>
            <Text style={styles.linhaTitulo}>Full workout history</Text>
            <Text style={styles.linhaTexto}>Track every session and machine</Text>
          </View>
        </View>
      </View>

      <View style={styles.precoCard}>
        <View style={styles.precoTopo}>
          <Text style={styles.precoLabel}>MONTHLY</Text>
        </View>
        <View style={styles.precoLinha}>
          <Text style={styles.preco}>€4.99</Text>
          <Text style={styles.precoPeriodo}>/month</Text>
        </View>
        <Text style={styles.precoNota}>Cancel anytime. No commitment.</Text>
      </View>

      <TouchableOpacity style={styles.botaoSubscrever} onPress={subscrever}>
        <Text style={styles.botaoTexto}>Go Pro</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={() => navigation.goBack()}>
        <Text style={styles.voltar}>Maybe later</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", padding: 24, alignItems: "center", paddingTop: 60 },
  iconCircle: {
    width: 70, height: 70, borderRadius: 20, backgroundColor: "#FF7A1A",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
    shadowColor: "#FF7A1A", shadowOpacity: 0.6, shadowRadius: 20, elevation: 10
  },
  titulo: { color: "#FFF", fontSize: 24, fontWeight: "bold", textAlign: "center", marginBottom: 8 },
  destaque: { color: "#FF7A1A" },
  subtitulo: { color: "#999", fontSize: 14, textAlign: "center", marginBottom: 30, paddingHorizontal: 10 },
  beneficios: { width: "100%", marginBottom: 25 },
  linha: { flexDirection: "row", alignItems: "flex-start", gap: 12, marginBottom: 18 },
  iconeBeneficio: { width: 36, height: 36, borderRadius: 10, backgroundColor: "#1A1A2E", justifyContent: "center", alignItems: "center" },
  linhaTitulo: { color: "#FFF", fontWeight: "bold", fontSize: 15 },
  linhaTexto: { color: "#999", fontSize: 13 },
  precoCard: { width: "100%", backgroundColor: "#1A1A2E", borderRadius: 15, padding: 18, borderWidth: 1, borderColor: "#FF7A1A", marginBottom: 20 },
  precoTopo: { marginBottom: 8 },
  precoLabel: { color: "#FF7A1A", fontWeight: "bold", fontSize: 12, letterSpacing: 1 },
  precoLinha: { flexDirection: "row", alignItems: "flex-end", marginBottom: 5 },
  preco: { color: "#FFF", fontSize: 32, fontWeight: "bold" },
  precoPeriodo: { color: "#999", fontSize: 14, marginBottom: 6, marginLeft: 4 },
  precoNota: { color: "#999", fontSize: 12 },
  botaoSubscrever: { backgroundColor: "#FF7A1A", padding: 16, borderRadius: 15, width: "100%", alignItems: "center", marginBottom: 15 },
  botaoTexto: { color: "#000", fontWeight: "bold", fontSize: 16 },
  voltar: { color: "#999", fontSize: 14 }
});
