import React, { useState } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
} from "react-native";
import { Eye, Mail, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function AuthScreen({ navigation, onLogin }) {
  const [mode, setMode] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);

  async function handleSubmit() {
    if (loading) return;
    setError(null);
    const endpoint = mode === "login" ? "/login" : "/register";

    if (!email.trim() || !password.trim()) {
      setError("Please fill in both email and password.");
      return;
    }

    try {
      setLoading(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const response = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const data = await response.json();

      if (!response.ok) {
        setError(data.erro || "An error occurred during sign in.");
        return;
      }

      if (data.token) {
        await AsyncStorage.setItem("token", data.token);
        if (typeof onLogin === "function") onLogin();
      }
    } catch (err) {
      setError("Network error. Unable to connect to server.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Eye color="#000" size={32} />
      </View>

      <Text style={styles.title}>Welcome back</Text>
      <Text style={styles.subtitle}>Sign in to continue training</Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleButton, mode === "login" && styles.toggleActive]}
          onPress={() => setMode("login")}
        >
          <Text style={mode === "login" ? styles.toggleTextActive : styles.toggleText}>
            Sign in
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleButton, mode === "register" && styles.toggleActive]}
          onPress={() => setMode("register")}
        >
          <Text style={mode === "register" ? styles.toggleTextActive : styles.toggleText}>
            Register
          </Text>
        </TouchableOpacity>
      </View>

      <View style={styles.inputContainer}>
        <Mail color="#666" size={20} />
        <TextInput
          style={styles.input}
          placeholder="you@gmail.com"
          placeholderTextColor="#666"
          value={email}
          onChangeText={setEmail}
          autoCapitalize="none"
        />
      </View>

      <View style={styles.inputContainer}>
        <Lock color="#666" size={20} />
        <TextInput
          style={styles.input}
          placeholder="Password"
          placeholderTextColor="#666"
          value={password}
          onChangeText={setPassword}
          secureTextEntry
        />
      </View>

      {error && <Text style={styles.errorText}>{error}</Text>}

      <TouchableOpacity
        style={styles.mainButton}
        onPress={handleSubmit}
        disabled={loading}
      >
        {loading ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.buttonText}>
            {mode === "login" ? "Sign in" : "Create account"}
          </Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", padding: 24, alignItems: "center", paddingTop: 80 },
  iconCircle: { width: 70, height: 70, borderRadius: 20, backgroundColor: "#FF7A1A", justifyContent: "center", alignItems: "center", marginBottom: 20 },
  title: { color: "#FFF", fontSize: 26, fontWeight: "bold", marginBottom: 5 },
  subtitle: { color: "#999", fontSize: 14, marginBottom: 30 },
  toggleContainer: { flexDirection: "row", backgroundColor: "#1A1A2E", borderRadius: 30, padding: 4, width: "100%", marginBottom: 20 },
  toggleButton: { flex: 1, padding: 12, borderRadius: 26, alignItems: "center" },
  toggleActive: { backgroundColor: "#FF7A1A" },
  toggleText: { color: "#999", fontWeight: "600" },
  toggleTextActive: { color: "#000", fontWeight: "bold" },
  inputContainer: { flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A2E", borderRadius: 15, padding: 15, width: "100%", marginBottom: 15, gap: 10 },
  input: { flex: 1, color: "#FFF" },
  mainButton: { backgroundColor: "#FF7A1A", padding: 16, borderRadius: 15, width: "100%", alignItems: "center", marginTop: 10 },
  buttonText: { color: "#000", fontWeight: "bold", fontSize: 16 },
  errorText: { color: "#FF4444", marginBottom: 10, textAlign: "center" }
});