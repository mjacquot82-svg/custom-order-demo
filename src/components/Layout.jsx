import { Link, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/icon-512.png";
import { getStoredOrders } from "../lib/ordersStore";
import { getActiveStaffUser } from "../lib/staffUsersStore";

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.56c0-.93.26-1.56 1.6-1.56H16.8V4.14c-.3-.04-1.34-.14-2.56-.14-2.54 0-4.28 1.55-4.28 4.28v2.2H7.08v3.2h2.88V22h3.54Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Zm10.55 1.65a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2Z" />
    </svg>
  );
}

function normalizeStatus(value) {
  return String(value || "").trim().toLowerCase();
}

function getSidebarCounts() {
  const orders = getStoredOrders();

  return {
    productionOrders: orders.length,
    productionQueue: orders.filter((order) => order.production_ready).length,
    assignments: orders.filter((order) => order.needs_assignment || !order.assigned_to_staff_id).length,
  };
}

function getAdminSections(role) {
  const isOwner = role === "Owner";

  return [
    {
      title: "Production",
      links: [
        { to: "/admin/orders", label: "Production Orders", badgeKey: "productionOrders" },
        { to: "/admin/queue", label: "Production Queue", badgeKey: "productionQueue" },
        { to: "/admin/assignments", label: "Assignments", badgeKey: "assignments" },
      ],
    },
    {
      title: "Records",
      links: [
        { to: "/admin/customers", label: "Customers" },
        ...(isOwner ? [{ to: "/admin/products", label: "Products" }] : []),
      ],
    },
  ];
}

function getActiveSidebarLink(pathname) {
  if (pathname.startsWith("/admin/assignments")) return "/admin/assignments";
  if (pathname.startsWith("/admin/orders")) return "/admin/orders";
  if (pathname.startsWith("/admin/queue")) return "/admin/queue";
  if (pathname.startsWith("/admin/products")) return "/admin/products";
  return "";
}

function AttentionBadge({ count }) {
  if (!count) return null;

  return (
    <span style={{ minWidth: "22px", height: "22px", padding: "0 7px", borderRadius: "999px", display: "inline-flex", alignItems: "center", justifyContent: "center", background: "#fff7ed", color: "#c2410c", border: "1px solid #fed7aa", fontSize: "12px", fontWeight: 900 }}>
      {count}
    </span>
  );
}

function AdminSidebar({ pathname, staffUser }) {
  const badgeCounts = getSidebarCounts();
  const activeLink = getActiveSidebarLink(pathname);
  const role = staffUser?.role || "Staff";
  const adminSections = getAdminSections(role);

  return (
    <aside style={{ width: "245px" }}>
      {adminSections.map((section) => (
        <div key={section.title}>
          {section.links.map((link) => {
            const active = activeLink === link.to;
            return (
              <Link key={link.to} to={link.to} style={{ display: "flex", justifyContent: "space-between", padding: "10px", background: active ? "#171717" : "#ffffff", color: active ? "#ffffff" : "#171717", textDecoration: "none" }}>
                <span>{link.label}</span>
                <AttentionBadge count={badgeCounts[link.badgeKey]} />
              </Link>
            );
          })}
        </div>
      ))}
    </aside>
  );
}

function PublicHeader() {
  return (
    <header style={{ borderBottom: "1px solid #e2e8f0", background: "#ffffff", position: "sticky", top: 0, zIndex: 50 }}>
      <div style={{ maxWidth: "1280px", margin: "0 auto", padding: "14px 24px", display: "flex", justifyContent: "space-between", alignItems: "center", gap: "16px" }}>
        <Link to="/" style={{ display: "flex", alignItems: "center", gap: "14px", textDecoration: "none", color: "#171717" }}>
          <img src={logo} alt="Tee & Co" style={{ width: "56px", height: "56px", objectFit: "contain" }} />
          <div>
            <strong style={{ fontSize: "24px", display: "block" }}>Tee & Co Ltd.</strong>
            <span style={{ color: "#64748b", fontSize: "14px" }}>Custom Apparel & Production</span>
          </div>
        </Link>

        <div style={{ display: "flex", alignItems: "center", gap: "18px" }}>
          <div style={{ display: "flex", gap: "12px" }}>
            <a href="https://facebook.com" target="_blank" rel="noreferrer" style={{ color: "#171717" }}>
              <FacebookIcon />
            </a>
            <a href="https://instagram.com" target="_blank" rel="noreferrer" style={{ color: "#171717" }}>
              <InstagramIcon />
            </a>
          </div>

          <Link to="/login" style={{ background: "#171717", color: "#ffffff", padding: "11px 18px", borderRadius: "12px", textDecoration: "none", fontWeight: 800 }}>
            Login
          </Link>
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const location = useLocation();
  const isAdmin = location.pathname.startsWith("/admin");
  const activeStaffUser = isAdmin ? getActiveStaffUser() : null;

  return (
    <div>
      {isAdmin ? (
        <div style={{ display: "flex", gap: "18px" }}>
          <AdminSidebar pathname={location.pathname} staffUser={activeStaffUser} />
          <main style={{ flex: 1 }}>
            <Outlet />
          </main>
        </div>
      ) : (
        <>
          <PublicHeader />
          <main>
            <Outlet />
          </main>
        </>
      )}
    </div>
  );
}
