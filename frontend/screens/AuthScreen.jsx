import React, { useState } from "react";
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator } from "react-native";
import { Eye, Mail, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as AuthSession from "expo-auth-session";
import * as Google from "expo-auth-session/providers/google";
import { API_URL } from "../config";

WebBrowser.maybeCompleteAuthSession();

const ANDROID_CLIENT_ID = "609585601175-3tsa339u8l178c2ne1n50f9i5ul8me5g.apps.googleusercontent.com";
const WEB_CLIENT_ID = "609585601175-nue1jb7oui1thg0iqdtq74k7anej2p80.apps.googleusercontent.com";

export default function AuthScreen({ navigation, onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [carregandoGoogle, setCarregandoGoogle] = useState(false);

  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId: ANDROID_CLIENT_ID,
    webClientId: WEB_CLIENT_ID,
    responseType: AuthSession.ResponseType.Code,
    scopes: ["openid", "profile", "email"],
  });

  React.useEffect(() => {
    if (request?.redirectUri) {
      console.log("[GOOGLE AUTH LOG] Google Provider redirectUri:", request.redirectUri);
    }
  }, [request]);

  React.useEffect(() => {
    if (response?.type === "success") {
      const { code } = response.params;
      const codeVerifier = request?.codeVerifier;
      const usedRedirectUri = request?.redirectUri;
      console.log("[GOOGLE AUTH LOG] Auth success. code:", !!code, "usedRedirectUri:", usedRedirectUri, "codeVerifier:", !!codeVerifier);
      loginComGoogle(code, usedRedirectUri, codeVerifier);
    } else if (response?.type === "error") {
      console.error("[GOOGLE AUTH LOG] OAuth error response:", response.error);
      setCarregandoGoogle(false);
      setErro("Error signing in with Google: " + (response.error?.message || "Unknown error"));
    } else if (response?.type === "dismiss" || response?.type === "cancel") {
      console.log("[GOOGLE AUTH LOG] User cancelled or dismissed Google Sign-In.");
      setCarregandoGoogle(false);
    }
  }, [response]);

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

      // Se o backend devolveu o token (seja login ou registo), entra logo na app
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

  async function loginComGoogleManual() {
    if (carregandoGoogle) return;
    setErro(null);
    setCarregandoGoogle(true);
    try {
      console.log("[GOOGLE AUTH LOG] Triggering promptAsync() for Google auth...");
      await promptAsync();
    } catch (e) {
      console.error("[GOOGLE AUTH LOG] Exception in promptAsync():", e);
      setErro("Error signing in with Google.");
      setCarregandoGoogle(false);
    }
  }

  async function loginComGoogle(code, usedRedirectUri, codeVerifier) {
    try {
      console.log("[GOOGLE AUTH LOG] Sending request to Flask backend:", `${API_URL}/login-google`);
      const resposta = await fetch(`${API_URL}/login-google`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          code: code,
          redirect_uri: usedRedirectUri,
          code_verifier: codeVerifier
        }),
      });
      const dados = await resposta.json();
      console.log("[GOOGLE AUTH LOG] Backend response status:", resposta.status, "data:", dados);

      if (!resposta.ok) {
        setErro(dados.erro || "Google authentication rejected by server.");
        return;
      }

      await AsyncStorage.setItem("token", dados.token);
      onLogin();
    } catch (e) {
      console.error("[GOOGLE AUTH LOG] Exception during backend login validation:", e);
      setErro("No connection to server when validating with Google.");
    } finally {
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
        onPress={loginComGoogleManual}
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