import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStoredProducts } from "../lib/productsStore";
import { createStoredQuickSale } from "../lib/salesStore";
import { getStoredCustomers } from "../lib/customersStore";
import {
  recordStoredOrderPayment,
  updateStoredOrder,
  useStoredOrders,
} from "../lib/ordersStore";
import { getActiveStaffUser } from "../lib/staffUsersStore";
import { validatePaymentAmount } from "../lib/financialValidation";
import { formatDateTime, formatShortDate } from "../lib/dateFormatting";
import PaymentStatusBadge from "../components/PaymentStatusBadge";
import { PAYMENT_METHOD_OPTIONS } from "../orders/orderFinancials";
import { isStaffWorkspaceView } from "./adminRoleView";

const taxRate = 0.13;
const counterPaymentMethods = PAYMENT_METHOD_OPTIONS.filter((option) =>
  ["Cash", "Debit", "Credit", "E-Transfer", "Cheque", "Other"].includes(option)
);
const quickSalePaymentMethods = [...counterPaymentMethods, "Pay Later"];

const fieldStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "15px",
  width: "100%",
  boxSizing: "border-box",
  background: "#ffffff",
};

const labelStyle = {
  display: "grid",
  gap: "8px",
  fontWeight: 600,
  color: "#292524",
};

const compactFieldStyle = {
  ...fieldStyle,
  padding: "8px 10px",
  borderRadius: "10px",
  fontSize: "14px",
};

const sectionCardStyle = {
  background: "#ffffff",
  borderRadius: "20px",
  border: "1px solid #e2e8f0",
  padding: "22px",
  display: "grid",
  gap: "16px",
};

function currency(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function normalize(value) {
  return String(value || "").trim().toLowerCase();
}

function normalizePhone(value) {
  return normalize(value).replace(/\D/g, "");
}

function isTypingField(element) {
  if (!element) return false;
  return ["INPUT", "SELECT", "TEXTAREA"].includes(element.tagName);
}

function sumValues(values = []) {
  return values.reduce((total, value) => total + Number(value || 0), 0);
}

function getModeButtonStyle(active) {
  return {
    border: active ? "1px solid #0f172a" : "1px solid #cbd5e1",
    background: active ? "#0f172a" : "#ffffff",
    color: active ? "#ffffff" : "#0f172a",
    borderRadius: "999px",
    padding: "10px 14px",
    fontWeight: 800,
    cursor: "pointer",
  };
}

function getActionToneStyles(tone = "default") {
  if (tone === "danger") {
    return { background: "#fff1f2", border: "1px solid #fecdd3", accent: "#be123c" };
  }

  if (tone === "success") {
    return { background: "#ecfdf5", border: "1px solid #a7f3d0", accent: "#047857" };
  }

  return { background: "#eff6ff", border: "1px solid #bfdbfe", accent: "#1d4ed8" };
}

function buildCustomerDirectory(customers, orders) {
  const directory = new Map();

  customers.forEach((customer) => {
    const key = customer.id || `saved-${normalize(customer.name)}`;
    directory.set(key, {
      id: customer.id || key,
      source: "saved",
      name: customer.name || "Unnamed Customer",
      company: customer.company || "",
      email: customer.email || "",
      phone: customer.phone || "",
      notes: customer.notes || "",
      order_numbers: Array.isArray(customer.order_numbers) ? [...customer.order_numbers] : [],
    });
  });

  orders.forEach((order) => {
    const normalizedName = normalize(order.customer_name);
    if (!normalizedName) return;

    const existingEntry = Array.from(directory.values()).find(
      (entry) =>
        (order.customer_id && entry.id === order.customer_id) || normalize(entry.name) === normalizedName
    );

    if (existingEntry) {
      const orderNumbers = new Set(existingEntry.order_numbers || []);
      orderNumbers.add(order.order_number);
      existingEntry.order_numbers = Array.from(orderNumbers);
      if (!existingEntry.company && order.company) existingEntry.company = order.company;
      return;
    }

    directory.set(`derived-${normalizedName}`, {
      id: `derived-${normalizedName}`,
      source: "orders",
      name: order.customer_name,
      company: "",
      email: "",
      phone: "",
      notes: "",
      order_numbers: order.order_number ? [order.order_number] : [],
    });
  });

  return Array.from(directory.values()).sort((left, right) =>
    left.name.localeCompare(right.name)
  );
}

function findCustomerMatches(customers, value) {
  const query = normalize(value);
  const phoneQuery = normalizePhone(value);

  if (query.length < 2 && phoneQuery.length < 3) return [];

  return customers
    .filter((customer) => {
      const searchableText = [
        customer.name,
        customer.company,
        customer.email,
        customer.phone,
        ...(customer.order_numbers || []),
      ]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const customerPhone = normalizePhone(customer.phone);

      return (
        searchableText.includes(query) ||
        (phoneQuery.length >= 3 && customerPhone.includes(phoneQuery))
      );
    })
    .slice(0, 6);
}

function cartItemsMatch(existingItem, newItem) {
  return (
    existingItem.product_id === newItem.product_id &&
    normalize(existingItem.name) === normalize(newItem.name) &&
    normalize(existingItem.color) === normalize(newItem.color) &&
    normalize(existingItem.size) === normalize(newItem.size) &&
    Number(existingItem.unit_price) === Number(newItem.unit_price)
  );
}

function buildCustomerOrders(selectedCustomer, orders) {
  if (!selectedCustomer) return [];

  const selectedName = normalize(selectedCustomer.name);
  const orderNumbers = new Set(selectedCustomer.order_numbers || []);

  return orders.filter((order) => {
    if (selectedCustomer.source === "saved" && selectedCustomer.id && order.customer_id === selectedCustomer.id) {
      return true;
    }

    if (order.order_number && orderNumbers.has(order.order_number)) {
      return true;
    }

    return selectedName && normalize(order.customer_name) === selectedName;
  });
}

function buildPaymentAction(order) {
  if (Number(order.balance_due || 0) <= 0) return null;

  const isDepositStep =
    order.payment_collection_state === "Awaiting Deposit" &&
    Number(order.deposit_outstanding || order.deposit_amount || 0) > 0;
  const amount = isDepositStep
    ? Number(order.deposit_outstanding || order.deposit_amount || 0)
    : Number(order.balance_due || 0);
  const readyForPickup = order.pickup_status === "Ready for Pickup";

  return {
    id: `${order.order_number}-payment-${isDepositStep ? "deposit" : "balance"}`,
    kind: "payment",
    paymentKind: isDepositStep ? "deposit" : "balance",
    label: isDepositStep ? "Collect Deposit" : readyForPickup ? "Collect Remaining Balance" : "Collect Payment",
    tone: readyForPickup ? "danger" : isDepositStep ? "default" : "default",
    orderNumber: order.order_number,
    customerName: order.customer_name,
    amount,
    summary: isDepositStep
      ? `${currency(amount)} deposit due before invoice collection continues.`
      : readyForPickup
      ? `${currency(amount)} due before this pickup can be released.`
      : `${currency(amount)} remains on this order.`,
  };
}

function buildPickupAction(order) {
  if (order.pickup_status !== "Ready for Pickup") return null;
  if (Number(order.balance_due || 0) > 0) return null;

  return {
    id: `${order.order_number}-pickup-release`,
    kind: "pickup",
    label: "Release Pickup Order",
    tone: "success",
    orderNumber: order.order_number,
    customerName: order.customer_name,
    amount: 0,
    summary: "Order is paid in full and ready to hand off at the counter.",
  };
}

function buildActionItems(orders = []) {
  const actions = orders.flatMap((order) => {
    const items = [];
    const paymentAction = buildPaymentAction(order);
    const pickupAction = buildPickupAction(order);

    if (paymentAction) items.push(paymentAction);
    if (pickupAction) items.push(pickupAction);

    return items;
  });

  return actions.sort((left, right) => {
    const leftPriority = left.kind === "pickup" ? 0 : left.paymentKind === "deposit" ? 1 : 2;
    const rightPriority = right.kind === "pickup" ? 0 : right.paymentKind === "deposit" ? 1 : 2;

    if (leftPriority !== rightPriority) {
      return leftPriority - rightPriority;
    }

    return Number(right.amount || 0) - Number(left.amount || 0);
  });
}

function OperationalStat({ label, value, emphasis = "default" }) {
  return (
    <div
      style={{
        border: "1px solid #e2e8f0",
        borderRadius: "16px",
        padding: "14px 16px",
        background: "#f8fafc",
        display: "grid",
        gap: "4px",
      }}
    >
      <span
        style={{
          color: "#64748b",
          fontSize: "11px",
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.06em",
        }}
      >
        {label}
      </span>
      <span
        style={{
          color: emphasis === "danger" ? "#b91c1c" : emphasis === "success" ? "#166534" : "#0f172a",
          fontSize: "22px",
          fontWeight: 800,
        }}
      >
        {value}
      </span>
    </div>
  );
}

export default function QuickSale() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const completedSaleNumber = searchParams.get("completed");
  const productSelectRef = useRef(null);
  const activeStaffUser = getActiveStaffUser();
  const isStaffWorkspace = isStaffWorkspaceView(activeStaffUser);

  const products = useStoredProducts().filter((product) => product.status !== "Inactive");
  const storedOrders = useStoredOrders();
  const [customers] = useState(() => getStoredCustomers());
  const customerDirectory = useMemo(
    () => buildCustomerDirectory(customers, storedOrders),
    [customers, storedOrders]
  );

  const [activeMode, setActiveMode] = useState("lookup");
  const [lookupQuery, setLookupQuery] = useState("");
  const [customerMatches, setCustomerMatches] = useState([]);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [selectedActionId, setSelectedActionId] = useState("");
  const [transactionMessage, setTransactionMessage] = useState("");
  const [paymentAmount, setPaymentAmount] = useState("");
  const [paymentMethod, setPaymentMethod] = useState(counterPaymentMethods[0] || "Cash");
  const [paymentNote, setPaymentNote] = useState("");
  const [paymentError, setPaymentError] = useState("");

  const [linkedCustomerId, setLinkedCustomerId] = useState("");
  const [linkedCustomerName, setLinkedCustomerName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [quickSalePaymentMethod, setQuickSalePaymentMethod] = useState("Cash");
  const [notes, setNotes] = useState("");
  const [lineItem, setLineItem] = useState({
    name: "",
    color: "",
    size: "",
    qty: "1",
    unit_price: "",
  });
  const [cart, setCart] = useState([]);

  useEffect(() => {
    if (!completedSaleNumber && activeMode === "quick-sale") {
      productSelectRef.current?.focus();
    }
  }, [activeMode, completedSaleNumber]);

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === selectedProductId);
  }, [products, selectedProductId]);

  const customerOrders = useMemo(() => {
    return buildCustomerOrders(selectedCustomer, storedOrders);
  }, [selectedCustomer, storedOrders]);

  const actionableItems = useMemo(() => buildActionItems(customerOrders), [customerOrders]);
  const selectedAction = useMemo(
    () => actionableItems.find((action) => action.id === selectedActionId) || null,
    [actionableItems, selectedActionId]
  );
  const selectedActionOrder = useMemo(
    () =>
      selectedAction
        ? customerOrders.find((order) => order.order_number === selectedAction.orderNumber) || null
        : null,
    [customerOrders, selectedAction]
  );

  const operationalSummary = useMemo(() => {
    const outstandingOrders = customerOrders.filter((order) => Number(order.balance_due || 0) > 0);
    const releaseReadyOrders = customerOrders.filter(
      (order) => order.pickup_status === "Ready for Pickup" && Number(order.balance_due || 0) <= 0
    );

    return {
      openItems: actionableItems.length,
      amountDueNow: sumValues(
        actionableItems
          .filter((action) => action.kind === "payment")
          .map((action) => action.amount)
      ),
      outstandingBalance: sumValues(outstandingOrders.map((order) => order.balance_due)),
      pickupReady: customerOrders.filter((order) => order.pickup_status === "Ready for Pickup")
        .length,
      releaseReady: releaseReadyOrders.length,
    };
  }, [actionableItems, customerOrders]);

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.qty * item.unit_price, 0);
  }, [cart]);

  const taxTotal = subtotal * taxRate;
  const total = subtotal + taxTotal;
  const canAddItem = lineItem.name.trim() && Number(lineItem.qty) > 0;
  const canCompleteSale = cart.length > 0;
  const paymentValidation = validatePaymentAmount({
    amount: paymentAmount,
    remainingBalance: selectedActionOrder?.balance_due || 0,
  });

  const handleGlobalEnter = useEffectEvent((event) => {
    if (completedSaleNumber || activeMode !== "quick-sale" || event.key !== "Enter" || !canCompleteSale) {
      return;
    }

    if (isTypingField(document.activeElement)) return;

    event.preventDefault();
    saveSale();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalEnter);
    return () => window.removeEventListener("keydown", handleGlobalEnter);
  }, []);

  function resetPaymentForm(nextAmount = "") {
    setPaymentAmount(nextAmount);
    setPaymentMethod(counterPaymentMethods[0] || "Cash");
    setPaymentNote("");
    setPaymentError("");
  }

  function handleLookupChange(value) {
    setLookupQuery(value);
    setCustomerMatches(findCustomerMatches(customerDirectory, value));
  }

  function selectCustomer(customer) {
    setSelectedCustomer(customer);
    setLookupQuery(customer.name || "");
    setCustomerMatches([]);
    setSelectedActionId("");
    setTransactionMessage("");
    setCustomerName(customer.name || "");
    setLinkedCustomerId(customer.source === "saved" ? customer.id : "");
    setLinkedCustomerName(customer.name || "");
    setActiveMode("lookup");
    resetPaymentForm("");
  }

  function startAction(action) {
    setSelectedActionId(action.id);
    setTransactionMessage("");

    if (action.kind === "payment") {
      setActiveMode("payment");
      resetPaymentForm(String(action.amount || ""));
      return;
    }

    setActiveMode("pickup");
    resetPaymentForm("");
  }

  function clearSelectedAction() {
    setSelectedActionId("");
    setTransactionMessage("");
    resetPaymentForm("");
  }

  function updateCustomerName(value) {
    setCustomerName(value);
    setLinkedCustomerId("");
    setLinkedCustomerName("");
  }

  function selectProduct(event) {
    const productId = event.target.value;
    const product = products.find((item) => item.id === productId);
    setSelectedProductId(productId);

    if (!product) {
      setLineItem({ name: "", color: "", size: "", qty: "1", unit_price: "" });
      return;
    }

    setLineItem((current) => ({
      ...current,
      name: product.name || "",
      color: product.colors?.[0] || "",
      size: product.sizes?.[0] || "",
      unit_price: product.retail_price || product.price || "",
    }));
  }

  function updateLineItem(event) {
    const { name, value } = event.target;
    setLineItem((current) => ({ ...current, [name]: value }));
  }

  function handleLineItemKeyDown(event) {
    if (event.key !== "Enter") return;

    event.preventDefault();
    if (canAddItem) {
      addToCart();
    }
  }

  function handleCartEditKeyDown(event) {
    if (event.key !== "Enter") return;
    event.preventDefault();
    productSelectRef.current?.focus();
  }

  function addToCart() {
    const qty = Number(lineItem.qty) || 0;
    const unitPrice = Number(lineItem.unit_price) || 0;

    if (!lineItem.name.trim() || qty <= 0 || unitPrice < 0) return;

    const item = {
      id: `cart-item-${Date.now()}`,
      product_id: selectedProductId,
      name: lineItem.name.trim(),
      color: lineItem.color.trim(),
      size: lineItem.size.trim(),
      qty,
      unit_price: unitPrice,
      line_total: qty * unitPrice,
    };

    setCart((current) => {
      const match = current.find((existingItem) => cartItemsMatch(existingItem, item));

      if (!match) return [...current, item];

      return current.map((existingItem) => {
        if (!cartItemsMatch(existingItem, item)) return existingItem;
        const nextQty = existingItem.qty + item.qty;
        return {
          ...existingItem,
          qty: nextQty,
          line_total: nextQty * existingItem.unit_price,
        };
      });
    });

    setSelectedProductId("");
    setLineItem({ name: "", color: "", size: "", qty: "1", unit_price: "" });
    setTimeout(() => productSelectRef.current?.focus(), 0);
  }

  function updateCartItem(itemId, field, value) {
    setCart((current) =>
      current.map((item) => {
        if (item.id !== itemId) return item;

        const nextValue =
          field === "qty" ? Math.max(1, Number(value) || 1) : Math.max(0, Number(value) || 0);
        const nextItem = {
          ...item,
          [field]: nextValue,
        };

        return {
          ...nextItem,
          line_total: nextItem.qty * nextItem.unit_price,
        };
      })
    );
  }

  function removeCartItem(itemId) {
    setCart((current) => current.filter((item) => item.id !== itemId));
  }

  function saveSale() {
    if (!cart.length) return;

    let sale;

    try {
      sale = createStoredQuickSale({
        customer_id: linkedCustomerId,
        customer_name: customerName.trim() || "Walk-in Customer",
        payment_method: quickSalePaymentMethod,
        payment_status: quickSalePaymentMethod === "Pay Later" ? "Unpaid" : "Paid",
        amount_paid: quickSalePaymentMethod === "Pay Later" ? 0 : total,
        balance_due: quickSalePaymentMethod === "Pay Later" ? total : 0,
        items: cart,
        subtotal,
        tax_rate: taxRate,
        tax_total: taxTotal,
        total,
        notes,
      });
    } catch (error) {
      alert(
        error?.code === "OVERPAYMENT"
          ? "Payment exceeds remaining balance."
          : error?.message || "Unable to save payment."
      );
      return;
    }

    navigate(`/admin/sales/new?completed=${sale.sale_number}`);
  }

  function completeSale(event) {
    event.preventDefault();
    saveSale();
  }

  function handleRecordCounterPayment(event) {
    event.preventDefault();

    if (!selectedActionOrder || selectedAction?.kind !== "payment") {
      setPaymentError("Select a payment item before recording a counter payment.");
      return;
    }

    if (!paymentValidation.valid) {
      const message = paymentValidation.message || "Enter a valid payment amount.";
      setPaymentError(message);
      alert(
        paymentValidation.code === "OVERPAYMENT"
          ? "Payment exceeds remaining balance."
          : message
      );
      return;
    }

    let updatedOrder;

    try {
      updatedOrder = recordStoredOrderPayment(selectedActionOrder.order_number, {
        amount: Number(paymentAmount),
        method: paymentMethod,
        note: paymentNote,
      });
    } catch (error) {
      const message =
        error?.code === "OVERPAYMENT"
          ? "Payment exceeds remaining balance."
          : error?.message || "Unable to save payment.";
      setPaymentError(message);
      alert(message);
      return;
    }

    if (!updatedOrder) {
      setPaymentError("Order could not be updated.");
      return;
    }

    if (updatedOrder.pickup_status === "Ready for Pickup" && Number(updatedOrder.balance_due || 0) <= 0) {
      const releaseAction = buildPickupAction(updatedOrder);
      setSelectedActionId(releaseAction?.id || "");
      setActiveMode("pickup");
      setTransactionMessage(
        `Payment recorded for ${updatedOrder.order_number}. The order is now ready to release.`
      );
    } else {
      setSelectedActionId("");
      setTransactionMessage(`Payment recorded for ${updatedOrder.order_number}.`);
    }

    resetPaymentForm("");
  }

  function handleReleasePickup(order) {
    if (!order) return;

    const balanceNote =
      Number(order.balance_due || 0) > 0 ? ` Outstanding balance: ${currency(order.balance_due)}.` : "";

    updateStoredOrder(order.order_number, {
      pickup_status: "Picked Up",
      picked_up_at: order.picked_up_at || new Date().toISOString(),
      status: order.status === "Ready for Pickup" ? "Picked Up" : order.status,
      activity_type: "pickup",
      activity_note: `Order marked as picked up.${balanceNote}`,
    });

    setSelectedActionId("");
    setTransactionMessage(`Pickup released for ${order.order_number}.`);
  }

  if (completedSaleNumber) {
    return (
      <div
        style={{
          maxWidth: "720px",
          margin: "60px auto",
          padding: "32px",
          background: "#ffffff",
          borderRadius: "24px",
          boxShadow: "0 10px 40px rgba(0,0,0,0.08)",
          textAlign: "center",
          fontFamily:
            'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "13px",
            fontWeight: 800,
            letterSpacing: "0.08em",
            textTransform: "uppercase",
            color: "#16a34a",
          }}
        >
          Front Counter
        </p>
        <h1 style={{ margin: "10px 0 12px", fontSize: "32px" }}>Quick Sale Completed</h1>
        <p style={{ marginBottom: "8px", color: "#0f172a", fontSize: "22px", fontWeight: 800 }}>
          Sale #{completedSaleNumber}
        </p>
        <p style={{ marginBottom: "28px", color: "#64748b", fontSize: "16px" }}>
          The transaction has been saved successfully.
        </p>
        <div style={{ display: "flex", justifyContent: "center", gap: "14px", flexWrap: "wrap" }}>
          <button
            onClick={() => navigate(`/admin/sales/receipt/${completedSaleNumber}`)}
            style={{
              background: "#171717",
              color: "#ffffff",
              border: "none",
              borderRadius: "14px",
              padding: "14px 20px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Print Receipt
          </button>
          <button
            onClick={() => navigate("/admin/sales/new")}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "14px 20px",
              fontWeight: 800,
              cursor: "pointer",
            }}
          >
            Start Another Quick Sale
          </button>
          <button
            onClick={() => navigate("/admin/sales")}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "14px 20px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            View Counter Sales
          </button>
          <button
            onClick={() => navigate("/admin")}
            style={{
              background: "#ffffff",
              border: "1px solid #cbd5e1",
              borderRadius: "14px",
              padding: "14px 20px",
              fontWeight: 700,
              cursor: "pointer",
            }}
          >
            {isStaffWorkspace ? "Return to Staff Workspace" : "Return to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1320px",
        margin: "0 auto",
        padding: "24px",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ display: "grid", gap: "20px" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 45%, #eff6ff 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: "24px",
            padding: "24px",
            display: "grid",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", flexWrap: "wrap" }}>
            <div style={{ maxWidth: "760px" }}>
              <p
                style={{
                  margin: 0,
                  color: "#9a3412",
                  fontSize: "12px",
                  fontWeight: 800,
                  letterSpacing: "0.08em",
                  textTransform: "uppercase",
                }}
              >
                Front Counter Workspace
              </p>
              <h1 style={{ margin: "8px 0 10px", fontSize: "36px", color: "#0f172a" }}>
                Front Counter
              </h1>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                Customer lookup drives the counter workflow here. Select a customer to surface
                deposits, balances, pickup-ready orders, and release actions without leaving the
                operational workspace.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button
                type="button"
                onClick={() => navigate("/admin/sales")}
                style={{
                  background: "#171717",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                View Counter Sales
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/customers")}
                style={{
                  background: "#ffffff",
                  color: "#171717",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Open Customers
              </button>
              <button
                type="button"
                onClick={() => navigate("/admin/orders")}
                style={{
                  background: "#ffffff",
                  color: "#171717",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "12px 16px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Production Queue
              </button>
            </div>
          </div>

          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
            <button type="button" onClick={() => setActiveMode("lookup")} style={getModeButtonStyle(activeMode === "lookup")}>
              Customer Lookup
            </button>
            <button type="button" onClick={() => setActiveMode("payment")} style={getModeButtonStyle(activeMode === "payment")}>
              Payment Collection
            </button>
            <button type="button" onClick={() => setActiveMode("pickup")} style={getModeButtonStyle(activeMode === "pickup")}>
              Pickup Release
            </button>
            <button type="button" onClick={() => setActiveMode("quick-sale")} style={getModeButtonStyle(activeMode === "quick-sale")}>
              Quick Sale
            </button>
          </div>
        </section>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "minmax(320px, 420px) minmax(0, 1fr)",
            gap: "20px",
            alignItems: "start",
          }}
        >
          <aside style={{ display: "grid", gap: "18px" }}>
            <section style={sectionCardStyle}>
              <div>
                <p
                  style={{
                    margin: 0,
                    color: "#78716c",
                    fontSize: "12px",
                    fontWeight: 800,
                    textTransform: "uppercase",
                    letterSpacing: "0.08em",
                  }}
                >
                  Step 1
                </p>
                <h2 style={{ margin: "6px 0 8px", fontSize: "26px", color: "#0f172a" }}>
                  Customer Lookup
                </h2>
                <p style={{ margin: 0, color: "#64748b", lineHeight: 1.5 }}>
                  Search saved customers or existing order customers to drive the transaction
                  workflow.
                </p>
              </div>

              <div style={{ position: "relative" }}>
                <input
                  value={lookupQuery}
                  onChange={(event) => handleLookupChange(event.target.value)}
                  placeholder="Search name, phone, email, company, or order #"
                  style={fieldStyle}
                />

                {customerMatches.length > 0 ? (
                  <div
                    style={{
                      position: "absolute",
                      top: "54px",
                      left: 0,
                      right: 0,
                      zIndex: 20,
                      background: "#ffffff",
                      border: "1px solid #e2e8f0",
                      borderRadius: "14px",
                      boxShadow: "0 18px 30px rgba(15, 23, 42, 0.12)",
                      overflow: "hidden",
                    }}
                  >
                    {customerMatches.map((customer) => (
                      <button
                        key={customer.id}
                        type="button"
                        onClick={() => selectCustomer(customer)}
                        style={{
                          display: "block",
                          width: "100%",
                          padding: "12px 14px",
                          textAlign: "left",
                          border: "none",
                          borderBottom: "1px solid #f1f5f9",
                          background: "#ffffff",
                          cursor: "pointer",
                        }}
                      >
                        <strong>{customer.name}</strong>
                        {customer.company ? ` - ${customer.company}` : ""}
                        <span style={{ display: "block", marginTop: "4px", color: "#64748b", fontSize: "13px" }}>
                          {[customer.phone, customer.email].filter(Boolean).join(" • ") ||
                            `${customer.order_numbers?.length || 0} linked orders`}
                        </span>
                      </button>
                    ))}
                  </div>
                ) : null}
              </div>

              {selectedCustomer ? (
                <div
                  style={{
                    border: "1px solid #e2e8f0",
                    borderRadius: "18px",
                    padding: "16px",
                    background: "#f8fafc",
                    display: "grid",
                    gap: "12px",
                  }}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", alignItems: "start" }}>
                    <div>
                      <h3 style={{ margin: 0, fontSize: "22px", color: "#0f172a" }}>
                        {selectedCustomer.name}
                      </h3>
                      <p style={{ margin: "4px 0 0", color: "#64748b" }}>
                        {selectedCustomer.company || "Customer profile"}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedCustomer(null);
                        setLookupQuery("");
                        setCustomerMatches([]);
                        clearSelectedAction();
                      }}
                      style={{
                        border: "1px solid #cbd5e1",
                        background: "#ffffff",
                        borderRadius: "10px",
                        padding: "8px 10px",
                        fontWeight: 700,
                        cursor: "pointer",
                      }}
                    >
                      Clear
                    </button>
                  </div>

                  <div style={{ display: "grid", gap: "6px", color: "#475569", fontSize: "14px" }}>
                    {selectedCustomer.phone ? <span>{selectedCustomer.phone}</span> : null}
                    {selectedCustomer.email ? <span>{selectedCustomer.email}</span> : null}
                    {selectedCustomer.order_numbers?.length ? (
                      <span>{selectedCustomer.order_numbers.length} linked order records</span>
                    ) : (
                      <span>No linked order numbers stored yet.</span>
                    )}
                  </div>
                </div>
              ) : (
                <div
                  style={{
                    border: "1px dashed #cbd5e1",
                    borderRadius: "18px",
                    padding: "18px",
                    color: "#64748b",
                    background: "#f8fafc",
                  }}
                >
                  Select a customer first. The workspace will then surface deposits due, remaining
                  balances, open invoices, and pickup-release actions automatically.
                </div>
              )}
            </section>

            {selectedCustomer ? (
              <section style={sectionCardStyle}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#78716c",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Operational Snapshot
                  </p>
                  <h2 style={{ margin: "6px 0 8px", fontSize: "24px" }}>Action Queue</h2>
                  <p style={{ margin: 0, color: "#64748b" }}>
                    Actionable items tied to this customer. Staff does not need to calculate what is
                    due manually.
                  </p>
                </div>

                <div style={{ display: "grid", gridTemplateColumns: "repeat(2, minmax(0, 1fr))", gap: "12px" }}>
                  <OperationalStat label="Open Actions" value={operationalSummary.openItems} />
                  <OperationalStat
                    label="Due Now"
                    value={currency(operationalSummary.amountDueNow)}
                    emphasis={operationalSummary.amountDueNow > 0 ? "danger" : "success"}
                  />
                  <OperationalStat
                    label="Outstanding"
                    value={currency(operationalSummary.outstandingBalance)}
                    emphasis={operationalSummary.outstandingBalance > 0 ? "danger" : "success"}
                  />
                  <OperationalStat
                    label="Release Ready"
                    value={operationalSummary.releaseReady}
                    emphasis={operationalSummary.releaseReady > 0 ? "success" : "default"}
                  />
                </div>

                {actionableItems.length ? (
                  <div style={{ display: "grid", gap: "12px" }}>
                    {actionableItems.map((action) => {
                      const tones = getActionToneStyles(action.tone);
                      const order = customerOrders.find((item) => item.order_number === action.orderNumber);

                      return (
                        <article
                          key={action.id}
                          style={{
                            borderRadius: "18px",
                            padding: "16px",
                            background: tones.background,
                            border: tones.border,
                            display: "grid",
                            gap: "10px",
                          }}
                        >
                          <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", alignItems: "start", flexWrap: "wrap" }}>
                            <div>
                              <p
                                style={{
                                  margin: 0,
                                  color: tones.accent,
                                  fontSize: "11px",
                                  fontWeight: 800,
                                  textTransform: "uppercase",
                                  letterSpacing: "0.08em",
                                }}
                              >
                                {action.kind === "pickup" ? "Pickup Release" : "Payment Action"}
                              </p>
                              <h3 style={{ margin: "6px 0 4px", fontSize: "18px", color: "#0f172a" }}>
                                {action.label}
                              </h3>
                              <p style={{ margin: 0, color: "#475569", lineHeight: 1.5 }}>
                                {action.summary}
                              </p>
                            </div>
                            <div style={{ textAlign: "right" }}>
                              <div style={{ fontWeight: 800, color: "#0f172a" }}>{action.orderNumber}</div>
                              <div style={{ color: "#64748b", fontSize: "13px" }}>
                                {action.amount > 0 ? currency(action.amount) : "Paid in full"}
                              </div>
                            </div>
                          </div>

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                            <PaymentStatusBadge status={order?.payment_status || "Draft"} />
                            <PaymentStatusBadge status={order?.invoice_status || "Draft"} />
                            <span style={{ color: "#475569", fontWeight: 700 }}>
                              Pickup: {order?.pickup_status || "Pending"}
                            </span>
                          </div>

                          <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                            <button
                              type="button"
                              onClick={() => startAction(action)}
                              style={{
                                background: "#0f172a",
                                color: "#ffffff",
                                border: "none",
                                borderRadius: "12px",
                                padding: "11px 14px",
                                fontWeight: 800,
                                cursor: "pointer",
                              }}
                            >
                              {action.kind === "pickup" ? "Open Release Workflow" : "Open Payment Workflow"}
                            </button>
                            <button
                              type="button"
                              onClick={() => navigate(`/admin/orders/${action.orderNumber}`)}
                              style={{
                                background: "#ffffff",
                                color: "#0f172a",
                                border: "1px solid #cbd5e1",
                                borderRadius: "12px",
                                padding: "11px 14px",
                                fontWeight: 700,
                                cursor: "pointer",
                              }}
                            >
                              View Order
                            </button>
                          </div>
                        </article>
                      );
                    })}
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px dashed #cbd5e1",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#f8fafc",
                      color: "#64748b",
                    }}
                  >
                    No open counter actions are tied to this customer right now.
                  </div>
                )}
              </section>
            ) : null}
          </aside>

          <main style={{ display: "grid", gap: "18px" }}>
            {transactionMessage ? (
              <div
                style={{
                  border: "1px solid #bbf7d0",
                  background: "#f0fdf4",
                  color: "#166534",
                  borderRadius: "16px",
                  padding: "14px 16px",
                  fontWeight: 700,
                }}
              >
                {transactionMessage}
              </div>
            ) : null}

            {activeMode === "lookup" ? (
              <section style={sectionCardStyle}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#78716c",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Customer-Driven Workflow
                  </p>
                  <h2 style={{ margin: "6px 0 8px", fontSize: "30px", color: "#0f172a" }}>
                    Lookup First, Then Act
                  </h2>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                    Front Counter now centers on the selected customer. Use the action queue on the
                    left to jump directly into payment collection or pickup release once the customer
                    is identified.
                  </p>
                </div>

                {selectedCustomer ? (
                  <div style={{ display: "grid", gap: "16px" }}>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                      <OperationalStat label="Open Orders" value={customerOrders.length} />
                      <OperationalStat label="Pickup Ready" value={operationalSummary.pickupReady} />
                      <OperationalStat
                        label="Balance Due"
                        value={currency(operationalSummary.outstandingBalance)}
                        emphasis={operationalSummary.outstandingBalance > 0 ? "danger" : "success"}
                      />
                    </div>

                    {customerOrders.length ? (
                      <div style={{ display: "grid", gap: "12px" }}>
                        {customerOrders.map((order) => (
                          <article
                            key={order.order_number}
                            style={{
                              border: "1px solid #e2e8f0",
                              borderRadius: "18px",
                              padding: "16px",
                              background: "#ffffff",
                              display: "grid",
                              gap: "10px",
                            }}
                          >
                            <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                              <div>
                                <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                                  {order.order_number}
                                </h3>
                                <p style={{ margin: "4px 0 0", color: "#64748b" }}>
                                  {order.garment || order.item || "Custom order"} • Qty {order.qty || 0}
                                </p>
                              </div>
                              <div style={{ textAlign: "right" }}>
                                <div style={{ fontWeight: 800, color: "#0f172a" }}>
                                  {currency(order.amount_due_now)}
                                </div>
                                <div style={{ color: "#64748b", fontSize: "13px" }}>Amount due now</div>
                              </div>
                            </div>

                            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                              <PaymentStatusBadge status={order.payment_status} />
                              <PaymentStatusBadge status={order.invoice_status} />
                              <span style={{ color: "#475569", fontWeight: 700 }}>
                                Pickup: {order.pickup_status}
                              </span>
                              <span style={{ color: "#475569", fontWeight: 700 }}>
                                Paid to date: {currency(order.paid_to_date)}
                              </span>
                            </div>

                            <p style={{ margin: 0, color: "#475569" }}>
                              {order.deposit_credited_message} {order.balance_summary}
                            </p>
                          </article>
                        ))}
                      </div>
                    ) : (
                      <div
                        style={{
                          border: "1px dashed #cbd5e1",
                          borderRadius: "18px",
                          padding: "18px",
                          background: "#f8fafc",
                          color: "#64748b",
                        }}
                      >
                        This customer does not have order records in the current operational store.
                      </div>
                    )}
                  </div>
                ) : (
                  <div
                    style={{
                      border: "1px dashed #cbd5e1",
                      borderRadius: "18px",
                      padding: "20px",
                      background: "#f8fafc",
                      color: "#64748b",
                    }}
                  >
                    Use the customer lookup to begin. Once selected, operational items appear here
                    automatically instead of forcing staff to jump between dashboards.
                  </div>
                )}
              </section>
            ) : null}

            {activeMode === "payment" ? (
              <section style={sectionCardStyle}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#78716c",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Counter Transaction
                  </p>
                  <h2 style={{ margin: "6px 0 8px", fontSize: "30px", color: "#0f172a" }}>
                    Payment Collection
                  </h2>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                    Manual counter payments record against the selected order and update balances,
                    payment status, invoice state, and financial history automatically.
                  </p>
                </div>

                {!selectedCustomer ? (
                  <div
                    style={{
                      border: "1px dashed #cbd5e1",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#f8fafc",
                      color: "#64748b",
                    }}
                  >
                    Select a customer first, then choose a payment action from the action queue.
                  </div>
                ) : !selectedActionOrder || selectedAction?.kind !== "payment" ? (
                  <div
                    style={{
                      border: "1px dashed #cbd5e1",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#f8fafc",
                      color: "#64748b",
                    }}
                  >
                    Choose `Collect Deposit` or `Collect Remaining Balance` from the customer action
                    queue to auto-populate this transaction.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "18px" }}>
                    <div
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "18px",
                        padding: "18px",
                        background: "#f8fafc",
                        display: "grid",
                        gap: "12px",
                      }}
                    >
                      <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                        <div>
                          <p
                            style={{
                              margin: 0,
                              color: "#9a3412",
                              fontSize: "11px",
                              fontWeight: 800,
                              textTransform: "uppercase",
                              letterSpacing: "0.08em",
                            }}
                          >
                            Selected Action
                          </p>
                          <h3 style={{ margin: "6px 0 4px", fontSize: "22px", color: "#0f172a" }}>
                            {selectedAction.label}
                          </h3>
                          <p style={{ margin: 0, color: "#475569" }}>
                            {selectedActionOrder.customer_name} • {selectedActionOrder.order_number}
                          </p>
                        </div>
                        <button
                          type="button"
                          onClick={clearSelectedAction}
                          style={{
                            background: "#ffffff",
                            color: "#0f172a",
                            border: "1px solid #cbd5e1",
                            borderRadius: "12px",
                            padding: "10px 12px",
                            fontWeight: 700,
                            cursor: "pointer",
                          }}
                        >
                          Clear Action
                        </button>
                      </div>

                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(160px, 1fr))", gap: "12px" }}>
                        <OperationalStat
                          label="Auto Total"
                          value={currency(selectedAction.amount)}
                          emphasis={selectedAction.amount > 0 ? "danger" : "success"}
                        />
                        <OperationalStat label="Paid To Date" value={currency(selectedActionOrder.paid_to_date)} />
                        <OperationalStat
                          label="Balance Due"
                          value={currency(selectedActionOrder.balance_due)}
                          emphasis={selectedActionOrder.balance_due > 0 ? "danger" : "success"}
                        />
                        <OperationalStat
                          label="Deposit Outstanding"
                          value={currency(selectedActionOrder.deposit_outstanding)}
                          emphasis={selectedActionOrder.deposit_outstanding > 0 ? "danger" : "success"}
                        />
                      </div>

                      <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                        <PaymentStatusBadge status={selectedActionOrder.payment_status} />
                        <PaymentStatusBadge status={selectedActionOrder.invoice_status} />
                        <span style={{ color: "#475569", fontWeight: 700 }}>
                          Pickup: {selectedActionOrder.pickup_status}
                        </span>
                        <span style={{ color: "#475569", fontWeight: 700 }}>
                          Due date: {selectedActionOrder.invoice_due_date ? formatShortDate(selectedActionOrder.invoice_due_date) : "—"}
                        </span>
                      </div>
                    </div>

                    <form onSubmit={handleRecordCounterPayment} style={{ display: "grid", gap: "16px" }}>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                        <label style={labelStyle}>
                          Payment Amount
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            value={paymentAmount}
                            onChange={(event) => {
                              setPaymentAmount(event.target.value);
                              setPaymentError("");
                            }}
                            style={{
                              ...fieldStyle,
                              border: paymentError || !paymentValidation.valid ? "1px solid #dc2626" : fieldStyle.border,
                              background:
                                paymentError || !paymentValidation.valid ? "#fff1f2" : fieldStyle.background,
                            }}
                          />
                        </label>

                        <label style={labelStyle}>
                          Payment Method
                          <select
                            value={paymentMethod}
                            onChange={(event) => setPaymentMethod(event.target.value)}
                            style={fieldStyle}
                          >
                            {counterPaymentMethods.map((option) => (
                              <option key={option} value={option}>
                                {option}
                              </option>
                            ))}
                          </select>
                        </label>
                      </div>

                      <label style={labelStyle}>
                        Counter Note
                        <textarea
                          value={paymentNote}
                          onChange={(event) => setPaymentNote(event.target.value)}
                          rows={3}
                          placeholder="Optional note for the payment record"
                          style={{ ...fieldStyle, resize: "vertical" }}
                        />
                      </label>

                      {paymentError || !paymentValidation.valid ? (
                        <p style={{ margin: 0, color: "#b91c1c", fontWeight: 700 }}>
                          {paymentError || paymentValidation.message}
                        </p>
                      ) : null}

                      <div style={{ display: "flex", gap: "12px", flexWrap: "wrap" }}>
                        <button
                          type="submit"
                          disabled={!paymentValidation.valid}
                          style={{
                            background: paymentValidation.valid ? "#171717" : "#a8a29e",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "12px",
                            padding: "13px 18px",
                            cursor: paymentValidation.valid ? "pointer" : "not-allowed",
                            fontWeight: 800,
                          }}
                        >
                          Record Payment
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/admin/orders/${selectedActionOrder.order_number}`)}
                          style={{
                            background: "#ffffff",
                            border: "1px solid #cbd5e1",
                            borderRadius: "12px",
                            padding: "13px 18px",
                            cursor: "pointer",
                            fontWeight: 700,
                          }}
                        >
                          View Full Order
                        </button>
                      </div>
                    </form>

                    <div
                      style={{
                        borderTop: "1px solid #e2e8f0",
                        paddingTop: "18px",
                        display: "grid",
                        gap: "10px",
                      }}
                    >
                      <h3 style={{ margin: 0, fontSize: "18px", color: "#0f172a" }}>
                        Existing Payment History
                      </h3>
                      {selectedActionOrder.payment_history?.length ? (
                        <div style={{ display: "grid", gap: "10px" }}>
                          {selectedActionOrder.payment_history.map((payment) => (
                            <article
                              key={payment.id}
                              style={{
                                border: "1px solid #e2e8f0",
                                borderRadius: "14px",
                                padding: "12px 14px",
                                background: "#f8fafc",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px", flexWrap: "wrap" }}>
                                <strong>{currency(payment.amount)}</strong>
                                <span style={{ color: "#475569", fontWeight: 700 }}>{payment.method}</span>
                              </div>
                              <div style={{ marginTop: "4px", color: "#64748b", fontSize: "13px" }}>
                                {payment.staff_member} • {formatDateTime(payment.timestamp)}
                              </div>
                              {payment.note ? (
                                <p style={{ margin: "6px 0 0", color: "#334155", fontSize: "14px" }}>
                                  {payment.note}
                                </p>
                              ) : null}
                            </article>
                          ))}
                        </div>
                      ) : (
                        <p style={{ margin: 0, color: "#64748b" }}>No payments recorded yet.</p>
                      )}
                    </div>
                  </div>
                )}
              </section>
            ) : null}

            {activeMode === "pickup" ? (
              <section style={sectionCardStyle}>
                <div>
                  <p
                    style={{
                      margin: 0,
                      color: "#78716c",
                      fontSize: "12px",
                      fontWeight: 800,
                      textTransform: "uppercase",
                      letterSpacing: "0.08em",
                    }}
                  >
                    Counter Handoff
                  </p>
                  <h2 style={{ margin: "6px 0 8px", fontSize: "30px", color: "#0f172a" }}>
                    Pickup Release
                  </h2>
                  <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                    Release actions only appear once pickup is ready and balance is fully paid. If
                    money is still owing, staff is pushed back into payment collection first.
                  </p>
                </div>

                {!selectedCustomer ? (
                  <div
                    style={{
                      border: "1px dashed #cbd5e1",
                      borderRadius: "18px",
                      padding: "18px",
                      background: "#f8fafc",
                      color: "#64748b",
                    }}
                  >
                    Select a customer to see pickup-ready orders and release eligibility.
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: "14px" }}>
                    {customerOrders.filter((order) => order.pickup_status === "Ready for Pickup").length ? (
                      customerOrders
                        .filter((order) => order.pickup_status === "Ready for Pickup")
                        .map((order) => {
                          const canRelease = Number(order.balance_due || 0) <= 0;
                          const isSelected = selectedAction?.orderNumber === order.order_number;

                          return (
                            <article
                              key={order.order_number}
                              style={{
                                border: isSelected ? "1px solid #0f172a" : "1px solid #e2e8f0",
                                borderRadius: "18px",
                                padding: "18px",
                                background: canRelease ? "#f0fdf4" : "#fff7ed",
                                display: "grid",
                                gap: "12px",
                              }}
                            >
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "12px", flexWrap: "wrap" }}>
                                <div>
                                  <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>
                                    {order.order_number}
                                  </h3>
                                  <p style={{ margin: "4px 0 0", color: "#475569" }}>
                                    {order.garment || order.item || "Custom order"} • Qty {order.qty || 0}
                                  </p>
                                </div>
                                <div style={{ textAlign: "right" }}>
                                  <div
                                    style={{
                                      color: canRelease ? "#166534" : "#c2410c",
                                      fontWeight: 800,
                                      fontSize: "20px",
                                    }}
                                  >
                                    {canRelease ? "Ready To Release" : currency(order.balance_due)}
                                  </div>
                                  <div style={{ color: "#64748b", fontSize: "13px" }}>
                                    {canRelease ? "Balance clear" : "Still due before release"}
                                  </div>
                                </div>
                              </div>

                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap", alignItems: "center" }}>
                                <PaymentStatusBadge status={order.payment_status} />
                                <PaymentStatusBadge status={order.invoice_status} />
                                <span style={{ color: "#475569", fontWeight: 700 }}>
                                  Pickup: {order.pickup_status}
                                </span>
                              </div>

                              <p style={{ margin: 0, color: "#475569" }}>
                                {canRelease
                                  ? "This order can be handed off now. Releasing it will mark pickup complete and add a timeline event."
                                  : `Collect ${currency(order.balance_due)} first. Once paid, this order can be released immediately.`}
                              </p>

                              <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
                                {canRelease ? (
                                  <button
                                    type="button"
                                    onClick={() => handleReleasePickup(order)}
                                    style={{
                                      background: "#166534",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "12px",
                                      padding: "12px 16px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Release Pickup Order
                                  </button>
                                ) : (
                                  <button
                                    type="button"
                                    onClick={() =>
                                      startAction(
                                        buildPaymentAction(order) || {
                                          id: `${order.order_number}-payment-balance`,
                                          kind: "payment",
                                          paymentKind: "balance",
                                          label: "Collect Remaining Balance",
                                          orderNumber: order.order_number,
                                          amount: order.balance_due,
                                        }
                                      )
                                    }
                                    style={{
                                      background: "#0f172a",
                                      color: "#ffffff",
                                      border: "none",
                                      borderRadius: "12px",
                                      padding: "12px 16px",
                                      fontWeight: 800,
                                      cursor: "pointer",
                                    }}
                                  >
                                    Collect Balance First
                                  </button>
                                )}
                                <button
                                  type="button"
                                  onClick={() => navigate(`/admin/orders/${order.order_number}`)}
                                  style={{
                                    background: "#ffffff",
                                    color: "#0f172a",
                                    border: "1px solid #cbd5e1",
                                    borderRadius: "12px",
                                    padding: "12px 16px",
                                    fontWeight: 700,
                                    cursor: "pointer",
                                  }}
                                >
                                  View Order
                                </button>
                              </div>
                            </article>
                          );
                        })
                    ) : (
                      <div
                        style={{
                          border: "1px dashed #cbd5e1",
                          borderRadius: "18px",
                          padding: "18px",
                          background: "#f8fafc",
                          color: "#64748b",
                        }}
                      >
                        No pickup-ready orders are tied to this customer yet.
                      </div>
                    )}
                  </div>
                )}
              </section>
            ) : null}

            {activeMode === "quick-sale" ? (
              <form onSubmit={completeSale} style={{ display: "grid", gap: "18px" }}>
                <section id="quick-sale-workflow" style={sectionCardStyle}>
                  <div>
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
                      Walk-In Transaction
                    </p>
                    <h2 style={{ margin: "6px 0 8px", fontSize: "30px", color: "#0f172a" }}>
                      Quick Sale
                    </h2>
                    <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                      Quick Sale stays available for immediate counter purchases while the rest of
                      Front Counter now handles customer lookup, payment collection, and pickup
                      workflow in the same workspace.
                    </p>
                  </div>

                  <section
                    style={{
                      background: "#f8fafc",
                      border: "1px solid #e2e8f0",
                      borderRadius: "18px",
                      padding: "18px",
                    }}
                  >
                    <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>Customer & Payment</h3>
                    <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                      <label style={labelStyle}>
                        Customer Name <span style={{ color: "#78716c", fontWeight: 500 }}>(optional)</span>
                        <input
                          value={customerName}
                          onChange={(event) => updateCustomerName(event.target.value)}
                          placeholder="Walk-in Customer"
                          style={fieldStyle}
                        />
                      </label>
                      <label style={labelStyle}>
                        Payment Method
                        <select
                          value={quickSalePaymentMethod}
                          onChange={(event) => setQuickSalePaymentMethod(event.target.value)}
                          style={fieldStyle}
                        >
                          {quickSalePaymentMethods.map((option) => (
                            <option key={option} value={option}>
                              {option}
                            </option>
                          ))}
                        </select>
                      </label>
                    </div>
                    {linkedCustomerId ? (
                      <p style={{ margin: "12px 0 0", color: "#166534", fontWeight: 700 }}>
                        Linked to existing customer: {linkedCustomerName}
                      </p>
                    ) : (
                      <p style={{ margin: "12px 0 0", color: "#64748b", fontWeight: 700 }}>
                        Use the customer lookup mode first if this quick sale should stay tied to a
                        saved customer profile.
                      </p>
                    )}
                  </section>

                  <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.8fr)", gap: "18px", alignItems: "start" }}>
                    <section
                      style={{
                        background: "#f8fafc",
                        border: "1px solid #e2e8f0",
                        borderRadius: "18px",
                        padding: "18px",
                      }}
                    >
                      <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>Add Item</h3>
                      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                        <label style={labelStyle}>
                          Product
                          <select
                            ref={productSelectRef}
                            value={selectedProductId}
                            onChange={selectProduct}
                            onKeyDown={handleLineItemKeyDown}
                            style={fieldStyle}
                          >
                            <option value="">Select product or type manually...</option>
                            {products.map((product) => (
                              <option key={product.id} value={product.id}>
                                {product.name}
                                {product.brand_model ? ` (${product.brand_model})` : ""}
                              </option>
                            ))}
                          </select>
                        </label>
                        <label style={labelStyle}>
                          Item Name
                          <input
                            name="name"
                            value={lineItem.name}
                            onChange={updateLineItem}
                            onKeyDown={handleLineItemKeyDown}
                            placeholder="T-Shirt"
                            style={fieldStyle}
                          />
                        </label>
                        <label style={labelStyle}>
                          Color
                          {selectedProduct?.colors?.length ? (
                            <select
                              name="color"
                              value={lineItem.color}
                              onChange={updateLineItem}
                              onKeyDown={handleLineItemKeyDown}
                              style={fieldStyle}
                            >
                              {selectedProduct.colors.map((color) => (
                                <option key={color}>{color}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              name="color"
                              value={lineItem.color}
                              onChange={updateLineItem}
                              onKeyDown={handleLineItemKeyDown}
                              placeholder="Black"
                              style={fieldStyle}
                            />
                          )}
                        </label>
                        <label style={labelStyle}>
                          Size
                          {selectedProduct?.sizes?.length ? (
                            <select
                              name="size"
                              value={lineItem.size}
                              onChange={updateLineItem}
                              onKeyDown={handleLineItemKeyDown}
                              style={fieldStyle}
                            >
                              {selectedProduct.sizes.map((size) => (
                                <option key={size}>{size}</option>
                              ))}
                            </select>
                          ) : (
                            <input
                              name="size"
                              value={lineItem.size}
                              onChange={updateLineItem}
                              onKeyDown={handleLineItemKeyDown}
                              placeholder="L"
                              style={fieldStyle}
                            />
                          )}
                        </label>
                        <label style={labelStyle}>
                          Qty
                          <input
                            type="number"
                            min="1"
                            name="qty"
                            value={lineItem.qty}
                            onChange={updateLineItem}
                            onKeyDown={handleLineItemKeyDown}
                            style={fieldStyle}
                          />
                        </label>
                        <label style={labelStyle}>
                          Unit Price
                          <input
                            type="number"
                            min="0"
                            step="0.01"
                            name="unit_price"
                            value={lineItem.unit_price}
                            onChange={updateLineItem}
                            onKeyDown={handleLineItemKeyDown}
                            placeholder="24.99"
                            style={fieldStyle}
                          />
                        </label>
                      </div>
                      <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                        <button
                          type="button"
                          onClick={addToCart}
                          disabled={!canAddItem}
                          style={{
                            background: canAddItem ? "#171717" : "#a8a29e",
                            color: "#ffffff",
                            border: "none",
                            borderRadius: "12px",
                            padding: "13px 18px",
                            cursor: canAddItem ? "pointer" : "not-allowed",
                            fontWeight: 700,
                          }}
                        >
                          Add to Cart
                        </button>
                      </div>
                    </section>

                    <aside
                      style={{
                        border: "1px solid #e2e8f0",
                        borderRadius: "18px",
                        padding: "18px",
                        background: "#ffffff",
                        position: "sticky",
                        top: "18px",
                      }}
                    >
                      <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>Cart</h3>
                      {cart.length ? (
                        <div style={{ display: "grid", gap: "10px" }}>
                          {cart.map((item) => (
                            <div key={item.id} style={{ border: "1px solid #e7e5e4", borderRadius: "12px", padding: "10px" }}>
                              <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                                <strong>{item.name}</strong>
                                <button
                                  type="button"
                                  onClick={() => removeCartItem(item.id)}
                                  style={{
                                    border: "none",
                                    background: "transparent",
                                    color: "#b91c1c",
                                    cursor: "pointer",
                                    fontWeight: 700,
                                  }}
                                >
                                  Remove
                                </button>
                              </div>
                              <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>
                                {[item.color, item.size].filter(Boolean).join(" • ") || "No variant"}
                              </p>
                              <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "8px", alignItems: "end" }}>
                                <label style={{ display: "grid", gap: "5px", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>
                                  Qty
                                  <input
                                    type="number"
                                    min="1"
                                    value={item.qty}
                                    onChange={(event) => updateCartItem(item.id, "qty", event.target.value)}
                                    onKeyDown={handleCartEditKeyDown}
                                    style={compactFieldStyle}
                                  />
                                </label>
                                <label style={{ display: "grid", gap: "5px", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>
                                  Unit Price
                                  <input
                                    type="number"
                                    min="0"
                                    step="0.01"
                                    value={item.unit_price}
                                    onChange={(event) =>
                                      updateCartItem(item.id, "unit_price", event.target.value)
                                    }
                                    onKeyDown={handleCartEditKeyDown}
                                    style={compactFieldStyle}
                                  />
                                </label>
                              </div>
                              <p style={{ margin: "8px 0 0", color: "#292524" }}>
                                Line Total: <strong>{currency(item.line_total)}</strong>
                              </p>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p style={{ color: "#64748b", marginTop: 0 }}>No items added yet.</p>
                      )}
                      <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "16px", paddingTop: "14px", display: "grid", gap: "8px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Subtotal</span>
                          <strong>{currency(subtotal)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>Tax (13%)</span>
                          <strong>{currency(taxTotal)}</strong>
                        </div>
                        <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px" }}>
                          <span>Total</span>
                          <strong>{currency(total)}</strong>
                        </div>
                      </div>
                    </aside>
                  </div>

                  <label style={labelStyle}>
                    Notes
                    <textarea
                      value={notes}
                      onChange={(event) => setNotes(event.target.value)}
                      placeholder="Optional sale note, counter note, or payment reference."
                      style={{ ...fieldStyle, minHeight: "86px", resize: "vertical" }}
                    />
                  </label>

                  <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
                    <button
                      type="button"
                      onClick={() => navigate("/admin")}
                      style={{
                        background: "#ffffff",
                        border: "1px solid #cbd5e1",
                        borderRadius: "12px",
                        padding: "13px 18px",
                        cursor: "pointer",
                        fontWeight: 600,
                      }}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      disabled={!canCompleteSale}
                      style={{
                        background: canCompleteSale ? "#171717" : "#a8a29e",
                        color: "#ffffff",
                        border: "none",
                        borderRadius: "12px",
                        padding: "13px 18px",
                        cursor: canCompleteSale ? "pointer" : "not-allowed",
                        fontWeight: 700,
                      }}
                    >
                      Complete Quick Sale
                    </button>
                  </div>
                </section>
              </form>
            ) : null}
          </main>
        </div>
      </div>
    </div>
  );
}
