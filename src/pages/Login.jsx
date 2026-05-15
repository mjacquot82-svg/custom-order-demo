import { Link, useNavigate } from "react-router-dom";
import { useEffect, useState } from "react";
import {
  attemptTemporaryOwnerLogin,
  attemptStaffLogin,
  getActiveOperationalStaffUsers,
  subscribeToStaffUsers,
  TEMP_OWNER_DEMO_CREDENTIALS,
} from "../lib/staffUsersStore";
import { pushAuthDiagnostic } from "../lib/authDiagnostics";
import { clearAllAuthSessions } from "../lib/authSessionStore";
import { setActiveCustomerSession } from "../lib/customerSessionStore";

const inputStyle = {
  width: "100%",
  padding: "14px 16px",
  borderRadius: "14px",
  border: "1px solid #d6d3d1",
  fontSize: "15px",
  outline: "none",
  boxSizing: "border-box",
};

const labelStyle = {
  display: "block",
  marginBottom: "8px",
  fontWeight: "600",
  color: "#292524",
};

const sectionEyebrowStyle = {
  margin: 0,
  fontSize: "12px",
  letterSpacing: "0.08em",
  textTransform: "uppercase",
  color: "#78716c",
};

const primaryButtonStyle = {
  width: "100%",
  background: "#171717",
  color: "#ffffff",
  border: "none",
  borderRadius: "14px",
  padding: "14px 18px",
  fontWeight: "700",
  fontSize: "15px",
  cursor: "pointer",
  boxShadow: "0 10px 20px rgba(0,0,0,0.10)",
};

export default function Login() {
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showStaffLogin, setShowStaffLogin] = useState(false);
  const [ownerLoginId, setOwnerLoginId] = useState(TEMP_OWNER_DEMO_CREDENTIALS.loginId);
  const [ownerPin, setOwnerPin] = useState("");
  const [ownerError, setOwnerError] = useState("");
  const [staffUsers, setStaffUsers] = useState(() => getActiveOperationalStaffUsers());
  const [selectedStaffId, setSelectedStaffId] = useState(staffUsers[0]?.id || "");
  const [pin, setPin] = useState("");
  const [pinError, setPinError] = useState("");
  const [customerError, setCustomerError] = useState("");

  useEffect(() => {
    function syncStaffUsers(nextUsers) {
      const activeUsers = nextUsers.filter(
        (user) => user.status !== "Inactive" && user.role !== "Owner"
      );
      setStaffUsers(activeUsers);
      setSelectedStaffId((currentId) => {
        if (activeUsers.some((user) => user.id === currentId)) {
          return currentId;
        }

        return activeUsers[0]?.id || "";
      });
    }

    return subscribeToStaffUsers(syncStaffUsers);
  }, []);

  function handleCustomerLogin(e) {
    e.preventDefault();
    const normalizedEmail = email.trim();
    const normalizedPassword = password.trim();

    if (!normalizedEmail || !normalizedPassword) {
      setCustomerError("Enter your email and password to start a new customer session.");
      pushAuthDiagnostic("customer-login-blocked", {
        reason: "missing-credentials",
        emailPresent: Boolean(normalizedEmail),
        passwordPresent: Boolean(normalizedPassword),
      });
      return;
    }

    clearAllAuthSessions("customer-login-start");
    setActiveCustomerSession({ email: normalizedEmail }, { source: "customer-login" });
    pushAuthDiagnostic("login-redirect", {
      actorType: "customer",
      target: "/my-orders",
    });
    navigate("/my-orders");
  }

  function handleShopLogin(event) {
    event.preventDefault();

    if (!staffUsers.length) {
      setPinError("No active staff users are available.");
      return;
    }

    const loginResult = attemptStaffLogin({
      staffUserId: selectedStaffId,
      pin,
      persistSession: false,
    });

    if (!loginResult.ok) {
      setPinError(loginResult.message);
      setPin("");
      return;
    }

    clearAllAuthSessions("staff-login-session-reset");
    const finalLoginResult = attemptStaffLogin({
      staffUserId: selectedStaffId,
      pin,
    });

    if (!finalLoginResult.ok) {
      setPinError(finalLoginResult.message);
      setPin("");
      return;
    }

    pushAuthDiagnostic("login-redirect", {
      actorType: "staff",
      userId: finalLoginResult.user?.id || "",
      role: finalLoginResult.user?.role || "",
      target: "/admin",
    });
    navigate("/admin", { replace: true });
  }

  function handleOwnerLogin(event) {
    event.preventDefault();

    setOwnerError("");
    clearAllAuthSessions("temporary-owner-login-reset");

    const loginResult = attemptTemporaryOwnerLogin({
      loginId: ownerLoginId,
      pin: ownerPin,
    });

    if (!loginResult.ok) {
      setOwnerError(loginResult.message);
      setOwnerPin("");
      return;
    }

    pushAuthDiagnostic("login-redirect", {
      actorType: "staff",
      userId: loginResult.user?.id || "",
      role: loginResult.user?.role || "",
      target: "/admin",
      authMode: "temporary-owner",
    });
    navigate("/admin", { replace: true });
  }

  function addPinDigit(digit) {
    setPinError("");
    setPin((current) => `${current}${digit}`.slice(0, 4));
  }

  function clearPin() {
    setPinError("");
    setPin("");
  }

  function openStaffLogin() {
    setShowStaffLogin(true);
    setPinError("");
    setPin("");
    setCustomerError("");
  }

  function closeStaffLogin() {
    setShowStaffLogin(false);
    clearPin();
  }

  return (
    <div
      style={{
        maxWidth: "1040px",
        margin: "0 auto",
        padding: "40px 24px 56px",
        fontFamily:
          'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif',
      }}
    >
      <div
        style={{
          display: "grid",
          gridTemplateColumns: showStaffLogin ? "minmax(0, 1fr)" : "minmax(0, 1.15fr) minmax(320px, 0.85fr)",
          gap: "24px",
          alignItems: "stretch",
        }}
      >
        {!showStaffLogin ? (
          <>
            <div
              style={{
                background: "linear-gradient(145deg, #ffffff 0%, #f5f5f4 100%)",
                borderRadius: "28px",
                padding: "36px",
                border: "1px solid #e7e5e4",
                boxShadow: "0 18px 40px rgba(0,0,0,0.06)",
              }}
            >
              <p style={sectionEyebrowStyle}>Customer Access</p>

              <h1
                style={{
                  marginTop: "10px",
                  marginBottom: "10px",
                  fontSize: "36px",
                  lineHeight: 1.05,
                  color: "#1c1917",
                }}
              >
                Sign in to your portal
              </h1>

              <p
                style={{
                  marginTop: 0,
                  color: "#57534e",
                  lineHeight: 1.6,
                  marginBottom: "28px",
                  maxWidth: "520px",
                }}
              >
                View your order history, track status updates, and respond to payment
                requests from Tee &amp; Co.
              </p>

              <form onSubmit={handleCustomerLogin}>
                <div style={{ marginBottom: "16px" }}>
                  <label style={labelStyle}>Email</label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => {
                      setCustomerError("");
                      setEmail(e.target.value);
                    }}
                    placeholder="you@example.com"
                    style={inputStyle}
                  />
                </div>

                <div style={{ marginBottom: "12px" }}>
                  <label style={labelStyle}>Password</label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => {
                      setCustomerError("");
                      setPassword(e.target.value);
                    }}
                    placeholder="Enter password"
                    style={inputStyle}
                  />
                </div>

                {customerError ? (
                  <p style={{ margin: "0 0 14px", color: "#b91c1c", fontWeight: 700 }}>
                    {customerError}
                  </p>
                ) : null}

                <div
                  style={{
                    display: "flex",
                    justifyContent: "space-between",
                    alignItems: "center",
                    marginBottom: "22px",
                    gap: "12px",
                    flexWrap: "wrap",
                  }}
                >
                  <Link
                    to="/signup"
                    style={{
                      color: "#171717",
                      textDecoration: "none",
                      fontWeight: "600",
                      fontSize: "14px",
                    }}
                  >
                    Create account
                  </Link>

                  <button
                    type="button"
                    style={{
                      background: "none",
                      border: "none",
                      color: "#57534e",
                      cursor: "pointer",
                      padding: 0,
                      fontSize: "14px",
                    }}
                  >
                    Forgot password?
                  </button>
                </div>

                <button type="submit" style={primaryButtonStyle}>
                  Sign In
                </button>
              </form>
            </div>

            <div
              style={{
                background: "#ffffff",
                borderRadius: "28px",
                padding: "30px",
                border: "1px solid #e7e5e4",
                boxShadow: "0 18px 40px rgba(0,0,0,0.05)",
                display: "grid",
                gap: "22px",
                alignContent: "start",
              }}
            >
              <div>
                <p style={sectionEyebrowStyle}>Team Access</p>
                <h2 style={{ margin: "10px 0 8px", fontSize: "26px", color: "#1c1917" }}>
                  Workspace sign-in
                </h2>
                <p style={{ margin: 0, color: "#57534e", lineHeight: 1.6 }}>
                  Choose the role-based sign-in path for Central Operations. Owner/admin
                  access uses the administrative credential, while staff access uses assigned
                  staff PINs.
                </p>
              </div>

              <div style={{ display: "grid", gap: "16px" }}>
                <div
                  style={{
                    border: "1px solid #e7e5e4",
                    borderRadius: "18px",
                    padding: "18px",
                    background: "#fafaf9",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#292524" }}>
                    Owner / Admin access
                  </p>
                  <p style={{ margin: "0 0 14px", color: "#57534e", lineHeight: 1.5, fontSize: "14px" }}>
                    Use your login ID and PIN to open the full administrative workspace.
                    This is the only owner/admin sign-in path.
                  </p>

                  <form onSubmit={handleOwnerLogin}>
                    <div style={{ marginBottom: "12px" }}>
                      <label style={labelStyle}>Login ID</label>
                      <input
                        type="text"
                        value={ownerLoginId}
                        onChange={(event) => {
                          setOwnerError("");
                          setOwnerLoginId(event.target.value);
                        }}
                        placeholder="Enter login ID"
                        style={inputStyle}
                        autoCapitalize="none"
                        autoCorrect="off"
                      />
                    </div>

                    <div style={{ marginBottom: "12px" }}>
                      <label style={labelStyle}>PIN</label>
                      <input
                        type="password"
                        inputMode="numeric"
                        pattern="[0-9]*"
                        maxLength="4"
                        value={ownerPin}
                        onChange={(event) => {
                          setOwnerError("");
                          setOwnerPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                        }}
                        placeholder="••••"
                        style={inputStyle}
                      />
                    </div>

                    {ownerError ? (
                      <p style={{ margin: "0 0 14px", color: "#b91c1c", fontWeight: 700 }}>
                        {ownerError}
                      </p>
                    ) : null}

                    <button type="submit" style={primaryButtonStyle}>
                      Enter Owner Workspace
                    </button>
                  </form>
                </div>

                <div
                  style={{
                    borderTop: "1px solid #e7e5e4",
                    paddingTop: "6px",
                  }}
                >
                  <p style={{ margin: "0 0 6px", fontWeight: 700, color: "#292524" }}>
                    Staff access
                  </p>
                  <p style={{ margin: "0 0 14px", color: "#57534e", lineHeight: 1.5, fontSize: "14px" }}>
                    Production and counter staff sign in with their assigned staff profile and
                    4-digit PIN.
                  </p>

                  <button
                    type="button"
                    onClick={openStaffLogin}
                    style={{
                      width: "100%",
                      background: "#171717",
                      color: "#ffffff",
                      border: "none",
                      borderRadius: "14px",
                      padding: "14px 18px",
                      fontWeight: "700",
                      fontSize: "15px",
                      cursor: "pointer",
                    }}
                  >
                    Continue to Staff Sign-In
                  </button>
                </div>
              </div>
            </div>
          </>
        ) : (
          <div
            style={{
              background: "#ffffff",
              borderRadius: "28px",
              padding: "32px",
              border: "1px solid #e7e5e4",
              boxShadow: "0 18px 40px rgba(0,0,0,0.06)",
              maxWidth: "560px",
              width: "100%",
              justifySelf: "center",
            }}
          >
            <button
              type="button"
              onClick={closeStaffLogin}
              style={{
                background: "none",
                border: "none",
                color: "#57534e",
                cursor: "pointer",
                padding: 0,
                fontWeight: 700,
                marginBottom: "18px",
              }}
            >
              ← Back to customer login
            </button>

            <p style={sectionEyebrowStyle}>Team Access</p>

            <h1 style={{ margin: "10px 0 10px", fontSize: "32px", lineHeight: 1.1 }}>
              Enter staff workspace
            </h1>

            <p style={{ marginTop: 0, color: "#57534e", lineHeight: 1.6, marginBottom: "22px" }}>
              Select an operational staff profile and enter the assigned PIN. Owner/admin
              access stays on the dedicated owner sign-in form.
            </p>

            <form onSubmit={handleShopLogin}>
              <div style={{ marginBottom: "16px" }}>
                <label style={labelStyle}>Staff Member</label>
                <select
                  value={selectedStaffId}
                  onChange={(event) => {
                    setSelectedStaffId(event.target.value);
                    clearPin();
                  }}
                  style={inputStyle}
                  disabled={!staffUsers.length}
                >
                  {staffUsers.map((user) => (
                    <option key={user.id} value={user.id}>
                      {user.name} — {user.role}
                    </option>
                  ))}
                </select>
              </div>

              <div style={{ marginBottom: "14px" }}>
                <label style={labelStyle}>PIN</label>
                <input
                  type="password"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  maxLength="4"
                  value={pin}
                  onChange={(event) => {
                    setPinError("");
                    setPin(event.target.value.replace(/\D/g, "").slice(0, 4));
                  }}
                  placeholder="••••"
                  style={{ ...inputStyle, textAlign: "center", fontSize: "24px", letterSpacing: "0.25em" }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: "10px", marginBottom: "14px" }}>
                {["1", "2", "3", "4", "5", "6", "7", "8", "9"].map((digit) => (
                  <button
                    key={digit}
                    type="button"
                    onClick={() => addPinDigit(digit)}
                    style={{
                      padding: "14px",
                      borderRadius: "14px",
                      border: "1px solid #d6d3d1",
                      background: "#fafaf9",
                      fontWeight: 800,
                      fontSize: "18px",
                      cursor: "pointer",
                    }}
                  >
                    {digit}
                  </button>
                ))}
                <button type="button" onClick={clearPin} style={{ padding: "14px", borderRadius: "14px", border: "1px solid #d6d3d1", background: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
                  Clear
                </button>
                <button type="button" onClick={() => addPinDigit("0")} style={{ padding: "14px", borderRadius: "14px", border: "1px solid #d6d3d1", background: "#fafaf9", fontWeight: 800, fontSize: "18px", cursor: "pointer" }}>
                  0
                </button>
                <button type="submit" style={{ padding: "14px", borderRadius: "14px", border: "1px solid #171717", background: "#171717", color: "#ffffff", fontWeight: 800, cursor: "pointer" }}>
                  Enter
                </button>
              </div>

              {pinError && (
                <p style={{ margin: "0 0 14px", color: "#b91c1c", fontWeight: 700 }}>
                  {pinError}
                </p>
              )}

              <button
                type="submit"
                disabled={pin.length < 4}
                style={{
                  width: "100%",
                  background: pin.length === 4 ? "#171717" : "#a8a29e",
                  color: "#ffffff",
                  border: "none",
                  borderRadius: "14px",
                  padding: "14px 18px",
                  fontWeight: "800",
                  fontSize: "15px",
                  cursor: pin.length === 4 ? "pointer" : "not-allowed",
                }}
              >
                Enter Staff Workspace
              </button>
            </form>

            <p style={{ margin: "16px 0 0", color: "#78716c", fontSize: "13px", lineHeight: 1.5 }}>
              {staffUsers.length
                ? "Use the staff profile assigned to you for day-to-day operations."
                : "No active staff users are currently available. Owner/admin access remains available on the main sign-in screen."}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
