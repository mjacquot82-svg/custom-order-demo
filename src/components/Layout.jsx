import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import logo from "../assets/icon-512.png";
import { getStoredOrders } from "../lib/ordersStore";
import { getActiveStaffUser, setActiveStaffUser } from "../lib/staffUsersStore";

function FacebookIcon() {
  return (
    <svg aria-hidden="true" viewBox="0 0 24 24" style={{ width: "18px", height: "18px", fill: "currentColor" }}>
      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.56c0-.93.26-1.56 1.6-1.56H16.8V4.14c-.3-.04-1.34-.14-2.56-.14-2.54 0-4.28 1.55-4.28 4.28v2.2H7.08v3.2h2.88V22h3.54Z" />
    </svg>
  );
}

function InstagramIcon() {
  return null;
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
    <span
      style={{
        minWidth: "22px",
        height: "22px",
        padding: "0 7px",
        borderRadius: "999px",
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        background: "#fff7ed",
        color: "#c2410c",
        border: "1px solid #fed7aa",
        fontSize: "12px",
        fontWeight: 900,
      }}
    >
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
              <Link
                key={link.to}
                to={link.to}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "10px",
                  background: active ? "#171717" : "#ffffff",
                  color: active ? "#ffffff" : "#171717",
                  textDecoration: "none",
                }}
              >
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
        <main>
          <Outlet />
        </main>
      )}
    </div>
  );
}
