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
  isCanceledOperationalStatus,
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
        borderRadius: "24px",
        padding: "28px",
        border: "1px solid #e2e8f0",
        boxShadow: "0 16px 40px rgba(15, 23, 42, 0.04)",
        marginBottom: "28px",
      }}
    >
      <div style={{ marginBottom: "18px" }}>
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

    if (
      !isCompletedOperationalStatus(operationalStatus) &&
      !isCanceledOperationalStatus(operationalStatus) &&
      (isBlockedByAssignment || isBlockedAtIntake)
    ) {
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

function WorkspaceCountLink({ label, count, description, to, tone = "default" }) {
  const tones = {
    default: { background: "#f8fafc", border: "#e2e8f0", count: "#0f172a", label: "#0f172a" },
    warning: { background: "#fff7ed", border: "#fed7aa", count: "#9a3412", label: "#7c2d12" },
    success: { background: "#ecfdf5", border: "#bbf7d0", count: "#166534", label: "#166534" },
    danger: { background: "#fef2f2", border: "#fecaca", count: "#b91c1c", label: "#991b1b" },
  };
  const palette = tones[tone] || tones.default;

  return (
    <Link
      to={to}
      style={{
        display: "grid",
        gap: "14px",
        alignItems: "start",
        borderRadius: "20px",
        padding: "20px",
        background: palette.background,
        border: `1px solid ${palette.border}`,
        color: "#171717",
        textDecoration: "none",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <p style={{ margin: 0, fontWeight: 900, fontSize: "12px", letterSpacing: "0.08em", textTransform: "uppercase", color: palette.label }}>
            {label}
          </p>
          <p style={{ margin: "8px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}>
            {description}
          </p>
        </div>
        <strong style={{ fontSize: "34px", lineHeight: 1, color: palette.count }}>{count}</strong>
      </div>
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "center" }}>
        <span style={{ color: "#475569", fontWeight: 700, fontSize: "13px" }}>Open dedicated workspace</span>
        <span style={{ color: "#64748b", fontWeight: 800, whiteSpace: "nowrap" }}>View</span>
      </div>
    </Link>
  );
}

function WorkspaceOverviewLink({ label, count, description, to }) {
  return (
    <Link
      to={to}
      style={{
        display: "grid",
        gap: "10px",
        padding: "18px",
        borderRadius: "18px",
        border: "1px solid #e2e8f0",
        background: "#f8fafc",
        textDecoration: "none",
        color: "#171717",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "baseline" }}>
        <strong style={{ fontSize: "16px" }}>{label}</strong>
        <span style={{ color: "#0f172a", fontSize: "22px", fontWeight: 900 }}>{count}</span>
      </div>
      <p style={{ margin: 0, color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}>{description}</p>
    </Link>
  );
}

function buildOwnerAttentionItems(orders = []) {
  const snapshot = buildWorkflowSnapshotCards(orders);
  const lookup = Object.fromEntries(snapshot.map((card) => [card.label, card.value]));
  const metrics = buildOperationalMetrics(orders);
  const activeOrders = orders.filter((order) => {
    const status = normalizeOperationalStatus(order.status);
    return !isCompletedOperationalStatus(status) && !isCanceledOperationalStatus(status);
  });
  const readyForPickup = activeOrders.filter(
    (order) => normalizeOperationalStatus(order.status) === "Ready for Pickup"
  ).length;

  return [
    {
      label: "Overdue Production",
      count: metrics.overdue,
      description: "Jobs past due date need immediate review in Shop Production.",
      to: "/admin/orders",
      tone: "danger",
    },
    {
      label: "Awaiting Approval",
      count: lookup["Awaiting Approval"] || 0,
      description: "Quotes still waiting on customer approval before production can move.",
      to: "/admin/quotes",
      tone: "warning",
    },
    {
      label: "Awaiting Deposit",
      count: lookup["Awaiting Deposit"] || 0,
      description: "Quote work is blocked until deposit collection is complete.",
      to: "/admin/quotes",
      tone: "warning",
    },
    {
      label: "Needs Assignment",
      count: metrics.needsAssignment,
      description: "Operational work still needs dispatch before the floor can absorb it.",
      to: "/admin/assignments",
      tone: "default",
    },
    {
      label: "Ready For Pickup",
      count: readyForPickup,
      description: "Completed work is waiting for customer handoff at the counter.",
      to: "/admin/orders?status=ready-for-pickup",
      tone: "success",
    },
  ]
    .filter((item) => item.count > 0)
    .slice(0, 3);
}

function buildOwnerWorkspaceOverview(orders = []) {
  const metrics = buildOperationalMetrics(orders);

  return [
    {
      label: "Quotes",
      count: metrics.activeQuotes,
      description: "Pricing, approvals, deposits, and artwork readiness.",
      to: "/admin/quotes",
    },
    {
      label: "Front Counter",
      count: metrics.readyForPickup,
      description: "Pickup-ready orders and day-of customer transactions.",
      to: "/admin/sales/new",
    },
    {
      label: "Shop Production",
      count: metrics.activeProduction,
      description: "Active production work currently moving through the floor.",
      to: "/admin/orders",
    },
    {
      label: "Financial",
      count: metrics.outstandingPayments,
      description: "Orders with remaining balances and invoice follow-up.",
      to: "/admin/financial",
    },
  ];
}

function UpcomingOrderCard({ order }) {
  return (
    <Link
      to={`/admin/orders/${order.orderNumber}`}
      style={{
        display: "grid",
        gap: "14px",
        borderRadius: "18px",
        padding: "18px",
        background: "#f8fafc",
        border: "1px solid #e2e8f0",
        textDecoration: "none",
        color: "#171717",
      }}
    >
      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "flex-start" }}>
        <div style={{ minWidth: 0 }}>
          <strong>{order.orderNumber}</strong>
          <p style={{ margin: "6px 0 0", fontWeight: 700 }}>{order.customerName}</p>
        </div>
        <strong style={{ color: "#0f172a", whiteSpace: "nowrap" }}>{order.dueLabel}</strong>
      </div>
      <div>
        <p style={{ margin: 0, color: "#475569", fontWeight: 700, fontSize: "13px" }}>{order.status}</p>
        <p style={{ margin: "6px 0 0", color: "#64748b", fontSize: "14px", lineHeight: 1.5 }}>{order.garment}</p>
      </div>
    </Link>
  );
}

function EmptyAttentionState() {
  return (
    <div
      style={{
        padding: "22px",
        borderRadius: "20px",
        border: "1px dashed #cbd5e1",
        background: "#f8fafc",
      }}
    >
      <p style={{ margin: 0, fontWeight: 800, color: "#0f172a" }}>No immediate owner escalations.</p>
      <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.6 }}>
        The highest-priority queues are clear right now. Use the workspace links to move into quotes, production, counter, or financial detail only when needed.
      </p>
    </div>
  );
}

function buildUpcomingOperationalOrders(orders = []) {
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  return orders
    .filter((order) => {
      const status = normalizeOperationalStatus(order.status);
      return (
        !isCompletedOperationalStatus(status) &&
        !isCanceledOperationalStatus(status) &&
        order.due_date
      );
    })
    .sort((left, right) => {
      const leftDate = new Date(`${left.due_date}T00:00:00`).getTime();
      const rightDate = new Date(`${right.due_date}T00:00:00`).getTime();
      return leftDate - rightDate;
    })
    .slice(0, 6)
    .map((order) => {
      const dueDate = new Date(`${order.due_date}T00:00:00`);
      const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));

      let dueLabel = `Due ${formatShortDate(order.due_date)}`;
      if (diffDays < 0) {
        dueLabel = `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
      } else if (diffDays === 0) {
        dueLabel = "Due today";
      } else if (diffDays === 1) {
        dueLabel = "Due tomorrow";
      }

      return {
        orderNumber: order.order_number,
        customerName: order.customer_name || "Walk-in Customer",
        garment: order.garment || order.item || "Custom garment",
        status: normalizeOperationalStatus(order.status),
        dueLabel,
      };
    });
}

function OwnerDashboard({ orders }) {
  const metrics = buildOperationalMetrics(orders);
  const attentionItems = buildOwnerAttentionItems(orders);
  const workspaceOverview = buildOwnerWorkspaceOverview(orders);
  const upcomingOrders = buildUpcomingOperationalOrders(orders);

  return (
    <div style={{ maxWidth: "1240px", margin: "0 auto", padding: "32px 24px 44px" }}>
      <div style={{ marginBottom: "28px" }}>
        <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Owner Operations</p>
        <h1 style={{ margin: "6px 0 8px", fontSize: "36px" }}>Dashboard</h1>
        <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>Global operational overview for the owner workspace. Use this page to spot pressure points, then move into the dedicated workspace that handles the work.</p>
      </div>

      <div style={{ marginBottom: "30px" }}>
        <OperationsSummaryCards metrics={metrics} />
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
          gap: "24px",
          alignItems: "start",
          marginBottom: "28px",
        }}
      >
        <Section
          title="Owner Attention"
          description="Only the highest-priority items stay here. Detailed queue management remains in Quotes, Shop Production, Front Counter, Assignments, and Financial."
        >
          {attentionItems.length ? (
            <div style={{ display: "grid", gap: "14px" }}>
              {attentionItems.map((queue) => (
                <WorkspaceCountLink
                  key={queue.label}
                  label={queue.label}
                  count={queue.count}
                  description={queue.description}
                  to={queue.to}
                  tone={queue.tone}
                />
              ))}
            </div>
          ) : (
            <EmptyAttentionState />
          )}
        </Section>

        <Section
          title="Workspace Guide"
          description="Each workspace keeps its own workflow detail so the dashboard can stay calm and quick to scan."
        >
          <div style={{ display: "grid", gap: "12px" }}>
            {workspaceOverview.map((workspace) => (
              <WorkspaceOverviewLink
                key={workspace.label}
                label={workspace.label}
                count={workspace.count}
                description={workspace.description}
                to={workspace.to}
              />
            ))}
          </div>
        </Section>
      </div>

      <Section title="Upcoming Deadlines" description="A short operational cut of the next due jobs so the owner overview stays useful without becoming another production board.">
        {upcomingOrders.length ? (
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))", gap: "14px" }}>
            {upcomingOrders.slice(0, 4).map((order) => (
              <UpcomingOrderCard key={order.orderNumber} order={order} />
            ))}
          </div>
        ) : (
          <p style={{ margin: 0, color: "#64748b", fontWeight: 700 }}>
            No active jobs with due dates are in the operational queue.
          </p>
        )}
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
  const recentActivity = buildStaffActivity(assignedOrders);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <div>
          <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>Staff Workspace</p>
          <h1 style={{ margin: "6px 0 8px", fontSize: "36px" }}>Dashboard</h1>
          <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
            Personal overview for today. This page stays focused on your workload, while production, quotes, and front-counter execution each happen in their dedicated workspace.
          </p>
        </div>
      </div>

      <Section title="Today’s Focus" description={`Signed in as ${staffUser?.name || "staff"}. These counts reflect only the jobs currently assigned to you.`}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "12px" }}>
          <SummaryCard label="Assigned To Me" value={summary.active} />
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
            No jobs are currently assigned to you. Shop production work may still be active or unassigned.
          </p>
        )}
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
