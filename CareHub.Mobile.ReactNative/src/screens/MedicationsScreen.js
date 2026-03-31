import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  Alert,
  FlatList,
  RefreshControl,
  SafeAreaView,
  ScrollView,
  Text,
  TextInput,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import {
  adjustMedicationStock,
  createMedication,
  deleteMedication,
  getLowStockMedications,
  getMedications,
  getResidents,
  updateMedication
} from "../services/apiClient";

const EMPTY_FORM = {
  id: "",
  medName: "",
  dosage: "",
  usage: "",
  quantity: "1",
  quantityUnit: "tablet",
  stockQuantity: "0",
  reorderLevel: "10",
  expiryDate: "",
  residentId: "",
  residentName: "",
  timesPerDay: "3"
};

function medicationName(item) {
  return item.medName || item.MedName || "Medication";
}

function toForm(item) {
  return {
    id: String(item.id || item.Id || ""),
    medName: item.medName || item.MedName || "",
    dosage: item.dosage || item.Dosage || "",
    usage: item.usage || item.Usage || "",
    quantity: String(item.quantity || item.Quantity || 1),
    quantityUnit: item.quantityUnit || item.QuantityUnit || "tablet",
    stockQuantity: String(item.stockQuantity ?? item.StockQuantity ?? 0),
    reorderLevel: String(item.reorderLevel ?? item.ReorderLevel ?? 10),
    expiryDate: (item.expiryDate || item.ExpiryDate || "").toString().slice(0, 10),
    residentId: String(item.residentId || item.ResidentId || ""),
    residentName: item.residentName || item.ResidentName || "",
    timesPerDay: String(item.timesPerDay || item.TimesPerDay || 3)
  };
}

function parseIntField(value, fallback) {
  const parsed = Number(value);
  if (!Number.isFinite(parsed)) {
    return fallback;
  }
  return Math.max(0, Math.round(parsed));
}

function toPayload(form) {
  const residentId = form.residentId.trim();
  return {
    id: form.id || undefined,
    medName: form.medName.trim(),
    dosage: form.dosage.trim(),
    usage: form.usage.trim() || null,
    quantity: parseIntField(form.quantity, 1),
    quantityUnit: form.quantityUnit.trim() || "tablet",
    stockQuantity: parseIntField(form.stockQuantity, 0),
    reorderLevel: parseIntField(form.reorderLevel, 10),
    expiryDate: form.expiryDate
      ? new Date(`${form.expiryDate}T00:00:00Z`).toISOString()
      : new Date().toISOString(),
    residentId: residentId || null,
    residentName: form.residentName.trim() || null,
    timesPerDay: parseIntField(form.timesPerDay, 3)
  };
}

function Field({ label, value, onChangeText, placeholder, keyboardType }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        keyboardType={keyboardType}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
      />
    </View>
  );
}

export default function MedicationsScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [lowStockItems, setLowStockItems] = useState([]);
  const [residents, setResidents] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [selectedMedicationId, setSelectedMedicationId] = useState("");
  const [query, setQuery] = useState("");
  const [stockDelta, setStockDelta] = useState("1");
  const [showLowStock, setShowLowStock] = useState(false);
  const [form, setForm] = useState(EMPTY_FORM);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  const canManage = user?.role === "Nurse";
  const isObserver = user?.role === "Observer";

  const residentOptions = useMemo(
    () =>
      residents.map((resident) => ({
        id: String(resident.id || resident.Id || ""),
        name: `${resident.residentFName || resident.ResidentFName || ""} ${resident.residentLName || resident.ResidentLName || ""}`.trim()
      })),
    [residents]
  );

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");

        const requests = [getMedications(token)];
        if (canManage) {
          requests.push(getResidents(token));
          requests.push(getLowStockMedications(token));
        }

        const results = await Promise.all(requests);
        const medicationList = Array.isArray(results[0]) ? results[0] : [];
        setItems(medicationList);

        if (canManage) {
          const residentList = Array.isArray(results[1]) ? results[1] : [];
          const lowList = Array.isArray(results[2]) ? results[2] : [];
          setResidents(residentList);
          setLowStockItems(lowList);

          if (selectedMedicationId) {
            const selected = medicationList.find(
              (item) => String(item.id || item.Id) === selectedMedicationId
            );
            if (selected) {
              setForm(toForm(selected));
              return;
            }
          }

          if (medicationList.length > 0) {
            const first = medicationList[0];
            setSelectedMedicationId(String(first.id || first.Id || ""));
            setForm(toForm(first));
          } else {
            setSelectedMedicationId("");
            setForm(EMPTY_FORM);
          }
        }
      } catch (err) {
        setError(err?.message || "Failed to load medications.");
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [canManage, selectedMedicationId, token]
  );

  useEffect(() => {
    load();
  }, [load]);

  const filteredItems = useMemo(() => {
    const term = query.trim().toLowerCase();
    const source = showLowStock && canManage ? lowStockItems : items;
    if (!term) return source;
    return source.filter((item) => {
      const medName = String(item.medName || item.MedName || "").toLowerCase();
      const dosage = String(item.dosage || item.Dosage || "").toLowerCase();
      const usage = String(item.usage || item.Usage || "").toLowerCase();
      const residentName = String(item.residentName || item.ResidentName || "").toLowerCase();
      return (
        medName.includes(term) ||
        dosage.includes(term) ||
        usage.includes(term) ||
        residentName.includes(term)
      );
    });
  }, [canManage, items, lowStockItems, query, showLowStock]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setSelectedMedicationId("");
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  }

  function selectMedication(item) {
    const id = String(item.id || item.Id || "");
    setSelectedMedicationId(id);
    setForm(toForm(item));
    setError("");
    setSuccess("");
  }

  async function onSave() {
    setError("");
    setSuccess("");

    if (!form.medName.trim()) {
      setError("Medication name is required.");
      return;
    }

    if (!form.dosage.trim()) {
      setError("Dosage is required.");
      return;
    }

    try {
      setSaving(true);
      const payload = toPayload(form);

      if (selectedMedicationId) {
        await updateMedication(selectedMedicationId, { ...payload, id: selectedMedicationId }, token);
        setSuccess("Medication updated.");
      } else {
        const created = await createMedication(payload, token);
        setSuccess("Medication created.");
        const createdId = String(created?.id || created?.Id || "");
        if (createdId) {
          setSelectedMedicationId(createdId);
        }
      }

      await load();
    } catch (err) {
      setError(err?.message || "Failed to save medication.");
    } finally {
      setSaving(false);
    }
  }

  async function onAdjustStock() {
    const delta = Number(stockDelta);
    if (!selectedMedicationId) {
      setError("Choose a medication first.");
      return;
    }
    if (!Number.isFinite(delta) || delta === 0) {
      setError("Stock delta must be a non-zero number.");
      return;
    }

    try {
      setError("");
      setSuccess("");
      await adjustMedicationStock(selectedMedicationId, Math.round(delta), token);
      setSuccess(`Stock adjusted by ${Math.round(delta)}.`);
      await load();
    } catch (err) {
      setError(err?.message || "Failed to adjust stock.");
    }
  }

  function confirmDelete() {
    if (!selectedMedicationId) {
      return;
    }

    Alert.alert(
      "Delete medication",
      "This permanently removes the medication record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(selectedMedicationId);
              setError("");
              setSuccess("");
              await deleteMedication(selectedMedicationId, token);
              setSuccess("Medication deleted.");
              setSelectedMedicationId("");
              setForm(EMPTY_FORM);
              await load();
            } catch (err) {
              setError(err?.message || "Failed to delete medication.");
            } finally {
              setDeletingId("");
            }
          }
        }
      ]
    );
  }

  const modeLabel = useMemo(() => {
    if (isObserver) return "Observer medication view";
    if (canManage) return "Nurse medication management";
    return "Unavailable";
  }, [canManage, isObserver]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Medications</Text>
      <Text style={{ marginBottom: 8 }}>Access mode: {modeLabel}</Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by medication, dosage, usage, or resident"
        style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
      />
      {canManage ? (
        <TouchableOpacity onPress={() => setShowLowStock((current) => !current)} style={{ marginBottom: 8 }}>
          <Text style={{ color: "#2a7" }}>
            {showLowStock ? "Show all medications" : "Show low-stock medications"}
          </Text>
        </TouchableOpacity>
      ) : null}
      {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#2a7", marginBottom: 8 }}>{success}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}

      {canManage ? (
        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity onPress={startCreate} style={{ marginBottom: 8 }}>
            <Text style={{ color: "#2a7", fontWeight: "600" }}>New Medication</Text>
          </TouchableOpacity>
          <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => String(item.id || item.Id)}
            style={{ marginBottom: 8 }}
            renderItem={({ item }) => {
              const id = String(item.id || item.Id || "");
              const selected = id === selectedMedicationId;
              return (
                <TouchableOpacity
                  onPress={() => selectMedication(item)}
                  style={{
                    marginRight: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: selected ? "#2a7" : "#ccc",
                    backgroundColor: selected ? "#e7fff4" : "#fff",
                    borderRadius: 8
                  }}
                >
                  <Text>{medicationName(item)}</Text>
                </TouchableOpacity>
              );
            }}
          />

          <ScrollView
            style={{ maxHeight: 430, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 }}
          >
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>
              {selectedMedicationId ? "Edit Medication" : "Create Medication"}
            </Text>
            <Field
              label="Medication Name"
              value={form.medName}
              onChangeText={(value) => updateForm("medName", value)}
              placeholder="Medication name"
            />
            <Field
              label="Dosage"
              value={form.dosage}
              onChangeText={(value) => updateForm("dosage", value)}
              placeholder="Dosage"
            />
            <Field
              label="Usage"
              value={form.usage}
              onChangeText={(value) => updateForm("usage", value)}
              placeholder="Usage"
            />
            <Field
              label="Quantity per Dose"
              value={form.quantity}
              onChangeText={(value) => updateForm("quantity", value)}
              placeholder="1"
              keyboardType="number-pad"
            />
            <Field
              label="Quantity Unit"
              value={form.quantityUnit}
              onChangeText={(value) => updateForm("quantityUnit", value)}
              placeholder="tablet"
            />
            <Field
              label="Stock Quantity"
              value={form.stockQuantity}
              onChangeText={(value) => updateForm("stockQuantity", value)}
              placeholder="0"
              keyboardType="number-pad"
            />
            <Field
              label="Reorder Level"
              value={form.reorderLevel}
              onChangeText={(value) => updateForm("reorderLevel", value)}
              placeholder="10"
              keyboardType="number-pad"
            />
            <Field
              label="Expiry Date"
              value={form.expiryDate}
              onChangeText={(value) => updateForm("expiryDate", value)}
              placeholder="YYYY-MM-DD"
            />
            <Field
              label="Times Per Day"
              value={form.timesPerDay}
              onChangeText={(value) => updateForm("timesPerDay", value)}
              placeholder="3"
              keyboardType="number-pad"
            />

            <Text style={{ marginBottom: 4 }}>Resident Assignment</Text>
            <FlatList
              horizontal
              data={residentOptions}
              keyExtractor={(item) => item.id}
              ListHeaderComponent={
                <TouchableOpacity
                  onPress={() => {
                    updateForm("residentId", "");
                    updateForm("residentName", "");
                  }}
                  style={{
                    marginRight: 8,
                    marginBottom: 8,
                    paddingHorizontal: 10,
                    paddingVertical: 8,
                    borderWidth: 1,
                    borderColor: !form.residentId ? "#2a7" : "#ccc",
                    backgroundColor: !form.residentId ? "#e7fff4" : "#fff",
                    borderRadius: 8
                  }}
                >
                  <Text>Inventory Only</Text>
                </TouchableOpacity>
              }
              renderItem={({ item }) => {
                const selected = item.id === form.residentId;
                return (
                  <TouchableOpacity
                    onPress={() => {
                      updateForm("residentId", item.id);
                      updateForm("residentName", item.name);
                    }}
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
                    <Text>{item.name || "Resident"}</Text>
                  </TouchableOpacity>
                );
              }}
            />

            <TouchableOpacity
              onPress={onSave}
              disabled={saving}
              style={{
                backgroundColor: saving ? "#8fbca8" : "#2a7",
                paddingVertical: 10,
                borderRadius: 6,
                alignItems: "center",
                marginBottom: 8
              }}
            >
              <Text style={{ color: "white", fontWeight: "600" }}>
                {saving ? "Saving..." : selectedMedicationId ? "Save Changes" : "Create Medication"}
              </Text>
            </TouchableOpacity>

            {selectedMedicationId ? (
              <>
                <View style={{ marginBottom: 8 }}>
                  <Text style={{ marginBottom: 4 }}>Adjust Stock</Text>
                  <TextInput
                    value={stockDelta}
                    onChangeText={setStockDelta}
                    placeholder="Use positive or negative value"
                    keyboardType="numbers-and-punctuation"
                    style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6, marginBottom: 8 }}
                  />
                  <TouchableOpacity onPress={onAdjustStock} style={{ alignItems: "center", marginBottom: 8 }}>
                    <Text style={{ color: "#2a7", fontWeight: "600" }}>Apply Stock Delta</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={confirmDelete}
                  disabled={deletingId === selectedMedicationId}
                  style={{ alignItems: "center", paddingVertical: 8 }}
                >
                  <Text style={{ color: deletingId === selectedMedicationId ? "#999" : "#c22" }}>
                    {deletingId === selectedMedicationId ? "Deleting..." : "Delete Medication"}
                  </Text>
                </TouchableOpacity>
              </>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        data={filteredItems}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        keyExtractor={(item) => String(item.id || item.Id)}
        renderItem={({ item }) => {
          const stock = item.stockQuantity ?? item.StockQuantity ?? 0;
          const reorderLevel = item.reorderLevel ?? item.ReorderLevel ?? 0;
          const residentName = item.residentName || item.ResidentName || "Inventory";
          return (
            <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
              <Text>{medicationName(item)}</Text>
              <Text style={{ color: "#666" }}>
                {item.dosage || item.Dosage || "No dosage"} | {residentName}
              </Text>
              <Text style={{ color: stock <= reorderLevel ? "#c22" : "#666" }}>
                Stock: {stock} | Reorder at: {reorderLevel}
              </Text>
            </View>
          );
        }}
      />
    </SafeAreaView>
  );
}
