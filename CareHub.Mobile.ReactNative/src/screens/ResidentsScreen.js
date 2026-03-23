import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, FlatList, RefreshControl, SafeAreaView, Text, TextInput, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getResidents } from "../services/apiClient";

export default function ResidentsScreen() {
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
      const data = await getResidents(token);
      setItems(Array.isArray(data) ? data : []);
    } catch (err) {
      setError(err?.message || "Failed to load residents.");
    } finally {
      if (isRefresh) setRefreshing(false);
      else setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const first = (item.residentFName || item.ResidentFName || "").toLowerCase();
      const last = (item.residentLName || item.ResidentLName || "").toLowerCase();
      const room = String(item.roomNumber || item.RoomNumber || "").toLowerCase();
      const full = `${first} ${last}`.trim();
      return full.includes(term) || room.includes(term);
    });
  }, [items, query]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Residents</Text>
      <Text style={{ marginBottom: 8 }}>
        Access mode: {user?.role === "Nurse" ? "CRUD target" : "Read-only target"}
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name or room"
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
            <Text>
              {item.residentFName || item.ResidentFName} {item.residentLName || item.ResidentLName}
            </Text>
            <Text style={{ color: "#666" }}>Room {item.roomNumber || item.RoomNumber || "N/A"}</Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
