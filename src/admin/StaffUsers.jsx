import { useEffect, useState } from "react";
import {
  getStoredStaffUsers,
  createStoredStaffUser,
  updateStoredStaffUser,
  disableStoredStaffUser,
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
  const [form, setForm] = useState({
    name: "",
    pin: "",
    role: "Staff",
  });

  useEffect(() => {
    setStaff(getStoredStaffUsers());
  }, []);

  function refreshStaff() {
    setStaff(getStoredStaffUsers());
  }

  function handleCreate(e) {
    e.preventDefault();

    if (!form.name || !form.pin) {
      alert("Name and PIN are required.");
      return;
    }

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
  }

  function handleDisable(id) {
    disableStoredStaffUser(id);
    refreshStaff();
  }

  function handleRoleChange(id, role) {
    updateStoredStaffUser(id, { role });
    refreshStaff();
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
                    pin: e.target.value,
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
                {STAFF_ROLES.map((role) => (
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
                  <th style={{ padding: "12px" }}>Status</th>
                  <th style={{ padding: "12px" }}>Actions</th>
                </tr>
              </thead>

              <tbody>
                {staff.map((user) => (
                  <tr
                    key={user.id}
                    style={{
                      borderBottom: "1px solid #f5f5f4",
                    }}
                  >
                    <td style={{ padding: "12px" }}>
                      {user.name}
                    </td>

                    <td style={{ padding: "12px" }}>
                      <select
                        value={user.role}
                        onChange={(e) =>
                          handleRoleChange(
                            user.id,
                            e.target.value
                          )
                        }
                        style={{
                          ...inputStyle,
                          minWidth: "140px",
                        }}
                      >
                        {STAFF_ROLES.map((role) => (
                          <option key={role} value={role}>
                            {role}
                          </option>
                        ))}
                      </select>
                    </td>

                    <td style={{ padding: "12px" }}>
                      {user.disabled ? "Disabled" : "Active"}
                    </td>

                    <td style={{ padding: "12px" }}>
                      {!user.disabled && (
                        <button
                          onClick={() =>
                            handleDisable(user.id)
                          }
                          style={{
                            ...buttonStyle,
                            background: "#dc2626",
                            color: "#ffffff",
                          }}
                        >
                          Disable
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}