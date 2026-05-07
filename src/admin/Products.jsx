import { useEffect, useState } from "react";
import {
  createStoredProduct,
  deleteStoredProduct,
  getStoredProducts,
} from "../lib/productsStore";
import { calculateBaseSellPrice } from "../products/productPricingIntegration";

const fieldStyle = {
  border: "1px solid #cbd5e1",
  borderRadius: "12px",
  padding: "12px 14px",
  fontSize: "15px",
  width: "100%",
  boxSizing: "border-box",
};

const emptyProduct = {
  name: "",
  category: "T-Shirt",
  image: "",
  cost_price: "0",
  markup_percentage: "0",
  decoration_type: "Screen Printing",
  status: "Active",
};

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function Products() {
  const [products, setProducts] = useState([]);
  const [form, setForm] = useState(emptyProduct);

  useEffect(() => {
    setProducts(getStoredProducts());
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setForm((current) => ({ ...current, [name]: value }));
  }

  async function updateImage(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const image = await fileToDataUrl(file);
    setForm((current) => ({ ...current, image }));
  }

  function handleSubmit(event) {
    event.preventDefault();

    const product = {
      ...form,
      calculated_base_price: calculateBaseSellPrice(
        form.cost_price,
        form.markup_percentage
      ),
    };

    createStoredProduct(product);
    setProducts(getStoredProducts());
    setForm(emptyProduct);
  }

  function handleDelete(productId) {
    deleteStoredProduct(productId);
    setProducts(getStoredProducts());
  }

  return (
    <div style={{ maxWidth: "1180px", margin: "0 auto", padding: "24px" }}>
      <div style={{ display: "grid", gridTemplateColumns: "400px 1fr", gap: "22px" }}>
        <form
          onSubmit={handleSubmit}
          style={{
            background: "#ffffff",
            borderRadius: "20px",
            padding: "22px",
          }}
        >
          <h1>Add Product</h1>

          <div style={{ display: "grid", gap: "14px" }}>
            <input
              name="name"
              value={form.name}
              onChange={updateField}
              placeholder="Product Name"
              style={fieldStyle}
            />

            <select
              name="decoration_type"
              value={form.decoration_type}
              onChange={updateField}
              style={fieldStyle}
            >
              <option>Screen Printing</option>
              <option>DTF</option>
            </select>

            <input
              name="cost_price"
              value={form.cost_price}
              onChange={updateField}
              placeholder="Cost"
              style={fieldStyle}
            />

            <input
              name="markup_percentage"
              value={form.markup_percentage}
              onChange={updateField}
              placeholder="Markup %"
              style={fieldStyle}
            />

            <div
              style={{
                padding: "14px",
                borderRadius: "14px",
                background: "#f8fafc",
                border: "1px solid #e2e8f0",
                fontWeight: 700,
              }}
            >
              Base Sell Price: $
              {calculateBaseSellPrice(
                form.cost_price,
                form.markup_percentage
              ).toFixed(2)}
            </div>

            <input type="file" accept="image/*" onChange={updateImage} />

            {form.image && (
              <img
                src={form.image}
                alt="Preview"
                style={{
                  width: "100%",
                  borderRadius: "14px",
                  border: "1px solid #e2e8f0",
                }}
              />
            )}

            <button
              type="submit"
              style={{
                background: "#171717",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "13px 18px",
                fontWeight: 700,
              }}
            >
              Save Product
            </button>
          </div>
        </form>

        <section style={{ display: "grid", gap: "14px" }}>
          {products.map((product) => (
            <article
              key={product.id}
              style={{
                display: "grid",
                gridTemplateColumns: "120px 1fr auto",
                gap: "14px",
                border: "1px solid #e2e8f0",
                borderRadius: "18px",
                padding: "14px",
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
                      borderRadius: "12px",
                    }}
                  />
                ) : (
                  "No Image"
                )}
              </div>

              <div>
                <h2>{product.name}</h2>
                <p>{product.decoration_type}</p>
                <p>
                  Cost: ${Number(product.cost_price || 0).toFixed(2)}
                </p>
                <p>
                  Markup: {Number(product.markup_percentage || 0).toFixed(0)}%
                </p>
                <strong>
                  Base Sell Price: $
                  {Number(product.calculated_base_price || 0).toFixed(2)}
                </strong>
              </div>

              <button
                type="button"
                onClick={() => handleDelete(product.id)}
              >
                Remove
              </button>
            </article>
          ))}
        </section>
      </div>
    </div>
  );
}
