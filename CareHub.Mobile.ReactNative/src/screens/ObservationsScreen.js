import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  createObservation,
  deleteObservation,
  getObservations,
  getObservationsByResident,
  getResidents,
  updateObservation
} from "../services/apiClient";

function residentName(item) {
  const first = item.residentFName || item.ResidentFName || "";
  const last = item.residentLName || item.ResidentLName || "";
  return `${first} ${last}`.trim();
}

export default function ObservationsScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [residents, setResidents] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [selectedResidentName, setSelectedResidentName] = useState("");
  const [type, setType] = useState("");
  const [value, setValue] = useState("");
  const [editingId, setEditingId] = useState("");
  const [saving, setSaving] = useState(false);
  const [loadingList, setLoadingList] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canRecord = user?.role === "Nurse" || user?.role === "General CareStaff";
  const isObserver = user?.role === "Observer";

  const loadObservations = useCallback(
    async (residentIdOverride = selectedResidentId) => {
      try {
        setLoadingList(true);
        setError("");
        const data =
          residentIdOverride && canRecord
            ? await getObservationsByResident(residentIdOverride, token)
            : await getObservations(token);
        setItems(Array.isArray(data) ? data : []);
      } catch (err) {
        setError(err?.message || "Failed to load observations.");
      } finally {
        setLoadingList(false);
      }
    },
    [canRecord, selectedResidentId, token]
  );

  const onRefresh = useCallback(async () => {
    try {
      setRefreshing(true);
      await loadObservations();
    } finally {
      setRefreshing(false);
    }
  }, [loadObservations]);

  const loadResidents = useCallback(async () => {
    if (!canRecord) {
      setResidents([]);
      return;
    }

    try {
      const data = await getResidents(token);
      const list = Array.isArray(data) ? data : [];
      setResidents(list);
      if (list.length > 0) {
        const first = list[0];
        const residentId = String(first.id || first.Id || "");
        setSelectedResidentId((current) => current || residentId);
        setSelectedResidentName((current) => current || residentName(first));
      }
    } catch (err) {
      setError(err?.message || "Failed to load residents for observation entry.");
    }
  }, [canRecord, token]);

  useEffect(() => {
    loadResidents();
  }, [loadResidents]);

  useEffect(() => {
    loadObservations();
  }, [loadObservations]);

  function pickResident(resident) {
    const residentId = String(resident.id || resident.Id || "");
    setSelectedResidentId(residentId);
    setSelectedResidentName(residentName(resident));
    loadObservations(residentId);
  }

  function resetForm() {
    setEditingId("");
    setType("");
    setValue("");
  }

  async function onSaveObservation() {
    setSuccess("");
    setError("");

    if (!selectedResidentId) {
      setError("Choose a resident.");
      return;
    }

    if (!type.trim() || !value.trim()) {
      setError("Type and value are required.");
      return;
    }

    try {
      setSaving(true);
      const payload = {
        id: editingId || undefined,
        residentId: selectedResidentId,
        residentName: selectedResidentName,
        type: type.trim(),
        value: value.trim(),
        recordedBy: user?.displayName || user?.username || "mobile-user"
      };

      if (editingId) {
        await updateObservation(editingId, { ...payload, id: editingId }, token);
        setSuccess("Observation updated.");
      } else {
        await createObservation(payload, token);
        setSuccess("Observation saved.");
      }

      resetForm();
      await loadObservations(selectedResidentId);
    } catch (err) {
      setError(err?.message || "Failed to save observation.");
    } finally {
      setSaving(false);
    }
  }

  function startEdit(item) {
    setEditingId(String(item.id || item.Id || ""));
    setType((item.type || item.Type || "").toString());
    setValue((item.value || item.Value || "").toString());
    setSelectedResidentId(String(item.residentId || item.ResidentId || ""));
    setSelectedResidentName((item.residentName || item.ResidentName || "").toString());
    setError("");
    setSuccess("");
  }

  function confirmDelete(item) {
    const observationId = String(item.id || item.Id || "");
    Alert.alert(
      "Delete observation",
      "This permanently removes the observation.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setError("");
              setSuccess("");
              await deleteObservation(observationId, token);
              if (editingId === observationId) {
                resetForm();
              }
              setSuccess("Observation deleted.");
              await loadObservations(selectedResidentId);
            } catch (err) {
              setError(err?.message || "Failed to delete observation.");
            }
          }
        }
      ]
    );
  }

  const modeLabel = useMemo(() => {
    if (isObserver) return "Read-only (own observations)";
    if (canRecord) return "Staff observation management";
    return "Unavailable";
  }, [canRecord, isObserver]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    if (!term) return items;
    return items.filter((item) => {
      const typeText = String(item.type || item.Type || "").toLowerCase();
      const valueText = String(item.value || item.Value || "").toLowerCase();
      const nameText = String(item.residentName || item.ResidentName || "").toLowerCase();
      const recorder = String(item.recordedBy || item.RecordedBy || "").toLowerCase();
      return (
        typeText.includes(term) ||
        valueText.includes(term) ||
        nameText.includes(term) ||
        recorder.includes(term)
      );
    });
  }, [items, query]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Observations</Text>
      <Text style={{ marginBottom: 8 }}>Access mode: {modeLabel}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Filter observations"
        style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
      />
      {canRecord ? (
        <View
          style={{
            marginBottom: 12,
            padding: 12,
            borderWidth: 1,
            borderColor: "#ddd",
            borderRadius: 8
          }}
        >
          <Text style={{ fontWeight: "600", marginBottom: 8 }}>
            {editingId ? "Edit Observation" : "Record Observation"}
          </Text>
          <Text style={{ marginBottom: 4 }}>Resident</Text>
          <FlatList
            horizontal
            data={residents}
            keyExtractor={(item) => String(item.id || item.Id)}
            renderItem={({ item }) => {
              const id = String(item.id || item.Id);
              const fullName = residentName(item);
              const selected = id === selectedResidentId;
              return (
                <TouchableOpacity
                  onPress={() => pickResident(item)}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: selected ? "#2a7" : "#ccc",
                    backgroundColor: selected ? "#e7fff4" : "#fff",
                    borderRadius: 8
                  }}
                >
                  <Text>{fullName || "Unknown"}</Text>
                </TouchableOpacity>
              );
            }}
          />
          <TextInput
            placeholder="Type (e.g., BP, Temp, Note)"
            value={type}
            onChangeText={setType}
            style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
          />
          <TextInput
            placeholder="Value (e.g., 120/80)"
            value={value}
            onChangeText={setValue}
            style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
          />
          <TouchableOpacity
            onPress={onSaveObservation}
            disabled={saving}
            style={{
              backgroundColor: saving ? "#8fbca8" : "#2a7",
              paddingVertical: 10,
              borderRadius: 6,
              alignItems: "center",
              marginBottom: editingId ? 8 : 0
            }}
          >
            <Text style={{ color: "white", fontWeight: "600" }}>
              {saving ? "Saving..." : editingId ? "Save Changes" : "Save Observation"}
            </Text>
          </TouchableOpacity>
          {editingId ? (
            <TouchableOpacity onPress={resetForm} style={{ alignItems: "center", paddingVertical: 4 }}>
              <Text style={{ color: "#666" }}>Cancel Edit</Text>
            </TouchableOpacity>
          ) : null}
        </View>
      ) : null}
      {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#2a7", marginBottom: 8 }}>{success}</Text> : null}
      {isObserver ? <Text style={{ marginBottom: 8 }}>Observer can only view their own records.</Text> : null}
      {loadingList ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}
      <FlatList
        data={filteredItems}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        keyExtractor={(item) => String(item.id || item.Id)}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text>
              {(item.type || item.Type || "").toString()}: {(item.value || item.Value || "").toString()}
            </Text>
            <Text style={{ color: "#666" }}>
              {(item.residentName || item.ResidentName || "").toString()} | {(item.recordedBy || item.RecordedBy || "").toString()}
            </Text>
            <Text style={{ color: "#666" }}>{(item.recordedAt || item.RecordedAt || "").toString()}</Text>
            {canRecord ? (
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                <TouchableOpacity onPress={() => startEdit(item)} style={{ marginRight: 12 }}>
                  <Text style={{ color: "#2a7" }}>Edit</Text>
                </TouchableOpacity>
                <TouchableOpacity onPress={() => confirmDelete(item)}>
                  <Text style={{ color: "#c22" }}>Delete</Text>
                </TouchableOpacity>
              </View>
            ) : null}
          </View>
        )}
      />
    </SafeAreaView>
  );
}
