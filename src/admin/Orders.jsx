import { useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import StatusBadge from "../components/StatusBadge";
import { formatShortDate } from "../lib/dateFormatting";
import { updateStoredOrder, useStoredOrders } from "../lib/ordersStore";
import {
  canAdvanceOperationalStatus,
  getNextOperationalStatus,
  isReadyForProductionStatus,
  sortOrdersByOperationalStatus,
} from "../orders/orderWorkflow";
import ProductionQueueBoard from "../production/ProductionQueueBoard";
import {
  buildProductionWorkspaceSummary,
  buildResultsLabel,
  getProductionMethodCounts,
  getProductionStatusCounts,
  matchesCustomer,
  matchesDateFilter,
  matchesProductionMethod,
  matchesProductionStatus,
  matchesSearch,
  normalizeLookup,
  normalizeProductionOrder,
  PRODUCTION_DATE_FILTERS,
  PRODUCTION_METHOD_FILTERS,
  PRODUCTION_STATUS_FILTERS,
  PRODUCTION_VIEW_MODES,
} from "../production/productionWorkspace";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function getPaymentSummary(order) {
  const balanceDue = Number(order.balance_due || 0);

  if (balanceDue > 0) {
    return `Owes ${money(balanceDue)}`;
  }

  return order.payment_status === "Paid in Full" ? "Paid" : "No balance due";
}

function OrdersTable({ orders, emptyMessage, onAdvanceStatus }) {
  return (
    <div
      style={{
        overflowX: "auto",
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        background: "#ffffff",
      }}
    >
      <table style={{ width: "100%", borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Order</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Customer</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Garment</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Production Type</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Assigned Worker</th>
            <th style={{ padding: "12px 8px", textAlign: "left", minWidth: "120px" }}>Created</th>
            <th style={{ padding: "12px 8px", textAlign: "left", minWidth: "120px" }}>Due Date</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Payment</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Status</th>
            <th style={{ padding: "12px 8px", textAlign: "left" }}>Action</th>
          </tr>
        </thead>

        <tbody>
          {orders.map((order) => (
            <tr key={order.order_number} style={{ borderBottom: "1px solid #e2e8f0" }}>
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

              <td style={{ padding: "14px 8px", color: "#57534e", whiteSpace: "nowrap" }}>
                {formatShortDate(order.created_at)}
              </td>

              <td style={{ padding: "14px 8px", color: "#57534e", whiteSpace: "nowrap" }}>
                {order.due_date ? formatShortDate(order.due_date) : "—"}
              </td>

              <td style={{ padding: "14px 8px" }}>
                <div style={{ display: "grid", gap: "6px" }}>
                  <PaymentStatusBadge status={order.payment_status} />
                  <span
                    style={{
                      color: order.balance_due > 0 ? "#991b1b" : "#64748b",
                      fontSize: "12px",
                      fontWeight: 700,
                      lineHeight: 1.3,
                      whiteSpace: "nowrap",
                    }}
                  >
                    {getPaymentSummary(order)}
                  </span>
                </div>
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
                colSpan="10"
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

function FilterPill({ active, children, count, tone = "default", onClick }) {
  const activeBackground =
    tone === "warning" ? "#9a3412" : tone === "success" ? "#166534" : "#171717";

  return (
    <button
      type="button"
      onClick={onClick}
      style={{
        border: active ? `1px solid ${activeBackground}` : "1px solid #d6d3d1",
        background: active ? activeBackground : "#ffffff",
        color: active ? "#ffffff" : "#171717",
        borderRadius: "999px",
        padding: "9px 13px",
        fontWeight: 700,
        cursor: "pointer",
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
      }}
    >
      <span>{children}</span>
      <span
        style={{
          minWidth: "20px",
          height: "20px",
          padding: "0 6px",
          borderRadius: "999px",
          display: "inline-flex",
          alignItems: "center",
          justifyContent: "center",
          fontSize: "12px",
          background: active ? "rgba(255,255,255,0.18)" : "#f5f5f4",
          color: active ? "#ffffff" : "#57534e",
        }}
      >
        {count}
      </span>
    </button>
  );
}

function FilterGroup({ label, children }) {
  return (
    <section
      style={{
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "18px",
        padding: "16px",
        display: "grid",
        gap: "12px",
      }}
    >
      <div>
        <p
          style={{
            margin: 0,
            color: "#64748b",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          {label}
        </p>
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  const background =
    tone === "warning" ? "#fff7ed" : tone === "danger" ? "#fef2f2" : tone === "success" ? "#ecfdf5" : "#ffffff";
  const border =
    tone === "warning" ? "#fdba74" : tone === "danger" ? "#fecaca" : tone === "success" ? "#bbf7d0" : "#e2e8f0";
  const color =
    tone === "warning" ? "#c2410c" : tone === "danger" ? "#b91c1c" : tone === "success" ? "#166534" : "#0f172a";

  return (
    <div
      style={{
        background,
        border: `1px solid ${border}`,
        borderRadius: "18px",
        padding: "16px",
      }}
    >
      <p style={{ margin: 0, color, fontWeight: 800 }}>{label}</p>
      <h2 style={{ margin: "10px 0 0", fontSize: "32px" }}>{value}</h2>
    </div>
  );
}

export default function Orders() {
  const storedOrders = useStoredOrders();
  const [searchParams, setSearchParams] = useSearchParams();
  const activeStatusFilter = searchParams.get("status") || "active";
  const activeMethodFilter = searchParams.get("workflow") || "all";
  const activeDateFilter = searchParams.get("date") || "all";
  const activeViewMode = searchParams.get("view") || "table";
  const searchTerm = searchParams.get("q") || "";
  const activeCustomerFilter = searchParams.get("customer") || "";
  const customStart = searchParams.get("start") || "";
  const customEnd = searchParams.get("end") || "";
  const [customerInput, setCustomerInput] = useState(activeCustomerFilter);
  const [isCustomerMenuOpen, setIsCustomerMenuOpen] = useState(false);

  const hasActiveFilters =
    activeStatusFilter !== "active" ||
    activeMethodFilter !== "all" ||
    activeDateFilter !== "all" ||
    activeViewMode !== "table" ||
    Boolean(activeCustomerFilter) ||
    Boolean(searchTerm) ||
    Boolean(customStart) ||
    Boolean(customEnd);

  const orders = useMemo(
    () => sortOrdersByOperationalStatus(storedOrders.map(normalizeProductionOrder)),
    [storedOrders]
  );

  const customerOptions = useMemo(() => {
    const uniqueCustomers = new Map();

    orders.forEach((order) => {
      const customerName = String(order.customer_name || "").trim();
      const normalizedCustomerName = normalizeLookup(customerName);
      if (!normalizedCustomerName || uniqueCustomers.has(normalizedCustomerName)) return;
      uniqueCustomers.set(normalizedCustomerName, customerName);
    });

    return Array.from(uniqueCustomers.entries())
      .map(([normalizedName, name]) => ({ normalizedName, name }))
      .sort((left, right) => left.name.localeCompare(right.name));
  }, [orders]);

  const customerSuggestions = useMemo(() => {
    const normalizedInput = normalizeLookup(customerInput);
    if (!normalizedInput) return customerOptions;

    return customerOptions.filter((customer) =>
      customer.normalizedName.includes(normalizedInput)
    );
  }, [customerInput, customerOptions]);

  const statusCounts = useMemo(() => getProductionStatusCounts(orders), [orders]);
  const methodCounts = useMemo(() => getProductionMethodCounts(orders), [orders]);
  const workspaceSummary = useMemo(
    () => buildProductionWorkspaceSummary(orders),
    [orders]
  );

  const filteredOrders = useMemo(
    () =>
      orders.filter(
        (order) =>
          matchesProductionStatus(order, activeStatusFilter) &&
          matchesProductionMethod(order, activeMethodFilter) &&
          matchesDateFilter(order, activeDateFilter, customStart, customEnd) &&
          matchesCustomer(order, activeCustomerFilter) &&
          matchesSearch(order, searchTerm)
      ),
    [
      orders,
      activeStatusFilter,
      activeMethodFilter,
      activeDateFilter,
      customStart,
      customEnd,
      activeCustomerFilter,
      searchTerm,
    ]
  );

  function updateFilters(nextValues) {
    const nextParams = new URLSearchParams(searchParams);

    Object.entries(nextValues).forEach(([key, value]) => {
      if (
        !value ||
        (key === "status" && value === "active") ||
        (key === "workflow" && value === "all") ||
        (key === "date" && value === "all") ||
        (key === "view" && value === "table")
      ) {
        nextParams.delete(key);
      } else {
        nextParams.set(key, value);
      }
    });

    if (
      (nextValues.date && nextValues.date !== "custom") ||
      (activeDateFilter !== "custom" && !nextValues.date)
    ) {
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

  function handleResetFilters() {
    setCustomerInput("");
    setIsCustomerMenuOpen(false);
    setSearchParams(new URLSearchParams());
  }

  function selectCustomerFilter(customerName) {
    setCustomerInput(customerName);
    setIsCustomerMenuOpen(false);
    updateFilters({ customer: customerName });
  }

  function handleCustomerInputChange(event) {
    const nextValue = event.target.value;
    const normalizedNextValue = normalizeLookup(nextValue);
    const exactMatch = customerOptions.find(
      (customer) => customer.normalizedName === normalizedNextValue
    );

    setCustomerInput(nextValue);
    setIsCustomerMenuOpen(true);

    if (!nextValue.trim()) {
      updateFilters({ customer: "" });
      return;
    }

    if (exactMatch) {
      updateFilters({ customer: exactMatch.name });
    }
  }

  function handleCustomerInputBlur() {
    window.setTimeout(() => {
      setIsCustomerMenuOpen(false);
      setCustomerInput(activeCustomerFilter);
    }, 120);
  }

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          background: "#ffffff",
          borderRadius: "24px",
          padding: "24px",
          border: "1px solid #e2e8f0",
          display: "grid",
          gap: "20px",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-start",
            gap: "16px",
            flexWrap: "wrap",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#64748b",
                fontSize: "12px",
                fontWeight: 800,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Production Workspace
            </p>
            <h1 style={{ margin: "8px 0 6px" }}>Production Orders</h1>
            <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
              One operational workspace for production visibility, queue management, and status progression.
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

        <section
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
            gap: "12px",
          }}
        >
          <SummaryCard label="Active Jobs" value={workspaceSummary.activeOrders} />
          <SummaryCard label="Urgent" value={workspaceSummary.urgentOrders} tone="danger" />
          <SummaryCard label="Unassigned" value={workspaceSummary.unassignedOrders} tone="warning" />
          <SummaryCard label="Completed" value={workspaceSummary.completedOrders} tone="success" />
        </section>

        <div style={{ display: "grid", gap: "14px" }}>
          <FilterGroup label="Queue Views">
            <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
              {PRODUCTION_STATUS_FILTERS.map((filter) => (
                <FilterPill
                  key={filter.key}
                  active={activeStatusFilter === filter.key}
                  count={statusCounts[filter.key] || 0}
                  tone={filter.key === "urgent" ? "warning" : filter.key === "completed" ? "success" : "default"}
                  onClick={() => updateFilters({ status: filter.key })}
                >
                  {filter.label}
                </FilterPill>
              ))}
            </div>
          </FilterGroup>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            <FilterGroup label="Production Workflow">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRODUCTION_METHOD_FILTERS.map((filter) => (
                  <FilterPill
                    key={filter.key}
                    active={activeMethodFilter === filter.key}
                    count={methodCounts[filter.key] || 0}
                    onClick={() => updateFilters({ workflow: filter.key })}
                  >
                    {filter.label}
                  </FilterPill>
                ))}
              </div>
            </FilterGroup>

            <FilterGroup label="View Mode">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRODUCTION_VIEW_MODES.map((mode) => (
                  <FilterPill
                    key={mode.key}
                    active={activeViewMode === mode.key}
                    count={filteredOrders.length}
                    onClick={() => updateFilters({ view: mode.key })}
                  >
                    {mode.label}
                  </FilterPill>
                ))}
              </div>
              <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
                Queue View keeps the production board inside this page so future drag-and-drop stage work can layer onto the same data model.
              </p>
            </FilterGroup>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: "14px",
            }}
          >
            <FilterGroup label="Date Window">
              <div style={{ display: "flex", gap: "8px", flexWrap: "wrap" }}>
                {PRODUCTION_DATE_FILTERS.map((tab) => (
                  <FilterPill
                    key={tab.key}
                    active={activeDateFilter === tab.key}
                    count={filteredOrders.length}
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
                      onChange={(event) =>
                        updateFilters({ date: "custom", start: event.target.value })
                      }
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
                      onChange={(event) =>
                        updateFilters({ date: "custom", end: event.target.value })
                      }
                      style={{
                        border: "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "10px 12px",
                      }}
                    />
                  </label>
                </div>
              ) : null}
            </FilterGroup>

            <FilterGroup label="Search And Filters">
              <div
                style={{
                  display: "flex",
                  gap: "10px",
                  flexWrap: "wrap",
                  alignItems: "center",
                }}
              >
                <div
                  style={{
                    position: "relative",
                    flex: "1 1 220px",
                    minWidth: 0,
                  }}
                >
                  <input
                    type="search"
                    value={customerInput}
                    onChange={handleCustomerInputChange}
                    onFocus={() => setIsCustomerMenuOpen(true)}
                    onBlur={handleCustomerInputBlur}
                    placeholder="Filter by customer"
                    style={{
                      width: "100%",
                      minWidth: 0,
                      border: "1px solid #cbd5e1",
                      borderRadius: "14px",
                      padding: "12px 14px",
                      boxSizing: "border-box",
                      fontSize: "15px",
                    }}
                  />

                  {isCustomerMenuOpen && customerSuggestions.length > 0 ? (
                    <div
                      style={{
                        position: "absolute",
                        top: "calc(100% + 6px)",
                        left: 0,
                        right: 0,
                        zIndex: 20,
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)",
                        overflow: "hidden",
                        maxHeight: "240px",
                        overflowY: "auto",
                      }}
                    >
                      {customerSuggestions.slice(0, 8).map((customer) => (
                        <button
                          key={customer.normalizedName}
                          type="button"
                          onMouseDown={() => selectCustomerFilter(customer.name)}
                          style={{
                            display: "block",
                            width: "100%",
                            padding: "11px 12px",
                            background:
                              normalizeLookup(activeCustomerFilter) === customer.normalizedName
                                ? "#f8fafc"
                                : "#ffffff",
                            border: "none",
                            borderBottom: "1px solid #f1f5f9",
                            textAlign: "left",
                            cursor: "pointer",
                            color: "#292524",
                          }}
                        >
                          <strong>{customer.name}</strong>
                        </button>
                      ))}
                    </div>
                  ) : null}
                </div>

                <input
                  type="search"
                  value={searchTerm}
                  onChange={(event) => updateFilters({ q: event.target.value })}
                  placeholder="Search order, garment, worker, or artwork filename"
                  style={{
                    flex: "1 1 300px",
                    minWidth: 0,
                    border: "1px solid #cbd5e1",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    boxSizing: "border-box",
                    fontSize: "15px",
                  }}
                />

                <button
                  type="button"
                  onClick={handleResetFilters}
                  disabled={!hasActiveFilters}
                  style={{
                    border: "1px solid #d6d3d1",
                    background: hasActiveFilters ? "#ffffff" : "#f5f5f4",
                    color: hasActiveFilters ? "#171717" : "#a8a29e",
                    borderRadius: "14px",
                    padding: "12px 14px",
                    fontWeight: 700,
                    cursor: hasActiveFilters ? "pointer" : "not-allowed",
                    whiteSpace: "nowrap",
                  }}
                >
                  Reset Filters
                </button>
              </div>
            </FilterGroup>
          </div>
        </div>

        <section style={{ display: "grid", gap: "12px" }}>
          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              gap: "10px",
              flexWrap: "wrap",
            }}
          >
            <div>
              <h2 style={{ margin: 0, fontSize: "18px" }}>
                {activeViewMode === "table" ? "Order Table" : "Queue Board"}
              </h2>
              <p style={{ margin: "4px 0 0", color: "#64748b" }}>
                {buildResultsLabel(filteredOrders.length, activeStatusFilter)}
              </p>
            </div>
          </div>

          {activeViewMode === "table" ? (
            <OrdersTable
              orders={filteredOrders}
              emptyMessage="No production orders match the current workspace filters."
              onAdvanceStatus={handleAdvanceStatus}
            />
          ) : (
            <ProductionQueueBoard orders={filteredOrders} />
          )}
        </section>
      </div>
    </div>
  );
}
