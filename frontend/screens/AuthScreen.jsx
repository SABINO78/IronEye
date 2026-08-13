import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet } from "react-native";
import { Eye, Mail, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import { API_URL } from "../config";

WebBrowser.maybeCompleteAuthSession();

const GOOGLE_CLIENT_ID = "609585601175-nue1jb7oui1thg0iqdtq74k7anej2p80.apps.googleusercontent.com";
const REDIRECT_URI = "https://auth.expo.io/@sabnu_78/frontend";

export default function AuthScreen({ navigation, onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);

  async function submeter() {
    setErro(null);
    const endpoint = modo === "login" ? "/login" : "/register";

    try {
      const resposta = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro);
        return;
      }

      if (modo === "login") {
        await AsyncStorage.setItem("token", dados.token);
        onLogin();
      } else {
        setModo("login");
      }
    } catch (erro) {
      setErro("Sem ligação ao servidor");
    }
  }

  async function loginComGoogleManual() {
    setErro(null);
    try {
      const authUrl =
        `https://accounts.google.com/o/oauth2/v2/auth?` +
        `client_id=${GOOGLE_CLIENT_ID}` +
        `&redirect_uri=${encodeURIComponent(REDIRECT_URI)}` +
        `&response_type=code` +
        `&scope=${encodeURIComponent("openid email profile")}`;

      const resultado = await WebBrowser.openAuthSessionAsync(authUrl, REDIRECT_URI);

      if (resultado.type === "success") {
        const url = resultado.url;
        const match = url.match(/[?&]code=([^&]*)/);
        if (match) {
          const code = match[1];
          await loginComGoogle(code);
        } else {
          setErro("Não foi possível obter o código da Google");
        }
      }
    } catch (e) {
      setErro("Erro ao iniciar sessão com a Google");
    }
  }

  async function loginComGoogle(code) {
    try {
      const resposta = await fetch(`${API_URL}/login-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ code: code, redirect_uri: REDIRECT_URI }),
      });
      const dados = await resposta.json();
      console.log("STATUS:", resposta.status, "DADOS:", dados)

      if (!resposta.ok) {
        setErro(dados.erro);
        return;
      }

      await AsyncStorage.setItem("token", dados.token);
      onLogin();
    } catch (e) {
      setErro("Sem ligação ao servidor");
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

      <TouchableOpacity style={styles.botaoPrincipal} onPress={submeter}>
        <Text style={styles.botaoTexto}>
          {modo === "login" ? "Sign in" : "Create account"}
        </Text>
      </TouchableOpacity>

      <TouchableOpacity
        style={styles.botaoGoogle}
        onPress={loginComGoogleManual}
      >
        <Text style={styles.botaoGoogleTexto}>Continue with Google</Text>
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