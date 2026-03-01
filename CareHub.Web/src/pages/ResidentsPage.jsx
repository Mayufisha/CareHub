import { useMemo, useState } from "react";
import PageTabs from "../components/PageTabs";

const RESIDENT_TABS = [
  { key: "directory", label: "Directory" },
  { key: "rooms", label: "Room Map" },
  { key: "care", label: "Care Plans" }
];

function ResidentsPage({
  loading,
  error,
  displayedResidents,
  pagedResidents,
  currentPage,
  pageSize,
  renderSectionTools,
  renderSectionMeta
}) {
  const [activeTab, setActiveTab] = useState("directory");

  const roomGroups = useMemo(() => {
    const map = new Map();
    displayedResidents.forEach((resident) => {
      const room = resident._room || "Unassigned";
      if (!map.has(room)) {
        map.set(room, []);
      }
      map.get(room).push(resident);
    });
    return Array.from(map.entries()).sort((a, b) => String(a[0]).localeCompare(String(b[0])));
  }, [displayedResidents]);

  if (loading) {
    return (
      <section className="card">
        <p>Loading residents...</p>
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
      <PageTabs tabs={RESIDENT_TABS} activeTab={activeTab} onChange={setActiveTab} />

      {activeTab === "directory" && (
        <section className="card">
          <h3>Residents Directory</h3>
          {renderSectionTools([
            { value: "name", label: "Sort: Name" },
            { value: "room", label: "Sort: Room" }
          ])}
          {renderSectionMeta(displayedResidents.length, "residents")}
          {displayedResidents.length === 0 && <p className="empty-state">No residents match this view.</p>}
          {pagedResidents.map((resident, index) => (
            <div className="list-row" key={resident.id}>
              <span className="list-primary">
                <b className="row-index">{(currentPage - 1) * pageSize + index + 1}</b>
                {resident._name}
              </span>
              <small>Room {resident._room || "N/A"}</small>
            </div>
          ))}
        </section>
      )}

      {activeTab === "rooms" && (
        <section className="card">
          <h3>Room Map</h3>
          {roomGroups.length === 0 && <p>No room assignments available.</p>}
          {roomGroups.map(([room, residents]) => (
            <div key={room} className="list-row">
              <span>{room}</span>
              <small>{residents.length} resident(s)</small>
            </div>
          ))}
        </section>
      )}

      {activeTab === "care" && (
        <section className="staff-grid">
          <article className="card">
            <h3>Care Plan Status</h3>
            <p>Planned: care plan review cycles and completion flags.</p>
          </article>
          <article className="card">
            <h3>Escalations</h3>
            <p>Planned: medication adherence and vitals escalation tracking.</p>
          </article>
          <article className="card">
            <h3>Family Notes</h3>
            <p>Planned: contact updates and communication history.</p>
          </article>
        </section>
      )}
    </section>
  );
}

export default ResidentsPage;
