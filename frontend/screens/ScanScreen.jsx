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
} from "react-native-google-mobile-ads";

import { API_URL } from "../config";


const ID_BLOCO_AD =
    "ca-app-pub-4830237129231721/7281673300";

const AD_UNIT_ID = ID_BLOCO_AD;


const CURRENT_LANGUAGE = "en";


export default function ScanScreen({ navigation }) {

    const insets = useSafeAreaInsets();

    const [permission, requestPermission] =
        useCameraPermissions();

    const [cameraRef, setCameraRef] =
        useState(null);

    const [loading, setLoading] =
        useState(false);

    const [adLoaded, setAdLoaded] =
        useState(false);

    const [adLoading, setAdLoading] =
        useState(false);

    const rewarded = useMemo(() => {
        return RewardedAd.createForAdRequest(AD_UNIT_ID);
    }, []);


    useEffect(() => {

        const unsubscribeLoaded =
            rewarded.addAdEventListener(
                RewardedAdEventType.LOADED,
                () => {
                    setAdLoaded(true);
                    setAdLoading(false);
                }
            );

        const unsubscribeEarned =
            rewarded.addAdEventListener(
                RewardedAdEventType.EARNED_REWARD,
                async (reward) => {
                    await claimBonusScan();
                }
            );

        const unsubscribeError =
            rewarded.addAdEventListener(
                AdEventType.ERROR,
                (error) => {
                    console.error("Ad error:", error);
                    setAdLoaded(false);
                    setAdLoading(false);
                    Alert.alert(
                        "Error",
                        "Could not load the ad. Please try again."
                    );
                }
            );

        // After the ad closes, pre-load the next one so it's ready if the user wants another bonus scan.
        const unsubscribeClosed =
            rewarded.addAdEventListener(
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


    async function claimBonusScan() {

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

            const response =
                await fetch(
                    `${API_URL}/scan/bonus`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                    }
                );

            let data;

            try {
                data = await response.json();
            } catch (error) {
                console.error("Invalid backend response:", error);
                Alert.alert(
                    "Error",
                    "Server returned an invalid response."
                );
                return;
            }

            if (!response.ok) {
                Alert.alert(
                    "Could not claim scan",
                    data.erro || "Bonus scan could not be assigned."
                );
                return;
            }

            Alert.alert(
                "🎉 +1 scan!",
                `You now have ${data.scans_restantes} scans available today.`
            );

        } catch (error) {
            console.error("Error claiming bonus scan:", error);
            Alert.alert(
                "Connection error",
                "Could not communicate with the server."
            );
        }

    }


    async function showAd() {

        if (adLoading) {
            return;
        }

        // If the ad isn't ready yet, trigger a load and inform the user to retry.
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
            setAdLoading(true);
            setAdLoaded(false);
            await rewarded.show();
        } catch (error) {
            console.error("Error showing ad:", error);
            setAdLoading(false);
            setAdLoaded(false);
            Alert.alert(
                "Error",
                "Could not display the ad."
            );
            rewarded.load();
        }

    }


    function showManualFallback(message) {

        Alert.alert(

            "Machine not found",

            message || "No gym machine found in the image.",

            [
                {
                    text: "Try again",
                    style: "cancel",
                },
                {
                    text: "Type name",
                    onPress: () => navigation.navigate("ManualScan"),
                },
            ]

        );

    }


    async function takePhoto() {

        if (!cameraRef || loading) {
            return;
        }

        try {

            setLoading(true);

            const photo =
                await cameraRef.takePictureAsync({
                    base64: true,
                    quality: 0.6,
                });

            if (!photo || !photo.base64) {
                Alert.alert(
                    "Error",
                    "Could not capture photo."
                );
                return;
            }

            const token =
                await AsyncStorage.getItem("token");

            if (!token) {
                Alert.alert(
                    "Session expired",
                    "Please log in again."
                );
                return;
            }

            const response =
                await fetch(
                    `${API_URL}/scan`,
                    {
                        method: "POST",
                        headers: {
                            "Content-Type": "application/json",
                            "Authorization": `Bearer ${token}`,
                        },
                        body: JSON.stringify({
                            imagem: photo.base64,
                            idioma: CURRENT_LANGUAGE,
                        }),
                    }
                );

            let data;

            try {
                data = await response.json();
            } catch (error) {
                console.error("Server did not return JSON:", error);
                Alert.alert(
                    "Error",
                    "Server returned an invalid response."
                );
                return;
            }

            if (
                response.status === 403 &&
                data.erro === "Limite diário atingido"
            ) {

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
                            onPress: showAd,
                        },
                    ]

                );

                return;

            }

            if (!response.ok) {
                Alert.alert(
                    "Error",
                    data.erro || "Could not analyze the image."
                );
                return;
            }

            if (data.machine_found === false) {
                showManualFallback(data.erro);
                return;
            }

            if (data.machine_found !== true) {
                Alert.alert(
                    "Error",
                    "AI returned an unexpected response."
                );
                return;
            }

            navigation.replace("ScanDetails", { scan: data });

        } catch (error) {

            console.error("Scan error:", error);

            Alert.alert(
                "Connection error",
                "Could not communicate with the server."
            );

        } finally {

            setLoading(false);

        }

    }


    if (!permission) {
        return (
            <View style={styles.permissionContainer}>
                <ActivityIndicator size="large" color="#FF8C00" />
            </View>
        );
    }

    if (!permission.granted) {
        return (
            <View style={styles.permissionContainer}>
                <Text style={styles.permissionText}>
                    IronEye requires camera access.
                </Text>
                <TouchableOpacity
                    style={styles.button}
                    onPress={requestPermission}
                >
                    <Text style={styles.buttonText}>
                        Allow camera
                    </Text>
                </TouchableOpacity>
            </View>
        );
    }


    return (

        <View style={styles.container}>

            <TouchableOpacity
                style={[styles.backButton, { top: Math.max(insets.top, 20) + 10 }]}
                onPress={() => navigation.goBack()}
            >
                <ChevronLeft color="#FFF" size={36} />
            </TouchableOpacity>

            <CameraView
                ref={(ref) => setCameraRef(ref)}
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
                        <ActivityIndicator size="large" color="#FF8C00" />
                        <Text style={styles.loadingText}>
                            AI is analyzing the machine...
                        </Text>
                    </>

                ) : (

                    <TouchableOpacity
                        style={styles.scanButton}
                        onPress={takePhoto}
                    >
                        <View style={styles.innerButton} />
                    </TouchableOpacity>

                )}

                <TouchableOpacity
                    onPress={() => navigation.navigate("ManualScan")}
                >
                    <Text style={styles.manualLink}>
                        Type name manually
                    </Text>
                </TouchableOpacity>

                {adLoading && (
                    <Text style={styles.adStatus}>
                        Preparing ad...
                    </Text>
                )}

            </View>

        </View>

    );

}


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