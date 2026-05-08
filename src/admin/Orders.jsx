import { useEffect, useMemo, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { normalizeProductionType } from "../constants/productionTypes";
import { useStoredOrders } from "../lib/ordersStore";
import StatusBadge from "../components/StatusBadge";

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizeOrder(order) {
  return {
    ...order,
    customer_name: order.customer_name || "Walk-in Customer",
    garment: order.garment || order.item || "Custom garment",
    assigned_to_staff_name:
      order.assigned_to_staff_name || "Unassigned",
    decoration_type: normalizeProductionType(order.decoration_type),
    status: order.status || "Awaiting Artwork",
  };
}

const statusTabs = [
  { key: "all", label: "All Orders" },
  { key: "production", label: "Production" },
  { key: "assignments", label: "Needs Assignment" },
  { key: "dtf", label: "DTF" },
  { key: "embroidery", label: "Embroidery" },
  { key: "screen", label: "Screen Print" },
];

function tabMatchesOrder(order, activeTab) {
  if (activeTab === "all") return true;

  if (activeTab === "assignments") {
    return (
      order.needs_assignment || !order.assigned_to_staff_name
    );
  }

  if (activeTab === "dtf") {
    return normalizeStatus(order.decoration_type) === "dtf";
  }

  if (activeTab === "embroidery") {
    return normalizeStatus(order.decoration_type) === "embroidery";
  }

  if (activeTab === "screen") {
    return normalizeStatus(order.decoration_type).includes("screen");
  }

  if (activeTab === "production") {
    return order.operational_visible !== false;
  }

  return true;
}

export default function Orders() {
  const [searchParams, setSearchParams] = useSearchParams();
  const activeFilter = searchParams.get("filter") || "all";
  const [activeTabKey, setActiveTabKey] = useState(
    activeFilter
  );

  useEffect(() => {
    setActiveTabKey(activeFilter);
  }, [activeFilter]);

  const orders = useStoredOrders().map(normalizeOrder);

  const filteredOrders = useMemo(
    () =>
      orders.filter((order) =>
        tabMatchesOrder(order, activeTabKey)
      ),
    [orders, activeTabKey]
  );

  function selectTab(tabKey) {
    setActiveTabKey(tabKey);
    setSearchParams(tabKey === "all" ? {} : { filter: tabKey });
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
          }}
        >
          <div>
            <h1 style={{ margin: 0 }}>Production Orders</h1>
            <p style={{ margin: "6px 0 0", color: "#64748b" }}>
              Assignment, production, and garment workflow visibility.
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

        <div
          style={{
            display: "flex",
            gap: "8px",
            marginBottom: "18px",
            flexWrap: "wrap",
          }}
        >
          {statusTabs.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => selectTab(tab.key)}
              style={{
                border:
                  activeTabKey === tab.key
                    ? "1px solid #171717"
                    : "1px solid #d6d3d1",
                background:
                  activeTabKey === tab.key
                    ? "#171717"
                    : "#ffffff",
                color:
                  activeTabKey === tab.key
                    ? "#ffffff"
                    : "#171717",
                borderRadius: "999px",
                padding: "9px 13px",
                fontWeight: 700,
              }}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div style={{ overflowX: "auto" }}>
          <table
            style={{ width: "100%", borderCollapse: "collapse" }}
          >
            <thead>
              <tr style={{ borderBottom: "1px solid #e2e8f0" }}>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>
                  Order
                </th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>
                  Customer
                </th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>
                  Garment
                </th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>
                  Production Type
                </th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>
                  Assigned Worker
                </th>
                <th style={{ padding: "12px 8px", textAlign: "left" }}>
                  Status
                </th>
              </tr>
            </thead>

            <tbody>
              {filteredOrders.map((order) => (
                <tr
                  key={order.order_number}
                  style={{ borderBottom: "1px solid #e2e8f0" }}
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

                  <td style={{ padding: "14px 8px" }}>
                    {order.customer_name}
                  </td>

                  <td style={{ padding: "14px 8px" }}>
                    {order.garment}
                  </td>

                  <td style={{ padding: "14px 8px" }}>
                    {order.decoration_type}
                  </td>

                  <td style={{ padding: "14px 8px" }}>
                    <span
                      style={{
                        color:
                          order.assigned_to_staff_name ===
                          "Unassigned"
                            ? "#b45309"
                            : "#166534",
                        fontWeight: 700,
                      }}
                    >
                      {order.assigned_to_staff_name}
                    </span>
                  </td>

                  <td style={{ padding: "14px 8px" }}>
                    <StatusBadge status={order.status} />
                  </td>
                </tr>
              ))}
              {filteredOrders.length === 0 ? (
                <tr>
                  <td
                    colSpan="6"
                    style={{
                      padding: "24px 8px",
                      textAlign: "center",
                      color: "#64748b",
                    }}
                  >
                    No orders match this workflow view yet.
                  </td>
                </tr>
              ) : null}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
