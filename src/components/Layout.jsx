import { Link, Navigate, Outlet, useLocation } from "react-router-dom";
import logo from "../assets/icon-512.png";
import { useStoredOrders } from "../lib/ordersStore";
import { getActiveStaffUser } from "../lib/staffUsersStore";

function FacebookIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      style={{ width: "18px", height: "18px", fill: "currentColor" }}
    >
      <path d="M13.5 22v-8.2h2.8l.4-3.2h-3.2V8.56c0-.93.26-1.56 1.6-1.56H16.8V4.14c-.3-.04-1.34-.14-2.56-.14-2.54 0-4.28 1.55-4.28 4.28v2.2H7.08v3.2h2.88V22h3.54Z" />
    </svg>
  );
}

function InstagramIcon() {
  return (
    <svg
      aria-hidden="true"
      viewBox="0 0 24 24"
      style={{ width: "18px", height: "18px", fill: "currentColor" }}
    >
      <path d="M7 2h10a5 5 0 0 1 5 5v10a5 5 0 0 1-5 5H7a5 5 0 0 1-5-5V7a5 5 0 0 1 5-5Zm0 2.2A2.8 2.8 0 0 0 4.2 7v10A2.8 2.8 0 0 0 7 19.8h10a2.8 2.8 0 0 0 2.8-2.8V7A2.8 2.8 0 0 0 17 4.2H7Zm10.55 1.65a.8.8 0 1 1 0 1.6.8.8 0 0 1 0-1.6ZM12 7a5 5 0 1 1 0 10 5 5 0 0 1 0-10Zm0 2.2A2.8 2.8 0 1 0 12 14.8 2.8 2.8 0 0 0 12 9.2Z" />
    </svg>
  );
}

function getSidebarCounts(orders = []) {
  return {
    productionOrders: orders.length,
    productionQueue: orders.filter((order) => order.production_ready).length,
    assignments: orders.filter(
      (order) =>
        order.needs_assignment || !order.assigned_to_staff_id
    ).length,
  };
}

function getAdminSections(role) {
  const isOwner = role === "Owner";

  return [
    {
      title: "Overview",
      links: [
        { to: "/admin", label: "Dashboard" },
        ...(isOwner
          ? [{ to: "/admin/staff-users", label: "Manage Staff" }]
          : []),
      ],
    },
    {
      title: "Production",
      links: [
        {
          to: "/admin/orders",
          label: "Production Orders",
          badgeKey: "productionOrders",
        },
        {
          to: "/admin/queue",
          label: "Production Queue",
          badgeKey: "productionQueue",
        },
        {
          to: "/admin/assignments",
          label: "Assignments",
          badgeKey: "assignments",
        },
      ],
    },
    {
      title: "Records",
      links: [
        { to: "/admin/customers", label: "Customers" },
        ...(isOwner
          ? [{ to: "/admin/products", label: "Products" }]
          : []),
      ],
    },
  ];
}

function getActiveSidebarLink(pathname) {
  if (pathname.startsWith("/admin/assignments")) return "/admin/assignments";
  if (pathname.startsWith("/admin/orders")) return "/admin/orders";
  if (pathname.startsWith("/admin/queue")) return "/admin/queue";
  if (pathname.startsWith("/admin/products")) return "/admin/products";
  if (pathname.startsWith("/admin/staff-users")) return "/admin/staff-users";
  if (pathname === "/admin") return "/admin";
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
  const orders = useStoredOrders();
  const badgeCounts = getSidebarCounts(orders);
  const activeLink = getActiveSidebarLink(pathname);
  const role = staffUser?.role || "Staff";
  const adminSections = getAdminSections(role);

  return (
    <aside
      style={{
        width: "250px",
        minWidth: "250px",
        maxWidth: "250px",
        flexShrink: 0,
        overflow: "hidden",
        minHeight: "100vh",
        background: "#ffffff",
        borderRight: "1px solid #e2e8f0",
        padding: "18px 14px",
        boxSizing: "border-box",
        position: "sticky",
        top: 0,
        alignSelf: "flex-start",
      }}
    >
      <Link
        to="/admin"
        style={{
          display: "flex",
          alignItems: "center",
          gap: "12px",
          textDecoration: "none",
          color: "#171717",
          marginBottom: "24px",
          minHeight: "56px",
        }}
      >
        <div
          style={{
            width: "54px",
            height: "54px",
            minWidth: "54px",
            minHeight: "54px",
            maxWidth: "54px",
            maxHeight: "54px",
            overflow: "hidden",
            borderRadius: "12px",
            flexShrink: 0,
          }}
        >
          <img
            src={logo}
            alt="Tee & Co"
            width="54"
            height="54"
            style={{
              width: "54px",
              height: "54px",
              objectFit: "contain",
              display: "block",
            }}
          />
        </div>

        <div style={{ overflow: "hidden" }}>
          <strong
            style={{
              display: "block",
              fontSize: "19px",
              lineHeight: 1.1,
            }}
          >
            Tee & Co
          </strong>

          <span
            style={{
              color: "#64748b",
              fontSize: "12px",
              whiteSpace: "nowrap",
            }}
          >
            Central Operations
          </span>
        </div>
      </Link>

      {adminSections.map((section) => (
        <div key={section.title} style={{ marginBottom: "18px" }}>
          <p
            style={{
              margin: "0 0 8px",
              fontSize: "11px",
              fontWeight: 900,
              color: "#78716c",
              textTransform: "uppercase",
              letterSpacing: "0.08em",
            }}
          >
            {section.title}
          </p>

          <div style={{ display: "grid", gap: "6px" }}>
            {section.links.map((link) => {
              const active = activeLink === link.to;

              return (
                <Link
                  key={link.to}
                  to={link.to}
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    padding: "11px 12px",
                    borderRadius: "12px",
                    background: active ? "#171717" : "#ffffff",
                    color: active ? "#ffffff" : "#171717",
                    textDecoration: "none",
                    border: active
                      ? "1px solid #171717"
                      : "1px solid #e2e8f0",
                    fontWeight: 700,
                  }}
                >
                  <span>{link.label}</span>

                  <AttentionBadge
                    count={badgeCounts[link.badgeKey]}
                  />
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </aside>
  );
}

function PublicHeader() {
  return (
    <header
      style={{
        borderBottom: "1px solid #e2e8f0",
        background: "#ffffff",
        position: "sticky",
        top: 0,
        zIndex: 50,
        minHeight: "84px",
      }}
    >
      <div
        style={{
          maxWidth: "1280px",
          margin: "0 auto",
          padding: "14px 24px",
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          gap: "16px",
          minHeight: "84px",
          boxSizing: "border-box",
        }}
      >
        <Link
          to="/"
          style={{
            display: "flex",
            alignItems: "center",
            gap: "14px",
            textDecoration: "none",
            color: "#171717",
            minWidth: 0,
          }}
        >
          <div
            style={{
              width: "56px",
              height: "56px",
              overflow: "hidden",
              borderRadius: "999px",
              flexShrink: 0,
            }}
          >
            <img
              src={logo}
              alt="Tee & Co"
              width="56"
              height="56"
              loading="eager"
              decoding="sync"
              style={{
                width: "56px",
                height: "56px",
                objectFit: "contain",
                display: "block",
              }}
            />
          </div>

          <div>
            <strong
              style={{
                fontSize: "24px",
                display: "block",
              }}
            >
              Tee & Co Ltd.
            </strong>

            <span
              style={{
                color: "#64748b",
                fontSize: "14px",
              }}
            >
              Custom Apparel & Production
            </span>
          </div>
        </Link>

        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "18px",
            flexShrink: 0,
          }}
        >
          <div style={{ display: "flex", gap: "12px" }}>
            <a
              href="https://facebook.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#171717" }}
            >
              <FacebookIcon />
            </a>

            <a
              href="https://instagram.com"
              target="_blank"
              rel="noreferrer"
              style={{ color: "#171717" }}
            >
              <InstagramIcon />
            </a>
          </div>

          <Link
            to="/login"
            style={{
              background: "#171717",
              color: "#ffffff",
              padding: "11px 18px",
              borderRadius: "12px",
              textDecoration: "none",
              fontWeight: 800,
            }}
          >
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
  const activeStaffUser = isAdmin
    ? getActiveStaffUser()
    : null;
  const isOwner = activeStaffUser?.role === "Owner";
  const isOwnerOnlyRoute =
    location.pathname.startsWith("/admin/staff-users") ||
    location.pathname.startsWith("/admin/products");

  if (isAdmin && !activeStaffUser) {
    return <Navigate to="/login" replace />;
  }

  if (isAdmin && isOwnerOnlyRoute && !isOwner) {
    return <Navigate to="/admin" replace />;
  }

  return (
    <div>
      {isAdmin ? (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <AdminSidebar
            pathname={location.pathname}
            staffUser={activeStaffUser}
          />

          <main style={{ flex: 1, minWidth: 0 }}>
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
