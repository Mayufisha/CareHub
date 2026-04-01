import { useMemo, useState } from "react";
import PageTabs from "../components/PageTabs";

const MAR_TABS = [
  { key: "feed", label: "Administration Feed" },
  { key: "summary", label: "Shift Snapshot" }
];

function MarPage({
  loading,
  error,
  displayedMarEntries,
  pagedMarEntries,
  currentPage,
  pageSize,
  renderSectionTools,
  renderSectionMeta
}) {
  const [activeTab, setActiveTab] = useState("feed");

  const statusSummary = useMemo(() => {
    return displayedMarEntries.reduce(
      (summary, entry) => {
        const status = entry._status || "Unknown";
        summary[status] = (summary[status] || 0) + 1;
        return summary;
      },
      {}
    );
  }, [displayedMarEntries]);

  if (loading) {
    return <section className="card">Loading MAR...</section>;
  }

  if (error) {
    return <section className="card error">{error}</section>;
  }

  return (
    <section className="page-shell">
      <PageTabs tabs={MAR_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "feed" && (
        <section className="card">
          <h3>Medication Administration Feed</h3>
          {renderSectionTools([
            { value: "date", label: "Sort: Date" },
            { value: "resident", label: "Sort: Resident" },
            { value: "status", label: "Sort: Status" }
          ])}
          {renderSectionMeta(displayedMarEntries.length, "MAR entries")}
          {displayedMarEntries.length === 0 ? (
            <p className="empty-state">No MAR entries match this view.</p>
          ) : null}
          {pagedMarEntries.map((entry, index) => (
            <div className="list-row" key={entry.id || entry.Id || `${entry._residentName}-${index}`}>
              <span className="list-primary">
                <b className="row-index">{(currentPage - 1) * pageSize + index + 1}</b>
                <span>
                  <strong>{entry._medicationName}</strong>
                  <small className="inline-meta">{entry._residentName}</small>
                </span>
              </span>
              <span className="list-row-actions">
                <small>{entry._status}</small>
                <small>{entry._timestamp}</small>
              </span>
            </div>
          ))}
        </section>
      )}

      {activeTab === "summary" && (
        <section className="dashboard-grid">
          <article className="card">
            <h3>Status Summary</h3>
            {Object.keys(statusSummary).length === 0 ? (
              <p className="empty-state">No MAR activity available for the current filters.</p>
            ) : (
              Object.entries(statusSummary).map(([status, count]) => (
                <div className="list-row" key={status}>
                  <span>{status}</span>
                  <small>{count}</small>
                </div>
              ))
            )}
          </article>
          <article className="card">
            <h3>Current Feed Notes</h3>
            <p>
              Use the shared search, sorting, and pager controls in the feed tab to narrow down a
              resident, medication, or administration status before exporting the list.
            </p>
          </article>
        </section>
      )}
    </section>
  );
}

export default MarPage;
