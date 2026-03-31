import React, { useCallback, useEffect, useMemo, useState } from "react";
import { FlatList, Text, TouchableOpacity, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  createMedicationOrder,
  getMedicationOrders,
  getMedications,
  updateMedicationOrderStatus
} from "../services/apiClient";
import {
  AppInput,
  Card,
  Chip,
  Hero,
  InfoBanner,
  ListRow,
  LoadingBlock,
  PrimaryButton,
  Screen,
  SectionTitle
} from "../ui/components";
import { colors, spacing } from "../ui/theme";

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
    medications.forEach((item) => map.set(String(item.id || item.Id), item.medName || item.MedName || "Medication"));
    return map;
  }, [medications]);

  const loadData = useCallback(async () => {
    try {
      setLoading(true);
      setError("");
      const [ordersData, medicationsData] = await Promise.all([getMedicationOrders(token), getMedications(token)]);
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
    <Screen>
      <Hero
        eyebrow="Supply Ordering"
        title="Medication orders"
        subtitle="Request, track, and close medication orders with a compact shift-friendly workflow."
        badge="Nurse ordering"
      />

      {error ? <InfoBanner text={error} tone="danger" /> : null}
      {success ? <InfoBanner text={success} tone="success" /> : null}

      <Card>
        <SectionTitle title="Create Order" subtitle="Select a medication, set the requested quantity, and add notes if needed." />
        <FlatList
          horizontal
          data={medications}
          keyExtractor={(item) => String(item.id || item.Id)}
          showsHorizontalScrollIndicator={false}
          renderItem={({ item }) => (
            <Chip
              label={item.medName || item.MedName || "Medication"}
              selected={String(item.id || item.Id) === selectedMedicationId}
              onPress={() => setSelectedMedicationId(String(item.id || item.Id))}
            />
          )}
          style={{ marginBottom: spacing.sm }}
        />
        <AppInput
          value={requestedQuantity}
          onChangeText={setRequestedQuantity}
          keyboardType="number-pad"
          placeholder="Requested quantity"
          autoCapitalize="none"
        />
        <AppInput value={notes} onChangeText={setNotes} placeholder="Notes (optional)" multiline />
        <PrimaryButton label={saving ? "Creating..." : "Create Order"} onPress={onCreateOrder} disabled={saving} />
      </Card>

      <Card style={{ marginBottom: 0 }}>
        <SectionTitle title="Order Queue" subtitle={`${orders.length} current medication orders`} />
        {loading ? <LoadingBlock label="Loading medication orders" /> : null}
        <FlatList
          data={orders}
          scrollEnabled={false}
          keyExtractor={(item) => String(item.id || item.Id)}
          renderItem={({ item }) => {
            const orderId = String(item.id || item.Id || "");
            const status = item.status || item.Status || "Requested";
            const medicationId = String(item.medicationId || item.MedicationId || "");
            const medicationName = item.medicationName || item.MedicationName || medicationNameById.get(medicationId) || "Medication";
            const actions = NEXT_STATUS_BY_CURRENT[status] || [];
            return (
              <ListRow
                title={medicationName}
                subtitle={`Qty ${(item.requestedQuantity || item.RequestedQuantity || 0).toString()} | Status ${status}`}
                meta={`Requested by ${(item.requestedBy || item.RequestedBy || "").toString()}`}
              >
                <View style={{ flexDirection: "row", flexWrap: "wrap" }}>
                  {actions.map((nextStatus) => (
                    <TouchableOpacity key={`${orderId}-${nextStatus}`} onPress={() => onUpdateStatus(item, nextStatus)} disabled={updatingId === orderId} style={{ marginRight: spacing.md, marginTop: spacing.xs }}>
                      <Text style={{ color: updatingId === orderId ? colors.textMuted : colors.accent, fontWeight: "700" }}>
                        {updatingId === orderId ? "Updating..." : `Mark ${nextStatus}`}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </ListRow>
            );
          }}
          ListEmptyComponent={!loading ? <Text style={{ color: colors.textMuted }}>No medication orders yet.</Text> : null}
        />
      </Card>
    </Screen>
  );
}
