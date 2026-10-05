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
} from "react-native-google-mobile-ads";

import { API_URL } from "../config";

const AD_UNIT_ID = "ca-app-pub-4830237129231721/7281673300";
const CURRENT_LANGUAGE = "en";

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
                await claimBonusScan();
            }
        );

        const unsubscribeError = rewarded.addAdEventListener(
            AdEventType.ERROR,
            (error) => {
                console.error("Ad error:", error);
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

    async function claimBonusScan() {
        try {
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${API_URL}/scan/bonus`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
            });

            const data = await response.json();
            if (response.ok) {
                Alert.alert(
                    "🎉 +1 scan!",
                    `You now have ${data.scans_restantes} scans available today.`
                );
            }
        } catch (e) {
            console.error("Error claiming bonus scan:", e);
        }
    }

    async function showAd() {
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
            console.error("Error displaying ad:", error);
            setAdLoading(false);
            rewarded.load();
        }
    }

    async function sendManualScan() {
        const cleanName = machineName.trim();

        if (!cleanName) {
            Alert.alert(
                "Empty field",
                "Please enter machine name before continuing."
            );
            return;
        }

        if (loading) return;

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

            const response = await fetch(`${API_URL}/scan/manual`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`,
                },
                body: JSON.stringify({
                    machine_name: cleanName,
                    idioma: CURRENT_LANGUAGE,
                }),
            });

            let data;
            try {
                data = await response.json();
            } catch (error) {
                console.error("Invalid JSON from server:", error);
                Alert.alert(
                    "Error",
                    "Server returned an invalid response."
                );
                return;
            }

            if (response.status === 403 && data.erro === "Limite diário atingido") {
                Alert.alert(
                    "Scans exhausted",
                    "You have used all your scans for today.",
                    [
                        { text: "Close", style: "cancel" },
                        { text: "📺 Watch ad +1 scan", onPress: showAd },
                    ]
                );
                return;
            }

            if (!response.ok) {
                Alert.alert(
                    "Error",
                    data.erro || "Could not validate this machine."
                );
                return;
            }

            if (data.machine_found === false) {
                Alert.alert(
                    "Not recognized",
                    data.erro || "Could not recognize this machine. Try writing the name differently."
                );
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
            console.error("Error in manual scan:", error);
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
            <Text style={styles.title}>
                Enter machine name
            </Text>

            <Text style={styles.subtitle}>
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
                onPress={sendManualScan}
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
                <Text style={styles.cancelText}>
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
    title: {
        color: "#FFF",
        fontSize: 24,
        fontWeight: "bold",
        marginBottom: 10,
    },
    subtitle: {
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
    cancelText: {
        color: "#999",
        fontSize: 14,
        textAlign: "center",
    },
});