import { Link } from "react-router-dom";
import { categories, garments } from "../data/garments";

export default function Home() {
  const previewCardStyle = {
    textDecoration: "none",
    background: "#ffffff",
    borderRadius: "16px",
    padding: "14px",
    border: "1px solid #e7e5e4",
    boxShadow: "0 8px 18px rgba(0,0,0,0.05)",
    color: "#171717",
    display: "block",
    width: "100%",
    boxSizing: "border-box",
    overflow: "hidden",
  };

  const previewBoxStyle = {
    width: "100%",
    aspectRatio: "1 / 1",
    background: "#fafaf9",
    borderRadius: "12px",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    marginBottom: "10px",
    padding: "10px",
    overflow: "hidden",
    minHeight: "220px",
    maxHeight: "220px",
  };

  const previewImageStyle = {
    width: "100%",
    height: "100%",
    minWidth: 0,
    minHeight: 0,
    objectFit: "contain",
    display: "block",
  };

  const previewTitleStyle = {
    margin: 0,
    fontSize: "15px",
    fontWeight: 700,
    lineHeight: 1.3,
  };

  const previewDescriptionStyle = {
    margin: "4px 0 0 0",
    fontSize: "13px",
    color: "#78716c",
    lineHeight: 1.4,
  };

  const popularGarments = [
    {
      title: "Gildan Softstyle T-Shirt",
      subtitle: "Best for everyday team, brand, and event orders.",
      image: "/garments/gildan-softstyle-tee.jpg",
      to: "/category/tshirts",
    },
    {
      title: "Heavy Blend Hoodie",
      subtitle: "A reliable fleece option for staff, schools, and merch drops.",
      image: "/garments/hoodies.PNG",
      to: "/category/hoodies",
    },
    {
      title: "Richardson 112 Hat",
      subtitle: "Structured trucker style that works well for embroidery.",
      image: "/garments/hat.PNG",
      to: "/category/hats",
    },
  ];

  const orderingSteps = [
    "Upload your artwork",
    "Approve your mockup",
    "Production begins",
    "Pickup or delivery",
  ];

  const reassuranceItems = [
    "No minimums available",
    "Bulk discounts offered",
    "Local production turnaround",
    "Mockups included before printing",
  ];

  const decorationTypes = [
    "Screen Printing",
    "Embroidery",
    "DTF Transfers",
    "Heat Press Vinyl",
  ];

  function getCategoryImage(categoryName) {
    const firstGarment = garments.find((g) => g.category === categoryName);
    return firstGarment?.image || "/garments/gildan-softstyle-tee.jpg";
  }

  function renderPreviewCard({ key, to, image, title, description }) {
    return (
      <Link key={key} to={to} className="home-preview-card" style={previewCardStyle}>
        <div className="home-preview-box" style={previewBoxStyle}>
          <img className="home-preview-image" src={image} alt={title} width="220" height="220" loading="eager" decoding="async" style={previewImageStyle} />
        </div>

        <div className="home-preview-copy">
          <h3 className="home-preview-title" style={previewTitleStyle}>{title}</h3>
          <p className="home-preview-description" style={previewDescriptionStyle}>{description}</p>
        </div>
      </Link>
    );
  }

  return (
    <div className="home-page" style={{ margin: "0 auto", padding: "12px 14px 26px", fontFamily: 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
      <div className="home-main-content" style={{ maxWidth: "1360px", margin: "0 auto" }}>
        <div className="home-top-cta" style={{ background: "#ffffff", borderRadius: "16px", padding: "18px", border: "1px solid #e7e5e4", boxShadow: "0 8px 18px rgba(0,0,0,0.05)" }}>
          <p style={{ margin: "0 0 6px 0", fontSize: "12px", fontWeight: 700, letterSpacing: "0.08em", color: "#78716c", textTransform: "uppercase" }}>Custom Apparel Made Simple</p>
          <h2 style={{ margin: "0 0 6px 0", fontSize: "24px", letterSpacing: "-0.02em" }}>Start Your Custom Order</h2>
          <p style={{ margin: "0 0 14px 0", fontSize: "14px", color: "#78716c", lineHeight: 1.45 }}>Upload artwork, choose garments, and request a quote in minutes.</p>
          <Link to="/category/tshirts" style={{ display: "inline-flex", alignItems: "center", justifyContent: "center", minHeight: "42px", padding: "0 16px", borderRadius: "12px", background: "#171717", color: "#ffffff", textDecoration: "none", fontSize: "14px", fontWeight: 700 }}>Start Order</Link>
        </div>
      </div>
    </div>
  );
}
