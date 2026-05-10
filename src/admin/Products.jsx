import { useRef, useState } from "react";
import ProductPricingFields from "../components/ProductPricingFields";
import { PRODUCTION_TYPES } from "../constants/productionTypes";
import {
  buildPlacementConfig,
  createStoredProduct,
  deleteStoredProduct,
  getProductPlacementConfig,
  getStoredProducts,
  updateStoredProduct,
} from "../lib/productsStore";

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
  fontWeight: 700,
  color: "#292524",
};

const emptyProduct = {
  name: "",
  category: "T-Shirt",
  product_type: "",
  brand_model: "",
  image: "",
  cost_price: "0",
  markup_percentage: "0",
  status: "Active",
  colors: "Black, White",
  sizes: "S, M, L, XL",
  placementsText: "Left Chest, Full Front, Full Back",
  placementPriceMap: {},
  production_methods: ["Screen Print"],
  production_method_prices: {},
  notes: "",
};

function money(value) {
  return `$${Number(value || 0).toFixed(2)}`;
}

function normalizeListInput(value) {
  return String(value || "")
    .split(/[\n,]/)
    .map((item) => item.trim())
    .filter(Boolean);
}

function buildPlacementPriceMap(placements, existing = {}) {
  return placements.reduce((accumulator, placement) => {
    accumulator[placement] = String(existing?.[placement] ?? "0");
    return accumulator;
  }, {});
}

function buildMethodPriceMap(methods, existing = {}) {
  return methods.reduce((accumulator, method) => {
    accumulator[method] = String(existing?.[method] ?? "0");
    return accumulator;
  }, {});
}

function buildFormFromProduct(product) {
  const placements = getProductPlacementConfig(product).map((placement) => placement.label);
  const productionMethods = product?.production_methods?.length
    ? product.production_methods
    : product?.decoration_types?.length
    ? product.decoration_types
    : ["Screen Print"];

  return {
    ...emptyProduct,
    ...product,
    product_type: product?.product_type || product?.name || "",
    cost_price: String(product?.cost_price ?? "0"),
    markup_percentage: String(product?.markup_percentage ?? "0"),
    colors: Array.isArray(product?.colors) ? product.colors.join(", ") : "",
    sizes: Array.isArray(product?.sizes) ? product.sizes.join(", ") : "",
    placementsText: placements.join(", "),
    placementPriceMap: buildPlacementPriceMap(
      placements,
      product?.placement_prices || {}
    ),
    production_methods: productionMethods,
    production_method_prices: buildMethodPriceMap(
      productionMethods,
      product?.production_method_prices || {}
    ),
    notes: product?.notes || "",
  };
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Products() {
  const pageRef = useRef(null);
  const [products, setProducts] = useState(() => getStoredProducts());
  const [form, setForm] = useState(emptyProduct);
  const [editingProductId, setEditingProductId] = useState(null);
  const [selectedFileName, setSelectedFileName] = useState("");
  const imageInputRef = useRef(null);

  const placementOptions = normalizeListInput(form.placementsText);

  function refreshProducts() {
    setProducts(getStoredProducts());
  }

  function updateField(event) {
    const { name, value } = event.target;

    setForm((current) => ({
      ...current,
      [name]: value,
    }));
  }

  function updatePlacementsText(event) {
    const nextText = event.target.value;
    const placements = normalizeListInput(nextText);

    setForm((current) => ({
      ...current,
      placementsText: nextText,
      placementPriceMap: buildPlacementPriceMap(
        placements,
        current.placementPriceMap
      ),
    }));
  }

  function toggleProductionMethod(method) {
    setForm((current) => {
      const exists = current.production_methods.includes(method);
      const nextMethods = exists
        ? current.production_methods.filter((item) => item !== method)
        : [...current.production_methods, method];
      const safeMethods = nextMethods.length ? nextMethods : ["Screen Print"];

      return {
        ...current,
        production_methods: safeMethods,
        production_method_prices: buildMethodPriceMap(
          safeMethods,
          current.production_method_prices
        ),
      };
    });
  }

  function updatePlacementPrice(placement, value) {
    setForm((current) => ({
      ...current,
      placementPriceMap: {
        ...current.placementPriceMap,
        [placement]: value,
      },
    }));
  }

  function updateMethodPrice(method, value) {
    setForm((current) => ({
      ...current,
      production_method_prices: {
        ...current.production_method_prices,
        [method]: value,
      },
    }));
  }

  async function updateImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    setSelectedFileName(file.name);
    const image = await fileToDataUrl(file);

    setForm((current) => ({
      ...current,
      image,
    }));
  }

  function resetForm() {
    setForm(emptyProduct);
    setEditingProductId(null);
    setSelectedFileName("");

    if (imageInputRef.current) {
      imageInputRef.current.value = "";
    }
  }

  function handleEdit(product) {
    setEditingProductId(product.id);
    setSelectedFileName("");
    setForm(buildFormFromProduct(product));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const placements = placementOptions;
    const placementPrices = placements.reduce((accumulator, placement) => {
      accumulator[placement] = Number(form.placementPriceMap?.[placement] || 0);
      return accumulator;
    }, {});
    const productionMethods = form.production_methods.length
      ? form.production_methods
      : ["Screen Print"];
    const productionMethodPrices = productionMethods.reduce((accumulator, method) => {
      accumulator[method] = Number(form.production_method_prices?.[method] || 0);
      return accumulator;
    }, {});
    const productPayload = {
      name: form.name,
      category: form.category,
      product_type: form.product_type || form.name,
      brand_model: form.brand_model,
      image: form.image,
      cost_price: Number(form.cost_price || 0),
      markup_percentage: Number(form.markup_percentage || 0),
      status: form.status,
      colors: normalizeListInput(form.colors),
      sizes: normalizeListInput(form.sizes),
      placements,
      placement_prices: placementPrices,
      placement_config: buildPlacementConfig(placements, placementPrices),
      production_methods: productionMethods,
      decoration_types: productionMethods,
      production_method_prices: productionMethodPrices,
      notes: form.notes,
    };

    if (editingProductId) {
      updateStoredProduct(editingProductId, productPayload);
    } else {
      createStoredProduct(productPayload);
    }

    refreshProducts();
    resetForm();

    pageRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
  }

  function handleDelete(productId) {
    deleteStoredProduct(productId);
    refreshProducts();

    if (editingProductId === productId) {
      resetForm();
    }
  }

  return (
    <div ref={pageRef} style={{ maxWidth: "1280px", margin: "0 auto", padding: "24px" }}>
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(340px, 1fr))",
          gap: "22px",
          alignItems: "start",
        }}
      >
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff",
            borderRadius: "22px",
            padding: "22px",
            border: "1px solid #e2e8f0",
            display: "grid",
            gap: "18px",
            position: "sticky",
            top: "18px",
          }}
        >
          <div>
            <p
              style={{
                margin: 0,
                color: "#78716c",
                fontSize: "12px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              Owner Catalog Control
            </p>
            <h1 style={{ margin: "6px 0 8px" }}>
              {editingProductId ? "Edit Product" : "Add Product"}
            </h1>
            <p style={{ margin: 0, color: "#64748b" }}>
              Configure garment price, allowed placements, and supported production methods.
            </p>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <label style={labelStyle}>
              Product Name
              <input
                name="name"
                value={form.name}
                onChange={updateField}
                placeholder="Pullover Hoodie"
                required
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Category
              <input
                name="category"
                value={form.category}
                onChange={updateField}
                placeholder="Hoodie / Sweater"
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Product Type
              <input
                name="product_type"
                value={form.product_type}
                onChange={updateField}
                placeholder="Pullover Hoodie"
                style={fieldStyle}
              />
            </label>

            <label style={labelStyle}>
              Brand / Model
              <input
                name="brand_model"
                value={form.brand_model}
                onChange={updateField}
                placeholder="Independent Trading Co. IND4000"
                style={fieldStyle}
              />
            </label>
          </div>

          <ProductPricingFields
            form={form}
            updateField={updateField}
            fieldStyle={fieldStyle}
            labelStyle={labelStyle}
          />

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
            <div>
              <strong style={{ display: "block", marginBottom: "4px" }}>
                Supported Production Methods
              </strong>
              <span style={{ color: "#64748b", fontSize: "13px" }}>
                These methods appear on New Order and can carry per-unit production charges.
              </span>
            </div>

            <div style={{ display: "grid", gap: "10px" }}>
              {PRODUCTION_TYPES.map((method) => {
                const checked = form.production_methods.includes(method);

                return (
                  <label
                    key={method}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "auto minmax(0, 1fr) 120px",
                      gap: "10px",
                      alignItems: "center",
                      background: "#ffffff",
                      border: "1px solid #dbe4ee",
                      borderRadius: "14px",
                      padding: "12px",
                    }}
                  >
                    <input
                      type="checkbox"
                      checked={checked}
                      onChange={() => toggleProductionMethod(method)}
                    />
                    <span style={{ fontWeight: 700 }}>{method}</span>
                    <input
                      type="number"
                      min="0"
                      step="0.01"
                      value={form.production_method_prices?.[method] || "0"}
                      onChange={(event) => updateMethodPrice(method, event.target.value)}
                      disabled={!checked}
                      placeholder="0.00"
                      style={fieldStyle}
                    />
                  </label>
                );
              })}
            </div>
          </div>

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
            <div>
              <strong style={{ display: "block", marginBottom: "4px" }}>
                Placements And Pricing
              </strong>
              <span style={{ color: "#64748b", fontSize: "13px" }}>
                Enter allowed placements, then set the price for each one.
              </span>
            </div>

            <label style={labelStyle}>
              Allowed Placements
              <textarea
                name="placementsText"
                value={form.placementsText}
                onChange={updatePlacementsText}
                placeholder="Left Chest, Full Front, Full Back, Sleeve"
                style={{ ...fieldStyle, minHeight: "88px", resize: "vertical" }}
              />
            </label>

            <div style={{ display: "grid", gap: "10px" }}>
              {placementOptions.map((placement) => (
                <label
                  key={placement}
                  style={{
                    display: "grid",
                    gridTemplateColumns: "minmax(0, 1fr) 120px",
                    gap: "10px",
                    alignItems: "center",
                    background: "#ffffff",
                    border: "1px solid #dbe4ee",
                    borderRadius: "14px",
                    padding: "12px",
                  }}
                >
                  <span style={{ fontWeight: 700 }}>{placement}</span>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={form.placementPriceMap?.[placement] || "0"}
                    onChange={(event) => updatePlacementPrice(placement, event.target.value)}
                    placeholder="0.00"
                    style={fieldStyle}
                  />
                </label>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(2, minmax(0, 1fr))",
              gap: "12px",
            }}
          >
            <label style={labelStyle}>
              Colors
              <textarea
                name="colors"
                value={form.colors}
                onChange={updateField}
                placeholder="Black, White, Navy"
                style={{ ...fieldStyle, minHeight: "84px", resize: "vertical" }}
              />
            </label>

            <label style={labelStyle}>
              Sizes
              <textarea
                name="sizes"
                value={form.sizes}
                onChange={updateField}
                placeholder="S, M, L, XL"
                style={{ ...fieldStyle, minHeight: "84px", resize: "vertical" }}
              />
            </label>
          </div>

          <div style={{ display: "grid", gap: "8px" }}>
            <label
              htmlFor="product-image-upload"
              style={{
                background: "#171717",
                color: "#ffffff",
                borderRadius: "12px",
                padding: "12px 14px",
                fontWeight: 800,
                textAlign: "center",
                cursor: "pointer",
              }}
            >
              Upload Product Image
            </label>

            <input
              id="product-image-upload"
              ref={imageInputRef}
              type="file"
              accept="image/*"
              onChange={updateImage}
              style={{ display: "none" }}
            />

            <div style={{ color: "#78716c", fontSize: "13px" }}>
              {selectedFileName || "No image selected"}
            </div>
          </div>

          {form.image ? (
            <img
              src={form.image}
              alt="Preview"
              style={{
                width: "100%",
                borderRadius: "16px",
                border: "1px solid #e2e8f0",
              }}
            />
          ) : null}

          <label style={labelStyle}>
            Notes
            <textarea
              name="notes"
              value={form.notes}
              onChange={updateField}
              placeholder="Catalog notes for staff."
              style={{ ...fieldStyle, minHeight: "96px", resize: "vertical" }}
            />
          </label>

          <label style={labelStyle}>
            Status
            <select
              name="status"
              value={form.status}
              onChange={updateField}
              style={fieldStyle}
            >
              <option>Active</option>
              <option>Inactive</option>
            </select>
          </label>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: editingProductId ? "1fr 1fr" : "1fr",
              gap: "10px",
            }}
          >
            <button
              type="submit"
              style={{
                background: "#171717",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "13px 18px",
                fontWeight: 800,
                cursor: "pointer",
              }}
            >
              {editingProductId ? "Update Product" : "Save Product"}
            </button>

            {editingProductId ? (
              <button
                type="button"
                onClick={resetForm}
                style={{
                  background: "#ffffff",
                  color: "#171717",
                  border: "1px solid #cbd5e1",
                  borderRadius: "12px",
                  padding: "13px 18px",
                  fontWeight: 800,
                  cursor: "pointer",
                }}
              >
                Cancel Edit
              </button>
            ) : null}
          </div>
        </form>

        <section style={{ display: "grid", gap: "14px" }}>
          {products.map((product) => (
            <article
              key={product.id}
              style={{
                display: "grid",
                gridTemplateColumns: "120px minmax(0, 1fr) auto",
                gap: "16px",
                border: "1px solid #e2e8f0",
                borderRadius: "20px",
                padding: "16px",
                background: "#ffffff",
              }}
            >
              <div>
                {product.image ? (
                  <img
                    src={product.image}
                    alt={product.name}
                    style={{
                      width: "120px",
                      height: "120px",
                      objectFit: "cover",
                      borderRadius: "14px",
                    }}
                  />
                ) : (
                  <div
                    style={{
                      width: "120px",
                      height: "120px",
                      borderRadius: "14px",
                      border: "1px dashed #cbd5e1",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      color: "#94a3b8",
                    }}
                  >
                    No Image
                  </div>
                )}
              </div>

              <div style={{ minWidth: 0 }}>
                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    gap: "12px",
                    flexWrap: "wrap",
                    alignItems: "flex-start",
                  }}
                >
                  <div>
                    <h2 style={{ margin: "0 0 6px" }}>{product.name}</h2>
                    <p style={{ margin: 0, color: "#64748b" }}>
                      {product.category} • {product.product_type || "General"}
                    </p>
                  </div>

                  <strong style={{ fontSize: "20px", color: "#0f172a" }}>
                    {money(product.base_garment_price)}
                  </strong>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                    marginTop: "14px",
                  }}
                >
                  <div>
                    <strong style={{ display: "block", marginBottom: "4px" }}>
                      Production Methods
                    </strong>
                    <span style={{ color: "#475569" }}>
                      {product.production_methods?.join(", ") || "None"}
                    </span>
                  </div>

                  <div>
                    <strong style={{ display: "block", marginBottom: "4px" }}>
                      Placement Pricing
                    </strong>
                    <span style={{ color: "#475569" }}>
                      {(product.placement_config || [])
                        .map((placement) => `${placement.label} ${money(placement.price)}`)
                        .join(" • ") || "No placements"}
                    </span>
                  </div>
                </div>

                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "repeat(auto-fit, minmax(180px, 1fr))",
                    gap: "10px",
                    marginTop: "14px",
                    color: "#64748b",
                  }}
                >
                  <span>Cost: {money(product.cost_price)}</span>
                  <span>Markup: {Number(product.markup_percentage || 0).toFixed(0)}%</span>
                  <span>Status: {product.status}</span>
                </div>
              </div>

              <div
                style={{
                  display: "flex",
                  gap: "8px",
                  alignItems: "flex-start",
                  flexWrap: "wrap",
                }}
              >
                <button
                  type="button"
                  onClick={() => handleEdit(product)}
                  style={{
                    border: "1px solid #cbd5e1",
                    background: "#ffffff",
                    color: "#171717",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Edit
                </button>

                <button
                  type="button"
                  onClick={() => handleDelete(product.id)}
                  style={{
                    border: "1px solid #fecaca",
                    background: "#fff1f2",
                    color: "#be123c",
                    borderRadius: "10px",
                    padding: "9px 12px",
                    fontWeight: 800,
                    cursor: "pointer",
                  }}
                >
                  Remove
                </button>
              </div>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
