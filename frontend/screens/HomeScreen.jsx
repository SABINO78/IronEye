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
    const [error, setError] = useState(null);


    useFocusEffect(
        useCallback(() => {
            loadDashboard();
        }, [])
    );


    async function loadDashboard() {

        try {

            const token = await AsyncStorage.getItem("token");

            const response = await fetch(`${API_URL}/dashboard`, {
                method: "GET",
                headers: {
                    "Authorization": `Bearer ${token}`,
                    "Content-Type": "application/json"
                }
            });

            const data = await response.json();

            if (response.ok) {
                setDashboard(data);
            } else {
                if (response.status === 401 || response.status === 404) {
                    await logout();
                    return;
                }

                setError(
                    data.erro || "Could not load data"
                );
            }

        } catch (err) {
            console.error("Error loading dashboard:", err);
            setError("Could not load data");
        }

    }


    async function logout() {
        await AsyncStorage.removeItem("token");
        onLogout();
    }


    const goToScan = () => {
        navigation.navigate("Scan");
    };


    return (

        <ScrollView style={styles.container}>

            <View style={styles.header}>

                <View>
                    <Text style={styles.welcome}>
                        WELCOME BACK
                    </Text>

                    <Text style={styles.title}>
                        Ready to lift?
                    </Text>
                </View>

                <View style={styles.headerButtons}>
                    <TouchableOpacity
                        onPress={() => navigation.navigate("History")}
                        style={styles.iconButton}
                    >
                        <Clock
                            color="#FF7A1A"
                            size={20}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={() => navigation.navigate("Profile")}
                        style={styles.iconButton}
                    >
                        <User
                            color="#FF7A1A"
                            size={20}
                        />
                    </TouchableOpacity>

                    <TouchableOpacity
                        onPress={logout}
                        style={styles.iconButton}
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

                    <View style={styles.cardHeader}>
                        <Text style={styles.cardTitle}>
                            {dashboard.is_pro ? "👑 Pro Scans" : "⚡ Daily Scans"}
                        </Text>

                        <Text style={styles.cardValue}>
                            {dashboard.scans_restantes}/{dashboard.limite_diario || 4} left
                        </Text>
                    </View>

                    <View style={styles.barBackground}>
                        <View
                            style={[
                                styles.barProgress,
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
                            <Text style={styles.proLink}>
                                Get unlimited scans →
                            </Text>
                        </TouchableOpacity>
                    )}

                </View>

            )}


            <Text style={styles.instruction}>
                Point at any gym machine
            </Text>

            <TouchableOpacity
                style={styles.scanButton}
                onPress={goToScan}
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
                        <Text style={styles.statValue}>
                            {dashboard.scans_hoje} machines
                        </Text>
                    </View>

                    <View style={styles.statCard}>
                        <Text style={styles.statLabel}>
                            📈 This week
                        </Text>
                        <Text style={styles.statValue}>
                            {dashboard.scans_semana} scans
                        </Text>
                    </View>
                </View>
            )}

            {error && (
                <Text style={styles.errorText}>
                    {error}
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

    title: {
        color: "#FFF",
        fontSize: 26,
        fontWeight: "bold"
    },

    headerButtons: {
        flexDirection: "row",
        gap: 10
    },

    iconButton: {
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

    cardHeader: {
        flexDirection: "row",
        justifyContent: "space-between",
        marginBottom: 10
    },

    cardTitle: {
        color: "#FF7A1A",
        fontWeight: "600"
    },

    cardValue: {
        color: "#FFF",
        fontWeight: "bold"
    },

    barBackground: {
        height: 6,
        backgroundColor: "#333",
        borderRadius: 3,
        marginBottom: 10
    },

    barProgress: {
        height: 6,
        backgroundColor: "#FF7A1A",
        borderRadius: 3
    },

    proLink: {
        color: "#FF7A1A",
        fontSize: 13
    },

    instruction: {
        color: "#999",
        textAlign: "center",
        marginBottom: 20
    },

    scanButton: {
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

    statValue: {
        color: "#FFF",
        fontWeight: "bold",
        fontSize: 16
    },

    errorText: {
        color: "#FF5555",
        textAlign: "center",
        marginBottom: 20
    }

});