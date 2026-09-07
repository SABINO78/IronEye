import React, { useState, useEffect } from "react";
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  ActivityIndicator,
  Alert,
} from "react-native";
import { Eye, Mail, Lock } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import * as WebBrowser from "expo-web-browser";
import * as Google from "expo-auth-session/providers/google";
import { makeRedirectUri } from "expo-auth-session";
import { API_URL } from "../config";

WebBrowser.maybeCompleteAuthSession();

export default function AuthScreen({ navigation, onLogin }) {
  const [modo, setModo] = useState("login");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [erro, setErro] = useState(null);
  const [carregando, setCarregando] = useState(false);

  // Configuração padrão do Google Auth baseada nos vídeos do YouTube
  const [request, response, promptAsync] = Google.useAuthRequest({
    androidClientId:
      "609585601175-nue1jb7oui1thg0iqdtq74k7anej2p80.apps.googleusercontent.com",
    webClientId:
      "609585601175-nue1jb7oui1thg0iqdtq74k7anej2p80.apps.googleusercontent.com",
    redirectUri: makeRedirectUri({ scheme: "ironeye" }),
  });

  // Ouve a resposta da autenticação da Google
  useEffect(() => {
    if (response?.type === "success") {
      const { accessToken } = response.authentication;
      obterInfoUtilizadorGoogle(accessToken);
    }
  }, [response]);

  // Função para procurar informações do utilizador na API da Google
  async function obterInfoUtilizadorGoogle(token) {
    if (!token) return;
    setCarregando(true);
    setErro(null);

    try {
      const respostaGoogle = await fetch(
        "https://www.googleapis.com/userinfo/v2/me",
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );

      const dadosGoogle = await respostaGoogle.json();

      if (dadosGoogle?.email) {
        // Envia o token ou email para o teu backend no Render
        const respostaBackend = await fetch(`${API_URL}/login-google-direct`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: dadosGoogle.email,
            googleId: dadosGoogle.id,
            name: dadosGoogle.name,
          }),
        });

        const dadosBackend = await respostaBackend.json();

        if (respostaBackend.ok && dadosBackend.token) {
          await AsyncStorage.setItem("token", dadosBackend.token);
          if (typeof onLogin === "function") {
            onLogin();
          }
        } else {
          // Fallback caso guardes os dados do utilizador diretamente no AsyncStorage
          await AsyncStorage.setItem("@user", JSON.stringify(dadosGoogle));
          if (typeof onLogin === "function") {
            onLogin();
          }
        }
      } else {
        throw new Error("Could not retrieve email from Google.");
      }
    } catch (e) {
      console.error("Erro ao obter perfil da Google:", e);
      Alert.alert(
        "Error",
        "Could not fetch your Google profile. Please try again."
      );
    } finally {
      setCarregando(false);
    }
  }

  // Submissão do formulário tradicional (Login / Registo)
  async function submeter() {
    if (carregando) return;
    setErro(null);
    const endpoint = modo === "login" ? "/login" : "/register";

    if (!email.trim() || !password.trim()) {
      setErro("Please fill in both email and password.");
      return;
    }

    try {
      setCarregando(true);

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 15000);

      const resposta = await fetch(`${API_URL}${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: email.trim(), password }),
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const dados = await resposta.json();

      if (!resposta.ok) {
        setErro(dados.erro || "An error occurred during sign in.");
        return;
      }

      if (dados.token) {
        await AsyncStorage.setItem("token", dados.token);
        if (typeof onLogin === "function") {
          onLogin();
        }
      }
    } catch (erro) {
      if (erro.name === "AbortError") {
        setErro("Server is waking up. Please try again in a moment.");
      } else {
        console.error("Erro na autenticação:", erro);
        setErro("Network error. Unable to connect to server.");
      }
    } finally {
      setCarregando(false);
    }
  }

  return (
    <View style={styles.container}>
      <View style={styles.iconCircle}>
        <Eye color="#000" size={32} />
      </View>

      <Text style={styles.titulo}>Welcome back</Text>
      <Text style={styles.subtitulo}>Sign in to continue training</Text>

      {/* Tabs para alternar entre Sign in e Register */}
      <View style={styles.toggleContainer}>
        <TouchableOpacity
          style={[styles.toggleBotao, modo === "login" && styles.toggleAtivo]}
          onPress={() => setModo("login")}
        >
          <Text
            style={
              modo === "login" ? styles.toggleTextoAtivo : styles.toggleTexto
            }
          >
            Sign in
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={[
            styles.toggleBotao,
            modo === "register" && styles.toggleAtivo,
          ]}
          onPress={() => setModo("register")}
        >
          <Text
            style={
              modo === "register" ? styles.toggleTextoAtivo : styles.toggleTexto
            }
          >
            Register
          </Text>
        </TouchableOpacity>
      </View>

      {/* Inputs do Formulário */}
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

      {/* Botão Principal */}
      <TouchableOpacity
        style={styles.botaoPrincipal}
        onPress={submeter}
        disabled={carregando}
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

      {/* Botão do Google */}
      <TouchableOpacity
        style={styles.botaoGoogle}
        disabled={!request || carregando}
        onPress={() => promptAsync()}
        activeOpacity={0.85}
      >
        {carregando ? (
          <ActivityIndicator color="#FFF" />
        ) : (
          <Text style={styles.botaoGoogleTexto}>Continue with Google</Text>
        )}
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0A",
    padding: 24,
    alignItems: "center",
    paddingTop: 80,
  },
  iconCircle: {
    width: 70,
    height: 70,
    borderRadius: 20,
    backgroundColor: "#FF7A1A",
    justifyContent: "center",
    alignItems: "center",
    marginBottom: 20,
    shadowColor: "#FF7A1A",
    shadowOpacity: 0.6,
    shadowRadius: 20,
    elevation: 10,
  },
  titulo: { color: "#FFF", fontSize: 26, fontWeight: "bold", marginBottom: 5 },
  subtitulo: { color: "#999", fontSize: 14, marginBottom: 30 },
  toggleContainer: {
    flexDirection: "row",
    backgroundColor: "#1A1A2E",
    borderRadius: 30,
    padding: 4,
    width: "100%",
    marginBottom: 20,
  },
  toggleBotao: { flex: 1, padding: 12, borderRadius: 26, alignItems: "center" },
  toggleAtivo: { backgroundColor: "#FF7A1A" },
  toggleTexto: { color: "#999", fontWeight: "600" },
  toggleTextoAtivo: { color: "#000", fontWeight: "bold" },
  inputContainer: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1A1A2E",
    borderRadius: 15,
    padding: 15,
    width: "100%",
    marginBottom: 15,
    gap: 10,
  },
  input: { flex: 1, color: "#FFF" },
  botaoPrincipal: {
    backgroundColor: "#FF7A1A",
    padding: 16,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
    marginTop: 10,
  },
  botaoTexto: { color: "#000", fontWeight: "bold", fontSize: 16 },
  botaoGoogle: {
    backgroundColor: "#1A1A2E",
    padding: 16,
    borderRadius: 15,
    width: "100%",
    alignItems: "center",
    marginTop: 12,
  },
  botaoGoogleTexto: { color: "#FFF", fontWeight: "600", fontSize: 15 },
  erro: { color: "#FF4444", marginBottom: 10, textAlign: "center" },
});