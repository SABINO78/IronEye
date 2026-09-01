import {View, Text, StyleSheet, TouchableOpacity} from "react-native"
import { useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "../config"

// Ecrã de Perfil do Utilizador
export default function Profile({ navigation, onLogout }) {
    const [perfil, setPerfil] = useState(null);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        carregarPerfil();
    }, []);

    // Procura os dados da conta no backend
    async function carregarPerfil() {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const resposta = await fetch(`${API_URL}/profile`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            const dados = await resposta.json();
            if (resposta.ok) {
                setPerfil(dados);
            } else {
                setErro("Não foi possível carregar os dados");
            }
        } catch (erro) {
            setErro("Não foi possível carregar o perfil");
        }
    }

    // Termina a sessão do utilizador
    async function fazerLogout() {
        // 1. Apaga o token guardado no telemóvel
        await AsyncStorage.removeItem("token");
        // 2. Avisa o App.js para voltar ao ecrã de Login
        if (onLogout) {
            onLogout();
        }
    }

    return (
        <View style={styles.container}>
            <Text style={styles.email}>{perfil ? perfil.email : "A carregar..."}</Text>
            {perfil && (
                <Text style={styles.dataCriacao}>
                    Conta criada em: {perfil.created_at}
                </Text>
            )}

            {erro && <Text style={styles.erroTexto}>{erro}</Text>}

            {/* Botão de Logout */}
            <TouchableOpacity style={styles.botaoLogout} onPress={fazerLogout}>
                <Text style={styles.botaoTexto}>Sair da conta</Text>
            </TouchableOpacity>

            {/* Botão para voltar ao ecrã inicial */}
            <TouchableOpacity style={styles.botaoVoltar} onPress={() => navigation.goBack()}>
                <Text style={styles.voltarTexto}>Voltar</Text>
            </TouchableOpacity>
        </View>
    );
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center", padding: 20 },
    email: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    dataCriacao: { color: "#999", fontSize: 14, marginBottom: 40 },
    botaoLogout: { backgroundColor: "#FF7A1A", padding: 15, borderRadius: 10, width: "100%", alignItems: "center", marginBottom: 15 },
    botaoTexto: { color: "#000", fontWeight: "bold" },
    botaoVoltar: { padding: 15, alignItems: "center" },
    voltarTexto: { color: "#999", fontSize: 15 },
    erroTexto: { color: "#FF4444", marginBottom: 20 }
});