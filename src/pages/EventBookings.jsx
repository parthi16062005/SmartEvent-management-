
import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import axios from "axios";

function EventBookings() {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [bookings, setBookings] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const token = localStorage.getItem("access_token");

    useEffect(() => {
        fetchBookings();
    }, [eventId]);

    const fetchBookings = async () => {
        try {
            setLoading(true);
            setError("");

            const eventResponse = await axios.get(
                `http://127.0.0.1:8000/events/${eventId}`
            );

            setEvent(eventResponse.data);

            const bookingsResponse = await axios.get(
                `http://127.0.0.1:8000/organizer/events/${eventId}/bookings`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setBookings(bookingsResponse.data);
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to load event bookings."
            );
        } finally {
            setLoading(false);
        }
    };

    const totalBookings = bookings.length;

    const ticketsSold = bookings.reduce(
        (total, booking) =>
            total + Number(booking.ticket_quantity || 0),
        0
    );

    const totalRevenue = bookings.reduce(
        (total, booking) =>
            total + Number(booking.total_price || 0),
        0
    );

    const formatDate = (date) => {
        if (!date) {
            return "-";
        }

        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const getStatusClass = (status) => {
        if (!status) {
            return "unknown";
        }

        const value = status.toLowerCase();

        if (value === "confirmed") {
            return "confirmed";
        }

        if (value === "cancelled") {
            return "cancelled";
        }

        if (value === "pending") {
            return "pending";
        }

        return "unknown";
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#f5f7fb",
                    padding: "50px 20px",
                }}
            >
                <div
                    style={{
                        maxWidth: "1100px",
                        margin: "0 auto",
                        background: "#ffffff",
                        borderRadius: "18px",
                        padding: "50px",
                        textAlign: "center",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            color: "#111827",
                        }}
                    >
                        Loading Event Bookings
                    </h2>

                    <p
                        style={{
                            marginTop: "10px",
                            color: "#6b7280",
                        }}
                    >
                        Please wait while we load the booking details.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f5f7fb",
                padding: "40px 20px 60px",
            }}
        >
            <div
                style={{
                    maxWidth: "1200px",
                    margin: "0 auto",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "flex-start",
                        gap: "20px",
                        marginBottom: "30px",
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <div
                            style={{
                                display: "inline-block",
                                background: "#eef2ff",
                                color: "#4f46e5",
                                padding: "7px 13px",
                                borderRadius: "20px",
                                fontSize: "12px",
                                fontWeight: "700",
                                letterSpacing: "0.5px",
                                marginBottom: "12px",
                            }}
                        >
                            EVENT MANAGEMENT
                        </div>

                        <h1
                            style={{
                                margin: 0,
                                color: "#111827",
                                fontSize: "32px",
                                fontWeight: "700",
                            }}
                        >
                            Event Bookings
                        </h1>

                        {event && (
                            <p
                                style={{
                                    marginTop: "8px",
                                    marginBottom: 0,
                                    color: "#6b7280",
                                    fontSize: "15px",
                                }}
                            >
                                Manage bookings for{" "}
                                <strong
                                    style={{
                                        color: "#374151",
                                    }}
                                >
                                    {event.title}
                                </strong>
                            </p>
                        )}
                    </div>

                    <Link
                        to="/organizer"
                        style={{
                            textDecoration: "none",
                            padding: "11px 18px",
                            borderRadius: "9px",
                            border: "1px solid #d1d5db",
                            background: "#ffffff",
                            color: "#374151",
                            fontSize: "14px",
                            fontWeight: "600",
                            whiteSpace: "nowrap",
                        }}
                    >
                        Back to Dashboard
                    </Link>
                </div>

                {/* Error */}
                {error && (
                    <div
                        style={{
                            background: "#fef2f2",
                            border: "1px solid #fecaca",
                            color: "#b91c1c",
                            padding: "14px 16px",
                            borderRadius: "10px",
                            marginBottom: "24px",
                            fontSize: "14px",
                            fontWeight: "500",
                        }}
                    >
                        {error}
                    </div>
                )}

                {!error && (
                    <>
                        {/* Event Information */}
                        {event && (
                            <div
                                style={{
                                    background: "#ffffff",
                                    border: "1px solid #e5e7eb",
                                    borderRadius: "16px",
                                    padding: "22px 24px",
                                    marginBottom: "24px",
                                    boxShadow:
                                        "0 5px 20px rgba(0,0,0,0.05)",
                                }}
                            >
                                <div
                                    style={{
                                        display: "grid",
                                        gridTemplateColumns:
                                            "repeat(auto-fit, minmax(180px, 1fr))",
                                        gap: "20px",
                                    }}
                                >
                                    <div>
                                        <p style={infoLabelStyle}>
                                            Event
                                        </p>

                                        <p style={infoValueStyle}>
                                            {event.title}
                                        </p>
                                    </div>

                                    <div>
                                        <p style={infoLabelStyle}>
                                            Category
                                        </p>

                                        <p style={infoValueStyle}>
                                            {event.category}
                                        </p>
                                    </div>

                                    <div>
                                        <p style={infoLabelStyle}>
                                            Location
                                        </p>

                                        <p style={infoValueStyle}>
                                            {event.location}
                                        </p>
                                    </div>

                                    <div>
                                        <p style={infoLabelStyle}>
                                            Ticket Price
                                        </p>

                                        <p style={infoValueStyle}>
                                            ₹
                                            {Number(
                                                event.ticket_price || 0
                                            ).toFixed(2)}
                                        </p>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Summary Cards */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(220px, 1fr))",
                                gap: "20px",
                                marginBottom: "28px",
                            }}
                        >
                            {/* Total Bookings */}
                            <div style={summaryCardStyle}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <p style={summaryLabelStyle}>
                                            Total Bookings
                                        </p>

                                        <h2 style={summaryValueStyle}>
                                            {totalBookings}
                                        </h2>
                                    </div>

                                    <div style={iconBoxStyle}>
                                        B
                                    </div>
                                </div>

                                <p style={summaryDescriptionStyle}>
                                    Total bookings received
                                </p>
                            </div>

                            {/* Tickets Sold */}
                            <div style={summaryCardStyle}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <p style={summaryLabelStyle}>
                                            Tickets Sold
                                        </p>

                                        <h2 style={summaryValueStyle}>
                                            {ticketsSold}
                                        </h2>
                                    </div>

                                    <div style={iconBoxStyle}>
                                        T
                                    </div>
                                </div>

                                <p style={summaryDescriptionStyle}>
                                    Tickets purchased by attendees
                                </p>
                            </div>

                            {/* Revenue */}
                            <div style={summaryCardStyle}>
                                <div
                                    style={{
                                        display: "flex",
                                        justifyContent: "space-between",
                                        alignItems: "center",
                                    }}
                                >
                                    <div>
                                        <p style={summaryLabelStyle}>
                                            Total Revenue
                                        </p>

                                        <h2
                                            style={{
                                                ...summaryValueStyle,
                                                fontSize: "26px",
                                            }}
                                        >
                                            ₹
                                            {totalRevenue.toFixed(2)}
                                        </h2>
                                    </div>

                                    <div style={iconBoxStyle}>
                                        ₹
                                    </div>
                                </div>

                                <p style={summaryDescriptionStyle}>
                                    Revenue generated from bookings
                                </p>
                            </div>
                        </div>

                        {/* Booking Table Card */}
                        <div
                            style={{
                                background: "#ffffff",
                                border: "1px solid #e5e7eb",
                                borderRadius: "16px",
                                boxShadow:
                                    "0 5px 20px rgba(0,0,0,0.05)",
                                overflow: "hidden",
                            }}
                        >
                            <div
                                style={{
                                    padding: "22px 24px",
                                    borderBottom:
                                        "1px solid #e5e7eb",
                                }}
                            >
                                <h2
                                    style={{
                                        margin: 0,
                                        fontSize: "19px",
                                        color: "#111827",
                                    }}
                                >
                                    Booking Details
                                </h2>

                                <p
                                    style={{
                                        margin: "6px 0 0",
                                        color: "#6b7280",
                                        fontSize: "13px",
                                    }}
                                >
                                    View all attendees and booking
                                    information for this event.
                                </p>
                            </div>

                            {bookings.length === 0 ? (
                                <div
                                    style={{
                                        padding: "60px 20px",
                                        textAlign: "center",
                                    }}
                                >
                                    <div
                                        style={{
                                            width: "55px",
                                            height: "55px",
                                            margin: "0 auto 18px",
                                            borderRadius: "50%",
                                            background: "#f3f4f6",
                                            display: "flex",
                                            alignItems: "center",
                                            justifyContent: "center",
                                            fontWeight: "700",
                                            color: "#6b7280",
                                            fontSize: "20px",
                                        }}
                                    >
                                        B
                                    </div>

                                    <h3
                                        style={{
                                            margin: 0,
                                            color: "#111827",
                                            fontSize: "18px",
                                        }}
                                    >
                                        No Bookings Yet
                                    </h3>

                                    <p
                                        style={{
                                            marginTop: "8px",
                                            color: "#6b7280",
                                            fontSize: "14px",
                                        }}
                                    >
                                        No users have booked tickets
                                        for this event yet.
                                    </p>
                                </div>
                            ) : (
                                <div
                                    style={{
                                        overflowX: "auto",
                                    }}
                                >
                                    <table
                                        style={{
                                            width: "100%",
                                            borderCollapse:
                                                "collapse",
                                            minWidth: "900px",
                                        }}
                                    >
                                        <thead>
                                            <tr
                                                style={{
                                                    background:
                                                        "#f9fafb",
                                                }}
                                            >
                                                <th
                                                    style={
                                                        tableHeaderStyle
                                                    }
                                                >
                                                    Booking ID
                                                </th>

                                                <th
                                                    style={
                                                        tableHeaderStyle
                                                    }
                                                >
                                                    User
                                                </th>

                                                <th
                                                    style={
                                                        tableHeaderStyle
                                                    }
                                                >
                                                    Tickets
                                                </th>

                                                <th
                                                    style={
                                                        tableHeaderStyle
                                                    }
                                                >
                                                    Total Amount
                                                </th>

                                                <th
                                                    style={
                                                        tableHeaderStyle
                                                    }
                                                >
                                                    Status
                                                </th>

                                                <th
                                                    style={
                                                        tableHeaderStyle
                                                    }
                                                >
                                                    Booking Date
                                                </th>
                                            </tr>
                                        </thead>

                                        <tbody>
                                            {bookings.map(
                                                (booking) => (
                                                    <tr
                                                        key={
                                                            booking.booking_id
                                                        }
                                                        style={{
                                                            borderTop:
                                                                "1px solid #f0f0f0",
                                                        }}
                                                    >
                                                        <td
                                                            style={
                                                                tableCellStyle
                                                            }
                                                        >
                                                            <span
                                                                style={{
                                                                    fontWeight:
                                                                        "700",
                                                                    color: "#4f46e5",
                                                                }}
                                                            >
                                                                #
                                                                {
                                                                    booking.booking_id
                                                                }
                                                            </span>
                                                        </td>

                                                        <td
                                                            style={
                                                                tableCellStyle
                                                            }
                                                        >
                                                            <div>
                                                                <div
                                                                    style={{
                                                                        fontWeight:
                                                                            "600",
                                                                        color: "#111827",
                                                                    }}
                                                                >
                                                                    {
                                                                        booking.username
                                                                    }
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "3px",
                                                                        fontSize:
                                                                            "12px",
                                                                        color: "#6b7280",
                                                                    }}
                                                                >
                                                                    {
                                                                        booking.email
                                                                    }
                                                                </div>

                                                                <div
                                                                    style={{
                                                                        marginTop:
                                                                            "3px",
                                                                        fontSize:
                                                                            "11px",
                                                                        color: "#9ca3af",
                                                                    }}
                                                                >
                                                                    User ID:{" "}
                                                                    {
                                                                        booking.user_id
                                                                    }
                                                                </div>
                                                            </div>
                                                        </td>

                                                        <td
                                                            style={{
                                                                ...tableCellStyle,
                                                                fontWeight:
                                                                    "600",
                                                            }}
                                                        >
                                                            {
                                                                booking.ticket_quantity
                                                            }
                                                        </td>

                                                        <td
                                                            style={{
                                                                ...tableCellStyle,
                                                                fontWeight:
                                                                    "700",
                                                                color: "#111827",
                                                            }}
                                                        >
                                                            ₹
                                                            {Number(
                                                                booking.total_price ||
                                                                    0
                                                            ).toFixed(
                                                                2
                                                            )}
                                                        </td>

                                                        <td
                                                            style={
                                                                tableCellStyle
                                                            }
                                                        >
                                                            <span
                                                                style={getStatusStyle(
                                                                    booking.booking_status
                                                                )}
                                                            >
                                                                {
                                                                    booking.booking_status
                                                                }
                                                            </span>
                                                        </td>

                                                        <td
                                                            style={{
                                                                ...tableCellStyle,
                                                                color: "#6b7280",
                                                                fontSize:
                                                                    "13px",
                                                            }}
                                                        >
                                                            {formatDate(
                                                                booking.created_at
                                                            )}
                                                        </td>
                                                    </tr>
                                                )
                                            )}
                                        </tbody>
                                    </table>
                                </div>
                            )}
                        </div>
                    </>
                )}
            </div>
        </div>
    );
}

const infoLabelStyle = {
    margin: 0,
    fontSize: "12px",
    color: "#9ca3af",
    fontWeight: "600",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
};

const infoValueStyle = {
    margin: "6px 0 0",
    fontSize: "14px",
    color: "#111827",
    fontWeight: "600",
};

const summaryCardStyle = {
    background: "#ffffff",
    border: "1px solid #e5e7eb",
    borderRadius: "16px",
    padding: "22px",
    boxShadow: "0 5px 20px rgba(0,0,0,0.05)",
};

const summaryLabelStyle = {
    margin: 0,
    color: "#6b7280",
    fontSize: "13px",
    fontWeight: "600",
};

const summaryValueStyle = {
    margin: "7px 0 0",
    color: "#111827",
    fontSize: "30px",
    fontWeight: "700",
};

const summaryDescriptionStyle = {
    margin: "12px 0 0",
    color: "#9ca3af",
    fontSize: "12px",
};

const iconBoxStyle = {
    width: "42px",
    height: "42px",
    borderRadius: "10px",
    background: "#eef2ff",
    color: "#4f46e5",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    fontWeight: "700",
    fontSize: "17px",
};

const tableHeaderStyle = {
    textAlign: "left",
    padding: "15px 18px",
    color: "#6b7280",
    fontSize: "12px",
    fontWeight: "700",
    textTransform: "uppercase",
    letterSpacing: "0.4px",
    whiteSpace: "nowrap",
};

const tableCellStyle = {
    padding: "17px 18px",
    color: "#374151",
    fontSize: "14px",
    verticalAlign: "middle",
};

const getStatusStyle = (status) => {
    const value = status?.toLowerCase();

    if (value === "confirmed") {
        return {
            display: "inline-block",
            padding: "5px 10px",
            borderRadius: "20px",
            background: "#dcfce7",
            color: "#15803d",
            fontSize: "12px",
            fontWeight: "700",
        };
    }

    if (value === "cancelled") {
        return {
            display: "inline-block",
            padding: "5px 10px",
            borderRadius: "20px",
            background: "#fee2e2",
            color: "#b91c1c",
            fontSize: "12px",
            fontWeight: "700",
        };
    }

    if (value === "pending") {
        return {
            display: "inline-block",
            padding: "5px 10px",
            borderRadius: "20px",
            background: "#fef3c7",
            color: "#b45309",
            fontSize: "12px",
            fontWeight: "700",
        };
    }

    return {
        display: "inline-block",
        padding: "5px 10px",
        borderRadius: "20px",
        background: "#f3f4f6",
        color: "#4b5563",
        fontSize: "12px",
        fontWeight: "700",
    };
};

export default EventBookings;
