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
  createResident,
  deleteResident,
  getResidents,
  updateResident
} from "../services/apiClient";

const EMPTY_FORM = {
  id: "",
  residentFName: "",
  residentLName: "",
  roomNumber: "",
  roomType: "Single",
  bedLabel: "",
  gender: "",
  dateOfBirth: "",
  doctorName: "",
  doctorContact: "",
  emergencyContactName1: "",
  emergencyContactPhone1: "",
  emergencyRelationship1: "",
  remarks: ""
};

function residentName(item) {
  const first = item.residentFName || item.ResidentFName || "";
  const last = item.residentLName || item.ResidentLName || "";
  return `${first} ${last}`.trim();
}

function toForm(item) {
  return {
    id: String(item.id || item.Id || ""),
    residentFName: item.residentFName || item.ResidentFName || "",
    residentLName: item.residentLName || item.ResidentLName || "",
    roomNumber: item.roomNumber || item.RoomNumber || "",
    roomType: item.roomType || item.RoomType || "Single",
    bedLabel: item.bedLabel || item.BedLabel || "",
    gender: item.gender || item.Gender || "",
    dateOfBirth: item.dateOfBirth || item.DateOfBirth || "",
    doctorName: item.doctorName || item.DoctorName || "",
    doctorContact: item.doctorContact || item.DoctorContact || "",
    emergencyContactName1: item.emergencyContactName1 || item.EmergencyContactName1 || "",
    emergencyContactPhone1: item.emergencyContactPhone1 || item.EmergencyContactPhone1 || "",
    emergencyRelationship1: item.emergencyRelationship1 || item.EmergencyRelationship1 || "",
    remarks: item.remarks || item.Remarks || ""
  };
}

function toPayload(form) {
  return {
    id: form.id || undefined,
    ResidentFName: form.residentFName.trim(),
    ResidentLName: form.residentLName.trim(),
    RoomNumber: form.roomNumber.trim(),
    RoomType: form.roomType.trim() || "Single",
    BedLabel: form.bedLabel.trim() || null,
    Gender: form.gender.trim() || null,
    DateOfBirth: form.dateOfBirth.trim(),
    DoctorName: form.doctorName.trim(),
    DoctorContact: form.doctorContact.trim(),
    EmergencyContactName1: form.emergencyContactName1.trim(),
    EmergencyContactPhone1: form.emergencyContactPhone1.trim(),
    EmergencyRelationship1: form.emergencyRelationship1.trim(),
    Remarks: form.remarks.trim() || null
  };
}

function FormField({ label, value, onChangeText, placeholder }) {
  return (
    <View style={{ marginBottom: 8 }}>
      <Text style={{ marginBottom: 4 }}>{label}</Text>
      <TextInput
        value={value}
        onChangeText={onChangeText}
        placeholder={placeholder}
        style={{ borderWidth: 1, borderColor: "#ccc", padding: 10, borderRadius: 6 }}
      />
    </View>
  );
}

export default function ResidentsScreen() {
  const { token, user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [deletingId, setDeletingId] = useState("");
  const [query, setQuery] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [selectedResidentId, setSelectedResidentId] = useState("");
  const [form, setForm] = useState(EMPTY_FORM);

  const canManage = user?.role === "Nurse";

  const load = useCallback(
    async (isRefresh = false) => {
      try {
        if (isRefresh) setRefreshing(true);
        else setLoading(true);
        setError("");
        const data = await getResidents(token);
        const list = Array.isArray(data) ? data : [];
        setItems(list);

        if (!canManage) {
          return;
        }

        if (selectedResidentId) {
          const selected = list.find(
            (item) => String(item.id || item.Id) === selectedResidentId
          );
          if (selected) {
            setForm(toForm(selected));
            return;
          }
        }

        if (list.length > 0) {
          const first = list[0];
          setSelectedResidentId(String(first.id || first.Id || ""));
          setForm(toForm(first));
        } else {
          setSelectedResidentId("");
          setForm(EMPTY_FORM);
        }
      } catch (err) {
        setError(err?.message || "Failed to load residents.");
      } finally {
        if (isRefresh) setRefreshing(false);
        else setLoading(false);
      }
    },
    [canManage, selectedResidentId, token]
  );

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
      const doctor = String(item.doctorName || item.DoctorName || "").toLowerCase();
      const full = `${first} ${last}`.trim();
      return (
        full.includes(term) ||
        room.includes(term) ||
        doctor.includes(term)
      );
    });
  }, [items, query]);

  function updateForm(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function startCreate() {
    setSelectedResidentId("");
    setForm(EMPTY_FORM);
    setError("");
    setSuccess("");
  }

  function selectResident(item) {
    const id = String(item.id || item.Id || "");
    setSelectedResidentId(id);
    setForm(toForm(item));
    setError("");
    setSuccess("");
  }

  async function onSave() {
    setError("");
    setSuccess("");

    if (!form.residentFName.trim() || !form.residentLName.trim()) {
      setError("Resident first and last name are required.");
      return;
    }

    if (!form.roomNumber.trim()) {
      setError("Room number is required.");
      return;
    }

    if (!form.dateOfBirth.trim()) {
      setError("Date of birth is required.");
      return;
    }

    try {
      setSaving(true);
      const payload = toPayload(form);

      if (selectedResidentId) {
        await updateResident(selectedResidentId, { ...payload, id: selectedResidentId }, token);
        setSuccess("Resident updated.");
      } else {
        const created = await createResident(payload, token);
        setSuccess("Resident created.");
        const createdId = String(created?.id || created?.Id || "");
        if (createdId) {
          setSelectedResidentId(createdId);
        }
      }

      await load();
    } catch (err) {
      setError(err?.message || "Failed to save resident.");
    } finally {
      setSaving(false);
    }
  }

  function confirmDelete() {
    if (!selectedResidentId) {
      return;
    }

    Alert.alert(
      "Delete resident",
      "This permanently removes the resident record.",
      [
        { text: "Cancel", style: "cancel" },
        {
          text: "Delete",
          style: "destructive",
          onPress: async () => {
            try {
              setDeletingId(selectedResidentId);
              setError("");
              setSuccess("");
              await deleteResident(selectedResidentId, token);
              setSuccess("Resident deleted.");
              setSelectedResidentId("");
              setForm(EMPTY_FORM);
              await load();
            } catch (err) {
              setError(err?.message || "Failed to delete resident.");
            } finally {
              setDeletingId("");
            }
          }
        }
      ]
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Residents</Text>
      <Text style={{ marginBottom: 8 }}>
        Access mode: {canManage ? "Nurse resident management" : "Read-only resident list"}
      </Text>
      <TextInput
        value={query}
        onChangeText={setQuery}
        placeholder="Search by name, room, or doctor"
        style={{ borderWidth: 1, borderColor: "#ccc", marginBottom: 8, padding: 10, borderRadius: 6 }}
      />
      {error ? <Text style={{ color: "red", marginBottom: 8 }}>{error}</Text> : null}
      {success ? <Text style={{ color: "#2a7", marginBottom: 8 }}>{success}</Text> : null}
      {loading ? <ActivityIndicator style={{ marginBottom: 8 }} /> : null}

      {canManage ? (
        <View style={{ marginBottom: 12 }}>
          <TouchableOpacity onPress={startCreate} style={{ marginBottom: 8 }}>
            <Text style={{ color: "#2a7", fontWeight: "600" }}>New Resident</Text>
          </TouchableOpacity>
          <FlatList
            horizontal
            data={items}
            keyExtractor={(item) => String(item.id || item.Id)}
            style={{ marginBottom: 8 }}
            renderItem={({ item }) => {
              const id = String(item.id || item.Id || "");
              const selected = id === selectedResidentId;
              return (
                <TouchableOpacity
                  onPress={() => selectResident(item)}
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
                  <Text>{residentName(item) || "Resident"}</Text>
                </TouchableOpacity>
              );
            }}
          />

          <ScrollView
            style={{ maxHeight: 360, borderWidth: 1, borderColor: "#ddd", borderRadius: 8, padding: 12 }}
          >
            <Text style={{ fontWeight: "600", marginBottom: 8 }}>
              {selectedResidentId ? "Edit Resident" : "Create Resident"}
            </Text>
            <FormField
              label="First Name"
              value={form.residentFName}
              onChangeText={(value) => updateForm("residentFName", value)}
              placeholder="First name"
            />
            <FormField
              label="Last Name"
              value={form.residentLName}
              onChangeText={(value) => updateForm("residentLName", value)}
              placeholder="Last name"
            />
            <FormField
              label="Room Number"
              value={form.roomNumber}
              onChangeText={(value) => updateForm("roomNumber", value)}
              placeholder="Room number"
            />
            <FormField
              label="Room Type"
              value={form.roomType}
              onChangeText={(value) => updateForm("roomType", value)}
              placeholder="Single or Double"
            />
            <FormField
              label="Bed Label"
              value={form.bedLabel}
              onChangeText={(value) => updateForm("bedLabel", value)}
              placeholder="Bed label"
            />
            <FormField
              label="Gender"
              value={form.gender}
              onChangeText={(value) => updateForm("gender", value)}
              placeholder="Gender"
            />
            <FormField
              label="Date of Birth"
              value={form.dateOfBirth}
              onChangeText={(value) => updateForm("dateOfBirth", value)}
              placeholder="YYYY-MM-DD"
            />
            <FormField
              label="Doctor Name"
              value={form.doctorName}
              onChangeText={(value) => updateForm("doctorName", value)}
              placeholder="Doctor name"
            />
            <FormField
              label="Doctor Contact"
              value={form.doctorContact}
              onChangeText={(value) => updateForm("doctorContact", value)}
              placeholder="Doctor contact"
            />
            <FormField
              label="Emergency Contact"
              value={form.emergencyContactName1}
              onChangeText={(value) => updateForm("emergencyContactName1", value)}
              placeholder="Primary contact name"
            />
            <FormField
              label="Emergency Phone"
              value={form.emergencyContactPhone1}
              onChangeText={(value) => updateForm("emergencyContactPhone1", value)}
              placeholder="Primary contact phone"
            />
            <FormField
              label="Emergency Relationship"
              value={form.emergencyRelationship1}
              onChangeText={(value) => updateForm("emergencyRelationship1", value)}
              placeholder="Relationship"
            />
            <FormField
              label="Remarks"
              value={form.remarks}
              onChangeText={(value) => updateForm("remarks", value)}
              placeholder="Remarks"
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
                {saving ? "Saving..." : selectedResidentId ? "Save Changes" : "Create Resident"}
              </Text>
            </TouchableOpacity>

            {selectedResidentId ? (
              <TouchableOpacity
                onPress={confirmDelete}
                disabled={deletingId === selectedResidentId}
                style={{ alignItems: "center", paddingVertical: 8 }}
              >
                <Text style={{ color: deletingId === selectedResidentId ? "#999" : "#c22" }}>
                  {deletingId === selectedResidentId ? "Deleting..." : "Delete Resident"}
                </Text>
              </TouchableOpacity>
            ) : null}
          </ScrollView>
        </View>
      ) : null}

      <FlatList
        data={filteredItems}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={() => load(true)} />}
        keyExtractor={(item) => String(item.id || item.Id)}
        renderItem={({ item }) => (
          <View style={{ paddingVertical: 10, borderBottomWidth: 1, borderBottomColor: "#eee" }}>
            <Text>{residentName(item) || "Unknown resident"}</Text>
            <Text style={{ color: "#666" }}>
              Room {item.roomNumber || item.RoomNumber || "N/A"} | DOB {item.dateOfBirth || item.DateOfBirth || "N/A"}
            </Text>
            <Text style={{ color: "#666" }}>
              Doctor: {item.doctorName || item.DoctorName || "Not set"}
            </Text>
          </View>
        )}
      />
    </SafeAreaView>
  );
}
