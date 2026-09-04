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
const IDIOMA_ATUAL = "en";


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
                    `You now have ${dados.scans_restantes} scans available today.`
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
            Alert.alert("Preparing ad", "Please wait a moment and try again.");
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
                "Empty field",
                "Please enter machine name before continuing."
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
                    "Session expired",
                    "Please log in again."
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
                    "Error",
                    "Server returned an invalid response."
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
                    "Scans exhausted",
                    "You have used all your scans for today.",
                    [
                        { text: "Close", style: "cancel" },
                        { text: "📺 Watch ad +1 scan", onPress: verAnuncio },
                    ]
                );
                return;
            }

            if (!resposta.ok) {

                Alert.alert(

                    "Error",

                    dados.erro ||
                    "Could not validate this machine."

                );

                return;
            }


            if (dados.machine_found === false) {

                Alert.alert(

                    "Not recognized",

                    dados.erro ||
                    "Could not recognize this machine. Try writing the name differently."

                );

                return;
            }


            if (dados.machine_found !== true) {

                Alert.alert(

                    "Error",

                    "AI returned an unexpected response."

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

                "Connection error",

                "Could not communicate with the server."

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
                Enter machine name
            </Text>

            <Text style={styles.subtitulo}>
                Couldn't identify the machine by photo?
                Type its name below.
            </Text>

            <TextInput

                style={styles.input}

                placeholder="e.g. Leg Press, Lat Pulldown..."

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
                        Confirm
                    </Text>

                )}

            </TouchableOpacity>

            <TouchableOpacity

                onPress={() => navigation.goBack()}

                disabled={loading}

            >

                <Text style={styles.cancelar}>
                    Back to camera
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