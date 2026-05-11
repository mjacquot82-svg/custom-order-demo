import { useState } from "react";
import { PAYMENT_METHOD_OPTIONS } from "../orders/orderFinancials";
import PaymentStatusBadge from "../components/PaymentStatusBadge";

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function formatTimestamp(value) {
  if (!value) return "—";

  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "—";

  return date.toLocaleString([], {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

function getPickupStatusStyle(status) {
  function badgeStyle(background, color) {
    return {
      display: "inline-flex",
      alignItems: "center",
      borderRadius: "999px",
      padding: "6px 10px",
      background,
      color,
      fontSize: "12px",
      fontWeight: 800,
    };
  }

  if (status === "Picked Up") return badgeStyle("#dcfce7", "#166534");
  if (status === "Ready for Pickup") return badgeStyle("#dbeafe", "#1d4ed8");
  return badgeStyle("#e2e8f0", "#334155");
}

const rowLabelStyle = {
  color: "#57534e",
  fontSize: "11px",
  fontWeight: 800,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
};

const rowValueStyle = {
  color: "#171717",
  fontSize: "18px",
  fontWeight: 800,
};

const fieldStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "11px 12px",
  boxSizing: "border-box",
  width: "100%",
  background: "#ffffff",
};

export default function FinancialSummaryPanel({
  order,
  onRecordPayment,
  onMarkPickedUp,
}) {
  const [paymentFormOpen, setPaymentFormOpen] = useState(false);
  const [amount, setAmount] = useState(order.balance_due > 0 ? String(order.balance_due) : "");
  const [method, setMethod] = useState(PAYMENT_METHOD_OPTIONS[0]);
  const [note, setNote] = useState("");
  const [error, setError] = useState("");

  const canMarkPickedUp =
    order.pickup_status !== "Picked Up" &&
    ["Ready for Pickup", "Picked Up", "Completed"].includes(order.status);

  function resetPaymentForm(nextAmount = "") {
    setAmount(nextAmount);
    setMethod(PAYMENT_METHOD_OPTIONS[0]);
    setNote("");
    setError("");
  }

  function handleTogglePaymentForm() {
    const nextOpenState = !paymentFormOpen;
    setPaymentFormOpen(nextOpenState);

    if (nextOpenState) {
      resetPaymentForm(order.balance_due > 0 ? String(order.balance_due) : "");
    } else {
      resetPaymentForm("");
    }
  }

  function handleSubmit(event) {
    event.preventDefault();

    const parsedAmount = Number(amount);
    if (!Number.isFinite(parsedAmount) || parsedAmount <= 0) {
      setError("Enter a valid payment amount.");
      return;
    }

    onRecordPayment({
      amount: parsedAmount,
      method,
      note,
    });

    setPaymentFormOpen(false);
    resetPaymentForm("");
  }

  return (
    <section
      style={{
        background: "#ffffff",
        borderRadius: "20px",
        padding: "24px",
        boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
      }}
    >
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          gap: "14px",
          flexWrap: "wrap",
          marginBottom: "18px",
        }}
      >
        <div>
          <h2 style={{ margin: "0 0 4px" }}>Financial Summary</h2>
          <p style={{ margin: 0, color: "#64748b" }}>
            Operational payment tracking for this order.
          </p>
        </div>

        <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
          <button
            type="button"
            onClick={handleTogglePaymentForm}
            style={{
              border: "1px solid #cbd5e1",
              background: "#ffffff",
              borderRadius: "12px",
              padding: "11px 14px",
              fontWeight: 700,
            }}
          >
            Record Payment
          </button>

          <button
            type="button"
            disabled={!canMarkPickedUp}
            onClick={onMarkPickedUp}
            style={{
              background: canMarkPickedUp ? "#171717" : "#cbd5e1",
              color: "#ffffff",
              border: "none",
              borderRadius: "12px",
              padding: "11px 14px",
              fontWeight: 700,
              cursor: canMarkPickedUp ? "pointer" : "not-allowed",
            }}
          >
            Mark Picked Up
          </button>
        </div>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))",
          gap: "14px",
          marginBottom: "18px",
        }}
      >
        <div style={{ display: "grid", gap: "4px" }}>
          <span style={rowLabelStyle}>Subtotal</span>
          <span style={rowValueStyle}>{money(order.subtotal)}</span>
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          <span style={rowLabelStyle}>Tax</span>
          <span style={rowValueStyle}>{money(order.tax_amount)}</span>
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          <span style={rowLabelStyle}>Total</span>
          <span style={rowValueStyle}>{money(order.total_amount)}</span>
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          <span style={rowLabelStyle}>Deposit</span>
          <span style={rowValueStyle}>{money(order.deposit_amount)}</span>
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          <span style={rowLabelStyle}>Amount Paid</span>
          <span style={rowValueStyle}>{money(order.total_paid)}</span>
        </div>

        <div style={{ display: "grid", gap: "4px" }}>
          <span style={rowLabelStyle}>Remaining Balance</span>
          <span style={{ ...rowValueStyle, color: order.balance_due > 0 ? "#991b1b" : "#166534" }}>
            {money(order.balance_due)}
          </span>
        </div>
      </div>

      <div
        style={{
          display: "flex",
          gap: "12px",
          flexWrap: "wrap",
          marginBottom: paymentFormOpen ? "18px" : "0",
        }}
      >
        <div style={{ display: "grid", gap: "6px" }}>
          <span style={rowLabelStyle}>Payment Status</span>
          <PaymentStatusBadge status={order.payment_status} />
        </div>

        <div style={{ display: "grid", gap: "6px" }}>
          <span style={rowLabelStyle}>Pickup Status</span>
          <span style={getPickupStatusStyle(order.pickup_status)}>{order.pickup_status}</span>
        </div>
      </div>

      {paymentFormOpen ? (
        <form
          onSubmit={handleSubmit}
          style={{
            borderTop: "1px solid #e2e8f0",
            marginTop: "18px",
            paddingTop: "18px",
            display: "grid",
            gap: "14px",
          }}
        >
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
              gap: "14px",
            }}
          >
            <label style={{ display: "grid", gap: "8px", fontWeight: 700, color: "#292524" }}>
              Amount
              <input
                type="number"
                min="0"
                step="0.01"
                value={amount}
                onChange={(event) => setAmount(event.target.value)}
                style={fieldStyle}
              />
            </label>

            <label style={{ display: "grid", gap: "8px", fontWeight: 700, color: "#292524" }}>
              Payment Method
              <select
                value={method}
                onChange={(event) => setMethod(event.target.value)}
                style={fieldStyle}
              >
                {PAYMENT_METHOD_OPTIONS.map((option) => (
                  <option key={option} value={option}>
                    {option}
                  </option>
                ))}
              </select>
            </label>
          </div>

          <label style={{ display: "grid", gap: "8px", fontWeight: 700, color: "#292524" }}>
            Note
            <textarea
              value={note}
              onChange={(event) => setNote(event.target.value)}
              rows={3}
              placeholder="Optional note for the payment record"
              style={{ ...fieldStyle, resize: "vertical" }}
            />
          </label>

          {error ? (
            <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>{error}</p>
          ) : null}

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button
              type="submit"
              style={{
                background: "#171717",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
              }}
            >
              Save Payment
            </button>

            <button
              type="button"
              onClick={handleTogglePaymentForm}
              style={{
                border: "1px solid #cbd5e1",
                background: "#ffffff",
                borderRadius: "12px",
                padding: "11px 14px",
                fontWeight: 700,
              }}
            >
              Cancel
            </button>
          </div>
        </form>
      ) : null}

      <div
        style={{
          borderTop: "1px solid #e2e8f0",
          marginTop: "18px",
          paddingTop: "18px",
          display: "grid",
          gap: "12px",
        }}
      >
        <div>
          <h3 style={{ margin: "0 0 4px", fontSize: "16px" }}>Payment History</h3>
          <p style={{ margin: 0, color: "#64748b", fontSize: "14px" }}>
            Recorded payments for this order.
          </p>
        </div>

        {!order.payment_history?.length ? (
          <p style={{ margin: 0, color: "#94a3b8" }}>No payments recorded yet.</p>
        ) : (
          <div style={{ display: "grid", gap: "10px" }}>
            {order.payment_history.map((payment) => (
              <article
                key={payment.id}
                style={{
                  border: "1px solid #e2e8f0",
                  borderRadius: "14px",
                  padding: "12px 14px",
                  background: "#f8fafc",
                }}
              >
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "10px",
                    flexWrap: "wrap",
                  }}
                >
                  <strong style={{ fontSize: "15px" }}>{money(payment.amount)}</strong>
                  <span style={{ color: "#475569", fontSize: "13px", fontWeight: 700 }}>
                    {payment.method}
                  </span>
                </div>

                <div style={{ marginTop: "4px", color: "#64748b", fontSize: "13px" }}>
                  {payment.staff_member} • {formatTimestamp(payment.timestamp)}
                </div>

                {payment.note ? (
                  <p style={{ margin: "6px 0 0", color: "#334155", fontSize: "14px" }}>
                    {payment.note}
                  </p>
                ) : null}
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
