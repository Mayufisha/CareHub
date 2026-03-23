import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  FlatList,
  SafeAreaView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  createMarEntry,
  getMarEntries,
  getMedications,
  getResidents,
  voidMarEntry
} from "../services/apiClient";

const MAR_STATUSES = ["Given", "Refused", "Held", "Missed", "NotAvailable"];

function toResidentName(resident) {
  const first = resident.residentFName || resident.ResidentFName || "";
  const last = resident.residentLName || resident.ResidentLName || "";
  return `${first} ${last}`.trim() || "Unknown resident";
}

function generateGuid() {
  const block = () => Math.floor((1 + Math.random()) * 0x10000).toString(16).slice(1);
  return `${block()}${block()}-${block()}-4${block().slice(1)}-${((8 + Math.random() * 4) | 0).toString(16)}${block().slice(1)}-${block()}${block()}${block()}`;
}

export default function MarScreen() {
  const { token, user } = useAuth();
  const [entries, setEntries] = useState([]);
  const [residents, setResidents] = useState([]);
  const [medications, setMedications] = useState([]);
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [selectedStatus, setSelectedStatus] = useState("Given");
  const [doseQuantity, setDoseQuantity] = useState("1");
  const [doseUnit, setDoseUnit] = useState("tablet");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [voidingId, setVoidingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const residentById = useMemo(() => {
    const map = new Map();
    residents.forEach((resident) => {
      map.set(String(resident.id || resident.Id), toResidentName(resident));
    });
    return map;
  }, [residents]);

  const filteredMeds = useMemo(() => {
    if (!selectedResidentId) return [];
    return medications.filter((med) => {
      const residentId = String(med.residentId || med.ResidentId || "");
      return residentId === selectedResidentId;
    });
  }, [medications, selectedResidentId]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const fromUtc = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString();
      const toUtc = new Date().toISOString();
      const [marData, residentData, medicationData] = await Promise.all([
        getMarEntries(token, { fromUtc, toUtc, includeVoided: false }),
        getResidents(token),
        getMedications(token)
      ]);

      const residentList = Array.isArray(residentData) ? residentData : [];
      const medList = Array.isArray(medicationData) ? medicationData : [];
      setEntries(Array.isArray(marData) ? marData : []);
      setResidents(residentList);
      setMedications(medList);

      if (!selectedResidentId && residentList.length > 0) {
        setSelectedResidentId(String(residentList[0].id || residentList[0].Id || ""));
      }
    } catch (err) {
      setError(err?.message || "Failed to load MAR data.");
    } finally {
      setLoading(false);
    }
  }, [selectedResidentId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  useEffect(() => {
    if (!selectedResidentId || filteredMeds.length === 0) {
      setSelectedMedicationId("");
      return;
    }

    const stillSelected = filteredMeds.some(
      (med) => String(med.id || med.Id) === selectedMedicationId
    );
    if (!stillSelected) {
      setSelectedMedicationId(String(filteredMeds[0].id || filteredMeds[0].Id || ""));
    }
  }, [filteredMeds, selectedMedicationId, selectedResidentId]);

  async function onCreate() {
    setError("");
    setSuccess("");

    if (!selectedResidentId) {
      setError("Choose a resident.");
      return;
    }
    if (!selectedMedicationId) {
      setError("Choose a medication.");
      return;
    }

    const parsedDose = Number(doseQuantity);
    if (!Number.isFinite(parsedDose) || parsedDose <= 0) {
      setError("Dose quantity must be a positive number.");
      return;
    }

    try {
      setSaving(true);
      const nowIso = new Date().toISOString();
      await createMarEntry(
        {
          clientRequestId: generateGuid(),
          residentId: selectedResidentId,
          medicationId: selectedMedicationId,
          status: selectedStatus,
          doseQuantity: parsedDose,
          doseUnit: doseUnit.trim() || "tablet",
          administeredAtUtc: nowIso,
          scheduledForUtc: nowIso,
          notes: notes.trim(),
          recordedBy: user?.displayName || user?.username || "mobile-nurse"
        },
        token
      );

      setNotes("");
      setSuccess("MAR entry saved.");
      await loadData();
    } catch (err) {
      setError(err?.message || "Failed to create MAR entry.");
    } finally {
      setSaving(false);
    }
  }

  async function onVoid(entryId) {
    setError("");
    setSuccess("");
    try {
      setVoidingId(entryId);
      await voidMarEntry(entryId, "Voided from mobile", token);
      setSuccess("MAR entry voided.");
      await loadData();
    } catch (err) {
      setError(err?.message || "Failed to void MAR entry.");
    } finally {
      setVoidingId("");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>MAR (Nurse)</Text>
      <Text style={{ marginBottom: 8 }}>Create and review medication administration entries.</Text>

      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>New MAR Entry</Text>

        <Text style={{ marginBottom: 4 }}>Resident</Text>
        <FlatList
          horizontal
          data={residents}
          keyExtractor={(item) => String(item.id || item.Id)}
          renderItem={({ item }) => {
            const id = String(item.id || item.Id);
            const selected = id === selectedResidentId;
            return (
              <TouchableOpacity
                onPress={() => setSelectedResidentId(id)}
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
                <Text>{toResidentName(item)}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <Text style={{ marginBottom: 4 }}>Medication</Text>
        <FlatList
          horizontal
          data={filteredMeds}
          keyExtractor={(item) => String(item.id || item.Id)}
          renderItem={({ item }) => {
            const id = String(item.id || item.Id);
            const selected = id === selectedMedicationId;
            return (
              <TouchableOpacity
                onPress={() => setSelectedMedicationId(id)}
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
                <Text>{item.medName || item.MedName || "Medication"}</Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={<Text style={{ color: "#777", marginBottom: 8 }}>No resident medications found.</Text>}
        />

        <Text style={{ marginBottom: 4 }}>Status</Text>
        <FlatList
          horizontal
          data={MAR_STATUSES}
          keyExtractor={(item) => item}
          renderItem={({ item }) => {
            const selected = item === selectedStatus;
            return (
              <TouchableOpacity
                onPress={() => setSelectedStatus(item)}
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
                <Text>{item}</Text>
              </TouchableOpacity>
            );
          }}
        />

        <TextInput
          value={doseQuantity}
          onChangeText={setDoseQuantity}
          keyboardType="decimal-pad"
          placeholder="Dose quantity"
          style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
        />
        <TextInput
          value={doseUnit}
          onChangeText={setDoseUnit}
          placeholder="Dose unit"
          style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
        />

        <TouchableOpacity
          onPress={onCreate}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#8fbca8" : "#2a7",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center"
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>{saving ? "Saving..." : "Save MAR Entry"}</Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#2a7", marginBottom: 8 }}>{success}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}

      <FlatList
        data={entries}
        keyExtractor={(item) => String(item.id || item.Id)}
        renderItem={({ item }) => {
          const entryId = String(item.id || item.Id || "");
          const residentId = String(item.residentId || item.ResidentId || "");
          const medName = medications.find((med) => String(med.id || med.Id) === String(item.medicationId || item.MedicationId))?.medName
            || "Medication";
          return (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <Text>{residentById.get(residentId) || "Resident"} - {medName}</Text>
              <Text style={{ color: "#666" }}>
                {(item.status || item.Status || "").toString()} | {(item.doseQuantity || item.DoseQuantity || "").toString()} {(item.doseUnit || item.DoseUnit || "").toString()}
              </Text>
              <Text style={{ color: "#666" }}>{(item.administeredAtUtc || item.AdministeredAtUtc || "").toString()}</Text>
              {!item.isVoided && !item.IsVoided ? (
                <TouchableOpacity
                  onPress={() => onVoid(entryId)}
                  disabled={voidingId === entryId}
                  style={{ marginTop: 6, alignSelf: "flex-start" }}
                >
                  <Text style={{ color: voidingId === entryId ? "#999" : "#c22" }}>
                    {voidingId === entryId ? "Voiding..." : "Void Entry"}
                  </Text>
                </TouchableOpacity>
              ) : (
                <Text style={{ color: "#c22", marginTop: 6 }}>Voided</Text>
              )}
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
