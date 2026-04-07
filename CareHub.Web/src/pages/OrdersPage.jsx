import { useMemo, useState } from "react";
import PageTabs from "../components/PageTabs";

const ORDERS_TABS = [
  { key: "queue", label: "Order Queue" },
  { key: "status", label: "Status Board" }
];

function OrdersPage({
  loading,
  error,
  displayedOrders,
  pagedOrders,
  currentPage,
  pageSize,
  renderSectionTools,
  renderSectionMeta
}) {
  const [activeTab, setActiveTab] = useState("queue");

  const statusSummary = useMemo(() => {
    return displayedOrders.reduce(
      (summary, order) => {
        const status = order._status || "Unknown";
        summary[status] = (summary[status] || 0) + 1;
        return summary;
      },
      {}
    );
  }, [displayedOrders]);

  if (loading) {
    return <section className="card">Loading medication orders...</section>;
  }

  if (error) {
    return <section className="card error">{error}</section>;
  }

  return (
    <section className="page-shell">
      <PageTabs tabs={ORDERS_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "queue" && (
        <section className="card">
          <h3>Medication Orders</h3>
          {renderSectionTools([
            { value: "date", label: "Sort: Date" },
            { value: "medication", label: "Sort: Medication" },
            { value: "status", label: "Sort: Status" }
          ])}
          {renderSectionMeta(displayedOrders.length, "orders")}
          {displayedOrders.length === 0 ? (
            <p className="empty-state">No medication orders match this view.</p>
          ) : null}
          {pagedOrders.map((order, index) => (
            <div className="list-row" key={order.id || order.Id || `${order._medicationName}-${index}`}>
              <span className="list-primary">
                <b className="row-index">{(currentPage - 1) * pageSize + index + 1}</b>
                <span>
                  <strong>{order._medicationName}</strong>
                  <small className="inline-meta">Requested by {order._requestedBy}</small>
                </span>
              </span>
              <span className="list-row-actions">
                <small>{order._status}</small>
                <small>{order._timestamp}</small>
              </span>
            </div>
          ))}
        </section>
      )}

      {activeTab === "status" && (
        <section className="dashboard-grid">
          <article className="card">
            <h3>Status Board</h3>
            {Object.keys(statusSummary).length === 0 ? (
              <p className="empty-state">No order statuses available for the current filters.</p>
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
            <h3>Queue Guidance</h3>
            <p>
              Use the queue tab to search medication names, status transitions, and who requested the
              order. Export uses the same filtered view that is currently on screen.
            </p>
          </article>
        </section>
      )}
    </section>
  );
}

export default OrdersPage;
