import { useEffect, useState } from "react";
import {
  getStoredStaffUsers,
  subscribeToStaffUsers,
  createStoredStaffUser,
  updateStoredStaffUser,
  disableStoredStaffUser,
  reactivateStoredStaffUser,
  generateUniqueStaffPin,
  isProtectedStaffUser,
  STAFF_ROLES,
} from "../lib/staffUsersStore";

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

export default function StaffUsers() {
  const [staff, setStaff] = useState([]);
  const [drafts, setDrafts] = useState({});
  const [form, setForm] = useState({
    name: "",
    pin: "",
    role: "Staff",
  });

  useEffect(() => {
    setStaff(getStoredStaffUsers());
    return subscribeToStaffUsers((users) => {
      setStaff(users);
    });
  }, []);

  useEffect(() => {
    setDrafts(
      Object.fromEntries(
        staff.map((user) => [
          user.id,
          {
            name: user.name,
            pin: user.pin,
          },
        ])
      )
    );
  }, [staff]);

  function refreshStaff() {
    setStaff(getStoredStaffUsers());
  }

  function setDraftValue(userId, field, value) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        ...currentDrafts[userId],
        [field]: field === "pin" ? String(value).replace(/\D/g, "").slice(0, 4) : value,
      },
    }));
  }

  function resetDraft(userId, user) {
    setDrafts((currentDrafts) => ({
      ...currentDrafts,
      [userId]: {
        name: user.name,
        pin: user.pin,
      },
    }));
  }

  function persistStaffUpdate(user, changes) {
    try {
      updateStoredStaffUser(user.id, changes);
      refreshStaff();
      return true;
    } catch (error) {
      alert(error.message || "Unable to save staff user.");
      resetDraft(user.id, user);
      refreshStaff();
      return false;
    }
  }

  function handleCreate(e) {
    e.preventDefault();

    if (!form.name || !form.pin) {
      alert("Name and PIN are required.");
      return;
    }

    try {
      createStoredStaffUser({
        name: form.name,
        pin: form.pin,
        role: form.role,
      });
    } catch (error) {
      alert(error.message || "Unable to create staff user.");
      return;
    }

    setForm({
      name: "",
      pin: "",
      role: "Staff",
    });

    refreshStaff();
  }

  function handleDisable(id) {
    try {
      disableStoredStaffUser(id);
    } catch (error) {
      alert(error.message || "Unable to disable staff user.");
      return;
    }

    refreshStaff();
  }

  function handleReactivate(id) {
    try {
      reactivateStoredStaffUser(id);
    } catch (error) {
      alert(error.message || "Unable to reactivate staff user.");
      return;
    }

    refreshStaff();
  }

  function handleRoleChange(id, role) {
    const user = staff.find((staffUser) => staffUser.id === id);
    if (!user) return;
    persistStaffUpdate(user, { role });
  }

  function handleFieldBlur(user, field) {
    const draft = drafts[user.id];
    if (!draft) return;

    const nextValue = field === "name" ? draft.name.trim() : draft.pin;
    if (nextValue === user[field]) {
      if (field === "name" && draft.name !== user.name) {
        resetDraft(user.id, user);
      }
      return;
    }

    persistStaffUpdate(user, { [field]: nextValue });
  }

  function handleResetPin(user) {
    try {
      const nextPin = generateUniqueStaffPin(user.id);
      setDraftValue(user.id, "pin", nextPin);
      persistStaffUpdate(user, { pin: nextPin });
    } catch (error) {
      alert(error.message || "Unable to reset PIN.");
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
          Create and manage staff accounts for production operations.
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    name: e.target.value,
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    pin: e.target.value.replace(/\D/g, "").slice(0, 4),
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
                onChange={(e) =>
                  setForm({
                    ...form,
                    role: e.target.value,
                  })
                }
              >
                {STAFF_ROLES.filter((role) => role !== "Owner").map((role) => (
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
                  <th style={{ padding: "12px" }}>PIN</th>
                  <th style={{ padding: "12px" }}>Role</th>
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {staff.map((user) => (
                  (() => {
                    const isProtected = isProtectedStaffUser(user);
                    const roleOptions = isProtected
                      ? ["Owner"]
                      : STAFF_ROLES.filter((role) => role !== "Owner");
                    const isInactive = user.status === "Inactive";
                    const draft = drafts[user.id] || {
                      name: user.name,
                      pin: user.pin,
                    };

                    return (
                      <tr
                        key={user.id}
                        style={{
                          borderBottom: "1px solid #f5f5f4",
                        }}
                      >
                        <td style={{ padding: "12px" }}>
                          <input
                            style={{
                              ...inputStyle,
                              minWidth: "180px",
                              opacity: isProtected ? 0.75 : 1,
                            }}
                            value={draft.name}
                            disabled={isProtected}
                            onChange={(e) =>
                              setDraftValue(user.id, "name", e.target.value)
                            }
                            onBlur={() => handleFieldBlur(user, "name")}
                            onKeyDown={(e) => {
                              if (e.key === "Enter") {
                                e.currentTarget.blur();
                              }
                            }}
                          />
                        </td>

                        <td style={{ padding: "12px" }}>
                          <div
                            style={{
                              display: "grid",
                              gap: "8px",
                              minWidth: "160px",
                            }}
                          >
                            <input
                              style={{
                                ...inputStyle,
                                fontFamily: "monospace",
                                letterSpacing: "0.18em",
                                opacity: isProtected ? 0.75 : 1,
                              }}
                              value={draft.pin}
                              disabled={isProtected}
                              onChange={(e) =>
                                setDraftValue(user.id, "pin", e.target.value)
                              }
                              onBlur={() => handleFieldBlur(user, "pin")}
                              onKeyDown={(e) => {
                                if (e.key === "Enter") {
                                  e.currentTarget.blur();
                                }
                              }}
                            />

                            <button
                              onClick={() => handleResetPin(user)}
                              disabled={isProtected}
                              style={{
                                ...buttonStyle,
                                background: isProtected ? "#e7e5e4" : "#f5f5f4",
                                color: isProtected ? "#a8a29e" : "#292524",
                                border: "1px solid #d6d3d1",
                                cursor: isProtected ? "not-allowed" : "pointer",
                              }}
                            >
                              Reset PIN
                            </button>
                          </div>
                        </td>

                        <td style={{ padding: "12px" }}>
                          <select
                            value={user.role}
                            disabled={isProtected}
                            onChange={(e) =>
                              handleRoleChange(
                                user.id,
                                e.target.value
                              )
                            }
                            style={{
                              ...inputStyle,
                              minWidth: "140px",
                              opacity: isProtected ? 0.7 : 1,
                              cursor: isProtected ? "not-allowed" : "pointer",
                            }}
                          >
                            {roleOptions.map((role) => (
                              <option key={role} value={role}>
                                {role}
                              </option>
                            ))}
                          </select>
                        </td>

                        <td style={{ padding: "12px" }}>
                          {user.status}
                        </td>

                        <td style={{ padding: "12px" }}>
                          {isProtected ? (
                            <span
                              style={{
                                color: "#78716c",
                                fontWeight: 700,
                              }}
                            >
                              Protected
                            </span>
                          ) : (
                            <button
                              onClick={() =>
                                isInactive
                                  ? handleReactivate(user.id)
                                  : handleDisable(user.id)
                              }
                              style={{
                                ...buttonStyle,
                                background: isInactive ? "#16a34a" : "#dc2626",
                                color: "#ffffff",
                              }}
                            >
                              {isInactive ? "Reactivate" : "Disable"}
                            </button>
                          )}
                        </td>
                      </tr>
                    );
                  })()
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
