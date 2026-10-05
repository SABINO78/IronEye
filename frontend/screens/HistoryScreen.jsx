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
    loadHistory();
  }, []);

  async function loadHistory() {
    try {
      const token = await AsyncStorage.getItem("token");

      const response = await fetch(`${API_URL}/history`, {
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });

      const data = await response.json();

      if (response.ok) {
        setScans(data);
      } else {
        setScans([]);
      }
    } catch (err) {
      console.log(err);
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
      <TouchableOpacity
        style={styles.backButton}
        onPress={() => navigation.goBack()}
      >
        <Text style={styles.backButtonText}>← Back</Text>
      </TouchableOpacity>

      <Text style={styles.title}>History</Text>

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
            <View style={styles.badgeNumber}>
              <Text style={styles.badgeNumberText}>
                {index + 1}
              </Text>
            </View>

            <View style={styles.info}>
              <Text style={styles.name}>
                {item.machine_name}
              </Text>

              <Text style={styles.muscle}>
                {item.primary_muscle}
                {item.secondary_muscles.length > 0
                  ? ` • ${item.secondary_muscles.join(" • ")}`
                  : ""}
              </Text>
            </View>

            <View style={styles.rightSide}>
              <Text style={styles.timeText}>
                {new Date(item.scanned_at).toLocaleTimeString([], {
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </Text>
            </View>
          </TouchableOpacity>
        )}
        ListEmptyComponent={
          <Text style={styles.emptyText}>
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

  title: {
    color: "#FFF",
    fontSize: 28,
    fontWeight: "bold",
    marginBottom: 20,
  },

  backButton: {
    paddingVertical: 10,
    marginBottom: 10,
  },

  backButtonText: {
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

  badgeNumber: {
    width: 45,
    height: 45,
    borderRadius: 22,
    backgroundColor: "#FF8C00",
    justifyContent: "center",
    alignItems: "center",
    marginRight: 15,
  },

  badgeNumberText: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 18,
  },

  info: {
    flex: 1,
  },

  name: {
    color: "#FFF",
    fontWeight: "bold",
    fontSize: 17,
  },

  muscle: {
    color: "#999",
    marginTop: 4,
  },

  rightSide: {
    alignItems: "flex-end",
  },

  timeText: {
    color: "#FFF",
    fontWeight: "bold",
  },

  emptyText: {
    color: "#888",
    textAlign: "center",
    marginTop: 50,
  },
});