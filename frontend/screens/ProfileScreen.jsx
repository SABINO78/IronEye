import {View, Text, StyleSheet, TouchableOpacity} from "react-native"
import { useState, useEffect } from "react"
import AsyncStorage from "@react-native-async-storage/async-storage"
import { API_URL } from "../config"

export default function Profile({navigation}){
    const [perfil, setPerfil] = useState(null)
    const [Erro, setErro] = useState(null)

    useEffect(() => {
        carregarPerfil()
    }, [])

    async function carregarPerfil() {
        const token = await AsyncStorage.getItem("token")
        try{
            const resposta = await fetch(`${API_URL}/dashboard`, {
                method:"GET",
                headers: {"Content-Type": "application/json",
                    "Authorization": `Bearer ${token}`
                }
            })
            const dados = await resposta.json()
            if (resposta.ok) setPerfil(dados)
        } catch(erro) {
            setErro("Não foi possível carregar o perfil")
        }
    }

    async function Logou() {
        await AsyncStorage.removeItem("token")
        navigation.navigate("Login")
    }

    return (
        <View style={styles.container}>
            <Text style={styles.email}>{perfil ? perfil.email : "A carregar..."}</Text>
            {perfil && (
                <Text style={styles.dataCriacao}>
                    Conta criada em: {perfil.created_at}
                </Text>
            )}
            <TouchableOpacity style={styles.botaoLogout} onPress={Logou}>
                <Text style={styles.botaoTexto}>Sair da conta</Text>
            </TouchableOpacity>
        </View>
    )
}

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: "#0A0A0A", justifyContent: "center", alignItems: "center", padding: 20 },
    email: { color: "#FFF", fontSize: 18, fontWeight: "bold", marginBottom: 10 },
    dataCriacao: { color: "#999", fontSize: 14, marginBottom: 40 },
    botaoLogout: { backgroundColor: "#FF7A1A", padding: 15, borderRadius: 10, width: "100%", alignItems: "center" },
    botaoTexto: { color: "#000", fontWeight: "bold" }
});