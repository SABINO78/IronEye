import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator } from "react-native";
import { useState, useEffect } from "react";
import { User, Calendar, LogOut, ArrowLeft } from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import { API_URL } from "../config";

export default function Profile({ navigation, onLogout }) {
    const [profile, setProfile] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState(null);

    useEffect(() => {
        loadProfile();
    }, []);

    async function loadProfile() {
        try {
            setLoading(true);
            const token = await AsyncStorage.getItem("token");
            if (!token) return;

            const response = await fetch(`${API_URL}/profile`, {
                method: "GET",
                headers: {
                    "Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            });
            const data = await response.json();
            if (response.ok) {
                setProfile(data);
            } else {
                setError("Could not load profile data");
            }
        } catch (err) {
            setError("No connection to server");
        } finally {
            setLoading(false);
        }
    }

    async function handleLogout() {
        await AsyncStorage.removeItem("token");
        if (onLogout) {
            onLogout();
        }
    }

    function formatDate(isoDate) {
        if (!isoDate) return "Recent";
        try {
            const d = new Date(isoDate);
            if (isNaN(d.getTime())) return isoDate;
            return d.toLocaleDateString("en-US", {
                day: "numeric",
                month: "long",
                year: "numeric"
            });
        } catch (e) {
            return isoDate;
        }
    }

    return (
        <View style={styles.container}>
            <TouchableOpacity style={styles.topBackButton} onPress={() => navigation.goBack()}>
                <ArrowLeft color="#FF7A1A" size={22} />
                <Text style={styles.topBackText}>Back</Text>
            </TouchableOpacity>

            <View style={styles.content}>
                <View style={styles.avatarCircle}>
                    <User color="#0A0A0E" size={44} strokeWidth={2.2} />
                </View>

                <Text style={styles.profileTitle}>Your Profile</Text>

                {loading ? (
                    <ActivityIndicator size="large" color="#FF7A1A" style={{ marginVertical: 30 }} />
                ) : profile ? (
                    <View style={styles.cardsContainer}>
                        <View style={styles.infoCard}>
                            <View style={styles.infoIconBox}>
                                <User color="#FF7A1A" size={20} />
                            </View>
                            <View style={styles.infoTexts}>
                                <Text style={styles.infoLabel}>ACCOUNT EMAIL</Text>
                                <Text style={styles.infoValue} numberOfLines={1}>{profile.email}</Text>
                            </View>
                        </View>

                        <View style={styles.infoCard}>
                            <View style={styles.infoIconBox}>
                                <Calendar color="#FF7A1A" size={20} />
                            </View>
                            <View style={styles.infoTexts}>
                                <Text style={styles.infoLabel}>MEMBER SINCE</Text>
                                <Text style={styles.infoValue}>{formatDate(profile.created_at)}</Text>
                            </View>
                        </View>
                    </View>
                ) : null}

                {error && <Text style={styles.errorText}>{error}</Text>}

                <TouchableOpacity style={styles.logoutButton} onPress={handleLogout} activeOpacity={0.85}>
                    <LogOut color="#000" size={18} />
                    <Text style={styles.logoutButtonText}>Log Out</Text>
                </TouchableOpacity>
            </View>
        </View>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A0A0E",
        paddingHorizontal: 22,
        paddingTop: 55,
        paddingBottom: 30,
    },
    topBackButton: {
        flexDirection: "row",
        alignItems: "center",
        gap: 6,
        alignSelf: "flex-start",
        marginBottom: 20,
    },
    topBackText: {
        color: "#FF7A1A",
        fontSize: 16,
        fontWeight: "600",
    },
    content: {
        alignItems: "center",
        width: "100%",
    },
    avatarCircle: {
        width: 86,
        height: 86,
        borderRadius: 28,
        backgroundColor: "#FF7A1A",
        justifyContent: "center",
        alignItems: "center",
        marginBottom: 16,
        shadowColor: "#FF7A1A",
        shadowOffset: { width: 0, height: 6 },
        shadowOpacity: 0.45,
        shadowRadius: 14,
        elevation: 10,
    },
    profileTitle: {
        color: "#FFFFFF",
        fontSize: 22,
        fontWeight: "800",
        marginBottom: 24,
    },
    cardsContainer: {
        width: "100%",
        gap: 12,
        marginBottom: 30,
    },
    infoCard: {
        flexDirection: "row",
        alignItems: "center",
        backgroundColor: "#13131C",
        borderRadius: 16,
        padding: 16,
        borderWidth: 1,
        borderColor: "#222230",
        gap: 14,
    },
    infoIconBox: {
        width: 40,
        height: 40,
        borderRadius: 12,
        backgroundColor: "#1F1A24",
        justifyContent: "center",
        alignItems: "center",
    },
    infoTexts: {
        flex: 1,
    },
    infoLabel: {
        color: "#8E8E98",
        fontSize: 11,
        fontWeight: "700",
        letterSpacing: 0.6,
        marginBottom: 3,
    },
    infoValue: {
        color: "#FFFFFF",
        fontSize: 15,
        fontWeight: "600",
    },
    logoutButton: {
        flexDirection: "row",
        alignItems: "center",
        justifyContent: "center",
        backgroundColor: "#FF7A1A",
        paddingVertical: 15,
        borderRadius: 14,
        width: "100%",
        gap: 8,
        marginTop: 10,
    },
    logoutButtonText: {
        color: "#000000",
        fontSize: 15,
        fontWeight: "800",
    },
    errorText: {
        color: "#FF4444",
        fontSize: 13,
        textAlign: "center",
        marginBottom: 16,
    },
});