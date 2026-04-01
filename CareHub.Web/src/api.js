export const API_BASE = import.meta.env.VITE_API_BASE || "http://localhost:5007/api";
const TOKEN_KEY = "carehub_token";

let authToken = "";
if (typeof window !== "undefined") {
  authToken = window.localStorage.getItem(TOKEN_KEY) || "";
}

export function setAuthToken(token) {
  authToken = token || "";
  if (typeof window !== "undefined") {
    if (authToken) {
      window.localStorage.setItem(TOKEN_KEY, authToken);
    } else {
      window.localStorage.removeItem(TOKEN_KEY);
    }
  }
}

export function getAuthToken() {
  return authToken;
}

async function request(path, options = {}) {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      "Content-Type": "application/json",
      ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
      ...(options.headers || {})
    },
    ...options
  });

  if (!response.ok) {
    const message = `${response.status} ${response.statusText}`;
    const error = new Error(message);
    error.status = response.status;
    throw error;
  }

  if (response.status === 204) {
    return null;
  }

  return response.json();
}

function buildQuery(params = {}) {
  const searchParams = new URLSearchParams();

  Object.entries(params).forEach(([key, value]) => {
    if (value === undefined || value === null || value === "") {
      return;
    }
    searchParams.set(key, String(value));
  });

  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export const api = {
  get(path) {
    return request(path);
  },
  post(path, body) {
    return request(path, { method: "POST", body: JSON.stringify(body) });
  },
  put(path, body) {
    return request(path, { method: "PUT", body: JSON.stringify(body) });
  },
  del(path) {
    return request(path, { method: "DELETE" });
  },
  postNoBody(path) {
    return request(path, { method: "POST" });
  }
};

export const apiService = {
  getResidents() {
    return api.get("/residents");
  },
  getMedications() {
    return api.get("/medications");
  },
  getObservations() {
    return api.get("/observations");
  },
  getStaffDirectory() {
    return api.get("/staff/directory");
  },
  getMarEntries(params = {}) {
    return api.get(`/mar${buildQuery(params)}`);
  },
  getMarReport(params = {}) {
    return api.get(`/mar/report${buildQuery(params)}`);
  },
  getMedicationOrders() {
    return api.get("/medicationorders");
  },
  createMedicationOrder(body) {
    return api.post("/medicationorders", body);
  },
  updateMedicationOrderStatus(id, body) {
    return api.put(`/medicationorders/${id}/status`, body);
  },
  aiShiftSummary(residentId) {
    return api.post("/ai/shift-summary", { residentId });
  },
  aiDetectTrends(residentId) {
    return api.post("/ai/detect-trends", { residentId });
  },
  aiCareQuery(query, residentId) {
    return api.post("/ai/care-query", { query, residentId });
  },
  aiReportDraft(residentId) {
    return api.post("/ai/report-draft", { residentId });
  },
  aiMedicationExplain(medicationName, dosage) {
    return api.post("/ai/medication-explain", { medicationName, dosage });
  },
  aiShiftHandoff() {
    return api.post("/ai/shift-handoff", {});
  },
  aiTrendExplain(residentId, days) {
    return api.post("/ai/trend-explain", { residentId, days });
  }
};
