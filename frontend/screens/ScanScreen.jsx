import React, { useState, useEffect, useMemo } from "react";

import {
    View,
    Text,
    StyleSheet,
    TouchableOpacity,
    ActivityIndicator,
    Alert,
} from "react-native";

import { ChevronLeft } from "lucide-react-native";
import {
    CameraView,
    useCameraPermissions
} from "expo-camera";

import { useSafeAreaInsets } from "react-native-safe-area-context";

import AsyncStorage from "@react-native-async-storage/async-storage";

import {
    RewardedAd,
    RewardedAdEventType,
    AdEventType,
    TestIds,
} from "react-native-google-mobile-ads";

import { API_URL } from "../config";


/* =====================================================
   ADMOB
===================================================== */

// ID REAL DO TEU BLOCO REWARDED
const ID_BLOCO_AD =
    "ca-app-pub-4830237129231721/7281673300";

// EM PRODUÇÃO
const AD_UNIT_ID = ID_BLOCO_AD;






/* =====================================================
   IDIOMA
===================================================== */

const IDIOMA_ATUAL = "en";


/* =====================================================
   COMPONENTE
===================================================== */

export default function ScanScreen({ navigation }) {

    const insets = useSafeAreaInsets();

    /* =================================================
       CÂMARA
    ================================================= */

    const [permission, requestPermission] =
        useCameraPermissions();

    const [cameraRef, setCameraRef] =
        useState(null);


    /* =================================================
       LOADING DO SCAN
    ================================================= */

    const [loading, setLoading] =
        useState(false);


    /* =================================================
       ADMOB STATES
    ================================================= */

    const [adLoaded, setAdLoaded] =
        useState(false);

    const [adLoading, setAdLoading] =
        useState(false);


    /* =================================================
       CRIAR REWARDED AD
    ================================================= */

    const rewarded = useMemo(() => {

        return RewardedAd.createForAdRequest(
            AD_UNIT_ID
        );

    }, []);


    /* =================================================
       CARREGAR ANÚNCIO
    ================================================= */

    useEffect(() => {

        console.log(
            "A carregar anúncio rewarded..."
        );


        const unsubscribeLoaded =
            rewarded.addAdEventListener(
                RewardedAdEventType.LOADED,
                () => {

                    console.log(
                        "Anúncio rewarded carregado!"
                    );

                    setAdLoaded(true);
                    setAdLoading(false);

                }
            );


        const unsubscribeEarned =
            rewarded.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                async (reward) => {

                    console.log(
                        "RECOMPENSA RECEBIDA:",
                        reward
                    );


                    /*
                        O utilizador terminou o anúncio.

                        Agora pedimos ao backend
                        para dar +1 scan.
                    */

                    await receberBonusScan();

                }
            );


        const unsubscribeError =
            rewarded.addAdEventListener(
                AdEventType.ERROR,
                (error) => {

                    console.error(
                        "Erro no anúncio:",
                        error
                    );

                    setAdLoaded(false);
                    setAdLoading(false);


                    Alert.alert(
                        "Error",
                        "Could not load the ad. Please try again."
                    );

                }
            );


        const unsubscribeClosed =
            rewarded.addAdEventListener(
                AdEventType.CLOSED,
                () => {

                    console.log(
                        "Anúncio fechado."
                    );


                    /*
                        Depois de fechar o anúncio,
                        carregamos outro.

                        Assim, se o utilizador quiser
                        ver o segundo anúncio, já temos
                        outro preparado.
                    */

                    setAdLoaded(false);

                    rewarded.load();

                }
            );


        // Primeiro carregamento
        rewarded.load();


        // Limpar listeners quando sair do ecrã
        return () => {

            unsubscribeLoaded();
            unsubscribeEarned();
            unsubscribeError();
            unsubscribeClosed();

        };

    }, [rewarded]);


    /* =================================================
       RECEBER +1 SCAN
    ================================================= */

    async function receberBonusScan() {

        try {

            const token =
                await AsyncStorage.getItem("token");


            if (!token) {

                Alert.alert(
                    "Session expired",
                    "Please log in again."
                );

                return;

            }


            console.log(
                "A pedir +1 scan ao backend..."
            );


            const resposta =
                await fetch(
                    `${API_URL}/scan/bonus`,
                    {
                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`,

                        },

                    }
                );


            let dados;


            try {

                dados =
                    await resposta.json();

            } catch (erro) {

                console.error(
                    "Resposta inválida do backend:",
                    erro
                );

                Alert.alert(
                    "Error",
                    "Server returned an invalid response."
                );

                return;

            }


            console.log(
                "Resposta do bonus:",
                resposta.status,
                dados
            );


            if (!resposta.ok) {

                Alert.alert(

                    "Could not claim scan",

                    dados.erro ||
                    "Bonus scan could not be assigned."

                );

                return;

            }


            /*
                O backend confirmou:

                +1 scan
            */

            Alert.alert(

                "🎉 +1 scan!",

                `You now have ${dados.scans_restantes} scans available today.`

            );


        } catch (error) {

            console.error(
                "Erro ao receber scan bónus:",
                error
            );


            Alert.alert(
                "Connection error",
                "Could not communicate with the server."
            );

        }

    }


    /* =================================================
       MOSTRAR ANÚNCIO
    ================================================= */

    async function verAnuncio() {

        if (adLoading) {

            return;

        }


        /*
            Se o anúncio ainda não estiver carregado,
            tentamos carregá-lo.
        */

        if (!adLoaded) {

            setAdLoading(true);


            Alert.alert(
                "Preparing ad",
                "Please wait a moment and try again."
            );


            rewarded.load();

            return;

        }


        try {

            console.log(
                "A mostrar anúncio rewarded..."
            );


            setAdLoading(true);

            setAdLoaded(false);


            await rewarded.show();


        } catch (error) {

            console.error(
                "Erro ao mostrar anúncio:",
                error
            );


            setAdLoading(false);
            setAdLoaded(false);


            Alert.alert(
                "Error",
                "Could not display the ad."
            );


            // Tentar carregar outro
            rewarded.load();

        }

    }


    /* =================================================
       FALLBACK MANUAL
    ================================================= */

    function mostrarFallbackManual(mensagem) {

        Alert.alert(

            "Machine not found",

            mensagem ||
            "No gym machine found in the image.",

            [

                {
                    text: "Try again",
                    style: "cancel",
                },

                {
                    text: "Type name",

                    onPress: () =>
                        navigation.navigate(
                            "ManualScan"
                        ),

                },

            ]

        );

    }


    /* =================================================
       TIRAR FOTO
    ================================================= */

    async function tirarFoto() {

        if (!cameraRef || loading) {

            return;

        }


        try {

            setLoading(true);


            /* =========================================
               TIRAR FOTO
            ========================================= */

            const foto =
                await cameraRef.takePictureAsync({

                    base64: true,

                    quality: 0.6,

                });


            if (!foto || !foto.base64) {

                Alert.alert(
                    "Error",
                    "Could not capture photo."
                );

                return;

            }


            /* =========================================
               TOKEN
            ========================================= */

            const token =
                await AsyncStorage.getItem("token");


            if (!token) {

                Alert.alert(
                    "Session expired",
                    "Please log in again."
                );

                return;

            }


            console.log(
                "A enviar fotografia para:",
                `${API_URL}/scan`
            );


            /* =========================================
               PEDIR SCAN AO BACKEND
            ========================================= */

            const resposta =
                await fetch(
                    `${API_URL}/scan`,
                    {

                        method: "POST",

                        headers: {

                            "Content-Type":
                                "application/json",

                            "Authorization":
                                `Bearer ${token}`,

                        },

                        body: JSON.stringify({

                            imagem:
                                foto.base64,

                            idioma:
                                IDIOMA_ATUAL,

                        }),

                    }
                );


            /* =========================================
               JSON
            ========================================= */

            let dados;


            try {

                dados =
                    await resposta.json();

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


            /* =========================================
               LIMITE ATINGIDO
            ========================================= */

            if (
                resposta.status === 403 &&
                dados.erro ===
                "Limite diário atingido"
            ) {

                /*
                    O utilizador já gastou
                    todos os scans disponíveis.

                    Agora damos a opção de
                    ver um anúncio.
                */

                Alert.alert(

                    "Scans exhausted",

                    "You have used all your scans for today.",

                    [

                        {
                            text: "Close",
                            style: "cancel",
                        },

                        {
                            text: "📺 Watch ad +1 scan",

                            onPress:
                                verAnuncio,

                        },

                    ]

                );


                return;

            }


            /* =========================================
               OUTROS ERROS
            ========================================= */

            if (!resposta.ok) {

                Alert.alert(

                    "Error",

                    dados.erro ||
                    "Could not analyze the image."

                );

                return;

            }


            /* =========================================
               MÁQUINA NÃO ENCONTRADA
            ========================================= */

            if (
                dados.machine_found === false
            ) {

                mostrarFallbackManual(
                    dados.erro
                );

                return;

            }


            /* =========================================
               RESPOSTA INVÁLIDA
            ========================================= */

            if (
                dados.machine_found !== true
            ) {

                Alert.alert(

                    "Error",

                    "AI returned an unexpected response."

                );

                return;

            }


            /* =========================================
               IR PARA DETALHES
            ========================================= */

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

                "Connection error",

                "Could not communicate with the server."

            );


        } finally {

            setLoading(false);

        }

    }


    /* =================================================
       PERMISSÃO DA CÂMARA
    ================================================= */

    if (!permission) {

        return (

            <View
                style={
                    styles.permissionContainer
                }
            >

                <ActivityIndicator
                    size="large"
                    color="#FF8C00"
                />

            </View>

        );

    }


    if (!permission.granted) {

        return (

            <View
                style={
                    styles.permissionContainer
                }
            >

                <Text
                    style={
                        styles.permissionText
                    }
                >

                    IronEye requires camera access.

                </Text>


                <TouchableOpacity

                    style={
                        styles.button
                    }

                    onPress={
                        requestPermission
                    }

                >

                    <Text
                        style={
                            styles.buttonText
                        }
                    >

                        Allow camera

                    </Text>

                </TouchableOpacity>

            </View>

        );

    }


    /* =================================================
       UI
    ================================================= */

    return (

        <View style={styles.container}>

            <TouchableOpacity 
                style={[styles.backButton, { top: Math.max(insets.top, 20) + 10 }]}
                onPress={() => navigation.goBack()}
            >
                <ChevronLeft color="#FFF" size={36} />
            </TouchableOpacity>

            <CameraView

                ref={(ref) =>
                    setCameraRef(ref)
                }

                style={styles.camera}

                facing="back"

            />


            <View
                style={[
                    styles.bottomContainer,
                    { 
                        paddingBottom: insets.bottom,
                        height: 180 + insets.bottom 
                    }
                ]}
            >

                {loading ? (

                    <>

                        <ActivityIndicator
                            size="large"
                            color="#FF8C00"
                        />

                        <Text
                            style={
                                styles.loadingText
                            }
                        >

                            AI is analyzing the machine...

                        </Text>

                    </>

                ) : (

                    <TouchableOpacity

                        style={
                            styles.scanButton
                        }

                        onPress={
                            tirarFoto
                        }

                    >

                        <View
                            style={
                                styles.innerButton
                            }
                        />

                    </TouchableOpacity>

                )}


                <TouchableOpacity

                    onPress={() =>
                        navigation.navigate(
                            "ManualScan"
                        )
                    }

                >

                    <Text
                        style={
                            styles.manualLink
                        }
                    >

                        Type name manually

                    </Text>

                </TouchableOpacity>


                {/* =====================================
                    ESTADO DO ANÚNCIO
                ===================================== */}

                {adLoading && (

                    <Text
                        style={
                            styles.adStatus
                        }
                    >

                        Preparing ad...

                    </Text>

                )}

            </View>

        </View>

    );

}


/* =====================================================
   STYLES
===================================================== */

const styles = StyleSheet.create({

    container: {
        flex: 1,
        backgroundColor: "#000",
    },

    backButton: {
        position: 'absolute',
        left: 20,
        zIndex: 10,
        width: 44,
        height: 44,
        justifyContent: 'center',
        alignItems: 'center',
        backgroundColor: 'rgba(0,0,0,0.4)',
        borderRadius: 22,
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


    adStatus: {
        color: "#AAA",
        fontSize: 12,
        marginTop: 8,
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