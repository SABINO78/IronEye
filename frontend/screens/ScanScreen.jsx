import React, { useState, useEffect, useMemo } from "react";

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


// DURANTE DESENVOLVIMENTO
const AD_UNIT_ID = TestIds.REWARDED;


// QUANDO A APP FOR PARA PRODUÇÃO,
// TROCA PARA:
//
// const AD_UNIT_ID = ID_BLOCO_AD;






/* =====================================================
   IDIOMA
===================================================== */

const IDIOMA_ATUAL = "pt";


/* =====================================================
   COMPONENTE
===================================================== */

export default function ScanScreen({ navigation }) {

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
                        "Erro",
                        "Não foi possível carregar o anúncio. Tenta novamente."
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
                    "Sessão expirada",
                    "Faz login novamente."
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
                    "Erro",
                    "O servidor devolveu uma resposta inválida."
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

                    "Não foi possível receber o scan",

                    dados.erro ||
                    "O scan bónus não pôde ser atribuído."

                );

                return;

            }


            /*
                O backend confirmou:

                +1 scan
            */

            Alert.alert(

                "🎉 +1 scan!",

                `Agora tens ${dados.scans_restantes} scans disponíveis hoje.`

            );


        } catch (error) {

            console.error(
                "Erro ao receber scan bónus:",
                error
            );


            Alert.alert(
                "Erro de ligação",
                "Não foi possível comunicar com o servidor."
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
                "A preparar anúncio",
                "Espera um momento e tenta novamente."
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
                "Erro",
                "Não foi possível mostrar o anúncio."
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
                    "Erro",
                    "Não foi possível obter a fotografia."
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
                    "Sessão expirada",
                    "Faz login novamente."
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

                    "Scans esgotados",

                    "Já utilizaste todos os teus scans de hoje.",

                    [

                        {
                            text: "Fechar",
                            style: "cancel",
                        },

                        {
                            text: "📺 Ver anúncio +1 scan",

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

                    "Erro",

                    dados.erro ||
                    "Não foi possível analisar a imagem."

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

                    "Erro",

                    "A IA devolveu uma resposta inesperada."

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

                "Erro de ligação",

                "Não foi possível comunicar com o servidor."

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

                    A IronEye precisa de acesso
                    à câmara.

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

                        Permitir câmara

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

            <CameraView

                ref={(ref) =>
                    setCameraRef(ref)
                }

                style={styles.camera}

                facing="back"

            />


            <View
                style={
                    styles.bottomContainer
                }
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

                            A IA está a analisar
                            a máquina...

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

                        Escrever nome manualmente

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

                        A preparar anúncio...

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