import { useState, useEffect } from "react";
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ScrollView,
  ActivityIndicator,
} from "react-native";
import {
  Crown,
  Zap,
  CheckCircle2,
  ShieldCheck,
  History,
  Sparkles,
  X,
} from "lucide-react-native";
import AsyncStorage from "@react-native-async-storage/async-storage";
import Purchases from "react-native-purchases";
import RevenueCatUI, { PAYWALL_RESULT } from "react-native-purchases-ui";
import { API_URL } from "../config";

export default function ProScreen({ navigation }) {
  const [isPremium, setIsPremium] = useState(false);
  const [precoFormatado, setPrecoFormatado] = useState(null);
  const [carregando, setCarregando] = useState(false);

  useEffect(() => {
    checkEntitlement();
    carregarPreco();
  }, []);

  async function carregarPreco() {
    try {
      const offerings = await Purchases.getOfferings();
      console.log("OFFERINGS:", JSON.stringify(offerings, null, 2));

      const pacote =
        offerings.current?.monthly ??
        offerings.current?.availablePackages?.[0];

      if (pacote?.product?.priceString) {
        setPrecoFormatado(pacote.product.priceString);
      } else {
        console.log("Nenhuma offering/package encontrada — offerings.current:", offerings.current);
        setPrecoFormatado(null);
      }
    } catch (e) {
      console.log("Erro ao buscar preço:", e);
      setPrecoFormatado(null);
    }
  }

  async function checkEntitlement() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (typeof customerInfo.entitlements.active["IronEye Pro"] !== "undefined") {
        setIsPremium(true);
      }
    } catch (e) {
      console.error("Erro ao verificar entitlement:", e);
    }
  }

  async function sincronizarComBackend() {
    try {
      const token = await AsyncStorage.getItem("token");
      if (!token) return;

      await fetch(`${API_URL}/subscription/verify`, {
        method: "POST",
        headers: {
          "Authorization": `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      });
    } catch (e) {
      console.error("Erro ao sincronizar com o backend:", e);
    }
  }

  async function subscrever() {
    if (carregando) return;
    try {
      setCarregando(true);
      const paywallResult = await RevenueCatUI.presentPaywall();

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          setIsPremium(true);
          await sincronizarComBackend();
          Alert.alert("IronEye Pro 🎉", "Subscription activated successfully! Enjoy your workout.");
          break;
        case PAYWALL_RESULT.CANCELLED:
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        default:
          break;
      }
    } catch (erro) {
      console.error("Erro ao abrir paywall:", erro);
      Alert.alert("Warning", "Could not open payment window. Please check your connection.");
    } finally {
      setCarregando(false);
    }
  }

  async function restaurarCompras() {
    if (carregando) return;
    try {
      setCarregando(true);
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active["IronEye Pro"] !== "undefined") {
        setIsPremium(true);
        await sincronizarComBackend();
        Alert.alert("Success", "Your subscription was restored successfully!");
      } else {
        Alert.alert("Info", "No active purchases found for this account.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not verify previous purchases.");
    } finally {
      setCarregando(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity style={styles.botaoFechar} onPress={() => navigation.goBack()}>
        <X color="#888" size={24} />
      </TouchableOpacity>

      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <Crown color="#0A0A0A" size={38} strokeWidth={2.5} />
        </View>
        <View style={styles.badgeTopo}>
          <Sparkles color="#FF7A1A" size={12} />
          <Text style={styles.badgeTexto}>PREMIUM ACCESS</Text>
        </View>
      </View>

      <Text style={styles.titulo}>
        Elevate your workout with <Text style={styles.destaque}>IronEye Pro</Text>
      </Text>
      <Text style={styles.subtitulo}>
        Unlock maximum AI power at the gym. More scans, perfect form, and zero ads.
      </Text>

      <View style={styles.beneficiosContainer}>
        <View style={styles.beneficioItem}>
          <View style={styles.iconeBeneficio}>
            <Zap color="#FF7A1A" size={20} />
          </View>
          <View style={styles.beneficioTextoContainer}>
            <Text style={styles.beneficioTitulo}>20 AI Scans Per Day</Text>
            <Text style={styles.beneficioDesc}>5x more capacity for complete workout sessions.</Text>
          </View>
        </View>

        <View style={styles.beneficioItem}>
          <View style={styles.iconeBeneficio}>
            <CheckCircle2 color="#FF7A1A" size={20} />
          </View>
          <View style={styles.beneficioTextoContainer}>
            <Text style={styles.beneficioTitulo}>Muscle & Biomechanics Analysis</Text>
            <Text style={styles.beneficioDesc}>Primary, secondary muscles, and detailed form tips.</Text>
          </View>
        </View>

        <View style={styles.beneficioItem}>
          <View style={styles.iconeBeneficio}>
            <History color="#FF7A1A" size={20} />
          </View>
          <View style={styles.beneficioTextoContainer}>
            <Text style={styles.beneficioTitulo}>Complete Exercise History</Text>
            <Text style={styles.beneficioDesc}>View and review all recently analyzed machines.</Text>
          </View>
        </View>

        <View style={styles.beneficioItem}>
          <View style={styles.iconeBeneficio}>
            <ShieldCheck color="#FF7A1A" size={20} />
          </View>
          <View style={styles.beneficioTextoContainer}>
            <Text style={styles.beneficioTitulo}>100% Ad-Free</Text>
            <Text style={styles.beneficioDesc}>Total focus on your weights without interruptions or waiting.</Text>
          </View>
        </View>
      </View>

      <View style={styles.precoCard}>
        <View style={styles.tagMelhorValor}>
          <Text style={styles.tagTexto}>MONTHLY PLAN</Text>
        </View>

        <View style={styles.precoLinha}>
          {precoFormatado ? (
            <>
              <Text style={styles.precoValor}>{precoFormatado}</Text>
              <Text style={styles.precoPeriodo}> / month</Text>
            </>
          ) : (
            <ActivityIndicator color="#FF7A1A" />
          )}
        </View>

        <Text style={styles.precoDesc}>
          Cancel anytime on Google Play. No commitment.
        </Text>
      </View>

      {isPremium ? (
        <View style={styles.cardJaPro}>
          <CheckCircle2 color="#00E676" size={22} />
          <Text style={styles.textoJaPro}>You are an IronEye Pro member ✅</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.botaoPrincipal}
          onPress={subscrever}
          disabled={carregando}
          activeOpacity={0.85}
        >
          {carregando ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.botaoPrincipalTexto}>Go Pro 🔥</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.botoesSecundarios}>
        <TouchableOpacity onPress={restaurarCompras} disabled={carregando}>
          <Text style={styles.textoRestaurar}>Restore purchases</Text>
        </TouchableOpacity>

        <Text style={styles.separador}>•</Text>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.textoDepois}>Not now</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.rodapeLegal}>
        Payment is processed securely by Google Play. You can manage or cancel your subscription anytime in Play Store settings.
      </Text>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#0A0A0E",
  },
  contentContainer: {
    paddingHorizontal: 22,
    paddingTop: 50,
    paddingBottom: 40,
    alignItems: "center",
  },
  botaoFechar: {
    position: "absolute",
    top: 50,
    right: 20,
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: "#161622",
    justifyContent: "center",
    alignItems: "center",
    zIndex: 10,
  },
  iconWrapper: {
    alignItems: "center",
    marginBottom: 16,
    marginTop: 10,
  },
  iconCircle: {
    width: 76,
    height: 76,
    borderRadius: 24,
    backgroundColor: "#FF7A1A",
    justifyContent: "center",
    alignItems: "center",
    shadowColor: "#FF7A1A",
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.5,
    shadowRadius: 18,
    elevation: 12,
  },
  badgeTopo: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#1E1A26",
    borderColor: "#FF7A1A",
    borderWidth: 1,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 20,
    marginTop: -10,
    gap: 5,
  },
  badgeTexto: {
    color: "#FF7A1A",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  titulo: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  destaque: {
    color: "#FF7A1A",
  },
  subtitulo: {
    color: "#9E9EA7",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 26,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  beneficiosContainer: {
    width: "100%",
    backgroundColor: "#13131C",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222230",
    marginBottom: 20,
    gap: 14,
  },
  beneficioItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  iconeBeneficio: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1F1A24",
    justifyContent: "center",
    alignItems: "center",
  },
  beneficioTextoContainer: {
    flex: 1,
  },
  beneficioTitulo: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  beneficioDesc: {
    color: "#8E8E98",
    fontSize: 12.5,
    lineHeight: 17,
  },
  precoCard: {
    width: "100%",
    backgroundColor: "#171724",
    borderRadius: 18,
    padding: 18,
    borderWidth: 1.5,
    borderColor: "#FF7A1A",
    alignItems: "center",
    marginBottom: 20,
    position: "relative",
  },
  tagMelhorValor: {
    position: "absolute",
    top: -11,
    backgroundColor: "#FF7A1A",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagTexto: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  precoLinha: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
    marginBottom: 4,
    minHeight: 40,
    justifyContent: "center",
  },
  precoValor: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
  },
  precoPeriodo: {
    color: "#9E9EA7",
    fontSize: 14,
    fontWeight: "600",
  },
  precoDesc: {
    color: "#7E7E8A",
    fontSize: 12,
    textAlign: "center",
  },
  botaoPrincipal: {
    width: "100%",
    backgroundColor: "#FF7A1A",
    paddingVertical: 16,
    borderRadius: 16,
    alignItems: "center",
    justifyContent: "center",
    marginBottom: 16,
    shadowColor: "#FF7A1A",
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.4,
    shadowRadius: 12,
    elevation: 8,
  },
  botaoPrincipalTexto: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  cardJaPro: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    backgroundColor: "#122A1E",
    borderColor: "#00E676",
    borderWidth: 1,
    width: "100%",
    paddingVertical: 15,
    borderRadius: 16,
    gap: 8,
    marginBottom: 16,
  },
  textoJaPro: {
    color: "#00E676",
    fontSize: 15,
    fontWeight: "700",
  },
  botoesSecundarios: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  textoRestaurar: {
    color: "#FF7A1A",
    fontSize: 13,
    fontWeight: "600",
  },
  separador: {
    color: "#444",
    fontSize: 13,
  },
  textoDepois: {
    color: "#7E7E8A",
    fontSize: 13,
    fontWeight: "500",
  },
  rodapeLegal: {
    color: "#5E5E6A",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 12,
  },
});