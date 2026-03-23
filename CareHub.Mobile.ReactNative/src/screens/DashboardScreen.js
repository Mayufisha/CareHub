import React, { useCallback, useEffect, useMemo, useState } from "react";
import { ActivityIndicator, Button, SafeAreaView, Text, View } from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMedications, getObservations, getResidents } from "../services/apiClient";

export default function DashboardScreen() {
  const { token, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [residentsCount, setResidentsCount] = useState(0);
  const [medicationsCount, setMedicationsCount] = useState(0);
  const [observationsCount, setObservationsCount] = useState(0);

  const role = user?.role || "";
  const canReadResidents = role === "Nurse" || role === "General CareStaff" || role === "Observer";
  const canReadMedications = role === "Nurse" || role === "Observer";
  const canReadObservations = role === "Nurse" || role === "General CareStaff" || role === "Observer";

  const modeLabel = useMemo(() => {
    if (role === "Nurse") return "Clinical operations";
    if (role === "General CareStaff") return "Care support";
    if (role === "Observer") return "Resident view";
    return "Restricted";
  }, [role]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [residents, medications, observations] = await Promise.all([
        canReadResidents ? getResidents(token) : Promise.resolve([]),
        canReadMedications ? getMedications(token) : Promise.resolve([]),
        canReadObservations ? getObservations(token) : Promise.resolve([])
      ]);

      setResidentsCount(Array.isArray(residents) ? residents.length : 0);
      setMedicationsCount(Array.isArray(medications) ? medications.length : 0);
      setObservationsCount(Array.isArray(observations) ? observations.length : 0);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [canReadMedications, canReadObservations, canReadResidents, token]);

  useEffect(() => {
    load();
  }, [load]);

  return (
    <SafeAreaView style={{ flex: 1, padding: 16 }}>
      <Text style={{ fontSize: 20, marginBottom: 8 }}>Dashboard</Text>
      <Text style={{ marginBottom: 4 }}>User: {user?.username}</Text>
      <Text style={{ marginBottom: 12 }}>Role: {user?.role}</Text>
      <Text style={{ marginBottom: 10 }}>Mode: {modeLabel}</Text>

      {loading ? <ActivityIndicator style={{ marginBottom: 10 }} /> : null}
      {error ? <Text style={{ marginBottom: 10, color: "red" }}>{error}</Text> : null}

      <View style={{ marginBottom: 6 }}>
        <Text>Total Residents: {residentsCount}</Text>
      </View>
      <View style={{ marginBottom: 6 }}>
        <Text>Total Medications: {medicationsCount}</Text>
      </View>
      <View style={{ marginBottom: 12 }}>
        <Text>Total Observations: {observationsCount}</Text>
      </View>

      <View style={{ marginTop: 4, marginBottom: 10 }}>
        <Button title="Refresh" onPress={load} />
      </View>
      <View style={{ marginTop: 16 }}>
        <Button title="Logout" onPress={logout} />
      </View>
    </SafeAreaView>
  );
}
