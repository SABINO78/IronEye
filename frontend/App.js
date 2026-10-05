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
  const [loading, setLoading] = useState(true);
  const [isLoggedIn, setIsLoggedIn] = useState(false);

  useEffect(() => {
    checkLogin();
  }, []);

  useEffect(() => {
    Purchases.setLogLevel(LOG_LEVEL.VERBOSE);
    const androidApiKey = "goog_PBftHZeZmBiYZsmVPucKgcFQrtw";
    if (Platform.OS === "android") {
      Purchases.configure({ apiKey: androidApiKey });
    }
  }, []);

  async function checkLogin() {
    try {
      const token = await AsyncStorage.getItem("token");
      setIsLoggedIn(token !== null);
    } catch (error) {
      console.error("Error checking login:", error);
    } finally {
      setLoading(false);
    }
  }

  if (loading) {
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
        {isLoggedIn ? (
          <>
            <Stack.Screen name="Home">
              {(props) => <HomeScreen {...props} onLogout={() => setIsLoggedIn(false)} />}
            </Stack.Screen>
            <Stack.Screen name="Profile">
              {(props) => <ProfileScreen {...props} onLogout={() => setIsLoggedIn(false)} />}
            </Stack.Screen>
            <Stack.Screen name="Pro" component={ProScreen} />
            <Stack.Screen name="History" component={HistoryScreen} />
            <Stack.Screen name="ScanDetails" component={ScanDetails} />
            <Stack.Screen name="Scan" component={ScanScreen} />
            <Stack.Screen name="ManualScan" component={ManualScanScreen} />
          </>
        ) : (
          <Stack.Screen name="Auth">
            {(props) => <AuthScreen {...props} onLogin={() => setIsLoggedIn(true)} />}
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