import { useEffect, useEffectEvent, useMemo, useRef, useState } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { useStoredProducts } from "../lib/productsStore";
import { createStoredQuickSale } from "../lib/salesStore";
import { getStoredCustomers } from "../lib/customersStore";
import { getActiveStaffUser } from "../lib/staffUsersStore";
import { isStaffWorkspaceView } from "./adminRoleView";

const taxRate = 0.13;

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

const workspaceCardStyle = {
  background: "#ffffff",
  border: "1px solid #dbe4ee",
  borderRadius: "18px",
  padding: "18px",
  display: "grid",
  gap: "10px",
  alignContent: "start",
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

function findCustomerMatches(customers, value) {
  const query = normalize(value);
  const phoneQuery = normalizePhone(value);

  if (query.length < 2 && phoneQuery.length < 3) return [];

  return customers
    .filter((customer) => {
      const searchableText = [customer.name, customer.company, customer.email, customer.phone]
        .filter(Boolean)
        .join(" ")
        .toLowerCase();
      const customerPhone = normalizePhone(customer.phone);

      return (
        searchableText.includes(query) ||
        (phoneQuery.length >= 3 && customerPhone.includes(phoneQuery))
      );
    })
    .slice(0, 5);
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

function WorkspaceCard({
  eyebrow,
  title,
  description,
  tone = "default",
  actionLabel,
  onAction,
}) {
  const accent =
    tone === "success"
      ? { background: "#ecfdf5", color: "#047857", border: "1px solid #a7f3d0" }
      : tone === "warning"
        ? { background: "#fff7ed", color: "#c2410c", border: "1px solid #fdba74" }
        : { background: "#eff6ff", color: "#1d4ed8", border: "1px solid #bfdbfe" };

  return (
    <article style={workspaceCardStyle}>
      <div
        style={{
          width: "fit-content",
          padding: "6px 10px",
          borderRadius: "999px",
          fontSize: "11px",
          fontWeight: 800,
          letterSpacing: "0.08em",
          textTransform: "uppercase",
          ...accent,
        }}
      >
        {eyebrow}
      </div>
      <div>
        <h3 style={{ margin: 0, fontSize: "20px", color: "#0f172a" }}>{title}</h3>
        <p style={{ margin: "8px 0 0", color: "#64748b", lineHeight: 1.5 }}>{description}</p>
      </div>
      {actionLabel ? (
        <button
          type="button"
          onClick={onAction}
          style={{
            justifySelf: "start",
            border: "1px solid #cbd5e1",
            background: "#ffffff",
            color: "#0f172a",
            borderRadius: "12px",
            padding: "10px 14px",
            fontWeight: 800,
            cursor: "pointer",
          }}
        >
          {actionLabel}
        </button>
      ) : null}
    </article>
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
  const [customers] = useState(() => getStoredCustomers());
  const [customerMatches, setCustomerMatches] = useState([]);
  const [linkedCustomerId, setLinkedCustomerId] = useState("");
  const [linkedCustomerName, setLinkedCustomerName] = useState("");
  const [selectedProductId, setSelectedProductId] = useState("");
  const [customerName, setCustomerName] = useState("");
  const [paymentMethod, setPaymentMethod] = useState("Cash");
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
    if (!completedSaleNumber) {
      productSelectRef.current?.focus();
    }
  }, [completedSaleNumber]);

  const selectedProduct = useMemo(() => {
    return products.find((product) => product.id === selectedProductId);
  }, [products, selectedProductId]);

  const subtotal = useMemo(() => {
    return cart.reduce((total, item) => total + item.qty * item.unit_price, 0);
  }, [cart]);

  const taxTotal = subtotal * taxRate;
  const total = subtotal + taxTotal;
  const canAddItem = lineItem.name.trim() && Number(lineItem.qty) > 0;
  const canCompleteSale = cart.length > 0;

  const handleGlobalEnter = useEffectEvent((event) => {
    if (completedSaleNumber || event.key !== "Enter" || !canCompleteSale) return;
    if (isTypingField(document.activeElement)) return;

    event.preventDefault();
    saveSale();
  });

  useEffect(() => {
    window.addEventListener("keydown", handleGlobalEnter);
    return () => window.removeEventListener("keydown", handleGlobalEnter);
  }, []);

  function updateCustomerName(value) {
    setCustomerName(value);
    setLinkedCustomerId("");
    setLinkedCustomerName("");
    setCustomerMatches(findCustomerMatches(customers, value));
  }

  function selectCustomer(customer) {
    setCustomerName(customer.name || "");
    setLinkedCustomerId(customer.id || "");
    setLinkedCustomerName(customer.name || "");
    setCustomerMatches([]);
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

        const nextValue = field === "qty" ? Math.max(1, Number(value) || 1) : Math.max(0, Number(value) || 0);
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
        payment_method: paymentMethod,
        payment_status: paymentMethod === "Pay Later" ? "Unpaid" : "Paid",
        amount_paid: paymentMethod === "Pay Later" ? 0 : total,
        balance_due: paymentMethod === "Pay Later" ? total : 0,
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
        <p style={{ margin: 0, fontSize: "13px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase", color: "#16a34a" }}>
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
          <button onClick={() => navigate(`/admin/sales/receipt/${completedSaleNumber}`)} style={{ background: "#171717", color: "#ffffff", border: "none", borderRadius: "14px", padding: "14px 20px", fontWeight: 800, cursor: "pointer" }}>
            Print Receipt
          </button>
          <button onClick={() => navigate("/admin/sales/new")} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "14px 20px", fontWeight: 800, cursor: "pointer" }}>
            Start Another Quick Sale
          </button>
          <button onClick={() => navigate("/admin/sales")} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "14px 20px", fontWeight: 700, cursor: "pointer" }}>
            View Counter Sales
          </button>
          <button onClick={() => navigate("/admin")} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "14px", padding: "14px 20px", fontWeight: 700, cursor: "pointer" }}>
            {isStaffWorkspace ? "Return to Staff Workspace" : "Return to Dashboard"}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div
      style={{
        maxWidth: "1180px",
        margin: "0 auto",
        padding: "24px",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div style={{ display: "grid", gap: "20px" }}>
        <section
          style={{
            background: "linear-gradient(135deg, #fff7ed 0%, #ffffff 40%, #eff6ff 100%)",
            border: "1px solid #e2e8f0",
            borderRadius: "24px",
            padding: "24px",
            display: "grid",
            gap: "18px",
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", gap: "16px", alignItems: "start", flexWrap: "wrap" }}>
            <div style={{ maxWidth: "760px" }}>
              <p style={{ margin: 0, color: "#9a3412", fontSize: "12px", fontWeight: 800, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Front Counter Workspace
              </p>
              <h1 style={{ margin: "8px 0 10px", fontSize: "36px", color: "#0f172a" }}>Front Counter</h1>
              <p style={{ margin: 0, color: "#475569", lineHeight: 1.6 }}>
                Customer-facing operational workspace for walk-in sales, payment collection, customer lookup, pickup handoff, and other in-person counter activity. Quick Sale remains live here as the active transaction workflow.
              </p>
            </div>

            <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
              <button onClick={() => navigate("/admin/sales")} type="button" style={{ background: "#171717", color: "#ffffff", border: "none", borderRadius: "12px", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
                View Counter Sales
              </button>
              <button onClick={() => navigate("/admin/customers")} type="button" style={{ background: "#ffffff", color: "#171717", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
                Customer Lookup
              </button>
              <button onClick={() => navigate("/admin/quotes")} type="button" style={{ background: "#ffffff", color: "#171717", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
                Quote Intake
              </button>
              <button onClick={() => navigate("/admin/orders")} type="button" style={{ background: "#ffffff", color: "#171717", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "12px 16px", fontWeight: 800, cursor: "pointer" }}>
                Production Queue
              </button>
            </div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "14px" }}>
            <WorkspaceCard
              eyebrow="Active Workflow"
              title="Quick Sale"
              description="Use this for walk-in purchases, stocked items, and fast counter checkout. The live quick-sale transaction form stays in this workspace below."
              actionLabel="Go To Quick Sale"
              onAction={() => document.getElementById("quick-sale-workflow")?.scrollIntoView({ behavior: "smooth", block: "start" })}
            />
            <WorkspaceCard
              eyebrow="Operational Scope"
              title="Payment Collection"
              description="This workspace now makes room for deposit collection and final balance payoff at the counter. Order-linked payment lifecycle logic remains in its current flows."
              tone="warning"
            />
            <WorkspaceCard
              eyebrow="Available Now"
              title="Customer Lookup"
              description="Saved customer search is already built into the quick-sale flow, and the customer workspace remains one click away for deeper lookup and repeat-order context."
              tone="success"
              actionLabel="Open Customers"
              onAction={() => navigate("/admin/customers")}
            />
            <WorkspaceCard
              eyebrow="Operational Placeholder"
              title="Pickup & Release"
              description="Counter handoff and release activity belongs here conceptually. Use the production queue to confirm ready-for-pickup jobs while this workspace continues to expand."
              actionLabel="Open Production Queue"
              onAction={() => navigate("/admin/orders")}
            />
          </div>
        </section>

        <form onSubmit={completeSale} style={{ display: "grid", gap: "18px" }}>
          <section
            id="quick-sale-workflow"
            style={{
              background: "#ffffff",
              borderRadius: "20px",
              padding: "24px",
              boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
              display: "grid",
              gap: "18px",
            }}
          >
            <div style={{ display: "grid", gap: "8px" }}>
              <p style={{ margin: 0, color: "#78716c", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase" }}>
                Live Workflow
              </p>
              <h2 style={{ margin: 0, fontSize: "30px", color: "#0f172a" }}>Quick Sale</h2>
              <p style={{ margin: 0, color: "#475569" }}>
                Use this workflow for immediate counter purchases and ready-to-pay walk-ins. Customer lookup is available below so staff can connect the transaction to an existing profile when needed.
              </p>
            </div>

            <div style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "16px", padding: "14px 16px", color: "#475569", lineHeight: 1.5 }}>
              Front Counter is broader than a single form now. Quick Sale stays intact here while deposit collection, balance payoff, pickup release, and other counter workflows continue to organize around the same workspace.
            </div>

            <section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px" }}>
              <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>Customer & Payment</h3>
              <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(220px, 1fr))", gap: "16px" }}>
                <label style={{ ...labelStyle, position: "relative" }}>
                  Customer Name <span style={{ color: "#78716c", fontWeight: 500 }}>(optional)</span>
                  <input value={customerName} onChange={(event) => updateCustomerName(event.target.value)} placeholder="Walk-in Customer" style={fieldStyle} />
                  {customerMatches.length > 0 && !linkedCustomerId && (
                    <div style={{ position: "absolute", top: "78px", left: 0, right: 0, zIndex: 20, background: "#ffffff", border: "1px solid #e2e8f0", borderRadius: "12px", boxShadow: "0 12px 24px rgba(15, 23, 42, 0.12)", overflow: "hidden" }}>
                      {customerMatches.map((customer) => (
                        <button key={customer.id} type="button" onClick={() => selectCustomer(customer)} style={{ display: "block", width: "100%", padding: "11px 12px", background: "#ffffff", border: "none", borderBottom: "1px solid #f1f5f9", textAlign: "left", cursor: "pointer", color: "#292524" }}>
                          <strong>{customer.name}</strong>{customer.company ? ` — ${customer.company}` : ""}
                          <span style={{ display: "block", marginTop: "3px", color: "#64748b", fontSize: "13px" }}>
                            {[customer.phone, customer.email].filter(Boolean).join(" • ") || "Saved customer"}
                          </span>
                        </button>
                      ))}
                    </div>
                  )}
                </label>
                <label style={labelStyle}>
                  Payment Method
                  <select value={paymentMethod} onChange={(event) => setPaymentMethod(event.target.value)} style={fieldStyle}>
                    <option>Cash</option>
                    <option>Debit</option>
                    <option>Credit</option>
                    <option>E-transfer</option>
                    <option>Square Later</option>
                    <option>Pay Later</option>
                  </select>
                </label>
              </div>
              {linkedCustomerId ? (
                <p style={{ margin: "12px 0 0", color: "#166534", fontWeight: 700 }}>Linked to existing customer: {linkedCustomerName}</p>
              ) : (
                <p style={{ margin: "12px 0 0", color: "#64748b", fontWeight: 700 }}>Start typing a saved customer name, company, phone, or email to link this quick sale.</p>
              )}
            </section>

            <div style={{ display: "grid", gridTemplateColumns: "minmax(0, 1.5fr) minmax(280px, 0.8fr)", gap: "18px", alignItems: "start" }}>
              <section style={{ background: "#f8fafc", border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>Add Item</h3>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))", gap: "14px" }}>
                  <label style={labelStyle}>Product<select ref={productSelectRef} value={selectedProductId} onChange={selectProduct} onKeyDown={handleLineItemKeyDown} style={fieldStyle}><option value="">Select product or type manually...</option>{products.map((product) => (<option key={product.id} value={product.id}>{product.name}{product.brand_model ? ` (${product.brand_model})` : ""}</option>))}</select></label>
                  <label style={labelStyle}>Item Name<input name="name" value={lineItem.name} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} placeholder="T-Shirt" style={fieldStyle} /></label>
                  <label style={labelStyle}>Color{selectedProduct?.colors?.length ? (<select name="color" value={lineItem.color} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} style={fieldStyle}>{selectedProduct.colors.map((color) => <option key={color}>{color}</option>)}</select>) : (<input name="color" value={lineItem.color} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} placeholder="Black" style={fieldStyle} />)}</label>
                  <label style={labelStyle}>Size{selectedProduct?.sizes?.length ? (<select name="size" value={lineItem.size} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} style={fieldStyle}>{selectedProduct.sizes.map((size) => <option key={size}>{size}</option>)}</select>) : (<input name="size" value={lineItem.size} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} placeholder="L" style={fieldStyle} />)}</label>
                  <label style={labelStyle}>Qty<input type="number" min="1" name="qty" value={lineItem.qty} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} style={fieldStyle} /></label>
                  <label style={labelStyle}>Unit Price<input type="number" min="0" step="0.01" name="unit_price" value={lineItem.unit_price} onChange={updateLineItem} onKeyDown={handleLineItemKeyDown} placeholder="24.99" style={fieldStyle} /></label>
                </div>
                <div style={{ display: "flex", justifyContent: "flex-end", marginTop: "16px" }}>
                  <button type="button" onClick={addToCart} disabled={!canAddItem} style={{ background: canAddItem ? "#171717" : "#a8a29e", color: "#ffffff", border: "none", borderRadius: "12px", padding: "13px 18px", cursor: canAddItem ? "pointer" : "not-allowed", fontWeight: 700 }}>Add to Cart</button>
                </div>
              </section>

              <aside style={{ border: "1px solid #e2e8f0", borderRadius: "18px", padding: "18px", background: "#ffffff", position: "sticky", top: "18px" }}>
                <h3 style={{ margin: "0 0 12px", fontSize: "20px" }}>Cart</h3>
                {cart.length ? (
                  <div style={{ display: "grid", gap: "10px" }}>
                    {cart.map((item) => (
                      <div key={item.id} style={{ border: "1px solid #e7e5e4", borderRadius: "12px", padding: "10px" }}>
                        <div style={{ display: "flex", justifyContent: "space-between", gap: "10px" }}>
                          <strong>{item.name}</strong>
                          <button type="button" onClick={() => removeCartItem(item.id)} style={{ border: "none", background: "transparent", color: "#b91c1c", cursor: "pointer", fontWeight: 700 }}>Remove</button>
                        </div>
                        <p style={{ margin: "4px 0", color: "#64748b", fontSize: "14px" }}>{[item.color, item.size].filter(Boolean).join(" • ") || "No variant"}</p>
                        <div style={{ display: "grid", gridTemplateColumns: "72px 1fr", gap: "8px", alignItems: "end" }}>
                          <label style={{ display: "grid", gap: "5px", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>Qty<input type="number" min="1" value={item.qty} onChange={(event) => updateCartItem(item.id, "qty", event.target.value)} onKeyDown={handleCartEditKeyDown} style={compactFieldStyle} /></label>
                          <label style={{ display: "grid", gap: "5px", color: "#64748b", fontSize: "12px", fontWeight: 700 }}>Unit Price<input type="number" min="0" step="0.01" value={item.unit_price} onChange={(event) => updateCartItem(item.id, "unit_price", event.target.value)} onKeyDown={handleCartEditKeyDown} style={compactFieldStyle} /></label>
                        </div>
                        <p style={{ margin: "8px 0 0", color: "#292524" }}>Line Total: <strong>{currency(item.line_total)}</strong></p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p style={{ color: "#64748b", marginTop: 0 }}>No items added yet.</p>
                )}
                <div style={{ borderTop: "1px solid #e2e8f0", marginTop: "16px", paddingTop: "14px", display: "grid", gap: "8px" }}>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Subtotal</span><strong>{currency(subtotal)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between" }}><span>Tax (13%)</span><strong>{currency(taxTotal)}</strong></div>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: "20px" }}><span>Total</span><strong>{currency(total)}</strong></div>
                </div>
              </aside>
            </div>

            <label style={labelStyle}>
              Notes
              <textarea value={notes} onChange={(event) => setNotes(event.target.value)} placeholder="Optional sale note, counter note, or payment reference." style={{ ...fieldStyle, minHeight: "86px", resize: "vertical" }} />
            </label>

            <div style={{ display: "flex", justifyContent: "flex-end", gap: "12px", flexWrap: "wrap" }}>
              <button type="button" onClick={() => navigate("/admin")} style={{ background: "#ffffff", border: "1px solid #cbd5e1", borderRadius: "12px", padding: "13px 18px", cursor: "pointer", fontWeight: 600 }}>
                Cancel
              </button>
              <button type="submit" disabled={!canCompleteSale} style={{ background: canCompleteSale ? "#171717" : "#a8a29e", color: "#ffffff", border: "none", borderRadius: "12px", padding: "13px 18px", cursor: canCompleteSale ? "pointer" : "not-allowed", fontWeight: 700 }}>
                Complete Quick Sale
              </button>
            </div>
          </section>
        </form>
      </div>
    </div>
  );
}
