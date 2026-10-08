
import { useEffect, useState } from "react";
import axios from "axios";

function AdminBookings() {
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchBookings();
    }, []);

    const fetchBookings = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await axios.get(
                "http://127.0.0.1:8000/admin/bookings",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setBookings(response.data);
        } catch (error) {
            console.error(error);

            if (error.response?.status === 403) {
                setError("Access denied. Admin access required.");
            } else if (error.response?.status === 401) {
                setError("Please login as an administrator.");
            } else {
                setError("Unable to load bookings.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        if (status === "CONFIRMED") {
            return {
                background: "#dcfce7",
                color: "#15803d",
            };
        }

        if (status === "CANCELLED") {
            return {
                background: "#fee2e2",
                color: "#b91c1c",
            };
        }

        return {
            background: "#fef3c7",
            color: "#b45309",
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
                <h2>Loading bookings...</h2>
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
                    <h2 style={{ marginTop: 0 }}>
                        Unable to load bookings
                    </h2>

                    <p style={{ marginBottom: 0 }}>
                        {error}
                    </p>
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
                            fontSize: "32px",
                            color: "#0f172a",
                            fontWeight: "700",
                        }}
                    >
                        Booking Management
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "16px",
                        }}
                    >
                        View all ticket bookings across the platform.
                    </p>
                </div>

                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px",
                        marginBottom: "24px",
                        boxShadow:
                            "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <p
                        style={{
                            margin: "0 0 8px",
                            color: "#64748b",
                            fontSize: "14px",
                            fontWeight: "600",
                        }}
                    >
                        Total Bookings
                    </p>

                    <h2
                        style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "30px",
                        }}
                    >
                        {bookings.length}
                    </h2>
                </div>

                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "24px",
                        boxShadow:
                            "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <h2
                        style={{
                            margin: "0 0 20px",
                            color: "#0f172a",
                            fontSize: "20px",
                        }}
                    >
                        All Bookings
                    </h2>

                    {bookings.length === 0 ? (
                        <p style={{ color: "#64748b" }}>
                            No bookings found.
                        </p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    minWidth: "950px",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            borderBottom:
                                                "1px solid #e2e8f0",
                                        }}
                                    >
                                        <th style={headerStyle}>
                                            Booking
                                        </th>

                                        <th style={headerStyle}>
                                            User
                                        </th>

                                        <th style={headerStyle}>
                                            Event
                                        </th>

                                        <th style={headerStyle}>
                                            Tickets
                                        </th>

                                        <th style={headerStyle}>
                                            Total
                                        </th>

                                        <th style={headerStyle}>
                                            Status
                                        </th>

                                        <th style={headerStyle}>
                                            Date
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {bookings.map((booking) => (
                                        <tr
                                            key={booking.booking_id}
                                            style={{
                                                borderBottom:
                                                    "1px solid #f1f5f9",
                                            }}
                                        >
                                            <td style={cellStyle}>
                                                <span
                                                    style={{
                                                        fontWeight: "700",
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    #
                                                    {booking.booking_id}
                                                </span>
                                            </td>

                                            <td style={cellStyle}>
                                                <div
                                                    style={{
                                                        fontWeight: "600",
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {booking.username ||
                                                        "Unknown"}
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: "4px",
                                                        fontSize: "13px",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    {booking.email || "—"}
                                                </div>
                                            </td>

                                            <td style={cellStyle}>
                                                <div
                                                    style={{
                                                        fontWeight: "600",
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {booking.event_title ||
                                                        "Unknown Event"}
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: "4px",
                                                        fontSize: "13px",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    Event ID:{" "}
                                                    {booking.event_id}
                                                </div>
                                            </td>

                                            <td style={cellStyle}>
                                                {booking.ticket_quantity}
                                            </td>

                                            <td style={cellStyle}>
                                                <strong>
                                                    ₹
                                                    {Number(
                                                        booking.total_price ||
                                                            0
                                                    ).toFixed(2)}
                                                </strong>
                                            </td>

                                            <td style={cellStyle}>
                                                <span
                                                    style={{
                                                        ...getStatusStyle(
                                                            booking.booking_status
                                                        ),
                                                        display:
                                                            "inline-block",
                                                        padding:
                                                            "6px 10px",
                                                        borderRadius: "999px",
                                                        fontSize: "12px",
                                                        fontWeight: "700",
                                                    }}
                                                >
                                                    {booking.booking_status}
                                                </span>
                                            </td>

                                            <td style={cellStyle}>
                                                {booking.created_at
                                                    ? new Date(
                                                          booking.created_at
                                                      ).toLocaleDateString(
                                                          "en-IN"
                                                      )
                                                    : "—"}
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

const headerStyle = {
    textAlign: "left",
    padding: "12px 14px",
    color: "#64748b",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.05em",
};

const cellStyle = {
    padding: "16px 14px",
    color: "#334155",
    fontSize: "14px",
    verticalAlign: "top",
};

export default AdminBookings;
