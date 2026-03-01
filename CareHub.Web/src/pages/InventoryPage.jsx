import { useState } from "react";
import PageTabs from "../components/PageTabs";

const INVENTORY_TABS = [
  { key: "catalog", label: "Catalog" },
  { key: "reorder", label: "Reorder Queue" },
  { key: "audit", label: "Audit" }
];

function InventoryPage({
  loading,
  error,
  displayedInventory,
  pagedInventory,
  lowStock,
  currentPage,
  pageSize,
  renderSectionTools,
  renderSectionMeta
}) {
  const [activeTab, setActiveTab] = useState("catalog");

  if (loading) {
    return (
      <section className="card">
        <p>Loading inventory...</p>
      </section>
    );
  }

  if (error) {
    return (
      <section className="card error">
        <p>{error}</p>
      </section>
    );
  }

  return (
    <section className="page-shell">
      <PageTabs tabs={INVENTORY_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "catalog" && (
        <section className="card">
          <h3>Inventory Catalog</h3>
          {renderSectionTools([
            { value: "name", label: "Sort: Name" },
            { value: "stock", label: "Sort: Stock" }
          ])}
          {renderSectionMeta(displayedInventory.length, "inventory items")}
          {displayedInventory.length === 0 && <p className="empty-state">No inventory items match this view.</p>}
          {pagedInventory.map((med, index) => (
            <div className={`list-row ${med._isLow ? "row-alert" : ""}`} key={med.id}>
              <span className="list-primary">
                <b className="row-index">{(currentPage - 1) * pageSize + index + 1}</b>
                {med._name}
              </span>
              <small>
                {med._stock} in stock
                {med.reorderLevel != null ? ` | Reorder at ${med._reorder}` : ""}
                {med._isLow ? " | LOW" : ""}
              </small>
            </div>
          ))}
        </section>
      )}

      {activeTab === "reorder" && (
        <section className="card">
          <h3>Reorder Queue</h3>
          {lowStock.length === 0 && <p>No low-stock items pending reorder.</p>}
          {lowStock.map((med, index) => (
            <div className="list-row row-alert" key={med.id}>
              <span className="list-primary">
                <b className="row-index">{index + 1}</b>
                {med.medName || med.name || "Unnamed medication"}
              </span>
              <small>
                {med.stockQuantity ?? 0} / {med.reorderLevel ?? 0}
              </small>
            </div>
          ))}
        </section>
      )}

      {activeTab === "audit" && (
        <section className="staff-grid">
          <article className="card">
            <h3>Stock Movement</h3>
            <p>Planned: inbound/outbound transaction log and adjustment reasons.</p>
          </article>
          <article className="card">
            <h3>Expiry Tracking</h3>
            <p>Planned: expiry windows, batch visibility, and early-disposal flags.</p>
          </article>
          <article className="card">
            <h3>Compliance Checks</h3>
            <p>Planned: reconciliation reminders and discrepancy reporting.</p>
          </article>
        </section>
      )}
    </section>
  );
}

export default InventoryPage;
