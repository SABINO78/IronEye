import { useState, useCallback } from "react";
import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity
} from "react-native";

import { useFocusEffect } from "@react-navigation/native";

import {
    Camera as CameraIcon,
    LogOut,
    User,
    Clock
} from "lucide-react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";

import { API_URL } from "../config";


export default function Home({ navigation, onLogout }) {

    const [dashboard, setDashboard] = useState(null);
    const [erro, setErro] = useState(null);


    // Sempre que a Home ficar ativa, atualiza os scans
    useFocusEffect(

        useCallback(() => {

            carregarDashboard();

        }, [])

    );


    async function carregarDashboard() {

        try {

            const token = await AsyncStorage.getItem("token");


            const resposta = await fetch(`${API_URL}/dashboard`, {

                method: "GET",

                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }

            });


            const dados = await resposta.json();


            if (resposta.ok) {

                setDashboard(dados);

            } else {

                // Se a sessão expirou ou o utilizador não existe na base de dados, faz logout automático
                if (resposta.status === 401 || resposta.status === 404) {
                    await logout();
                    return;
                }

                setErro(
                    dados.erro || "Could not load data"
                );

            }

        } catch (erro) {

            console.error(
                "Erro ao carregar dashboard:",
                erro
            );

            setErro(
                "Could not load data"
            );

        }

    }


    async function logout() {

        await AsyncStorage.removeItem("token");

        onLogout();

    }


    const irParaScan = () => {

        navigation.navigate("Scan");

    };


    return (

        <ScrollView style={styles.container}>


            <View style={styles.header}>


                <View>

                    <Text style={styles.welcome}>
                        WELCOME BACK
                    </Text>

                    <Text style={styles.titulo}>
                        Ready to lift?
                    </Text>

                </View>


                <View style={styles.headerBotoes}>

                    {/* Botão de Histórico */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate("History")}
                        style={styles.iconBotao}
                    >
                        <Clock
                            color="#FF7A1A"
                            size={20}
                        />
                    </TouchableOpacity>

                    {/* Botão de Perfil */}
                    <TouchableOpacity
                        onPress={() => navigation.navigate("Profile")}
                        style={styles.iconBotao}
                    >

                        <User
                            color="#FF7A1A"
                            size={20}
                        />

                    </TouchableOpacity>

                    {/* Botão de Terminar Sessão */}
                    <TouchableOpacity
                        onPress={logout}
                        style={styles.iconBotao}
                    >

                        <LogOut
                            color="#FF7A1A"
                            size={20}
                        />

                    </TouchableOpacity>


                </View>


            </View>


            {dashboard && (

                <View style={styles.card}>


                    <View style={styles.cardTopo}>


                        <Text style={styles.cardTitulo}>
                            {dashboard.is_pro ? "👑 Pro Scans" : "⚡ Daily Scans"}
                        </Text>


                        <Text style={styles.cardValor}>

                            {dashboard.scans_restantes}/{dashboard.limite_diario || 4} left

                        </Text>


                    </View>


                    <View style={styles.barraFundo}>


                        <View
                            style={[
                                styles.barraProgresso,
                                {
                                    width: `${Math.min(100, Math.max(0, (dashboard.scans_restantes / (dashboard.limite_diario || 4)) * 100))}%`
                                }
                            ]}
                        />


                    </View>


                    {!dashboard.is_pro && (
                        <TouchableOpacity
                            onPress={() => navigation.navigate("Pro")}
                        >
                            <Text style={styles.linkPro}>
                                Get unlimited scans →
                            </Text>
                        </TouchableOpacity>
                    )}


                </View>

            )}


            <Text style={styles.instrucao}>
                Point at any gym machine
            </Text>


            <TouchableOpacity
                style={styles.botaoScan}
                onPress={irParaScan}
            >

                <CameraIcon
                    color="#000"
                    size={40}
                />

            </TouchableOpacity>


            <Text style={styles.tapText}>
                Tap to scan
            </Text>


            <Text style={styles.subTapText}>
                AI identifies in ~2 seconds
            </Text>


            {dashboard && (

                <View style={styles.statsContainer}>


                    <View style={styles.statCard}>


                        <Text style={styles.statLabel}>
                            🔥 Today
                        </Text>


                        <Text style={styles.statValor}>

                            {dashboard.scans_hoje} machines

                        </Text>


                    </View>


                    <View style={styles.statCard}>


                        <Text style={styles.statLabel}>
                            📈 This week
                        </Text>


                        <Text style={styles.statValor}>

                            {dashboard.scans_semana} scans

                        </Text>


                    </View>


                </View>

            )}


            {erro && (

                <Text style={styles.erro}>
                    {erro}
                </Text>

            )}


        </ScrollView>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#0A0A0A",
        padding: 20,
        paddingTop: 60
    },

    header: {
        flexDirection: "row",
        justifyContent: "space-between",
        alignItems: "flex-start",
        marginBottom: 20
    },

    welcome: {
        color: "#999",
        fontSize: 12,
        letterSpacing: 1
    },

    titulo: {
        color: "#FFF",
        fontSize: 26,
        fontWeight: "bold"
    },

    headerBotoes: {
        flexDirection: "row",
        gap: 10
    },

    iconBotao: {
        width: 36,
        height: 36,
        borderRadius: 18,
        backgroundColor: "#1A1A2E",
        justifyContent: "center",
        alignItems: "center"
    },

    card: {
        backgroundColor: "#1A1A2E",
        borderRadius: 15,
        padding: 16,
        marginBottom: 30
    },

    cardTopo: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10
    },

    cardTitulo: {
        color: "#FF7A1A",
        fontWeight: "600"
    },

    cardValor: {
        color: "#FFF",
        fontWeight: "bold"
    },

    barraFundo: {
        height: 6,
        backgroundColor: "#333",
        borderRadius: 3,
        marginBottom: 10
    },

    barraProgresso: {
        height: 6,
        backgroundColor: "#FF7A1A",
        borderRadius: 3
    },

    linkPro: {
        color: "#FF7A1A",
        fontSize: 13
    },

    instrucao: {
        color: "#999",
        textAlign: "center",
        marginBottom: 20
    },

    botaoScan: {
        width: 160,
        height: 160,
        borderRadius: 80,
        backgroundColor: "#FF7A1A",
        justifyContent: "center",
        alignItems: "center",
        alignSelf: "center",
        shadowColor: "#FF7A1A",
        shadowOpacity: 0.7,
        shadowRadius: 30,
        elevation: 15
    },

    tapText: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 18,
        textAlign: "center",
        marginTop: 20
    },

    subTapText: {
        color: "#999",
        fontSize: 13,
        textAlign: "center",
        marginBottom: 30
    },

    statsContainer: {
        flexDirection: "row",
        gap: 15,
        marginBottom: 40
    },

    statCard: {
        flex: 1,
        backgroundColor: "#1A1A2E",
        borderRadius: 15,
        padding: 16
    },

    statLabel: {
        color: "#999",
        fontSize: 13,
        marginBottom: 5
    },

    statValor: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 16
    },

    erro: {
        color: "#FF5555",
        textAlign: "center",
        marginBottom: 20
    }

});