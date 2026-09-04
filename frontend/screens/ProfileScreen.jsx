import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { User, Calendar, LogOut, ArrowLeft, Shield } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function Profile({ navigation, onLogout }) {
    const [perfil, setPerfil] = useState(null);
    const [carregando, setCarregando] = useState(true);
    const [erro, setErro] = useState(null);

    useEffect(() => {
        carregarPerfil();
    }, []);

    async function carregarPerfil() {
        try {
            setCarregando(true);
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
                setErro("Não foi possível carregar os dados do perfil");
            }
        } catch (erro) {
            setErro("Sem ligação ao servidor");
        } finally {
            setCarregando(false);
        }
    }

    async function fazerLogout() {
        await AsyncStorage.removeItem("token");
        if (onLogout) {
            onLogout();
        }
    }

    function formatarData(dataIso) {
        if (!dataIso) return "Recente";
        try {
            const d = new Date(dataIso);
            if (isNaN(d.getTime())) return dataIso;
            return d.toLocaleDateString("pt-PT", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        } catch (e) {
            return dataIso;
        }
    }

    return (
        <View style={styles.container}>
            {/* Top Bar com Botão Voltar */}
            <TouchableOpacity style={styles.botaoTopoVoltar} onPress={() => navigation.goBack()}>
                <ArrowLeft color="#FF7A1A" size={22} />
                <Text style={styles.topoVoltarTexto}>Voltar</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                {/* Avatar com Ícone */}
                <View style={styles.avatarCircle}>
                    <User color="#0A0A0E" size={44} strokeWidth={2.2} />
                </View>

                <Text style={styles.tituloPerfil}>O teu Perfil</Text>

                {carregando ? (
                    <ActivityIndicator size="large" color="#FF7A1A" style={{ marginVertical: 30 }} />
                ) : perfil ? (
                    <View style={styles.cardsContainer}>
                        {/* Card do Email */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoIconBox}>
                                <User color="#FF7A1A" size={20} />
                            </View>
                            <View style={styles.infoTexts}>
                                <Text style={styles.infoLabel}>EMAIL DA CONTA</Text>
                                <Text style={styles.infoValor} numberOfLines={1}>{perfil.email}</Text>
                            </View>
                        </View>

                        {/* Card da Data de Criação */}
                        <View style={styles.infoCard}>
                            <View style={styles.infoIconBox}>
                                <Calendar color="#FF7A1A" size={20} />
                            </View>
                            <View style={styles.infoTexts}>
                                <Text style={styles.infoLabel}>MEMBRO DESDE</Text>
                                <Text style={styles.infoValor}>{formatarData(perfil.created_at)}</Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                {erro && <Text style={styles.erroTexto}>{erro}</Text>}

                {/* Botão de Logout */}
                <TouchableOpacity style={styles.botaoLogout} onPress={fazerLogout} activeOpacity={0.85}>
                    <LogOut color="#000" size={18} />
                    <Text style={styles.botaoLogoutTexto}>Terminar Sessão</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A0A0E",
        paddingHorizontal: 22,
        paddingTop: 55,
        paddingBottom: 30,
    },
    botaoTopoVoltar: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        marginBottom: 20,
    },
    topoVoltarTexto: {
        color: "#FF7A1A",
        fontSize: 16,
        fontWeight: "600",
    },
    content: {
        alignItems: "center",
        width: "100%",
    },
    avatarCircle: {
        width: 86,
        height: 86,
        borderRadius: 28,
        backgroundColor: "#FF7A1A",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#FF7A1A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 10,
    },
    tituloPerfil: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "800",
        marginBottom: 24,
    },
    cardsContainer: {
        width: "100%",
        gap: 12,
        marginBottom: 30,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#13131C",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#222230",
        gap: 14,
    },
    infoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#1F1A24",
        justifyContent: "center",
        alignItems: "center",
    },
    infoTexts: {
        flex: 1,
    },
    infoLabel: {
        color: "#8E8E98",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.6,
        marginBottom: 3,
    },
    infoValor: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },
    botaoLogout: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF7A1A",
        paddingVertical: 15,
        borderRadius: 14,
        width: "100%",
        gap: 8,
        marginTop: 10,
    },
    botaoLogoutTexto: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "800",
    },
    erroTexto: {
        color: "#FF4444",
        fontSize: 13,
        textAlign: "center",
        marginBottom: 16,
    },
});