import React, { useState, useEffect } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Eye, Mail, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { supabase } from "../lib/supabase"; // Garante que o caminho para o teu ficheiro supabase.js está correto
import { API_URL } from "../config";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation, onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  // Escuta as alterações de sessão do Supabase
  useEffect(() => {
    const { data: { subscription } } = supabase.auth.onAuthStateChange(async (event, session) => {
      if (event === "SIGNED_IN" && session) {
        console.log("[SUPABASE LOG] Utilizador autenticado com sucesso!");
        await AsyncStorage.setItem("token", session.access_token);
        setCarregandoGoogle(false);
        onLogin();
      }
    });

    return () => subscription.unsubscribe();
  }, []);

  // Login/Registo tradicional com o teu backend Flask
  async function submeter() {
    if (carregando) return;
    setErro(null);
    const endpoint = modo === "login" ? "/login" : "/register";

    if (!email.trim() || !password.trim()) {
      setErro("Please fill in email and password");
      return;
    }

    try {
      setCarregando(true);
      const resposta = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "An error occurred during sign in");
        return;
      }

      if (dados.token) {
        await AsyncStorage.setItem("token", dados.token);
        onLogin();
      }
    } catch (erro) {
      console.error("Erro no login/registo:", erro);
      setErro("No connection to server. Please check if backend is running.");
    } finally {
      setCarregando(false);
    }
  }

  // Novo Login Simplificado com Google via Supabase
  async function loginComGoogle() {
    if (carregandoGoogle) return;
    setErro(null);
    setCarregandoGoogle(true);

    try {
      const { error } = await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: "ironeye://",
        },
      });

      if (error) {
        setErro(error.message);
        setCarregandoGoogle(false);
      }
    } catch (e) {
      console.error("[SUPABASE GOOGLE ERROR]", e);
      setErro("Error signing in with Google.");
      setCarregandoGoogle(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Eye color="#000" size={32} />
      </View>

      <Text style={styles.titulo}>Welcome back</Text>
      <Text style={styles.subtitulo}>Sign in to continue training</Text>

      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBotao, modo === "login" && styles.toggleAtivo]}
          onPress={() => setModo("login")}
        >
          <Text style={modo === "login" ? styles.toggleTextoAtivo : styles.toggleTexto}>
            Sign in
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[styles.toggleBotao, modo === "register" && styles.toggleAtivo]}
          onPress={() => setModo("register")}
        >
          <Text style={modo === "register" ? styles.toggleTextoAtivo : styles.toggleTexto}>
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

      {erro && <Text style={styles.erro}>{erro}</Text>}

      <TouchableOpacity
        style={styles.botaoPrincipal}
        onPress={submeter}
        disabled={carregando || carregandoGoogle}
        activeOpacity={0.85}
      >
        {carregando ? (
          <ActivityIndicator color="#000" />
        ) : (
          <Text style={styles.botaoTexto}>
            {modo === "login" ? "Sign in" : "Create account"}
          </Text>
        )}
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botaoGoogle}
        onPress={loginComGoogle}
        disabled={carregando || carregandoGoogle}
        activeOpacity={0.85}
      >
        {carregandoGoogle ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.botaoGoogleTexto}>Continue with Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: "#0A0A0A", padding: 24, alignItems: "center", paddingTop: 80 },
  iconCircle: {
    width: 70, height: 70, borderRadius: 20, backgroundColor: "#FF7A1A",
    justifyContent: "center", alignItems: "center", marginBottom: 20,
    shadowColor: "#FF7A1A", shadowOpacity: 0.6, shadowRadius: 20, elevation: 10
  },
  titulo: { color: "#FFF", fontSize: 26, fontWeight: "bold", marginBottom: 5 },
  subtitulo: { color: "#999", fontSize: 14, marginBottom: 30 },
  toggleContainer: {
    flexDirection: "row", backgroundColor: "#1A1A2E", borderRadius: 30,
    padding: 4, width: "100%", marginBottom: 20
  },
  toggleBotao: { flex: 1, padding: 12, borderRadius: 26, alignItems: "center" },
  toggleAtivo: { backgroundColor: "#FF7A1A" },
  toggleTexto: { color: "#999", fontWeight: "600" },
  toggleTextoAtivo: { color: "#000", fontWeight: "bold" },
  inputContainer: {
    flexDirection: "row", alignItems: "center", backgroundColor: "#1A1A2E",
    borderRadius: 15, padding: 15, width: "100%", marginBottom: 15, gap: 10
  },
  input: { flex: 1, color: "#FFF" },
  botaoPrincipal: { backgroundColor: "#FF7A1A", padding: 16, borderRadius: 15, width: "100%", alignItems: "center", marginTop: 10 },
  botaoTexto: { color: "#000", fontWeight: "bold", fontSize: 16 },
  botaoGoogle: { backgroundColor: "#1A1A2E", padding: 16, borderRadius: 15, width: "100%", alignItems: "center", marginTop: 12 },
  botaoGoogleTexto: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  erro: { color: "#FF4444", marginBottom: 10, textAlign: "center" }
});