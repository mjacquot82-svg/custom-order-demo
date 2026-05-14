import { Navigate } from "react-router-dom";
import { useStoredOrders } from "../lib/ordersStore";
import { buildOperationalMetrics } from "../operations/buildOperationalMetrics";
import {
  isCanceledOperationalStatus,
  isCompletedOperationalStatus,
  normalizeOperationalStatus,
} from "../orders/orderWorkflow";
import {
  isActiveQuoteWorkflowOrder,
  normalizeQuoteStatus,
} from "../quotes/quoteWorkflow";
import { buildProductionReadiness } from "../quotes/productionReadiness";
import OperationsSummaryCards from "../dashboard/OperationsSummaryCards";
import { getActiveStaffUser } from "../lib/staffUsersStore";
import { isStaffWorkspaceView } from "./adminRoleView";

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
          <p
            style={{
              margin: "8px 0 0",
              color: "#64748b",
              maxWidth: "760px",
              lineHeight: 1.6,
            }}
          >
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
      <p
        style={{
          margin: 0,
          color: palette.label,
          fontSize: "12px",
          fontWeight: 800,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
        }}
      >
        {label}
      </p>
      <h2 style={{ margin: "10px 0 0", color: palette.value, fontSize: "30px" }}>
        {value}
      </h2>
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

function OwnerDashboard({ orders }) {
  const metrics = buildOperationalMetrics(orders);
  const operationsSnapshotCards = buildWorkflowSnapshotCards(orders);
  const productionTypes = Object.entries(metrics.productionTypes).filter(([, total]) => total > 0);
  const workerLoad = Object.entries(metrics.workerLoad).sort((left, right) => right[1] - left[1]);

  return (
    <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div style={{ marginBottom: "20px" }}>
        <p
          style={{
            margin: 0,
            color: "#78716c",
            fontSize: "12px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
          }}
        >
          Owner Operations
        </p>
        <h1 style={{ margin: "6px 0 8px", fontSize: "36px" }}>Operations Dashboard</h1>
        <p style={{ margin: 0, color: "#64748b", maxWidth: "760px" }}>
          Monitor production, dispatch assignments, identify overdue work, and manage daily
          shop operations from one command center.
        </p>
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
            <article
              style={{
                background: "#f8fafc",
                borderRadius: "18px",
                padding: "18px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
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
            <article
              style={{
                background: "#f8fafc",
                borderRadius: "18px",
                padding: "18px",
                border: "1px solid #e2e8f0",
                color: "#64748b",
                fontWeight: 700,
              }}
            >
              No jobs are currently assigned.
            </article>
          ) : null}
        </div>
      </Section>
    </div>
  );
}

export default function Dashboard() {
  const orders = useStoredOrders();
  const staffUser = getActiveStaffUser();

  if (isStaffWorkspaceView(staffUser)) {
    return <Navigate to="/admin/assignments" replace />;
  }

  return <OwnerDashboard orders={orders} />;
}
