
import { useEffect, useState } from "react";
import axios from "axios";

function AdminEvents() {
    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    useEffect(() => {
        fetchEvents();
    }, []);

    const fetchEvents = async () => {
        try {
            const token = localStorage.getItem("access_token");

            const response = await axios.get(
                "http://127.0.0.1:8000/admin/events",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setEvents(response.data);
        } catch (error) {
            console.error(error);

            if (error.response?.status === 403) {
                setError("Access denied. Admin access required.");
            } else if (error.response?.status === 401) {
                setError("Please login as an administrator.");
            } else {
                setError("Unable to load events.");
            }
        } finally {
            setLoading(false);
        }
    };

    const getStatusStyle = (status) => {
        if (status === "CANCELLED") {
            return {
                background: "#fee2e2",
                color: "#b91c1c",
            };
        }

        if (status === "COMPLETED") {
            return {
                background: "#e2e8f0",
                color: "#475569",
            };
        }

        if (status === "ONGOING") {
            return {
                background: "#fef3c7",
                color: "#b45309",
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
                <h2>Loading events...</h2>
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
                        Unable to load events
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
                        Event Management
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "16px",
                        }}
                    >
                        View all events and monitor their current status.
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
                        Total Events
                    </p>

                    <h2
                        style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "30px",
                        }}
                    >
                        {events.length}
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
                        All Events
                    </h2>

                    {events.length === 0 ? (
                        <p style={{ color: "#64748b" }}>
                            No events found.
                        </p>
                    ) : (
                        <div style={{ overflowX: "auto" }}>
                            <table
                                style={{
                                    width: "100%",
                                    borderCollapse: "collapse",
                                    minWidth: "900px",
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
                                            ID
                                        </th>

                                        <th style={headerStyle}>
                                            Event
                                        </th>

                                        <th style={headerStyle}>
                                            Category
                                        </th>

                                        <th style={headerStyle}>
                                            Location
                                        </th>

                                        <th style={headerStyle}>
                                            Price
                                        </th>

                                        <th style={headerStyle}>
                                            Available
                                        </th>

                                        <th style={headerStyle}>
                                            Status
                                        </th>
                                    </tr>
                                </thead>

                                <tbody>
                                    {events.map((event) => (
                                        <tr
                                            key={event.id}
                                            style={{
                                                borderBottom:
                                                    "1px solid #f1f5f9",
                                            }}
                                        >
                                            <td style={cellStyle}>
                                                #{event.id}
                                            </td>

                                            <td style={cellStyle}>
                                                <div
                                                    style={{
                                                        fontWeight: "600",
                                                        color: "#0f172a",
                                                    }}
                                                >
                                                    {event.title}
                                                </div>

                                                <div
                                                    style={{
                                                        marginTop: "4px",
                                                        fontSize: "13px",
                                                        color: "#64748b",
                                                    }}
                                                >
                                                    {event.event_date
                                                        ? new Date(
                                                              event.event_date
                                                          ).toLocaleDateString(
                                                              "en-IN"
                                                          )
                                                        : "—"}
                                                </div>
                                            </td>

                                            <td style={cellStyle}>
                                                {event.category || "—"}
                                            </td>

                                            <td style={cellStyle}>
                                                {event.location || "—"}
                                            </td>

                                            <td style={cellStyle}>
                                                ₹
                                                {Number(
                                                    event.ticket_price || 0
                                                ).toFixed(2)}
                                            </td>

                                            <td style={cellStyle}>
                                                {event.available_tickets ??
                                                    0}
                                            </td>

                                            <td style={cellStyle}>
                                                <span
                                                    style={{
                                                        ...getStatusStyle(
                                                            event.event_status
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
                                                    {event.event_status ||
                                                        "UPCOMING"}
                                                </span>
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

export default AdminEvents;
