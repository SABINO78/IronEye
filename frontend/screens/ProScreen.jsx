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
  const [formattedPrice, setFormattedPrice] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    checkEntitlement();
    loadPrice();
  }, []);

  async function loadPrice() {
    try {
      const offerings = await Purchases.getOfferings();
      const pkg =
        offerings.current?.monthly ??
        offerings.current?.availablePackages?.[0];

      if (pkg?.product?.priceString) {
        setFormattedPrice(pkg.product.priceString);
      } else {
        setFormattedPrice(null);
      }
    } catch (e) {
      console.log("Error fetching price:", e);
      setFormattedPrice(null);
    }
  }

  async function checkEntitlement() {
    try {
      const customerInfo = await Purchases.getCustomerInfo();
      if (typeof customerInfo.entitlements.active["IronEye Pro"] !== "undefined") {
        setIsPremium(true);
      }
    } catch (e) {
      console.error("Error checking entitlement:", e);
    }
  }

  async function syncWithBackend() {
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
      console.error("Error syncing with backend:", e);
    }
  }

  async function subscribe() {
    if (loading) return;
    try {
      setLoading(true);
      const paywallResult = await RevenueCatUI.presentPaywall();

      switch (paywallResult) {
        case PAYWALL_RESULT.PURCHASED:
        case PAYWALL_RESULT.RESTORED:
          setIsPremium(true);
          await syncWithBackend();
          Alert.alert("IronEye Pro 🎉", "Subscription activated successfully! Enjoy your workout.");
          break;
        case PAYWALL_RESULT.CANCELLED:
        case PAYWALL_RESULT.NOT_PRESENTED:
        case PAYWALL_RESULT.ERROR:
        default:
          break;
      }
    } catch (err) {
      console.error("Error opening paywall:", err);
      Alert.alert("Warning", "Could not open payment window. Please check your connection.");
    } finally {
      setLoading(false);
    }
  }

  async function restorePurchases() {
    if (loading) return;
    try {
      setLoading(true);
      const customerInfo = await Purchases.restorePurchases();
      if (typeof customerInfo.entitlements.active["IronEye Pro"] !== "undefined") {
        setIsPremium(true);
        await syncWithBackend();
        Alert.alert("Success", "Your subscription was restored successfully!");
      } else {
        Alert.alert("Info", "No active purchases found for this account.");
      }
    } catch (e) {
      Alert.alert("Error", "Could not verify previous purchases.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>
      <TouchableOpacity style={styles.closeButton} onPress={() => navigation.goBack()}>
        <X color="#888" size={24} />
      </TouchableOpacity>

      <View style={styles.iconWrapper}>
        <View style={styles.iconCircle}>
          <Crown color="#0A0A0A" size={38} strokeWidth={2.5} />
        </View>
        <View style={styles.topBadge}>
          <Sparkles color="#FF7A1A" size={12} />
          <Text style={styles.badgeText}>PREMIUM ACCESS</Text>
        </View>
      </View>

      <Text style={styles.title}>
        Elevate your workout with <Text style={styles.highlight}>IronEye Pro</Text>
      </Text>
      <Text style={styles.subtitle}>
        Unlock maximum AI power at the gym. More scans, perfect form, and zero ads.
      </Text>

      <View style={styles.benefitsContainer}>
        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <Zap color="#FF7A1A" size={20} />
          </View>
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>20 AI Scans Per Day</Text>
            <Text style={styles.benefitDesc}>5x more capacity for complete workout sessions.</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <CheckCircle2 color="#FF7A1A" size={20} />
          </View>
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>Muscle & Biomechanics Analysis</Text>
            <Text style={styles.benefitDesc}>Primary, secondary muscles, and detailed form tips.</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <History color="#FF7A1A" size={20} />
          </View>
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>Complete Exercise History</Text>
            <Text style={styles.benefitDesc}>View and review all recently analyzed machines.</Text>
          </View>
        </View>

        <View style={styles.benefitItem}>
          <View style={styles.benefitIcon}>
            <ShieldCheck color="#FF7A1A" size={20} />
          </View>
          <View style={styles.benefitTextContainer}>
            <Text style={styles.benefitTitle}>100% Ad-Free</Text>
            <Text style={styles.benefitDesc}>Total focus on your weights without interruptions or waiting.</Text>
          </View>
        </View>
      </View>

      <View style={styles.priceCard}>
        <View style={styles.bestValueTag}>
          <Text style={styles.tagText}>MONTHLY PLAN</Text>
        </View>

        <View style={styles.priceRow}>
          {formattedPrice ? (
            <>
              <Text style={styles.priceValue}>{formattedPrice}</Text>
              <Text style={styles.pricePeriod}> / month</Text>
            </>
          ) : (
            <ActivityIndicator color="#FF7A1A" />
          )}
        </View>

        <Text style={styles.priceDesc}>
          Cancel anytime on Google Play. No commitment.
        </Text>
      </View>

      {isPremium ? (
        <View style={styles.alreadyProCard}>
          <CheckCircle2 color="#00E676" size={22} />
          <Text style={styles.alreadyProText}>You are an IronEye Pro member ✅</Text>
        </View>
      ) : (
        <TouchableOpacity
          style={styles.mainButton}
          onPress={subscribe}
          disabled={loading}
          activeOpacity={0.85}
        >
          {loading ? (
            <ActivityIndicator color="#000" />
          ) : (
            <Text style={styles.mainButtonText}>Go Pro 🔥</Text>
          )}
        </TouchableOpacity>
      )}

      <View style={styles.secondaryButtons}>
        <TouchableOpacity onPress={restorePurchases} disabled={loading}>
          <Text style={styles.restoreText}>Restore purchases</Text>
        </TouchableOpacity>

        <Text style={styles.separator}>•</Text>

        <TouchableOpacity onPress={() => navigation.goBack()}>
          <Text style={styles.laterText}>Not now</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.legalFooter}>
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
  closeButton: {
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
  topBadge: {
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
  badgeText: {
    color: "#FF7A1A",
    fontSize: 10,
    fontWeight: "bold",
    letterSpacing: 0.8,
  },
  title: {
    color: "#FFFFFF",
    fontSize: 24,
    fontWeight: "800",
    textAlign: "center",
    marginBottom: 8,
    lineHeight: 30,
  },
  highlight: {
    color: "#FF7A1A",
  },
  subtitle: {
    color: "#9E9EA7",
    fontSize: 14,
    textAlign: "center",
    marginBottom: 26,
    lineHeight: 20,
    paddingHorizontal: 10,
  },
  benefitsContainer: {
    width: "100%",
    backgroundColor: "#13131C",
    borderRadius: 18,
    padding: 16,
    borderWidth: 1,
    borderColor: "#222230",
    marginBottom: 20,
    gap: 14,
  },
  benefitItem: {
    flexDirection: "row",
    alignItems: "flex-start",
    gap: 14,
  },
  benefitIcon: {
    width: 38,
    height: 38,
    borderRadius: 12,
    backgroundColor: "#1F1A24",
    justifyContent: "center",
    alignItems: "center",
  },
  benefitTextContainer: {
    flex: 1,
  },
  benefitTitle: {
    color: "#FFFFFF",
    fontSize: 15,
    fontWeight: "700",
    marginBottom: 2,
  },
  benefitDesc: {
    color: "#8E8E98",
    fontSize: 12.5,
    lineHeight: 17,
  },
  priceCard: {
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
  bestValueTag: {
    position: "absolute",
    top: -11,
    backgroundColor: "#FF7A1A",
    paddingHorizontal: 12,
    paddingVertical: 3,
    borderRadius: 12,
  },
  tagText: {
    color: "#000",
    fontSize: 10,
    fontWeight: "900",
    letterSpacing: 0.6,
  },
  priceRow: {
    flexDirection: "row",
    alignItems: "baseline",
    marginTop: 4,
    marginBottom: 4,
    minHeight: 40,
    justifyContent: "center",
  },
  priceValue: {
    color: "#FFFFFF",
    fontSize: 32,
    fontWeight: "900",
  },
  pricePeriod: {
    color: "#9E9EA7",
    fontSize: 14,
    fontWeight: "600",
  },
  priceDesc: {
    color: "#7E7E8A",
    fontSize: 12,
    textAlign: "center",
  },
  mainButton: {
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
  mainButtonText: {
    color: "#000000",
    fontSize: 16,
    fontWeight: "800",
    letterSpacing: 0.3,
  },
  alreadyProCard: {
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
  alreadyProText: {
    color: "#00E676",
    fontSize: 15,
    fontWeight: "700",
  },
  secondaryButtons: {
    flexDirection: "row",
    alignItems: "center",
    justifyContent: "center",
    gap: 12,
    marginBottom: 16,
  },
  restoreText: {
    color: "#FF7A1A",
    fontSize: 13,
    fontWeight: "600",
  },
  separator: {
    color: "#444",
    fontSize: 13,
  },
  laterText: {
    color: "#7E7E8A",
    fontSize: 13,
    fontWeight: "500",
  },
  legalFooter: {
    color: "#5E5E6A",
    fontSize: 11,
    textAlign: "center",
    lineHeight: 15,
    paddingHorizontal: 12,
  },
});