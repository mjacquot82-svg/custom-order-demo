import { Link, useSearchParams } from "react-router-dom";
import { normalizeProductionType } from "../constants/productionTypes";
import { updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import StatusBadge from "../components/StatusBadge";
import {
  canAdvanceOperationalStatus,
  getNextOperationalStatus,
  isCompletedOperationalStatus,
  isReadyForProductionStatus,
  normalizeOperationalStatus,
  sortOrdersByOperationalStatus,
} from "../orders/orderWorkflow";

function normalizeLookup(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeOrder(order) {
  return {
    ...order,
    customer_name: order.customer_name || "Walk-in Customer",
    garment: order.garment || order.item || "Custom garment",
    assigned_to_staff_name: order.assigned_to_staff_name || "Unassigned",
    decoration_type: normalizeProductionType(order.decoration_type),
    status: normalizeOperationalStatus(order.status || "New"),
  };
}

const workflowTabs = [
  { key: "all", label: "All Workflow" },
  { key: "production", label: "Production" },
  { key: "assignments", label: "Unassigned" },
  { key: "dtf", label: "DTF" },
  { key: "embroidery", label: "Embroidery" },
  { key: "screen", label: "Screen Print" },
];

const orderScopeTabs = [
  { key: "active", label: "Active Orders" },
  { key: "completed", label: "Completed Orders" },
  { key: "all", label: "All Orders" },
];

const dateFilterTabs = [
  { key: "all", label: "Any Date" },
  { key: "today", label: "Today" },
  { key: "week", label: "This Week" },
  { key: "month", label: "This Month" },
  { key: "custom", label: "Custom Range" },
];

function getOrderArtworkLabel(order) {
  return (order.artwork_files || [])
    .map((file) => file?.file_name || file?.name || "")
    .filter(Boolean)
    .join(" ");
}

function getOrderSearchText(order) {
  return normalizeLookup([
    order.order_number,
    order.customer_name,
    order.garment,
    order.decoration_type,
    order.assigned_to_staff_name,
    order.status,
    order.due_date,
    order.created_at,
    getOrderArtworkLabel(order),
  ].join(" "));
}

function getOrderFilterDate(order) {
  if (order.due_date) {
    return new Date(`${order.due_date}T00:00:00`);
  }

  if (order.created_at) {
    const createdAt = new Date(order.created_at);
    createdAt.setHours(0, 0, 0, 0);
    return createdAt;
  }

  return null;
}

function buildWeekStart(today) {
  const start = new Date(today);
  start.setDate(today.getDate() - today.getDay());
  start.setHours(0, 0, 0, 0);
  return start;
}

function buildWeekEnd(today) {
  const end = buildWeekStart(today);
  end.setDate(end.getDate() + 6);
  end.setHours(23, 59, 59, 999);
  return end;
}

function buildMonthEnd(today) {
  return new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59, 999);
}

function matchesDateFilter(order, dateFilter, customStart, customEnd) {
  if (dateFilter === "all") return true;

  const orderDate = getOrderFilterDate(order);
  if (!orderDate) return false;

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  if (dateFilter === "today") {
    return orderDate.getTime() === today.getTime();
  }

  if (dateFilter === "week") {
    return orderDate >= buildWeekStart(today) && orderDate <= buildWeekEnd(today);
  }

  if (dateFilter === "month") {
    return orderDate >= new Date(today.getFullYear(), today.getMonth(), 1) && orderDate <= buildMonthEnd(today);
  }

  if (dateFilter === "custom") {
    const start = customStart ? new Date(`${customStart}T00:00:00`) : null;
    const end = customEnd ? new Date(`${customEnd}T23:59:59`) : null;

    if (start && orderDate < start) return false;
    if (end && orderDate > end) return false;
    return true;
  }

  return true;
}

function tabMatchesOrder(order, activeTab) {
  if (activeTab === "all") return true;

  if (activeTab === "assignments") {
    return order.needs_assignment || !order.assigned_to_staff_id;
  }

  const normalizedDecorationType = normalizeLookup(order.decoration_type);

  if (activeTab === "dtf") {
    return normalizedDecorationType === "dtf";
  }

  if (activeTab === "embroidery") {
    return normalizedDecorationType === "embroidery";
  }

  if (activeTab === "screen") {
    return normalizedDecorationType.includes("screen");
  }

  if (activeTab === "production") {
    return order.operational_visible !== false && !isCompletedOperationalStatus(order.status);
  }

  return true;
}

function matchesSearch(order, searchTerm) {
  if (!searchTerm) return true;
  return getOrderSearchText(order).includes(normalizeLookup(searchTerm));
}

function OrdersTable({ orders, emptyMessage, subdued = false, onAdvanceStatus }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: subdued ? "1px solid #e7e5e4" : "1px solid #e2e8f0",
        borderRadius: "16px",
        background: subdued ? "#fafaf9" : "#ffffff",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: subdued ? "1px solid #e7e5e4" : "1px solid #e2e8f0" }}>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Order</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Customer</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Garment</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Production Type</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Assigned Worker</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Due / Created</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Status</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr
              key={order.order_number}
              style={{ borderBottom: subdued ? "1px solid #ece7e1" : "1px solid #e2e8f0" }}
            >
              <td style={{ padding: "14px 8px" }}>
                <Link
                  to={`/admin/orders/${order.order_number}`}
                  style={{
                    color: "#0f172a",
                    fontWeight: 700,
                    textDecoration: "none",
                  }}
                >
                  {order.order_number}
                </Link>
              </td>

              <td style={{ padding: "14px 8px" }}>{order.customer_name}</td>
              <td style={{ padding: "14px 8px" }}>{order.garment}</td>
              <td style={{ padding: "14px 8px" }}>{order.decoration_type}</td>

              <td style={{ padding: "14px 8px" }}>
                <span
                  style={{
                    display: "inline-flex",
                    alignItems: "center",
                    borderRadius: "999px",
                    padding: "6px 10px",
                    color: order.assigned_to_staff_name === "Unassigned" ? "#b45309" : "#166534",
                    fontWeight: 700,
                    background: order.assigned_to_staff_name === "Unassigned" ? "#fff7ed" : "#ecfdf5",
                  }}
                >
                  {order.assigned_to_staff_name}
                </span>
              </td>

              <td style={{ padding: "14px 8px", color: "#57534e" }}>
                {order.due_date || (order.created_at ? new Date(order.created_at).toLocaleDateString() : "—")}
              </td>

              <td style={{ padding: "14px 8px" }}>
                <StatusBadge status={order.status} />
              </td>

              <td style={{ padding: "14px 8px" }}>
                {canAdvanceOperationalStatus(order.status) ? (
                  <button
                    type="button"
                    onClick={() => onAdvanceStatus(order)}
                    style={{
                      border: "none",
                      background: isReadyForProductionStatus(order.status) ? "#171717" : "#334155",
                      color: "#ffffff",
                      borderRadius: "10px",
                      padding: "9px 12px",
                      fontWeight: 700,
                      cursor: "pointer",
                    }}
                  >
                    Mark {getNextOperationalStatus(order.status)}
                  </button>
                ) : (
                  <span style={{ color: "#64748b", fontWeight: 700 }}>Complete</span>
                )}
              </td>
            </tr>
          ))}

          {orders.length === 0 ? (
            <tr>
              <td
                colSpan="8"
                style={{
                  padding: "24px 8px",
                  textAlign: "center",
                  color: "#64748b",
                }}
              >
                {emptyMessage}
              </td>
            </tr>
          ) : null}
        </tbody>
      </table>
    </div>
  );
}

function FilterPill({ active, children, onClick }) {
  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? "1px solid #171717" : "1px solid #d6d3d1",
        background: active ? "#171717" : "#ffffff",
        color: active ? "#ffffff" : "#171717",
        borderRadius: "999px",
        padding: "9px 13px",
        fontWeight: 700,
        cursor: "pointer",
      }}
    >
      {children}
    </button>
  );
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeWorkflowFilter = searchParams.get("filter") || "all";
  const activeScope = searchParams.get("scope") || "active";
  const activeDateFilter = searchParams.get("date") || "all";
  const searchTerm = searchParams.get("q") || "";
  const customStart = searchParams.get("start") || "";
  const customEnd = searchParams.get("end") || "";

  const orders = sortOrdersByOperationalStatus(useStoredOrders().map(normalizeOrder));

  const filteredOrders = orders.filter(
    (order) =>
      tabMatchesOrder(order, activeWorkflowFilter) &&
      matchesDateFilter(order, activeDateFilter, customStart, customEnd) &&
      matchesSearch(order, searchTerm)
  );

  const activeOrders = filteredOrders.filter((order) => !isCompletedOperationalStatus(order.status));
  const completedOrders = filteredOrders.filter((order) => isCompletedOperationalStatus(order.status));

  function updateFilters(nextValues) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (!value || (key === "filter" && value === "all") || (key === "scope" && value === "active") || (key === "date" && value === "all")) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    if ((nextValues.date && nextValues.date !== "custom") || (activeDateFilter !== "custom" && !nextValues.date)) {
      nextParams.delete("start");
      nextParams.delete("end");
    }

    setSearchParams(nextParams);
  }

  function handleAdvanceStatus(order) {
    const nextStatus = getNextOperationalStatus(order.status);
    const updates = {
      status: nextStatus,
      activity_type: "status_change",
      activity_note: `Status changed to ${nextStatus}.`,
    };

    if (nextStatus === "In Production") {
      updates.production_started_at = order.production_started_at || new Date().toISOString();
      updates.production_ready = true;
    }

    if (nextStatus === "Completed") {
      updates.completed_at = new Date().toISOString();
    }

    updateStoredOrder(order.order_number, updates);
  }

  return (
    <div style={{ maxWidth: "1200px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "20px",
          padding: "24px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            marginBottom: "20px",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Production Orders</h1>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              Active work stays front-and-center while completed jobs remain searchable and separated below.
            </p>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <Link
              to="/admin/orders/new"
              style={{
                background: "#171717",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "12px 16px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              New Order
            </Link>
            <Link
              to="/admin/assignments"
              style={{
                background: "#ffffff",
                color: "#171717",
                border: "1px solid #d6d3d1",
                borderRadius: "12px",
                padding: "12px 16px",
                textDecoration: "none",
                fontWeight: 700,
              }}
            >
              Open Assignments
            </Link>
          </div>
        </div>

        <div style={{ display: "grid", gap: "14px", marginBottom: "18px" }}>
          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {orderScopeTabs.map((tab) => (
              <FilterPill
                key={tab.key}
                active={activeScope === tab.key}
                onClick={() => updateFilters({ scope: tab.key })}
              >
                {tab.label}
              </FilterPill>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {workflowTabs.map((tab) => (
              <FilterPill
                key={tab.key}
                active={activeWorkflowFilter === tab.key}
                onClick={() => updateFilters({ filter: tab.key })}
              >
                {tab.label}
              </FilterPill>
            ))}
          </div>

          <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
            {dateFilterTabs.map((tab) => (
              <FilterPill
                key={tab.key}
                active={activeDateFilter === tab.key}
                onClick={() => updateFilters({ date: tab.key })}
              >
                {tab.label}
              </FilterPill>
            ))}
          </div>

          {activeDateFilter === "custom" ? (
            <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
              <label style={{ display: "grid", gap: "6px", color: "#475569", fontWeight: 700 }}>
                Start Date
                <input
                  type="date"
                  value={customStart}
                  onChange={(event) => updateFilters({ date: "custom", start: event.target.value })}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "10px 12px",
                  }}
                />
              </label>

              <label style={{ display: "grid", gap: "6px", color: "#475569", fontWeight: 700 }}>
                End Date
                <input
                  type="date"
                  value={customEnd}
                  onChange={(event) => updateFilters({ date: "custom", end: event.target.value })}
                  style={{
                    border: "1px solid #cbd5e1",
                    borderRadius: "12px",
                    padding: "10px 12px",
                  }}
                />
              </label>
            </div>
          ) : null}

          <input
            type="search"
            value={searchTerm}
            onChange={(event) => updateFilters({ q: event.target.value })}
            placeholder="Search order, customer, garment, worker, or artwork filename"
            style={{
              width: "100%",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "12px 14px",
              boxSizing: "border-box",
              fontSize: "15px",
            }}
          />
        </div>

        {(activeScope === "active" || activeScope === "all") ? (
          <section style={{ marginBottom: activeScope === "all" ? "20px" : 0 }}>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px" }}>Active Orders</h2>
              <span style={{ color: "#57534e", fontWeight: 700 }}>{activeOrders.length} active jobs</span>
            </div>

            <OrdersTable
              orders={activeOrders}
              emptyMessage="No active orders match this workflow view yet."
              onAdvanceStatus={handleAdvanceStatus}
            />
          </section>
        ) : null}

        {(activeScope === "completed" || activeScope === "all") ? (
          <section>
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                gap: "10px",
                flexWrap: "wrap",
                marginBottom: "10px",
              }}
            >
              <h2 style={{ margin: 0, fontSize: "18px" }}>Completed Orders</h2>
              <span style={{ color: "#57534e", fontWeight: 700 }}>{completedOrders.length} completed jobs</span>
            </div>

            <OrdersTable
              orders={completedOrders}
              emptyMessage="No completed orders match the current search and date filters."
              subdued
              onAdvanceStatus={handleAdvanceStatus}
            />
          </section>
        ) : null}
      </div>
    </div>
  );
}
