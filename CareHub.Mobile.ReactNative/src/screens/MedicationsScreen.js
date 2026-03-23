import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMedications } from "../services/apiClient";

export default function MedicationsScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");

  const load = useCallback(async (isRefresh = false) => {
    try {
      if (isRefresh) setRefreshing(true);
      else setLoading(true);
      setError("");
      const data = await getMedications(token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Failed to load medications.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const modeLabel = useMemo(() => {
    if (user?.role === "Observer") return "Read-only (own medications)";
    if (user?.role === "Nurse") return "CRUD target";
    return "Unavailable";
  }, [user]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const medName = String(item.medName || item.MedName || "").toLowerCase();
      const dosage = String(item.dosage || item.Dosage || "").toLowerCase();
      return medName.includes(term) || dosage.includes(term);
    });
  }, [items, query]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Medications</Text>
      <Text style={{ marginBottom: 8 }}>Access mode: {modeLabel}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by medication or dosage"
        style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
      />
      {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}
      <FlatList
        data={filteredItems}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        keyExtractor={(item) => String(item.id || item.Id)}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text>{item.medName || item.MedName || "Unnamed medication"}</Text>
            <Text style={{ color: "#666" }}>{item.dosage || item.Dosage || "No dosage"}</Text>
            <Text style={{ color: "#666" }}>
              Stock: {item.stockQuantity ?? item.StockQuantity ?? 0}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
