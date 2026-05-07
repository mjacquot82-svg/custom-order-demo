import { useEffect, useState } from "react";
import {
  createStoredStaffUser,
  disableStoredStaffUser,
  getStoredStaffUsers,
  OWNER_USER_ID,
  reactivateStoredStaffUser,
  resetStoredStaffUserPin,
  STAFF_ROLES,
  updateStoredStaffUser,
} from "../lib/staffUsersStore";

const EDITABLE_STAFF_ROLES = STAFF_ROLES.filter((role) => role !== "Owner");

const inputStyle = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "12px",
  border: "1px solid #d6d3d1",
  fontSize: "14px",
  boxSizing: "border-box",
};

const buttonStyle = {
  padding: "10px 14px",
  borderRadius: "10px",
  border: "none",
  cursor: "pointer",
  fontWeight: 700,
};

function formatPinValue(value) {
  return String(value || "").replace(/\D/g, "").slice(0, 4);
}

export default function StaffUsers() {
  const [staff, setStaff] = useState([]);
  const [form, setForm] = useState({
    name: "",
    pin: "",
    role: "Staff",
  });
  const [pinDrafts, setPinDrafts] = useState({});

  useEffect(() => {
    refreshStaff();
  }, []);

  function refreshStaff() {
    const storedStaff = getStoredStaffUsers();
    setStaff(storedStaff);
    setPinDrafts(
      storedStaff.reduce((drafts, user) => {
        drafts[user.id] = "";
        return drafts;
      }, {})
    );
  }

  function handleCreate(event) {
    event.preventDefault();

    if (!form.name.trim() || form.pin.length !== 4) {
      alert("Enter a staff name and a unique 4-digit PIN.");
      return;
    }

    try {
      createStoredStaffUser({
        name: form.name,
        pin: form.pin,
        role: form.role,
      });

      setForm({
        name: "",
        pin: "",
        role: "Staff",
      });

      refreshStaff();
    } catch (error) {
      alert(error.message);
    }
  }

  function handleDisable(user) {
    try {
      if (user.status === "Inactive") {
        reactivateStoredStaffUser(user.id);
      } else {
        disableStoredStaffUser(user.id);
      }

      refreshStaff();
    } catch (error) {
      alert(error.message);
    }
  }

  function handleRoleChange(id, role) {
    try {
      updateStoredStaffUser(id, { role });
      refreshStaff();
    } catch (error) {
      alert(error.message);
    }
  }

  function handlePinReset(user) {
    const nextPin = pinDrafts[user.id] || "";

    if (nextPin.length !== 4) {
      alert("PIN must be exactly 4 digits.");
      return;
    }

    try {
      resetStoredStaffUserPin(user.id, nextPin);
      refreshStaff();
    } catch (error) {
      alert(error.message);
    }
  }

  return (
    <div style={{ padding: "32px" }}>
      <div style={{ marginBottom: "28px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "32px",
            fontWeight: 900,
            color: "#171717",
          }}
        >
          Manage Staff
        </h1>

        <p
          style={{
            marginTop: "8px",
            color: "#57534e",
            fontSize: "15px",
          }}
        >
          Create staff accounts, enforce unique PINs, and control activation status.
        </p>
      </div>

      <div
        style={{
          display: "grid",
          gridTemplateColumns: "380px 1fr",
          gap: "24px",
          alignItems: "start",
        }}
      >
        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e7e5e4",
            borderRadius: "18px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "18px",
              fontSize: "20px",
            }}
          >
            Add Staff User
          </h2>

          <form
            onSubmit={handleCreate}
            style={{ display: "grid", gap: "14px" }}
          >
            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 700,
                }}
              >
                Name
              </label>

              <input
                style={inputStyle}
                value={form.name}
                onChange={(event) =>
                  setForm({
                    ...form,
                    name: event.target.value,
                  })
                }
                placeholder="Staff member name"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 700,
                }}
              >
                PIN
              </label>

              <input
                style={inputStyle}
                value={form.pin}
                inputMode="numeric"
                maxLength={4}
                onChange={(event) =>
                  setForm({
                    ...form,
                    pin: formatPinValue(event.target.value),
                  })
                }
                placeholder="4-digit PIN"
              />
            </div>

            <div>
              <label
                style={{
                  display: "block",
                  marginBottom: "6px",
                  fontWeight: 700,
                }}
              >
                Role
              </label>

              <select
                style={inputStyle}
                value={form.role}
                onChange={(event) =>
                  setForm({
                    ...form,
                    role: event.target.value,
                  })
                }
              >
                {EDITABLE_STAFF_ROLES.map((role) => (
                  <option key={role} value={role}>
                    {role}
                  </option>
                ))}
              </select>
            </div>

            <button
              type="submit"
              style={{
                ...buttonStyle,
                background: "#171717",
                color: "#ffffff",
              }}
            >
              Add Staff User
            </button>
          </form>
        </section>

        <section
          style={{
            background: "#ffffff",
            border: "1px solid #e7e5e4",
            borderRadius: "18px",
            padding: "20px",
          }}
        >
          <h2
            style={{
              marginTop: 0,
              marginBottom: "18px",
              fontSize: "20px",
            }}
          >
            Staff Users
          </h2>

          <div style={{ overflowX: "auto" }}>
            <table
              style={{
                width: "100%",
                borderCollapse: "collapse",
              }}
            >
              <thead>
                <tr
                  style={{
                    borderBottom: "1px solid #e7e5e4",
                    textAlign: "left",
                  }}
                >
                  <th style={{ padding: "12px" }}>Name</th>
                  <th style={{ padding: "12px" }}>Role</th>
                  <th style={{ padding: "12px" }}>PIN Reset</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {staff.map((user) => {
                  const isProtectedOwner = user.id === OWNER_USER_ID;

                  return (
                    <tr
                      key={user.id}
                      style={{
                        borderBottom: "1px solid #f5f5f4",
                      }}
                    >
                      <td style={{ padding: "12px" }}>
                        <strong>{user.name}</strong>
                        {isProtectedOwner && (
                          <div style={{ marginTop: "4px", color: "#78716c", fontSize: "12px", fontWeight: 700 }}>
                            Protected default owner account
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {isProtectedOwner ? (
                          <span style={{ fontWeight: 700 }}>{user.role}</span>
                        ) : (
                          <select
                            value={user.role}
                            onChange={(event) =>
                              handleRoleChange(user.id, event.target.value)
                            }
                            style={{
                              ...inputStyle,
                              minWidth: "140px",
                            }}
                          >
                            {EDITABLE_STAFF_ROLES.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        )}
                      </td>

                      <td style={{ padding: "12px", minWidth: "220px" }}>
                        {isProtectedOwner ? (
                          <span style={{ color: "#78716c", fontWeight: 700 }}>
                            Default PIN 1234 is reserved.
                          </span>
                        ) : (
                          <div style={{ display: "grid", gap: "8px" }}>
                            <input
                              style={inputStyle}
                              inputMode="numeric"
                              maxLength={4}
                              value={pinDrafts[user.id] || ""}
                              onChange={(event) =>
                                setPinDrafts((current) => ({
                                  ...current,
                                  [user.id]: formatPinValue(event.target.value),
                                }))
                              }
                              placeholder="New 4-digit PIN"
                            />

                            <button
                              type="button"
                              onClick={() => handlePinReset(user)}
                              style={{
                                ...buttonStyle,
                                background: "#0f172a",
                                color: "#ffffff",
                              }}
                            >
                              Save PIN
                            </button>
                          </div>
                        )}
                      </td>

                      <td style={{ padding: "12px", fontWeight: 700 }}>
                        {user.status}
                      </td>

                      <td style={{ padding: "12px" }}>
                        {isProtectedOwner ? (
                          <span style={{ color: "#78716c", fontWeight: 700 }}>
                            Protected
                          </span>
                        ) : (
                          <button
                            type="button"
                            onClick={() => handleDisable(user)}
                            style={{
                              ...buttonStyle,
                              background:
                                user.status === "Inactive" ? "#166534" : "#dc2626",
                              color: "#ffffff",
                            }}
                          >
                            {user.status === "Inactive" ? "Reactivate" : "Disable"}
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
