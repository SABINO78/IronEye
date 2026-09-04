import React, { useState, useEffect, useMemo } from "react";

import {
    View,
    Text,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
    KeyboardAvoidingView,
    Platform,
} from "react-native";

import AsyncStorage from "@react-native-async-storage/async-storage";
import {
    RewardedAd,
    RewardedAdEventType,
    AdEventType,
    TestIds,
} from "react-native-google-mobile-ads";

import { API_URL } from "../config";

const AD_UNIT_ID = TestIds.REWARDED;
const IDIOMA_ATUAL = "pt";


export default function ManualScanScreen({ navigation }) {

    const [machineName, setMachineName] = useState("");
    const [loading, setLoading] = useState(false);
    const [adLoaded, setAdLoaded] = useState(false);
    const [adLoading, setAdLoading] = useState(false);

    const rewarded = useMemo(() => {
        return RewardedAd.createForAdRequest(AD_UNIT_ID);
    }, []);

    useEffect(() => {
        const unsubscribeLoaded = rewarded.addAdEventListener(
            RewardedAdEventType.LOADED,
            () => {
                setAdLoaded(true);
                setAdLoading(false);
            }
        );

        const unsubscribeEarned = rewarded.addAdEventListener(
            RewardedAdEventType.EARNED_REWARD,
            async () => {
                await receberBonusScan();
            }
        );

        const unsubscribeError = rewarded.addAdEventListener(
            AdEventType.ERROR,
            (error) => {
                console.error("Erro no anúncio:", error);
                setAdLoaded(false);
                setAdLoading(false);
            }
        );

        const unsubscribeClosed = rewarded.addAdEventListener(
            AdEventType.CLOSED,
            () => {
                setAdLoaded(false);
                rewarded.load();
            }
        );

        rewarded.load();

        return () => {
            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeError();
            unsubscribeClosed();
        };
    }, [rewarded]);

    async function receberBonusScan() {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const resposta = await fetch(`${API_URL}/scan/bonus`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            const dados = await resposta.json();
            if (resposta.ok) {
                Alert.alert(
                    "🎉 +1 scan!",
                    `Agora tens ${dados.scans_restantes} scans disponíveis hoje.`
                );
            }
        } catch (e) {
            console.error("Erro ao receber scan bonus:", e);
        }
    }

    async function verAnuncio() {
        if (adLoading) return;

        if (!adLoaded) {
            setAdLoading(true);
            Alert.alert("A preparar anúncio", "Espera um momento e tenta novamente.");
            rewarded.load();
            return;
        }

        try {
            setAdLoading(true);
            setAdLoaded(false);
            await rewarded.show();
        } catch (error) {
            console.error("Erro ao mostrar anúncio:", error);
            setAdLoading(false);
            rewarded.load();
        }
    }

    async function enviarManual() {

        const nomeLimpo = machineName.trim();

        if (!nomeLimpo) {

            Alert.alert(
                "Campo vazio",
                "Escreve o nome da máquina antes de continuar."
            );

            return;
        }


        if (loading) {
            return;
        }


        try {

            setLoading(true);

            const token = await AsyncStorage.getItem("token");


            if (!token) {

                Alert.alert(
                    "Sessão expirada",
                    "Faz login novamente."
                );

                return;

            }


            console.log(
                "A enviar nome manual para:",
                `${API_URL}/scan/manual`
            );


            const resposta = await fetch(`${API_URL}/scan/manual`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                    "Authorization": `Bearer ${token}`,

                },

                body: JSON.stringify({

                    machine_name: nomeLimpo,

                    idioma: IDIOMA_ATUAL,

                }),

            });


            let dados;

            try {

                dados = await resposta.json();

            } catch (erro) {

                console.error(
                    "O servidor não devolveu JSON:",
                    erro
                );

                Alert.alert(
                    "Erro",
                    "O servidor devolveu uma resposta inválida."
                );

                return;
            }


            console.log(
                "Resposta do servidor:",
                resposta.status,
                dados
            );


            if (resposta.status === 403 && dados.erro === "Limite diário atingido") {
                Alert.alert(
                    "Scans esgotados",
                    "Já utilizaste todos os teus scans de hoje.",
                    [
                        { text: "Fechar", style: "cancel" },
                        { text: "📺 Ver anúncio +1 scan", onPress: verAnuncio },
                    ]
                );
                return;
            }

            if (!resposta.ok) {

                Alert.alert(

                    "Erro",

                    dados.erro ||
                    "Não foi possível validar essa máquina."

                );

                return;
            }


            if (dados.machine_found === false) {

                Alert.alert(

                    "Não reconhecido",

                    dados.erro ||
                    "Não conseguimos reconhecer essa máquina. Tenta escrever o nome de outra forma."

                );

                return;
            }


            if (dados.machine_found !== true) {

                Alert.alert(

                    "Erro",

                    "A IA devolveu uma resposta inesperada."

                );

                return;
            }


            navigation.replace(

                "ScanDetails",

                {
                    scan: dados
                }

            );


        } catch (error) {

            console.error(
                "Erro no scan manual:",
                error
            );


            Alert.alert(

                "Erro de ligação",

                "Não foi possível comunicar com o servidor."

            );


        } finally {

            setLoading(false);

        }

    }


    return (

        <KeyboardAvoidingView
            style={styles.container}
            behavior={Platform.OS === "ios" ? "padding" : undefined}
        >

            <Text style={styles.titulo}>
                Escrever nome da máquina
            </Text>

            <Text style={styles.subtitulo}>
                Não conseguimos identificar a máquina pela foto?
                Escreve o nome dela abaixo.
            </Text>

            <TextInput

                style={styles.input}

                placeholder="Ex: Leg Press, Lat Pulldown..."

                placeholderTextColor="#777"

                value={machineName}

                onChangeText={setMachineName}

                editable={!loading}

                autoFocus

            />

            <TouchableOpacity

                style={[
                    styles.button,
                    loading && styles.buttonDisabled,
                ]}

                onPress={enviarManual}

                disabled={loading}

            >

                {loading ? (

                    <ActivityIndicator color="#FFF" />

                ) : (

                    <Text style={styles.buttonText}>
                        Confirmar
                    </Text>

                )}

            </TouchableOpacity>

            <TouchableOpacity

                onPress={() => navigation.goBack()}

                disabled={loading}

            >

                <Text style={styles.cancelar}>
                    Voltar à câmara
                </Text>

            </TouchableOpacity>

        </KeyboardAvoidingView>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#0A0A0A",
        padding: 25,
        justifyContent: "center",
    },

    titulo: {
        color: "#FFF",
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },

    subtitulo: {
        color: "#DDD",
        fontSize: 15,
        lineHeight: 22,
        marginBottom: 25,
    },

    input: {
        backgroundColor: "#1A1A2E",
        borderRadius: 12,
        padding: 15,
        color: "#FFF",
        fontSize: 16,
        marginBottom: 20,
    },

    button: {
        backgroundColor: "#FF8C00",
        borderRadius: 12,
        paddingVertical: 15,
        alignItems: "center",
        marginBottom: 15,
    },

    buttonDisabled: {
        opacity: 0.6,
    },

    buttonText: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 16,
    },

    cancelar: {
        color: "#999",
        fontSize: 14,
        textAlign: "center",
    },

});