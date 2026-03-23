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
  createMedicationOrder,
  getMedicationOrders,
  getMedications,
  updateMedicationOrderStatus
} from "../services/apiClient";

const NEXT_STATUS_BY_CURRENT = {
  Requested: ["Ordered", "Cancelled"],
  Ordered: ["Received", "Cancelled"],
  Received: [],
  Cancelled: []
};

export default function OrdersScreen() {
  const { token, user } = useAuth();
  const [orders, setOrders] = useState([]);
  const [medications, setMedications] = useState([]);
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [requestedQuantity, setRequestedQuantity] = useState("10");
  const [notes, setNotes] = useState("");
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [updatingId, setUpdatingId] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const medicationNameById = useMemo(() => {
    const map = new Map();
    medications.forEach((m) => map.set(String(m.id || m.Id), m.medName || m.MedName || "Medication"));
    return map;
  }, [medications]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [ordersData, medicationsData] = await Promise.all([
        getMedicationOrders(token),
        getMedications(token)
      ]);

      const medList = Array.isArray(medicationsData) ? medicationsData : [];
      setOrders(Array.isArray(ordersData) ? ordersData : []);
      setMedications(medList);

      if (!selectedMedicationId && medList.length > 0) {
        setSelectedMedicationId(String(medList[0].id || medList[0].Id));
      }
    } catch (err) {
      setError(err?.message || "Failed to load medication orders.");
    } finally {
      setLoading(false);
    }
  }, [selectedMedicationId, token]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  async function onCreateOrder() {
    setError("");
    setSuccess("");

    if (!selectedMedicationId) {
      setError("Choose a medication.");
      return;
    }

    const qty = Number(requestedQuantity);
    if (!Number.isFinite(qty) || qty <= 0) {
      setError("Requested quantity must be a positive number.");
      return;
    }

    try {
      setSaving(true);
      const medName = medicationNameById.get(selectedMedicationId) || "Medication";
      await createMedicationOrder(
        {
          medicationId: selectedMedicationId,
          requestedQuantity: qty,
          requestedBy: user?.displayName || user?.username || "mobile-nurse",
          medicationName: medName,
          notes: notes.trim() || undefined
        },
        token
      );
      setNotes("");
      setSuccess("Medication order created.");
      await loadData();
    } catch (err) {
      setError(err?.message || "Failed to create medication order.");
    } finally {
      setSaving(false);
    }
  }

  async function onUpdateStatus(order, nextStatus) {
    const orderId = String(order.id || order.Id || "");
    setError("");
    setSuccess("");
    try {
      setUpdatingId(orderId);
      await updateMedicationOrderStatus(
        orderId,
        {
          status: nextStatus,
          updatedBy: user?.displayName || user?.username || "mobile-nurse"
        },
        token
      );
      setSuccess(`Order marked as ${nextStatus}.`);
      await loadData();
    } catch (err) {
      setError(err?.message || `Failed to set order status to ${nextStatus}.`);
    } finally {
      setUpdatingId("");
    }
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Medication Orders</Text>
      <Text style={{ marginBottom: 8 }}>Nurse workflow: request, order, receive, cancel.</Text>

      <View style={{ padding: 12, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, marginBottom: 12 }}>
        <Text style={{ fontWeight: "600", marginBottom: 8 }}>Create Order</Text>
        <FlatList
          horizontal
          data={medications}
          keyExtractor={(item) => String(item.id || item.Id)}
          renderItem={({ item }) => {
            const medId = String(item.id || item.Id);
            const selected = medId === selectedMedicationId;
            return (
              <TouchableOpacity
                onPress={() => setSelectedMedicationId(medId)}
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
        />
        <TextInput
          value={requestedQuantity}
          onChangeText={setRequestedQuantity}
          keyboardType="number-pad"
          placeholder="Requested quantity"
          style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
        />
        <TextInput
          value={notes}
          onChangeText={setNotes}
          placeholder="Notes (optional)"
          style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
        />
        <TouchableOpacity
          onPress={onCreateOrder}
          disabled={saving}
          style={{
            backgroundColor: saving ? "#8fbca8" : "#2a7",
            paddingVertical: 10,
            borderRadius: 6,
            alignItems: "center"
          }}
        >
          <Text style={{ color: "white", fontWeight: "600" }}>
            {saving ? "Creating..." : "Create Order"}
          </Text>
        </TouchableOpacity>
      </View>

      {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#2a7", marginBottom: 8 }}>{success}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}

      <FlatList
        data={orders}
        keyExtractor={(item) => String(item.id || item.Id)}
        renderItem={({ item }) => {
          const orderId = String(item.id || item.Id || "");
          const status = item.status || item.Status || "Requested";
          const medicationId = String(item.medicationId || item.MedicationId || "");
          const medicationName =
            item.medicationName || item.MedicationName || medicationNameById.get(medicationId) || "Medication";
          const actions = NEXT_STATUS_BY_CURRENT[status] || [];

          return (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <Text>{medicationName}</Text>
              <Text style={{ color: "#666" }}>
                Qty: {(item.requestedQuantity || item.RequestedQuantity || 0).toString()} | Status: {status}
              </Text>
              <Text style={{ color: "#666" }}>
                Requested By: {(item.requestedBy || item.RequestedBy || "").toString()}
              </Text>
              <View style={{ flexDirection: "row", marginTop: 6 }}>
                {actions.map((nextStatus) => (
                  <TouchableOpacity
                    key={`${orderId}-${nextStatus}`}
                    onPress={() => onUpdateStatus(item, nextStatus)}
                    disabled={updatingId === orderId}
                    style={{ marginRight: 10 }}
                  >
                    <Text style={{ color: updatingId === orderId ? "#999" : "#2a7" }}>
                      {updatingId === orderId ? "Updating..." : `Mark ${nextStatus}`}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
