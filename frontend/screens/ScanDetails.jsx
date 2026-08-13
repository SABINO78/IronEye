import {
    View,
    Text,
    StyleSheet,
    ScrollView,
} from "react-native";


export default function ScanDetails({ route }) {

    const { scan } = route.params;


    const secondaryMuscles =
        Array.isArray(scan.secondary_muscles)
            ? scan.secondary_muscles
            : [];


    const tips =
        Array.isArray(scan.tips)
            ? scan.tips
            : [];


    return (

        <ScrollView style={styles.container}>

            <Text style={styles.titulo}>
                {scan.machine_name || "Máquina"}
            </Text>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Grupo muscular
                </Text>

                <Text style={styles.valor}>
                    {scan.muscle_group || "Não identificado"}
                </Text>

            </View>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Músculo principal
                </Text>

                <Text style={styles.valor}>
                    {scan.primary_muscle || "Não identificado"}
                </Text>

            </View>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Músculos secundários
                </Text>


                {secondaryMuscles.length > 0 ? (

                    secondaryMuscles.map(
                        (musculo, index) => (

                            <Text
                                key={index}
                                style={styles.valor}
                            >
                                • {musculo}
                            </Text>

                        )
                    )

                ) : (

                    <Text style={styles.texto}>
                        Não identificado
                    </Text>

                )}

            </View>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Descrição
                </Text>

                <Text style={styles.texto}>
                    {scan.description || "Sem descrição disponível."}
                </Text>

            </View>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Como utilizar
                </Text>

                <Text style={styles.texto}>
                    {scan.how_to_use || "Sem instruções disponíveis."}
                </Text>

            </View>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Dicas
                </Text>


                {tips.length > 0 ? (

                    tips.map(
                        (tip, index) => (

                            <Text
                                key={index}
                                style={styles.texto}
                            >
                                • {tip}
                            </Text>

                        )
                    )

                ) : (

                    <Text style={styles.texto}>
                        Sem dicas disponíveis.
                    </Text>

                )}

            </View>


            <View style={styles.card}>

                <Text style={styles.label}>
                    Confiança da IA
                </Text>

                <Text style={styles.valor}>
                    {scan.confidence ?? 0}%
                </Text>

            </View>


            {scan.scanned_at && (

                <View style={styles.card}>

                    <Text style={styles.label}>
                        Data do Scan
                    </Text>

                    <Text style={styles.valor}>
                        {new Date(
                            scan.scanned_at
                        ).toLocaleString()}
                    </Text>

                </View>

            )}


            {scan.scans_restantes !== undefined && (

                <View style={styles.card}>

                    <Text style={styles.label}>
                        Scans restantes
                    </Text>

                    <Text style={styles.valor}>
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

    titulo: {

        color: "#FFF",

        fontSize: 30,

        fontWeight: "bold",

        marginTop: 40,

        marginBottom: 25,

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

    valor: {

        color: "#FFF",

        fontSize: 16,

    },

    texto: {

        color: "#DDD",

        fontSize: 15,

        lineHeight: 23,

    },

});