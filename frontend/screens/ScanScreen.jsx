import React, { useState } from "react";

import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";

import {
    CameraView,
    useCameraPermissions
} from "expo-camera";

import AsyncStorage from "@react-native-async-storage/async-storage";


const API_URL = "http://192.168.1.73:5000";

// Idioma fixo por agora. Quando tiveres um Context/estado
// global de idioma na app, troca este valor por esse estado.
const IDIOMA_ATUAL = "pt";


export default function ScanScreen({ navigation }) {

    const [permission, requestPermission] = useCameraPermissions();

    const [cameraRef, setCameraRef] = useState(null);

    const [loading, setLoading] = useState(false);


    if (!permission) {

        return (
            <View style={styles.permissionContainer}>

                <ActivityIndicator
                    size="large"
                    color="#FF8C00"
                />

            </View>
        );

    }


    if (!permission.granted) {

        return (
            <View style={styles.permissionContainer}>

                <Text style={styles.permissionText}>
                    A IronEye precisa de acesso à câmara.
                </Text>

                <TouchableOpacity
                    style={styles.button}
                    onPress={requestPermission}
                >

                    <Text style={styles.buttonText}>
                        Permitir câmara
                    </Text>

                </TouchableOpacity>

            </View>
        );

    }


    function mostrarFallbackManual(mensagem) {

        Alert.alert(

            "Máquina não encontrada",

            mensagem ||
            "Não encontrámos uma máquina de ginásio na imagem.",

            [
                {
                    text: "Tentar de novo",
                    style: "cancel",
                },
                {
                    text: "Escrever nome",
                    onPress: () => navigation.navigate("ManualScan"),
                },
            ]

        );

    }


    async function tirarFoto() {

        if (!cameraRef || loading) {
            return;
        }


        try {

            setLoading(true);

            const foto = await cameraRef.takePictureAsync({

                base64: true,

                quality: 0.6,

            });


            if (!foto || !foto.base64) {

                Alert.alert(
                    "Erro",
                    "Não foi possível obter a fotografia."
                );

                return;

            }


            const token = await AsyncStorage.getItem("token");


            if (!token) {

                Alert.alert(
                    "Sessão expirada",
                    "Faz login novamente."
                );

                return;

            }


            console.log("A enviar fotografia para:", `${API_URL}/scan`);


            const resposta = await fetch(`${API_URL}/scan`, {

                method: "POST",

                headers: {

                    "Content-Type": "application/json",

                    "Authorization": `Bearer ${token}`,

                },

                body: JSON.stringify({

                    imagem: foto.base64,

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
                    "Não foi possível analisar a imagem."

                );

                return;
            }


            if (dados.machine_found === false) {

                mostrarFallbackManual(dados.erro);

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
                "Erro no scan:",
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

        <View style={styles.container}>

            <CameraView

                ref={(ref) => setCameraRef(ref)}

                style={styles.camera}

                facing="back"

            />


            <View style={styles.bottomContainer}>

                {loading ? (

                    <>

                        <ActivityIndicator
                            size="large"
                            color="#FF8C00"
                        />

                        <Text style={styles.loadingText}>
                            A IA está a analisar a máquina...
                        </Text>

                    </>

                ) : (

                    <TouchableOpacity

                        style={styles.scanButton}

                        onPress={tirarFoto}

                    >

                        <View style={styles.innerButton} />

                    </TouchableOpacity>

                )}


                <TouchableOpacity
                    onPress={() => navigation.navigate("ManualScan")}
                >

                    <Text style={styles.manualLink}>
                        Escrever nome manualmente
                    </Text>

                </TouchableOpacity>

            </View>

        </View>

    );

}


const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#000",
    },

    camera: {
        flex: 1,
    },

    bottomContainer: {
        height: 180,
        backgroundColor: "#0A0A0A",
        alignItems: "center",
        justifyContent: "center",
    },

    scanButton: {
        width: 80,
        height: 80,
        borderRadius: 40,
        backgroundColor: "#FF8C00",
        alignItems: "center",
        justifyContent: "center",
    },

    innerButton: {
        width: 65,
        height: 65,
        borderRadius: 35,
        backgroundColor: "#FFF",
    },

    loadingText: {
        color: "#FFF",
        fontSize: 16,
        marginTop: 15,
    },

    manualLink: {
        color: "#FF8C00",
        fontSize: 14,
        marginTop: 12,
        textDecorationLine: "underline",
    },

    permissionContainer: {
        flex: 1,
        backgroundColor: "#0A0A0A",
        alignItems: "center",
        justifyContent: "center",
        padding: 30,
    },

    permissionText: {
        color: "#FFF",
        fontSize: 18,
        textAlign: "center",
        marginBottom: 20,
    },

    button: {
        backgroundColor: "#FF8C00",
        paddingHorizontal: 25,
        paddingVertical: 15,
        borderRadius: 10,
    },

    buttonText: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 16,
    },

});