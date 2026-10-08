
import { useEffect, useState } from "react";
import axios from "axios";

function AdminUsers() {
    const [users, setUsers] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await axios.get(
                "http://127.0.0.1:8000/admin/users",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setUsers(response.data);
        } catch (error) {
            console.error(error);

            if (error.response?.status === 403) {
                setError("Access denied. Admin access required.");
            } else if (error.response?.status === 401) {
                setError("Please login as an administrator.");
            } else {
                setError("Unable to load users.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getRoleStyle = (role) => {
        if (role === "ADMIN") {
            return {
                background: "#ede9fe",
                color: "#6d28d9",
            };
        }

        if (role === "ORGANIZER") {
            return {
                background: "#dbeafe",
                color: "#1d4ed8",
            };
        }

        return {
            background: "#dcfce7",
            color: "#15803d",
        };
    };

    if (loading) {
        return (
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "40px 20px",
                    textAlign: "center",
                }}
            >
                <h2>Loading users...</h2>
            </div>
        );
    }

    if (error) {
        return (
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                    padding: "40px 20px",
                }}
            >
                <div
                    style={{
                        padding: "20px",
                        borderRadius: "10px",
                        background: "#fff1f2",
                        border: "1px solid #fecdd3",
                        color: "#be123c",
                    }}
                >
                    <h2 style={{ marginTop: 0 }}>Unable to load users</h2>
                    <p style={{ marginBottom: 0 }}>{error}</p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f8fafc",
                padding: "40px 20px",
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                {/* Header */}
                <div style={{ marginBottom: "32px" }}>
                    <p
                        style={{
                            margin: "0 0 8px",
                            color: "#64748b",
                            fontSize: "14px",
                            fontWeight: "600",
                            textTransform: "uppercase",
                            letterSpacing: "0.08em",
                        }}
                    >
                        Administration
                    </p>

                    <h1
                        style={{
                            margin: "0 0 10px",
                            color: "#0f172a",
                            fontSize: "32px",
                        }}
                    >
                        User Management
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "16px",
                        }}
                    >
                        View registered users and their account roles.
                    </p>
                </div>

                {/* Summary */}
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "22px 24px",
                        marginBottom: "24px",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <p
                        style={{
                            margin: "0 0 6px",
                            color: "#64748b",
                            fontSize: "14px",
                        }}
                    >
                        Total Registered Users
                    </p>

                    <h2
                        style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "28px",
                        }}
                    >
                        {users.length}
                    </h2>
                </div>

                {/* Users Table */}
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        overflow: "hidden",
                        boxShadow: "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <div
                        style={{
                            padding: "22px 24px",
                            borderBottom: "1px solid #e2e8f0",
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                color: "#0f172a",
                                fontSize: "20px",
                            }}
                        >
                            Registered Users
                        </h2>
                    </div>

                    {users.length === 0 ? (
                        <div
                            style={{
                                padding: "40px",
                                textAlign: "center",
                                color: "#64748b",
                            }}
                        >
                            No users found.
                        </div>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    minWidth: "700px",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background: "#f8fafc",
                                        }}
                                    >
                                        <th
                                            style={{
                                                padding: "16px 20px",
                                                textAlign: "left",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            ID
                                        </th>

                                        <th
                                            style={{
                                                padding: "16px 20px",
                                                textAlign: "left",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Username
                                        </th>

                                        <th
                                            style={{
                                                padding: "16px 20px",
                                                textAlign: "left",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Email
                                        </th>

                                        <th
                                            style={{
                                                padding: "16px 20px",
                                                textAlign: "left",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Role
                                        </th>

                                        <th
                                            style={{
                                                padding: "16px 20px",
                                                textAlign: "left",
                                                color: "#475569",
                                                fontSize: "13px",
                                                fontWeight: "600",
                                            }}
                                        >
                                            Created
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {users.map((user) => (
                                        <tr
                                            key={user.id}
                                            style={{
                                                borderTop:
                                                    "1px solid #e2e8f0",
                                            }}
                                        >
                                            <td
                                                style={{
                                                    padding: "18px 20px",
                                                    color: "#64748b",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                #{user.id}
                                            </td>

                                            <td
                                                style={{
                                                    padding: "18px 20px",
                                                    color: "#0f172a",
                                                    fontSize: "14px",
                                                    fontWeight: "600",
                                                }}
                                            >
                                                {user.username}
                                            </td>

                                            <td
                                                style={{
                                                    padding: "18px 20px",
                                                    color: "#475569",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {user.email}
                                            </td>

                                            <td
                                                style={{
                                                    padding: "18px 20px",
                                                }}
                                            >
                                                <span
                                                    style={{
                                                        display:
                                                            "inline-block",
                                                        padding:
                                                            "6px 10px",
                                                        borderRadius:
                                                            "999px",
                                                        fontSize: "12px",
                                                        fontWeight: "700",
                                                        ...getRoleStyle(
                                                            user.role
                                                        ),
                                                    }}
                                                >
                                                    {user.role}
                                                </span>
                                            </td>

                                            <td
                                                style={{
                                                    padding: "18px 20px",
                                                    color: "#64748b",
                                                    fontSize: "14px",
                                                }}
                                            >
                                                {new Date(
                                                    user.created_at
                                                ).toLocaleDateString(
                                                    "en-IN"
                                                )}
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default AdminUsers;
