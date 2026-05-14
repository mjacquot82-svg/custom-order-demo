import { Link } from "react-router-dom";
import { useStoredOrders } from "../lib/ordersStore";
import { formatDateTime, formatShortDate } from "../lib/dateFormatting";
import { getActiveStaffUser } from "../lib/staffUsersStore";
import { buildOperationalMetrics } from "../operations/buildOperationalMetrics";
import {
  isActiveQuoteWorkflowOrder,
  normalizeQuoteStatus,
} from "../quotes/quoteWorkflow";
import {
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";
import {
  getAssignedOrdersForStaff,
  isStaffWorkspaceView,
} from "./adminRoleView";
import OperationsSummaryCards from "../dashboard/OperationsSummaryCards";
import { buildProductionReadiness } from "../quotes/productionReadiness";

function Section({ title, children, description }) {
  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "22px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
        marginBottom: "22px",
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

function SummaryCard({ label, value, tone = "default", detail }) {
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
      {detail ? (
        <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "13px", lineHeight: 1.4 }}>
          {detail}
        </p>
      ) : null}
    </article>
  );
}

function buildWorkflowSnapshotCards(orders = []) {
  const snapshot = {
    awaitingApproval: 0,
    awaitingDeposit: 0,
    artworkNeeded: 0,
    readyForProduction: 0,
    blockedJobs: 0,
  };

  orders.forEach((order) => {
    const quoteStatus = normalizeQuoteStatus(order.quote_status);

    if (isActiveQuoteWorkflowOrder(order)) {
      const readiness = buildProductionReadiness(order, order);
      const unmetChecks = readiness.checks.filter((check) => !check.passed);

      if (quoteStatus === "Awaiting Approval") {
        snapshot.awaitingApproval += 1;
      }

      if (quoteStatus === "Awaiting Deposit" || unmetChecks.some((check) => check.label === "Deposit")) {
        snapshot.awaitingDeposit += 1;
      }

      if (quoteStatus === "Awaiting Artwork Approval" || unmetChecks.some((check) => check.label === "Artwork")) {
        snapshot.artworkNeeded += 1;
      }

      if (readiness.ready || quoteStatus === "Ready For Production") {
        snapshot.readyForProduction += 1;
      }

      return;
    }

    const operationalStatus = normalizeOperationalStatus(order.status);
    const isBlockedByAssignment = order.needs_assignment || !order.assigned_to_staff_name;
    const isBlockedAtIntake = operationalStatus === "New";

    if (!isCompletedOperationalStatus(operationalStatus) && (isBlockedByAssignment || isBlockedAtIntake)) {
      snapshot.blockedJobs += 1;
    }
  });

  return [
    { label: "Awaiting Approval", value: snapshot.awaitingApproval, tone: "warning" },
    { label: "Awaiting Deposit", value: snapshot.awaitingDeposit, tone: "warning" },
    { label: "Artwork Needed", value: snapshot.artworkNeeded, tone: "warning" },
    { label: "Ready For Production", value: snapshot.readyForProduction, tone: "success" },
    { label: "Blocked Jobs", value: snapshot.blockedJobs, tone: "default" },
  ];
}

function buildStaffActivity(orders = []) {
  return orders
    .flatMap((order) =>
      (order.connected_timeline || order.activity_log || []).map((event) => ({
        ...event,
        order_number: order.order_number,
        status: order.status,
      }))
    )
    .sort(
      (left, right) =>
        new Date(right.created_at || 0).getTime() - new Date(left.created_at || 0).getTime()
    )
    .slice(0, 8);
}

function buildStaffWorkspaceSummary(orders = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return orders.reduce(
    (summary, order) => {
      const status = normalizeOperationalStatus(order.status);
      const dueDate = order.due_date ? new Date(`${order.due_date}T00:00:00`) : null;

      if (!isCompletedOperationalStatus(status)) {
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

        if (diffDays < 0 && !isCompletedOperationalStatus(status)) {
          summary.overdue += 1;
        } else if (diffDays >= 0 && diffDays <= 2 && !isCompletedOperationalStatus(status)) {
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

function StaffJobCard({ order }) {
  return (
    <Link
      to={`/admin/orders/${order.order_number}`}
      style={{
        display: "grid",
        gap: "8px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        borderRadius: "18px",
        padding: "16px",
        textDecoration: "none",
        color: "#171717",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
        <strong>{order.order_number}</strong>
        <span style={{ color: "#475569", fontWeight: 700, fontSize: "13px" }}>{order.status}</span>
      </div>
      <div>
        <p style={{ margin: 0, fontWeight: 700 }}>{order.customer_name || "Walk-in Customer"}</p>
        <p style={{ margin: "4px 0 0", color: "#64748b", fontSize: "14px" }}>
          {order.garment || order.item || "Custom garment"}
        </p>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", color: "#64748b", fontSize: "13px", fontWeight: 700 }}>
        <span>{order.decoration_type || "Production"}</span>
        <span>Due {order.due_date ? formatShortDate(order.due_date) : "TBD"}</span>
      </div>
    </Link>
  );
}

function OwnerDashboard({ orders }) {
  const metrics = buildOperationalMetrics(orders);
  const operationsSnapshotCards = buildWorkflowSnapshotCards(orders);
  const productionTypes = Object.entries(metrics.productionTypes).filter(([, total]) => total > 0);
  const workerLoad = Object.entries(metrics.workerLoad).sort((left, right) => right[1] - left[1]);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Owner Operations</p>
        <h1 style={{ margin: "6px 0 8px", fontSize: "36px" }}>Operations Dashboard</h1>
        <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>Monitor production, dispatch assignments, identify overdue work, and manage daily shop operations from one command center.</p>
      </div>

      <div style={{ marginBottom: "22px" }}>
        <OperationsSummaryCards metrics={metrics} />
      </div>

      <Section
        title="Operations Snapshot"
        description="Workflow visibility stays separate from the KPI row here. Use this section to spot what is still waiting on approval, deposit, artwork, production release, or assignment before work can move."
      >
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {operationsSnapshotCards.map((card) => (
            <SummaryCard key={card.label} label={card.label} value={card.value} tone={card.tone} />
          ))}
        </div>
      </Section>

      <Section title="Production Types">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {productionTypes.map(([type, total]) => (
            <SummaryCard key={type} label={type} value={total} />
          ))}
          {!productionTypes.length ? (
            <article style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}>
              No active production mix yet.
            </article>
          ) : null}
        </div>
      </Section>

      <Section title="Worker Load Summary">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          {workerLoad.map(([worker, total]) => (
            <SummaryCard key={worker} label={worker} value={`${total} jobs`} />
          ))}
          {!workerLoad.length ? (
            <article style={{ background: "#f8fafc", borderRadius: "18px", padding: "18px", border: "1px solid #e2e8f0", color: "#64748b", fontWeight: 700 }}>
              No jobs are currently assigned.
            </article>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

function StaffDashboard({ orders, staffUser }) {
  const assignedOrders = getAssignedOrdersForStaff(orders, staffUser);
  const summary = buildStaffWorkspaceSummary(assignedOrders);
  const activeAssignedOrders = assignedOrders.filter(
    (order) => !isCompletedOperationalStatus(normalizeOperationalStatus(order.status))
  );
  const quoteIntakeOrders = orders.filter((order) => isActiveQuoteWorkflowOrder(order));
  const recentActivity = buildStaffActivity(assignedOrders);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: "16px", flexWrap: "wrap", marginBottom: "20px" }}>
        <div>
          <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Staff Workspace</p>
          <h1 style={{ margin: "6px 0 8px", fontSize: "36px" }}>My Operational Dashboard</h1>
          <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
            Focus on assigned jobs, production movement, and the next actions needed to keep work flowing.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <Link
            to="/admin/assignments"
            style={{
              background: "#171717",
              color: "#ffffff",
              borderRadius: "12px",
              padding: "12px 16px",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Open My Assignments
          </Link>
          <Link
            to="/admin/orders"
            style={{
              background: "#ffffff",
              color: "#171717",
              border: "1px solid #d6dbe4",
              borderRadius: "12px",
              padding: "12px 16px",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Assigned Orders
          </Link>
        </div>
      </div>

      <Section title="Today’s Focus" description={`Signed in as ${staffUser?.name || "staff"}. This workspace only surfaces the work that supports day-to-day execution.`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <SummaryCard label="Active Work" value={summary.active} />
          <SummaryCard label="Ready To Start" value={summary.ready} />
          <SummaryCard label="In Production" value={summary.inProduction} tone="success" />
          <SummaryCard label="Due Soon" value={summary.dueSoon} tone="warning" />
          <SummaryCard label="Overdue" value={summary.overdue} tone="danger" />
          <SummaryCard label="Ready For Pickup" value={summary.readyForPickup} />
        </div>
      </Section>

      <Section title="My Active Jobs" description="Open the order detail workspace to update production status, review instructions, and track activity.">
        {activeAssignedOrders.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: "12px" }}>
            {activeAssignedOrders.slice(0, 8).map((order) => (
              <StaffJobCard key={order.order_number} order={order} />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>
            No active jobs are currently assigned to you.
          </p>
        )}
      </Section>

      <Section title="Quote Intake" description="Operational visibility for incoming quote work without exposing financial reporting or owner summaries.">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <SummaryCard label="Open Quotes" value={quoteIntakeOrders.length} />
          <SummaryCard
            label="Awaiting Approval"
            value={quoteIntakeOrders.filter((order) => normalizeQuoteStatus(order.quote_status) === "Awaiting Approval").length}
            tone="warning"
          />
          <SummaryCard
            label="Ready For Production"
            value={quoteIntakeOrders.filter((order) => normalizeQuoteStatus(order.quote_status) === "Ready For Production").length}
            tone="success"
          />
        </div>
        <div style={{ marginTop: "16px" }}>
          <Link
            to="/admin/quotes"
            style={{
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              borderRadius: "12px",
              padding: "12px 16px",
              background: "#ffffff",
              color: "#171717",
              border: "1px solid #d6dbe4",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
            Open Quote Intake
          </Link>
        </div>
      </Section>

      <Section title="Recent Activity" description="A compact timeline of the latest work changes tied to your assigned jobs.">
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

export default function Dashboard() {
  const orders = useStoredOrders();
  const staffUser = getActiveStaffUser();

  if (isStaffWorkspaceView(staffUser)) {
    return <StaffDashboard orders={orders} staffUser={staffUser} />;
  }

  return <OwnerDashboard orders={orders} />;
}
