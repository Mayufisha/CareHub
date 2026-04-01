import { useState } from "react";
import PageTabs from "../components/PageTabs";

const AI_TABS = [
  { key: "resident-tools", label: "Resident Tools" },
  { key: "facility-tools", label: "Facility Tools" },
  { key: "response-center", label: "Response Center" }
];

const RESIDENT_TOOL_CARDS = [
  {
    key: "shift-summary",
    title: "Shift Summary",
    description: "Summarize the last 24 hours of observations, MAR activity, and follow-up items."
  },
  {
    key: "detect-trends",
    title: "Detect Trends",
    description: "Review recent vitals and medication events to surface trend signals."
  },
  {
    key: "care-query",
    title: "Care Query",
    description: "Ask a resident-specific or facility-wide question using current care data."
  },
  {
    key: "report-draft",
    title: "Report Draft",
    description: "Draft a structured resident report for staff review and editing."
  },
  {
    key: "medication-explain",
    title: "Medication Explain",
    description: "Translate a medication name and dosage into plain-language staff guidance."
  },
  {
    key: "trend-explain",
    title: "Trend Explain",
    description: "Explain short-window trend movement over a selected 3- or 7-day period."
  }
];

const FACILITY_TOOL_CARDS = [
  {
    key: "shift-handoff",
    title: "Shift Handoff",
    description: "Generate a facility-wide handoff note for the incoming team."
  }
];

function AiDashboardPage() {
  const [activeTab, setActiveTab] = useState("resident-tools");

  return (
    <section className="page-shell">
      <PageTabs tabs={AI_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {(activeTab === "resident-tools" || activeTab === "facility-tools") && (
        <section className="dashboard-grid">
          <article className="card ai-context-card">
            <h3>Resident Context</h3>
            <p>Select a resident, choose an AI tool, and review each result before acting on it.</p>
            <div className="ai-field-grid">
              <label>
                Resident
                <select defaultValue="">
                  <option value="">Choose resident</option>
                </select>
              </label>
              <label>
                Trend Window
                <select defaultValue="7">
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                </select>
              </label>
            </div>
            <label>
              Care Query
              <textarea rows="4" placeholder="Ask about symptoms, refusals, follow-up items, or recent care activity." />
            </label>
            <div className="ai-field-grid">
              <label>
                Medication Name
                <input placeholder="Medication name" />
              </label>
              <label>
                Dosage
                <input placeholder="Dosage (optional)" />
              </label>
            </div>
          </article>

          {activeTab === "resident-tools" &&
            RESIDENT_TOOL_CARDS.map((tool) => (
              <article key={tool.key} className="card ai-tool-card">
                <div className="ai-tool-header">
                  <h3>{tool.title}</h3>
                  <span className="row-index">AI</span>
                </div>
                <p>{tool.description}</p>
                <div className="action-row">
                  <button type="button" className="ghost-button">
                    Open Tool
                  </button>
                </div>
              </article>
            ))}

          {activeTab === "facility-tools" &&
            FACILITY_TOOL_CARDS.map((tool) => (
              <article key={tool.key} className="card ai-tool-card">
                <div className="ai-tool-header">
                  <h3>{tool.title}</h3>
                  <span className="row-index">AI</span>
                </div>
                <p>{tool.description}</p>
                <div className="action-row">
                  <button type="button" className="ghost-button">
                    Open Tool
                  </button>
                </div>
              </article>
            ))}
        </section>
      )}

      {activeTab === "response-center" && (
        <section className="dashboard-grid">
          <article className="card ai-response-card">
            <div className="ai-tool-header">
              <h3>Latest AI Response</h3>
              <button type="button" className="ghost-button">
                Copy
              </button>
            </div>
            <p className="empty-state">
              No AI response yet. Run one of the resident or facility tools to populate this panel.
            </p>
            <p className="topbar-meta">
              AI-generated output is informational only and must be reviewed by qualified staff.
            </p>
          </article>

          <article className="card">
            <h3>How This Fits The Shift</h3>
            <div className="list-row">
              <span>Review resident context first</span>
              <small>Choose resident and timeframe</small>
            </div>
            <div className="list-row">
              <span>Run only one tool at a time</span>
              <small>Keep outputs scoped and easy to verify</small>
            </div>
            <div className="list-row">
              <span>Copy or hand off result</span>
              <small>Use the response center after review</small>
            </div>
          </article>
        </section>
      )}
    </section>
  );
}

export default AiDashboardPage;
