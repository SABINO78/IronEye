import React, { useState, useEffect } from "react";
import { StyleSheet, View, ActivityIndicator, Platform } from "react-native";
import { StatusBar } from "expo-status-bar";
import { NavigationContainer } from "@react-navigation/native";
import { createNativeStackNavigator } from "@react-navigation/native-stack";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases, { LOG_LEVEL } from "react-native-purchases";

import AuthScreen from "./screens/AuthScreen";
import HomeScreen from "./screens/HomeScreen";
import ProfileScreen from "./screens/ProfileScreen";
import ProScreen from "./screens/ProScreen";
import ScanDetails from "./screens/ScanDetails";
import HistoryScreen from "./screens/HistoryScreen";
import ScanScreen from "./screens/ScanScreen";
import ManualScanScreen from "./screens/ManualScanScreen"

const Stack = createNativeStackNavigator();

export default function App() {
  const [carregando, setCarregando] = useState(true);
  const [isLogado, setIsLogado] = useState(false);

  useEffect(() => {
    verificarLogin();
  }, []);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    const androidApiKey = "goog_PBftHZeZmBiYZsmVPucKgcFQrtw";
    if (Platform.OS === "android") {
      Purchases.configure({ apiKey: androidApiKey });
    }
  }, []);

  async function verificarLogin() {
    try {
      const token = await AsyncStorage.getItem("token");
      setIsLogado(token !== null);
    } catch (error) {
      console.error("Erro ao verificar login:", error);
    } finally {
      setCarregando(false);
    }
  }

  if (carregando) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#FF7A1A" />
      </View>
    );
  }

  return (
    <NavigationContainer>
      <StatusBar style="auto" />
      <Stack.Navigator screenOptions={{ headerShown: false }}>
        {isLogado ? (
          <>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} onLogout={() => setIsLogado(false)} />}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {(props) => <ProfileScreen {...props} onLogout={() => setIsLogado(false)} />}
            </Stack.Screen>
            <Stack.Screen name="Pro" component={ProScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="ScanDetails" component={ScanDetails} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="ManualScan" component={ManualScanScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth">
            {(props) => <AuthScreen {...props} onLogin={() => setIsLogado(true)} />}
          </Stack.Screen>
        )}
      </Stack.Navigator>
    </NavigationContainer>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#fff",
    alignItems: "center",
    justifyContent: "center",
  },
});