import React, { useState } from "react";

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


const API_URL = "http://192.168.1.73:5000";

const IDIOMA_ATUAL = "pt";


export default function ManualScanScreen({ navigation }) {

    const [machineName, setMachineName] = useState("");

    const [loading, setLoading] = useState(false);


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