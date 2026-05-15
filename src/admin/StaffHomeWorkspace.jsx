import { Link } from "react-router-dom";
import { formatDateTime, formatShortDate } from "../lib/dateFormatting";
import {
  isCanceledOperationalStatus,
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";
import { buildWorkerJobsView } from "../worker/buildWorkerJobsView";

function Section({ title, description, children }) {
  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "24px",
        padding: "24px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.04)",
      }}
    >
      <div style={{ marginBottom: "16px" }}>
        <h2 style={{ margin: 0 }}>{title}</h2>
        {description ? (
          <p style={{ margin: "8px 0 0", color: "#64748b", maxWidth: "760px", lineHeight: 1.6 }}>
            {description}
          </p>
        ) : null}
      </div>
      {children}
    </section>
  );
}

function SummaryCard({ label, value, tone = "default" }) {
  const tones = {
    default: { background: "#f8fafc", border: "#e2e8f0", value: "#0f172a", label: "#475569" },
    warning: { background: "#fff7ed", border: "#fed7aa", value: "#9a3412", label: "#9a3412" },
    success: { background: "#ecfdf5", border: "#bbf7d0", value: "#166534", label: "#166534" },
    danger: { background: "#fef2f2", border: "#fecaca", value: "#b91c1c", label: "#b91c1c" },
  };
  const palette = tones[tone] || tones.default;

  return (
    <article
      style={{
        background: palette.background,
        borderRadius: "16px",
        padding: "16px",
        border: `1px solid ${palette.border}`,
      }}
    >
      <p style={{ margin: 0, color: palette.label, fontSize: "12px", fontWeight: 800, letterSpacing: "0.06em", textTransform: "uppercase" }}>
        {label}
      </p>
      <h2 style={{ margin: "10px 0 0", color: palette.value, fontSize: "30px" }}>{value}</h2>
    </article>
  );
}

function StaffAssignmentColumn({ title, description, orders = [], emptyMessage }) {
  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        border: "1px solid #e7e5e4",
        display: "grid",
        gap: "14px",
      }}
    >
      <div>
        <h2 style={{ margin: "0 0 4px" }}>{title}</h2>
        <p style={{ margin: 0, color: "#64748b" }}>{description}</p>
      </div>

      {orders.length ? (
        <div style={{ display: "grid", gap: "10px" }}>
          {orders.map((order) => (
            <Link
              key={order.order_number}
              to={`/admin/orders/${order.order_number}`}
              style={{
                display: "grid",
                gap: "6px",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
                background: "#f8fafc",
                padding: "14px",
                textDecoration: "none",
                color: "#171717",
              }}
            >
              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
                <strong>{order.order_number}</strong>
                <span style={{ color: "#475569", fontWeight: 700, fontSize: "13px" }}>{order.status}</span>
              </div>
              <span style={{ fontWeight: 700 }}>{order.customer_name || "Walk-in Customer"}</span>
              <span style={{ color: "#64748b", fontSize: "14px" }}>
                {order.garment || order.item || "Custom garment"} • Due {order.due_date ? formatShortDate(order.due_date) : "TBD"}
              </span>
            </Link>
          ))}
        </div>
      ) : (
        <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>{emptyMessage}</p>
      )}
    </section>
  );
}

function buildStaffWorkspaceSummary(orders = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return orders.reduce(
    (summary, order) => {
      const status = normalizeOperationalStatus(order.status);
      const dueDate = order.due_date ? new Date(`${order.due_date}T00:00:00`) : null;

      if (!isCompletedOperationalStatus(status) && !isCanceledOperationalStatus(status)) {
        summary.active += 1;
      }

      if (status === "Awaiting Production" || status === "New") {
        summary.ready += 1;
      }

      if (status === "In Production") {
        summary.inProduction += 1;
      }

      if (status === "Ready for Pickup") {
        summary.readyForPickup += 1;
      }

      if (dueDate) {
        const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

        if (diffDays < 0 && !isCompletedOperationalStatus(status) && !isCanceledOperationalStatus(status)) {
          summary.overdue += 1;
        } else if (
          diffDays >= 0 &&
          diffDays <= 2 &&
          !isCompletedOperationalStatus(status) &&
          !isCanceledOperationalStatus(status)
        ) {
          summary.dueSoon += 1;
        }
      }

      return summary;
    },
    {
      active: 0,
      ready: 0,
      inProduction: 0,
      readyForPickup: 0,
      overdue: 0,
      dueSoon: 0,
    }
  );
}

function buildStaffActivity(orders = []) {
  return orders
    .flatMap((order) =>
      (order.connected_timeline || order.activity_log || []).map((event) => ({
        ...event,
        order_number: order.order_number,
      }))
    )
    .sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    )
    .slice(0, 6);
}

export default function StaffHomeWorkspace({ orders, staffUser }) {
  const summary = buildStaffWorkspaceSummary(orders);
  const groupedOrders = buildWorkerJobsView(orders, staffUser);
  const recentActivity = buildStaffActivity(orders);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px", display: "grid", gap: "18px" }}>
      <div>
        <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
          Staff Home
        </p>
        <h1 style={{ margin: "6px 0 8px", fontSize: "32px" }}>My Assigned Work</h1>
        <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
          Signed in as {staffUser?.name || "staff"}. This workspace is your personal execution queue: what needs to start, what is already in production, what is due soon, and what is ready for pickup.
        </p>
      </div>

      <Section title="My Queue Snapshot" description="Only work assigned directly to you appears here. Quotes, front-counter actions, and the global shop queue stay in their own workspaces.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <SummaryCard label="Assigned To Me" value={summary.active} />
          <SummaryCard label="Ready To Start" value={summary.ready} />
          <SummaryCard label="In Production" value={summary.inProduction} tone="success" />
          <SummaryCard label="Due Soon" value={summary.dueSoon} tone="warning" />
          <SummaryCard label="Overdue" value={summary.overdue} tone="danger" />
          <SummaryCard label="Ready For Pickup" value={summary.readyForPickup} />
        </div>
      </Section>

      <section style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "16px" }}>
        <StaffAssignmentColumn
          title="Ready To Start"
          description="Assigned jobs waiting for production work."
          orders={groupedOrders.ready}
          emptyMessage="No jobs assigned to you are waiting to be started."
        />
        <StaffAssignmentColumn
          title="In Production"
          description="Work already moving through production."
          orders={groupedOrders.inProgress}
          emptyMessage="No jobs assigned to you are currently marked in production."
        />
        <StaffAssignmentColumn
          title="Ready For Pickup"
          description="Completed production work waiting for handoff."
          orders={groupedOrders.paused}
          emptyMessage="No jobs assigned to you are waiting for pickup."
        />
      </section>

      <Section title="Recent Activity" description="A lightweight timeline for your assigned jobs so you can regain context without a second dashboard.">
        {recentActivity.length ? (
          <div style={{ display: "grid", gap: "10px" }}>
            {recentActivity.map((event, index) => (
              <article
                key={event.id || `${event.order_number}-${index}`}
                style={{
                  borderLeft: "4px solid #171717",
                  background: "#f8fafc",
                  borderRadius: "12px",
                  padding: "12px 14px",
                }}
              >
                <strong>{event.note || "Order activity recorded."}</strong>
                <div style={{ marginTop: "4px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
                  {event.order_number ? `Order ${event.order_number}` : "Order update"}
                  {event.created_at ? ` • ${formatDateTime(event.created_at)}` : ""}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>
            No recent activity is attached to your assignments yet.
          </p>
        )}
      </Section>
    </div>
  );
}
