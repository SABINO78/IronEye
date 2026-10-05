import {
    View,
    Text,
    StyleSheet,
    ScrollView,
    TouchableOpacity,
} from "react-native";

export default function ScanDetails({ route, navigation }) {
    const { scan } = route.params;

    const secondaryMuscles = Array.isArray(scan.secondary_muscles)
        ? scan.secondary_muscles
        : [];

    const tips = Array.isArray(scan.tips)
        ? scan.tips
        : [];

    return (
        <ScrollView style={styles.container}>
            <TouchableOpacity
                style={styles.backButton}
                onPress={() => navigation.goBack()}
            >
                <Text style={styles.backButtonText}>← Back</Text>
            </TouchableOpacity>

            <Text style={styles.title}>
                {scan.machine_name || "Machine"}
            </Text>

            <View style={styles.card}>
                <Text style={styles.label}>
                    Muscle group
                </Text>
                <Text style={styles.value}>
                    {scan.muscle_group || "Not identified"}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>
                    Primary muscle
                </Text>
                <Text style={styles.value}>
                    {scan.primary_muscle || "Not identified"}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>
                    Secondary muscles
                </Text>
                {secondaryMuscles.length > 0 ? (
                    secondaryMuscles.map((muscle, index) => (
                        <Text key={index} style={styles.value}>
                            • {muscle}
                        </Text>
                    ))
                ) : (
                    <Text style={styles.bodyText}>
                        Not identified
                    </Text>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>
                    Description
                </Text>
                <Text style={styles.bodyText}>
                    {scan.description || "No description available."}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>
                    How to use
                </Text>
                <Text style={styles.bodyText}>
                    {scan.how_to_use || "No instructions available."}
                </Text>
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>
                    Tips
                </Text>
                {tips.length > 0 ? (
                    tips.map((tip, index) => (
                        <Text key={index} style={styles.bodyText}>
                            • {tip}
                        </Text>
                    ))
                ) : (
                    <Text style={styles.bodyText}>
                        No tips available.
                    </Text>
                )}
            </View>

            <View style={styles.card}>
                <Text style={styles.label}>
                    AI Confidence
                </Text>
                <Text style={styles.value}>
                    {scan.confidence ?? 0}%
                </Text>
            </View>

            {scan.scanned_at && (
                <View style={styles.card}>
                    <Text style={styles.label}>
                        Scan Date
                    </Text>
                    <Text style={styles.value}>
                        {new Date(scan.scanned_at).toLocaleString()}
                    </Text>
                </View>
            )}

            {scan.scans_restantes !== undefined && (
                <View style={styles.card}>
                    <Text style={styles.label}>
                        Scans remaining
                    </Text>
                    <Text style={styles.value}>
                        {scan.scans_restantes}
                    </Text>
                </View>
            )}
        </ScrollView>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: "#0A0A0A",
        padding: 20,
    },
    title: {
        color: "#FFF",
        fontSize: 30,
        fontWeight: "bold",
        marginTop: 10,
        marginBottom: 25,
    },
    backButton: {
        marginTop: 40,
        paddingVertical: 8,
    },
    backButtonText: {
        color: "#FF8C00",
        fontSize: 16,
        fontWeight: "600",
    },
    card: {
        backgroundColor: "#1A1A2E",
        borderRadius: 15,
        padding: 18,
        marginBottom: 15,
    },
    label: {
        color: "#FF8C00",
        fontWeight: "bold",
        fontSize: 16,
        marginBottom: 8,
    },
    value: {
        color: "#FFF",
        fontSize: 16,
    },
    bodyText: {
        color: "#DDD",
        fontSize: 15,
        lineHeight: 23,
    },
});