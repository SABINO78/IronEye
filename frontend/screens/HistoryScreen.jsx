import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  FlatList,
  StyleSheet,
  ActivityIndicator,
  TouchableOpacity,
} from "react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function HistoryScreen({ navigation }) {
  const [scans, setScans] = useState(null);

  useEffect(() => {
    carregarHistorico();
  }, []);

  async function carregarHistorico() {
    try {
      const token = await AsyncStorage.getItem("token");

      const resposta = await fetch(`${API_URL}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const dados = await resposta.json();

      if (resposta.ok) {
        setScans(dados);
      } else {
        setScans([]);
      }
    } catch (erro) {
      console.log(erro);
      setScans([]);
    }
  }

  if (scans === null) {
    return (
      <View style={styles.loading}>
        <ActivityIndicator size="large" color="#FF8C00" />
      </View>
    );
  }

  return (
    <View style={styles.container}>

      {/* Botão de voltar */}
      <TouchableOpacity
        style={styles.botaoVoltar}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.voltarTexto}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.titulo}>History</Text>

      <FlatList
        data={scans}
        keyExtractor={(item) => item.id.toString()}
        renderItem={({ item, index }) => (
          <TouchableOpacity
            style={styles.card}
            onPress={() =>
              navigation.navigate("ScanDetails", {
                scan: item,
              })
            }
          >
            <View style={styles.numero}>
              <Text style={styles.numeroTexto}>
                {index + 1}
              </Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.nome}>
                {item.machine_name}
              </Text>

              <Text style={styles.musculo}>
                {item.primary_muscle}
                {item.secondary_muscles.length > 0
                  ? ` • ${item.secondary_muscles.join(" • ")}`
                  : ""}
              </Text>
            </View>

            <View style={styles.direita}>
              <Text style={styles.hora}>
                {new Date(item.scanned_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.vazio}>
            You haven't made any scans yet.
          </Text>
        }
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    paddingTop: 60,
    paddingHorizontal: 20,
  },

  loading: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    justifyContent: "center",
    alignItems: "center",
  },

  titulo: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  botaoVoltar: {
    paddingVertical: 10,
    marginBottom: 10,
  },

  voltarTexto: {
    color: "#FF8C00",
    fontSize: 16,
    fontWeight: "600",
  },

  card: {
    backgroundColor: "#151522",
    borderRadius: 18,
    padding: 15,
    marginBottom: 15,
    flexDirection: "row",
    alignItems: "center",
  },

  numero: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#FF8C00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  numeroTexto: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },

  info: {
    flex: 1,
  },

  nome: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },

  musculo: {
    color: "#999",
    marginTop: 4,
  },

  direita: {
    alignItems: "flex-end",
  },

  hora: {
    color: "#FFF",
    fontWeight: "bold",
  },

  vazio: {
    color: "#888",
    textAlign: "center",
    marginTop: 50,
  },
});