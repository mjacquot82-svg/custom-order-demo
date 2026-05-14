import { useEffect, useState } from "react";
import { Link, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useStoredOrders } from "../lib/ordersStore";
import { isActiveOperationalStatus } from "../orders/orderWorkflow";
import {
  canAccessOwnerWorkspace,
  getAdminViewer,
  getAssignedOrdersForStaff,
  getOperationalOrdersForStaff,
  hasOperationalSession,
  isAdminWorkspaceView,
  isStaffWorkspaceView,
} from "../admin/adminRoleView";
import {
  clearActiveStaffSession,
  getActiveStaffUser,
  subscribeToActiveStaffUser,
} from "../lib/staffUsersStore";
import { getUserInitials } from "../utils/getUserInitials";

const ADMIN_LOGO_SRC = "/tee&co512x512.png";
const FACEBOOK_URL =
  "https://www.facebook.com/p/Tee-Co-Ltd-100078145951464/";
const INSTAGRAM_URL = "https://www.instagram.com/teeandcodesigns/";

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

function getSidebarCounts({ operationalOrders = [], assignedOrders = [], staffWorkspace = false } = {}) {
  const activeOperationalOrders = operationalOrders.filter(
    (order) =>
      order.operational_visible !== false && isActiveOperationalStatus(order.status)
  );
  const activeAssignedOrders = assignedOrders.filter(
    (order) =>
      order.operational_visible !== false && isActiveOperationalStatus(order.status)
  );

  return {
    productionOrders: activeOperationalOrders.length,
    assignments: staffWorkspace
      ? activeAssignedOrders.length
      : activeOperationalOrders.filter(
          (order) =>
            order.needs_assignment || !order.assigned_to_staff_id
        ).length,
  };
}

function getAdminSections(staffUser) {
  if (!isAdminWorkspaceView(staffUser)) {
    return [
      {
        title: "My Work",
        links: [
          { to: "/admin", label: "My Dashboard", navKey: "dashboard" },
          {
            to: "/admin/assignments",
            label: "My Assigned Work",
            navKey: "assignments",
            badgeKey: "assignments",
          },
        ],
      },
      {
        title: "Front Counter",
        links: [
          { to: "/admin/sales/new", label: "Front Counter", navKey: "frontCounter" },
          { to: "/admin/sales", label: "Counter Sales", navKey: "counterSales" },
          { to: "/admin/quotes", label: "Quote Intake", navKey: "quotes" },
          { to: "/admin/customers", label: "Customer Lookup", navKey: "customers" },
        ],
      },
      {
        title: "Shop Production",
        links: [
          {
            to: "/admin/orders",
            label: "Shop Production Queue",
            navKey: "productionOrders",
            badgeKey: "productionOrders",
          },
        ],
      },
    ];
  }

  const canManageCatalog = true;

  return [
    {
      title: "Actions",
      links: [
        { to: "/admin/quotes/new", label: "New Quote", navKey: "newQuote" },
        { to: "/admin/sales/new", label: "Front Counter", navKey: "frontCounter" },
      ],
    },
    {
      title: "Management",
      links: [
        { to: "/admin", label: "Dashboard", navKey: "dashboard" },
        { to: "/admin/staff-users", label: "Manage Staff", navKey: "staffUsers" },
      ],
    },
    {
      title: "Front Counter",
      links: [
        { to: "/admin/sales", label: "Counter Sales", navKey: "counterSales" },
        { to: "/admin/quotes", label: "Quote Intake", navKey: "quotes" },
        { to: "/admin/customers", label: "Customer Lookup", navKey: "customers" },
      ],
    },
    {
      title: "Production",
      links: [
        {
          to: "/admin/orders",
          label: "Production Orders",
          navKey: "productionOrders",
          badgeKey: "productionOrders",
        },
        {
          to: "/admin/assignments",
          label: "Assignments",
          navKey: "assignments",
          badgeKey: "assignments",
        },
      ],
    },
    {
      title: "Financial",
      links: [
        {
          to: "/admin/financial",
          label: "Invoices & Payments",
          navKey: "financial",
        },
      ],
    },
    {
      title: "Records",
      links: [
        ...(canManageCatalog
          ? [{ to: "/admin/products", label: "Products", navKey: "products" }]
          : []),
        {
          to: "/admin/quotes/archived",
          label: "Archived Quotes",
          navKey: "archivedQuotes",
        },
        {
          to: "/admin/records/canceled",
          label: "Canceled Orders",
          navKey: "canceledOrders",
        },
      ],
    },
  ];
}

function getActiveSidebarLink(pathname) {
  if (pathname.startsWith("/admin/assignments")) return "assignments";
  if (pathname.startsWith("/admin/products")) return "products";
  if (pathname.startsWith("/admin/customers")) return "customers";
  if (pathname.startsWith("/admin/staff-users")) return "staffUsers";
  if (pathname === "/admin/records/canceled") return "canceledOrders";
  if (pathname === "/admin/quotes/archived") return "archivedQuotes";
  if (pathname === "/admin/quotes") return "quotes";
  if (pathname.startsWith("/admin/quotes/")) return pathname === "/admin/quotes/new" ? "newQuote" : "quotes";
  if (pathname === "/admin/financial") return "financial";
  if (pathname === "/admin/sales") return "counterSales";
  if (pathname === "/admin/sales/new") return "frontCounter";
  if (pathname.startsWith("/admin/sales/receipt/")) return "counterSales";
  if (pathname === "/admin/orders") return "productionOrders";
  if (pathname.startsWith("/admin/orders/")) return "productionOrders";
  if (pathname === "/admin") return "dashboard";
  return "";
}

function AttentionBadge({ count, active = false }) {
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
        background: active ? "rgba(255,255,255,0.16)" : "#fff7ed",
        color: active ? "#ffffff" : "#c2410c",
        border: active ? "1px solid rgba(255,255,255,0.2)" : "1px solid #fed7aa",
        fontSize: "12px",
        fontWeight: 900,
      }}
    >
      {count}
    </span>
  );
}

function SocialLinks({ compact = false }) {
  const linkStyle = compact
    ? {
        display: "inline-flex",
        alignItems: "center",
        justifyContent: "center",
        width: "38px",
        height: "38px",
        borderRadius: "999px",
        border: "1px solid #dbe4ee",
        color: "#171717",
        background: "#ffffff",
      }
    : {
        display: "inline-flex",
        alignItems: "center",
        gap: "8px",
        padding: "10px 12px",
        borderRadius: "12px",
        border: "1px solid #dbe4ee",
        color: "#171717",
        background: "#ffffff",
        textDecoration: "none",
        fontWeight: 700,
      };

  return (
    <div style={{ display: "flex", gap: "10px", flexWrap: "wrap" }}>
      <a href={FACEBOOK_URL} target="_blank" rel="noreferrer" style={linkStyle}>
        <FacebookIcon />
        {compact ? null : <span>Facebook</span>}
      </a>

      <a href={INSTAGRAM_URL} target="_blank" rel="noreferrer" style={linkStyle}>
        <InstagramIcon />
        {compact ? null : <span>Instagram</span>}
      </a>
    </div>
  );
}

function AdminSidebar({ pathname, staffUser }) {
  const orders = useStoredOrders();
  const staffWorkspace = isStaffWorkspaceView(staffUser);
  const operationalOrders = isAdminWorkspaceView(staffUser)
    ? orders
    : getOperationalOrdersForStaff(orders);
  const assignedOrders = isAdminWorkspaceView(staffUser)
    ? orders
    : getAssignedOrdersForStaff(orders, staffUser);
  const badgeCounts = getSidebarCounts({
    operationalOrders,
    assignedOrders,
    staffWorkspace,
  });
  const activeLink = getActiveSidebarLink(pathname);
  const adminSections = getAdminSections(staffUser);
  const workspaceLabel = staffWorkspace
    ? "Staff Operations"
    : "Central Operations";

  return (
    <aside
      style={{
        width: "250px",
        minWidth: "250px",
        maxWidth: "250px",
        flexShrink: 0,
        display: "flex",
        flexDirection: "column",
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
            className="tee-co-logo"
            src={ADMIN_LOGO_SRC}
            alt="Tee & Co"
            width="54"
            height="54"
            loading="eager"
            decoding="sync"
            fetchPriority="high"
            style={{
              width: "100%",
              height: "100%",
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
            {workspaceLabel}
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
              const active = activeLink === (link.navKey || link.to);
              const navItemStyle = {
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: active ? "12px 13px" : "11px 12px",
                borderRadius: "14px",
                background: active
                  ? "linear-gradient(135deg, #0f172a 0%, #1e293b 100%)"
                  : "#ffffff",
                color: active ? "#ffffff" : "#171717",
                textDecoration: "none",
                border: active
                  ? "1px solid #0f172a"
                  : "1px solid #e2e8f0",
                fontWeight: active ? 800 : 700,
                boxShadow: active
                  ? "inset 0 1px 0 rgba(255,255,255,0.08), 0 12px 28px rgba(15, 23, 42, 0.16)"
                  : "none",
                cursor: active ? "default" : "pointer",
                pointerEvents: active ? "none" : "auto",
              };

              const content = (
                <>
                  <span>{link.label}</span>
                  <AttentionBadge
                    count={badgeCounts[link.badgeKey]}
                    active={active}
                  />
                </>
              );

              if (active) {
                return (
                  <div
                    key={link.to}
                    aria-current="page"
                    style={navItemStyle}
                  >
                    {content}
                  </div>
                );
              }

              return (
                <Link key={link.to} to={link.to} style={navItemStyle}>
                  {content}
                </Link>
              );
            })}
          </div>
        </div>
      ))}

      <div
        style={{
          marginTop: "auto",
          paddingTop: "18px",
          borderTop: "1px solid #e2e8f0",
          display: "grid",
          gap: "10px",
        }}
      >
        <p
          style={{
            margin: 0,
            fontSize: "11px",
            fontWeight: 900,
            color: "#78716c",
            textTransform: "uppercase",
            letterSpacing: "0.08em",
          }}
        >
          Tee & Co Social
        </p>

        <SocialLinks />
      </div>
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
              minWidth: "56px",
              minHeight: "56px",
              maxWidth: "56px",
              maxHeight: "56px",
              overflow: "hidden",
              borderRadius: "999px",
              flexShrink: 0,
            }}
          >
            <img
              className="tee-co-logo"
              src={ADMIN_LOGO_SRC}
              alt="Tee & Co"
              width="56"
              height="56"
              loading="eager"
              decoding="sync"
              fetchPriority="high"
              style={{
                width: "100%",
                height: "100%",
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
              Made local, worn proud
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
          <SocialLinks compact />

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

function AdminWorkspaceHeader({ staffUser }) {
  const navigate = useNavigate();
  const viewer = getAdminViewer(staffUser);
  const initials = getUserInitials(viewer?.name);
  const displayName = viewer?.name || "Operations";
  const displayRole = viewer?.role || "Workspace";
  const isStaffWorkspace = isStaffWorkspaceView(staffUser);
  const workspaceLabel = isStaffWorkspace
    ? "Operational Workspace"
    : "Owner Management Workspace";

  function handleLogout() {
    clearActiveStaffSession();
    navigate("/login", { replace: true });
  }

  return (
    <header
      style={{
        display: "flex",
        justifyContent: "flex-end",
        padding: "18px 24px 0",
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          display: "flex",
          justifyContent: "flex-end",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "flex-end",
            gap: "12px",
            flexWrap: "wrap",
            background: "#ffffff",
            border: "1px solid #e2e8f0",
            borderRadius: "16px",
            padding: "10px 12px",
            boxShadow: "0 1px 3px rgba(0,0,0,0.08)",
            maxWidth: "100%",
          }}
        >
          <div
            aria-hidden="true"
            style={{
              width: "42px",
              height: "42px",
              borderRadius: "999px",
              background: "#171717",
              color: "#ffffff",
              display: "inline-flex",
              alignItems: "center",
              justifyContent: "center",
              fontWeight: 900,
              fontSize: "14px",
              flexShrink: 0,
            }}
          >
            {initials}
          </div>

          <div style={{ minWidth: 0 }}>
            <p
              style={{
                margin: "0 0 4px",
                color: "#64748b",
                fontSize: "11px",
                fontWeight: 900,
                letterSpacing: "0.08em",
                textTransform: "uppercase",
              }}
            >
              {workspaceLabel}
            </p>
            <p
              style={{
                margin: 0,
                color: "#171717",
                fontWeight: 800,
                lineHeight: 1.2,
                wordBreak: "break-word",
              }}
            >
              {displayName}
            </p>

            <p
              style={{
                margin: "3px 0 0",
                color: "#64748b",
                fontSize: "13px",
                fontWeight: 700,
                lineHeight: 1.2,
              }}
            >
              ({displayRole})
            </p>
          </div>

          {staffUser ? (
            <button
              type="button"
              onClick={handleLogout}
              style={{
                background: "#171717",
                color: "#ffffff",
                border: "none",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 800,
                cursor: "pointer",
                flexShrink: 0,
              }}
            >
              Logout
            </button>
          ) : (
            <Link
              to="/login"
              style={{
                background: "#fafaf9",
                color: "#171717",
                border: "1px solid #d6d3d1",
                borderRadius: "12px",
                padding: "10px 14px",
                fontWeight: 800,
                textDecoration: "none",
                flexShrink: 0,
              }}
            >
              Login
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}

export default function Layout() {
  const location = useLocation();
  const navigate = useNavigate();
  const isAdmin = location.pathname.startsWith("/admin");
  const [activeStaffUser, setActiveStaffUser] = useState(() => getActiveStaffUser());

  useEffect(() => {
    function syncActiveStaffUser(nextStaffUser = getActiveStaffUser()) {
      setActiveStaffUser(nextStaffUser);
    }

    syncActiveStaffUser();

    return subscribeToActiveStaffUser((nextStaffUser) => {
      syncActiveStaffUser(nextStaffUser);
    });
  }, []);

  useEffect(() => {
    if (!isAdmin) return;
    if (!hasOperationalSession(activeStaffUser)) {
      navigate("/login", { replace: true });
      return;
    }
    if (canAccessOwnerWorkspace(location.pathname, activeStaffUser)) return;
    navigate("/admin", { replace: true });
  }, [activeStaffUser, isAdmin, location.pathname, navigate]);

  const visibleStaffUser = isAdmin ? activeStaffUser : null;

  if (isAdmin && !visibleStaffUser) {
    return null;
  }

  return (
    <div>
      {isAdmin ? (
        <div style={{ display: "flex", alignItems: "flex-start" }}>
          <AdminSidebar
            pathname={location.pathname}
            search={location.search}
            staffUser={visibleStaffUser}
          />

          <div style={{ flex: 1, minWidth: 0 }}>
            <AdminWorkspaceHeader staffUser={visibleStaffUser} />

            <main style={{ minWidth: 0 }}>
              <Outlet />
            </main>
          </div>
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
