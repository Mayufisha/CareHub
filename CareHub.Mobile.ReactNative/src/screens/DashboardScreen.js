import React, { useCallback, useEffect, useMemo, useState } from "react";
import {
  ActivityIndicator,
  SafeAreaView,
  ScrollView,
  Text,
  TouchableOpacity,
  View
} from "react-native";
import { useAuth } from "../context/AuthContext";
import { getMedications, getObservations, getResidents } from "../services/apiClient";
import { colors, radii, shadows, spacing, typography } from "../ui/theme";

function StatCard({ label, value, tone }) {
  const palette =
    tone === "warm"
      ? { bg: colors.accentSoft, value: colors.accent }
      : tone === "dark"
        ? { bg: colors.panel, value: colors.textOnDark }
        : { bg: colors.surfaceStrong, value: colors.panel };

  return (
    <View
      style={{
        flex: 1,
        minHeight: 110,
        borderRadius: radii.lg,
        padding: spacing.md,
        backgroundColor: palette.bg,
        borderWidth: tone === "dark" ? 0 : 1,
        borderColor: colors.border,
        ...shadows.card
      }}
    >
      <Text
        style={{
          color: tone === "dark" ? "#d9d3c9" : colors.textMuted,
          fontSize: typography.micro,
          fontWeight: "700",
          marginBottom: spacing.sm,
          textTransform: "uppercase"
        }}
      >
        {label}
      </Text>
      <Text
        style={{
          color: palette.value,
          fontSize: 30,
          fontWeight: "800",
          marginBottom: spacing.xs
        }}
      >
        {value}
      </Text>
    </View>
  );
}

function QuickAction({ label, tone, onPress }) {
  return (
    <TouchableOpacity
      onPress={onPress}
      style={{
        flex: 1,
        backgroundColor: tone === "secondary" ? colors.surface : colors.accent,
        borderRadius: radii.pill,
        borderWidth: tone === "secondary" ? 1 : 0,
        borderColor: colors.border,
        paddingVertical: 14,
        alignItems: "center"
      }}
    >
      <Text
        style={{
          color: tone === "secondary" ? colors.text : colors.textOnDark,
          fontWeight: "800"
        }}
      >
        {label}
      </Text>
    </TouchableOpacity>
  );
}

export default function DashboardScreen() {
  const { token, user, logout } = useAuth();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [residents, setResidents] = useState([]);
  const [medications, setMedications] = useState([]);
  const [observations, setObservations] = useState([]);

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

  const roleSummary = useMemo(() => {
    if (role === "Nurse") return "Medication, MAR, AI, and resident workflows are available.";
    if (role === "General CareStaff") return "Observation capture and resident review are available.";
    if (role === "Observer") return "Resident-facing observations and medication visibility only.";
    return "Access is restricted.";
  }, [role]);

  const load = useCallback(async () => {
    try {
      setLoading(true);
      setError("");

      const [residentData, medicationData, observationData] = await Promise.all([
        canReadResidents ? getResidents(token) : Promise.resolve([]),
        canReadMedications ? getMedications(token) : Promise.resolve([]),
        canReadObservations ? getObservations(token) : Promise.resolve([])
      ]);

      setResidents(Array.isArray(residentData) ? residentData : []);
      setMedications(Array.isArray(medicationData) ? medicationData : []);
      setObservations(Array.isArray(observationData) ? observationData : []);
    } catch (err) {
      setError(err?.message || "Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  }, [canReadMedications, canReadObservations, canReadResidents, token]);

  useEffect(() => {
    load();
  }, [load]);

  const residentCount = residents.length;
  const medicationCount = medications.length;
  const observationCount = observations.length;

  const lowStockCount = useMemo(
    () =>
      medications.filter((item) => {
        const stock = item.stockQuantity ?? item.StockQuantity ?? 0;
        const reorderLevel = item.reorderLevel ?? item.ReorderLevel ?? 0;
        return stock <= reorderLevel;
      }).length,
    [medications]
  );

  const latestObservation = useMemo(() => {
    if (!observations.length) return null;
    const sorted = [...observations].sort(
      (a, b) => new Date(b.recordedAt || b.RecordedAt || 0) - new Date(a.recordedAt || a.RecordedAt || 0)
    );
    return sorted[0];
  }, [observations]);

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: colors.background }}>
      <ScrollView
        contentContainerStyle={{
          padding: spacing.lg,
          paddingBottom: spacing.xl + 16
        }}
        showsVerticalScrollIndicator={false}
      >
        <View
          style={{
            backgroundColor: colors.panel,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            ...shadows.card
          }}
        >
          <Text style={{ color: "#d9d3c9", fontSize: typography.micro, fontWeight: "700", marginBottom: spacing.xs }}>
            {modeLabel}
          </Text>
          <Text
            style={{
              color: colors.textOnDark,
              fontSize: typography.title,
              fontWeight: "800",
              marginBottom: spacing.xs
            }}
          >
            Hello, {user?.displayName || user?.username}
          </Text>
          <Text style={{ color: "#d9d3c9", lineHeight: 21, marginBottom: spacing.md }}>
            {roleSummary}
          </Text>
          <View
            style={{
              alignSelf: "flex-start",
              backgroundColor: colors.panelSoft,
              borderRadius: radii.pill,
              paddingHorizontal: spacing.md,
              paddingVertical: 8
            }}
          >
            <Text style={{ color: colors.textOnDark, fontWeight: "700" }}>{user?.role}</Text>
          </View>
        </View>

        {loading ? (
          <View
            style={{
              backgroundColor: colors.surface,
              borderRadius: radii.lg,
              padding: spacing.lg,
              alignItems: "center",
              marginBottom: spacing.lg,
              borderWidth: 1,
              borderColor: colors.border
            }}
          >
            <ActivityIndicator color={colors.accent} />
            <Text style={{ marginTop: spacing.sm, color: colors.textMuted }}>Refreshing dashboard</Text>
          </View>
        ) : null}

        {error ? (
          <View
            style={{
              backgroundColor: "#fde7e2",
              borderRadius: radii.md,
              padding: spacing.md,
              marginBottom: spacing.lg,
              borderWidth: 1,
              borderColor: "#efc2b8"
            }}
          >
            <Text style={{ color: colors.danger, fontWeight: "700", marginBottom: spacing.xs }}>
              Dashboard issue
            </Text>
            <Text style={{ color: colors.text }}>{error}</Text>
          </View>
        ) : null}

        <View style={{ flexDirection: "row", marginBottom: spacing.sm }}>
          <View style={{ flex: 1, marginRight: spacing.sm / 2 }}>
            <StatCard label="Residents" value={residentCount} tone="dark" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm / 2 }}>
            <StatCard label="Observations" value={observationCount} tone="warm" />
          </View>
        </View>
        <View style={{ flexDirection: "row", marginBottom: spacing.lg }}>
          <View style={{ flex: 1, marginRight: spacing.sm / 2 }}>
            <StatCard label="Medications" value={medicationCount} tone="neutral" />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm / 2 }}>
            <StatCard label="Low Stock" value={canReadMedications ? lowStockCount : "-"} tone="neutral" />
          </View>
        </View>

        <View
          style={{
            backgroundColor: colors.surface,
            borderRadius: radii.lg,
            padding: spacing.lg,
            marginBottom: spacing.lg,
            borderWidth: 1,
            borderColor: colors.border,
            ...shadows.card
          }}
        >
          <Text
            style={{
              color: colors.text,
              fontWeight: "800",
              fontSize: typography.section,
              marginBottom: spacing.sm
            }}
          >
            Shift Snapshot
          </Text>
          <Text style={{ color: colors.textMuted, lineHeight: 21 }}>
            {latestObservation
              ? `Latest observation: ${(latestObservation.type || latestObservation.Type || "").toString()} recorded by ${(latestObservation.recordedBy || latestObservation.RecordedBy || "staff").toString()}.`
              : "No recent observation data is available yet for this session."}
          </Text>
          <View
            style={{
              marginTop: spacing.md,
              backgroundColor: colors.background,
              borderRadius: radii.md,
              padding: spacing.md
            }}
          >
            <Text style={{ color: colors.text, fontWeight: "700", marginBottom: spacing.xs }}>
              Access Summary
            </Text>
            <Text style={{ color: colors.textMuted, lineHeight: 20 }}>
              {canReadResidents ? "Resident records loaded." : "Resident records hidden."}{" "}
              {canReadMedications ? "Medication inventory loaded." : "Medication inventory hidden."}{" "}
              {canReadObservations ? "Observation feed loaded." : "Observation feed hidden."}
            </Text>
          </View>
        </View>

        <View style={{ flexDirection: "row" }}>
          <View style={{ flex: 1, marginRight: spacing.sm / 2 }}>
            <QuickAction label="Refresh" onPress={load} />
          </View>
          <View style={{ flex: 1, marginLeft: spacing.sm / 2 }}>
            <QuickAction label="Logout" tone="secondary" onPress={logout} />
          </View>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}
