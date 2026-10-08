import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
} from "recharts";

function OrganizerDashboard() {
    const navigate = useNavigate();

    const [analytics, setAnalytics] = useState({
        total_events: 0,
        total_bookings: 0,
        tickets_sold: 0,
        total_revenue: 0,
    });

    const [eventAnalytics, setEventAnalytics] = useState([]);

    const [events, setEvents] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");
    const [cancellingEventId, setCancellingEventId] = useState(null);

    const getToken = () => {
        return (
            localStorage.getItem("token") ||
            localStorage.getItem("access_token")
        );
    };

    const loadDashboard = async () => {
        try {
            setLoading(true);
            setError("");

            const token = getToken();

            if (!token) {
                setError("Please login as an organizer.");
                setLoading(false);
                return;
            }

            const headers = {
                Authorization: `Bearer ${token}`,
            };

            // Load organizer events
            const eventsResponse = await axios.get(
                "http://127.0.0.1:8000/organizer/events",
                {
                    headers,
                }
            );

            const organizerEvents = eventsResponse.data || [];

            setEvents(organizerEvents);

            // Load organizer analytics
            try {
                const analyticsResponse = await axios.get(
                    "http://127.0.0.1:8000/organizer/analytics",
                    {
                        headers,
                    }
                );

                const data = analyticsResponse.data || {};
                const summary = data.summary || {};

                setAnalytics({
                    total_events: organizerEvents.length,
                    total_bookings:
                        summary.total_bookings || 0,
                    tickets_sold:
                        summary.total_tickets_sold || 0,
                    total_revenue:
                        summary.total_revenue || 0,
                });

                // Event-wise analytics for chart
                const analyticsEvents = data.events || [];

                const chartData = analyticsEvents.map(
                    (event) => ({
                        name:
                            event.event_title?.length > 18
                                ? event.event_title.substring(0, 18) +
                                  "..."
                                : event.event_title || "Event",
                        tickets_sold:
                            event.tickets_sold || 0,
                        revenue:
                            Number(event.total_revenue) || 0,
                        bookings:
                            event.booking_count || 0,
                        remaining:
                            event.remaining_tickets || 0,
                    })
                );

                setEventAnalytics(chartData);
            } catch (analyticsError) {
                console.error(
                    "Organizer analytics error:",
                    analyticsError
                );

                setAnalytics({
                    total_events: organizerEvents.length,
                    total_bookings: 0,
                    tickets_sold: 0,
                    total_revenue: 0,
                });

                setEventAnalytics([]);
            }
        } catch (err) {
            console.error(
                "Organizer dashboard error:",
                err
            );

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");

                setError(
                    "Your session has expired. Please login again."
                );

                setTimeout(() => {
                    navigate("/login");
                }, 1500);

                return;
            }

            if (err.response?.status === 403) {
                setError(
                    "Access denied. Please login with an Organizer account."
                );
                return;
            }

            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError(
                    "Unable to load organizer dashboard."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadDashboard();
    }, []);

    const formatDate = (dateString) => {
        if (!dateString) {
            return "Not available";
        }

        return new Date(dateString).toLocaleDateString(
            "en-IN",
            {
                day: "2-digit",
                month: "short",
                year: "numeric",
            }
        );
    };

    const getStatusStyle = (status) => {
        if (status === "CANCELLED") {
            return {
                background: "#fef2f2",
                color: "#dc2626",
            };
        }

        if (status === "COMPLETED") {
            return {
                background: "#f3f4f6",
                color: "#4b5563",
            };
        }

        if (status === "ONGOING") {
            return {
                background: "#fff7ed",
                color: "#ea580c",
            };
        }

        return {
            background: "#ecfdf5",
            color: "#059669",
        };
    };

    const handleCancelEvent = async (event) => {
        const confirmed = window.confirm(
            `Are you sure you want to cancel "${event.title}"?\n\nThis action will mark the event as CANCELLED and notify users who have confirmed bookings.`
        );

        if (!confirmed) {
            return;
        }

        try {
            setCancellingEventId(event.id);
            setError("");
            setSuccess("");

            const token = getToken();

            if (!token) {
                setError("Please login as an organizer.");
                return;
            }

            await axios.post(
                `http://127.0.0.1:8000/organizer/events/${event.id}/cancel`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSuccess(
                `"${event.title}" has been cancelled successfully.`
            );

            // Reload events and analytics
            await loadDashboard();
        } catch (err) {
            console.error(
                "Cancel event error:",
                err
            );

            if (err.response?.status === 401) {
                localStorage.removeItem("token");
                localStorage.removeItem("access_token");
                localStorage.removeItem("user");

                navigate("/login");
                return;
            }

            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError(
                    "Unable to cancel the event."
                );
            }
        } finally {
            setCancellingEventId(null);
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#f8fafc",
                    padding: "40px",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#475569",
                    fontSize: "16px",
                }}
            >
                Loading organizer dashboard...
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f8fafc",
                padding: "36px 24px 60px",
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
                        alignItems: "center",
                        gap: "20px",
                        marginBottom: "32px",
                        flexWrap: "wrap",
                    }}
                >
                    <div>
                        <p
                            style={{
                                margin: "0 0 7px",
                                color: "#64748b",
                                fontSize: "14px",
                                fontWeight: "600",
                                letterSpacing: "0.3px",
                            }}
                        >
                            ORGANIZER PANEL
                        </p>

                        <h1
                            style={{
                                margin: 0,
                                color: "#0f172a",
                                fontSize: "32px",
                                fontWeight: "700",
                                lineHeight: "1.2",
                            }}
                        >
                            Organizer Dashboard
                        </h1>

                        <p
                            style={{
                                margin: "10px 0 0",
                                color: "#64748b",
                                fontSize: "15px",
                            }}
                        >
                            Manage your events and track their
                            performance.
                        </p>
                    </div>

                    <Link
                        to="/organizer/events/create"
                        style={{
                            textDecoration: "none",
                            background: "#0f172a",
                            color: "#ffffff",
                            padding: "12px 20px",
                            borderRadius: "8px",
                            fontSize: "14px",
                            fontWeight: "600",
                            display: "inline-flex",
                            alignItems: "center",
                            justifyContent: "center",
                            boxShadow:
                                "0 4px 10px rgba(15, 23, 42, 0.12)",
                        }}
                    >
                        Create Event
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
                            borderRadius: "8px",
                            marginBottom: "24px",
                            fontSize: "14px",
                        }}
                    >
                        {error}
                    </div>
                )}

                {/* Success */}
                {success && (
                    <div
                        style={{
                            background: "#ecfdf5",
                            border: "1px solid #a7f3d0",
                            color: "#047857",
                            padding: "14px 16px",
                            borderRadius: "8px",
                            marginBottom: "24px",
                            fontSize: "14px",
                        }}
                    >
                        {success}
                    </div>
                )}

                {/* Statistics */}
                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(220px, 1fr))",
                        gap: "18px",
                        marginBottom: "32px",
                    }}
                >
                    {[
                        {
                            title: "TOTAL EVENTS",
                            value: analytics.total_events,
                            description: "Events created",
                        },
                        {
                            title: "TOTAL BOOKINGS",
                            value: analytics.total_bookings,
                            description: "Confirmed bookings",
                        },
                        {
                            title: "TICKETS SOLD",
                            value: analytics.tickets_sold,
                            description:
                                "Tickets successfully sold",
                        },
                        {
                            title: "TOTAL REVENUE",
                            value: `₹${Number(
                                analytics.total_revenue
                            ).toLocaleString("en-IN")}`,
                            description:
                                "Revenue from bookings",
                        },
                    ].map((stat) => (
                        <div
                            key={stat.title}
                            style={{
                                background: "#ffffff",
                                border:
                                    "1px solid #e2e8f0",
                                borderRadius: "12px",
                                padding: "22px",
                                boxShadow:
                                    "0 2px 8px rgba(15, 23, 42, 0.04)",
                            }}
                        >
                            <p
                                style={{
                                    margin: 0,
                                    color: "#64748b",
                                    fontSize: "13px",
                                    fontWeight: "600",
                                }}
                            >
                                {stat.title}
                            </p>

                            <h2
                                style={{
                                    margin: "12px 0 0",
                                    color: "#0f172a",
                                    fontSize: "30px",
                                    fontWeight: "700",
                                }}
                            >
                                {stat.value}
                            </h2>

                            <p
                                style={{
                                    margin: "6px 0 0",
                                    color: "#94a3b8",
                                    fontSize: "13px",
                                }}
                            >
                                {stat.description}
                            </p>
                        </div>
                    ))}
                </div>

                {/* Ticket Sales Chart */}
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "26px",
                        marginBottom: "28px",
                        boxShadow:
                            "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "20px",
                            fontWeight: "700",
                        }}
                    >
                        Ticket Sales by Event
                    </h2>

                    <p
                        style={{
                            margin: "7px 0 24px",
                            color: "#64748b",
                            fontSize: "14px",
                        }}
                    >
                        View the number of tickets sold for each
                        event.
                    </p>

                    {eventAnalytics.length === 0 ? (
                        <div
                            style={{
                                height: "300px",
                                display: "flex",
                                justifyContent: "center",
                                alignItems: "center",
                                color: "#64748b",
                                fontSize: "14px",
                            }}
                        >
                            No ticket sales data available yet.
                        </div>
                    ) : (
                        <div
                            style={{
                                width: "100%",
                                height: "320px",
                            }}
                        >
                            <ResponsiveContainer
                                width="100%"
                                height="100%"
                            >
                                <BarChart
                                    data={eventAnalytics}
                                    margin={{
                                        top: 10,
                                        right: 20,
                                        left: 0,
                                        bottom: 45,
                                    }}
                                >
                                    <CartesianGrid
                                        strokeDasharray="3 3"
                                    />

                                    <XAxis
                                        dataKey="name"
                                        angle={-20}
                                        textAnchor="end"
                                        interval={0}
                                        height={70}
                                        tick={{
                                            fontSize: 12,
                                        }}
                                    />

                                    <YAxis
                                        allowDecimals={false}
                                        tick={{
                                            fontSize: 12,
                                        }}
                                    />

                                    <Tooltip />

                                    <Bar
                                        dataKey="tickets_sold"
                                        name="Tickets Sold"
                                        fill="#0f172a"
                                        radius={[
                                            5,
                                            5,
                                            0,
                                            0,
                                        ]}
                                    />
                                </BarChart>
                            </ResponsiveContainer>
                        </div>
                    )}
                </div>

                {/* Performance Overview */}
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        padding: "26px",
                        marginBottom: "28px",
                        boxShadow:
                            "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "20px",
                            fontWeight: "700",
                        }}
                    >
                        Performance Overview
                    </h2>

                    <p
                        style={{
                            margin: "7px 0 24px",
                            color: "#64748b",
                            fontSize: "14px",
                        }}
                    >
                        Track your event bookings, ticket sales and
                        revenue.
                    </p>

                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(180px, 1fr))",
                            gap: "16px",
                        }}
                    >
                        {/* Average Tickets / Booking */}
                        <div
                            style={{
                                padding: "18px",
                                background: "#f8fafc",
                                borderRadius: "9px",
                                border:
                                    "1px solid #e2e8f0",
                            }}
                        >
                            <div
                                style={{
                                    color: "#64748b",
                                    fontSize: "13px",
                                    marginBottom: "8px",
                                }}
                            >
                                Average Tickets / Booking
                            </div>

                            <strong
                                style={{
                                    color: "#0f172a",
                                    fontSize: "22px",
                                }}
                            >
                                {analytics.total_bookings > 0
                                    ? (
                                          analytics.tickets_sold /
                                          analytics.total_bookings
                                      ).toFixed(1)
                                    : "0.0"}
                            </strong>
                        </div>

                        {/* Average Booking Value */}
                        <div
                            style={{
                                padding: "18px",
                                background: "#f8fafc",
                                borderRadius: "9px",
                                border:
                                    "1px solid #e2e8f0",
                            }}
                        >
                            <div
                                style={{
                                    color: "#64748b",
                                    fontSize: "13px",
                                    marginBottom: "8px",
                                }}
                            >
                                Average Booking Value
                            </div>

                            <strong
                                style={{
                                    color: "#0f172a",
                                    fontSize: "22px",
                                }}
                            >
                                ₹
                                {analytics.total_bookings > 0
                                    ? Math.round(
                                          analytics.total_revenue /
                                              analytics.total_bookings
                                      ).toLocaleString("en-IN")
                                    : "0"}
                            </strong>
                        </div>

                        {/* Revenue per Ticket */}
                        <div
                            style={{
                                padding: "18px",
                                background: "#f8fafc",
                                borderRadius: "9px",
                                border:
                                    "1px solid #e2e8f0",
                            }}
                        >
                            <div
                                style={{
                                    color: "#64748b",
                                    fontSize: "13px",
                                    marginBottom: "8px",
                                }}
                            >
                                Revenue per Ticket
                            </div>

                            <strong
                                style={{
                                    color: "#0f172a",
                                    fontSize: "22px",
                                }}
                            >
                                ₹
                                {analytics.tickets_sold > 0
                                    ? Math.round(
                                          analytics.total_revenue /
                                              analytics.tickets_sold
                                      ).toLocaleString("en-IN")
                                    : "0"}
                            </strong>
                        </div>
                    </div>
                </div>

                {/* Events */}
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        overflow: "hidden",
                        boxShadow:
                            "0 2px 8px rgba(15, 23, 42, 0.04)",
                    }}
                >
                    {/* Events Header */}
                    <div
                        style={{
                            padding: "24px 26px",
                            borderBottom:
                                "1px solid #e2e8f0",
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "15px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <h2
                                style={{
                                    margin: 0,
                                    color: "#0f172a",
                                    fontSize: "20px",
                                    fontWeight: "700",
                                }}
                            >
                                My Events
                            </h2>

                            <p
                                style={{
                                    margin: "6px 0 0",
                                    color: "#64748b",
                                    fontSize: "14px",
                                }}
                            >
                                Manage your events and view booking
                                activity.
                            </p>
                        </div>

                        <Link
                            to="/organizer/events/create"
                            style={{
                                textDecoration: "none",
                                color: "#0f172a",
                                border:
                                    "1px solid #cbd5e1",
                                padding: "9px 15px",
                                borderRadius: "7px",
                                fontSize: "13px",
                                fontWeight: "600",
                                background: "#ffffff",
                            }}
                        >
                            + New Event
                        </Link>
                    </div>

                    {/* No Events */}
                    {events.length === 0 ? (
                        <div
                            style={{
                                padding: "55px 20px",
                                textAlign: "center",
                            }}
                        >
                            <h3
                                style={{
                                    margin: "0 0 8px",
                                    color: "#334155",
                                    fontSize: "17px",
                                }}
                            >
                                No events yet
                            </h3>

                            <p
                                style={{
                                    margin: "0 0 20px",
                                    color: "#64748b",
                                    fontSize: "14px",
                                }}
                            >
                                Create your first event to start
                                managing bookings and tickets.
                            </p>

                            <Link
                                to="/organizer/events/create"
                                style={{
                                    textDecoration: "none",
                                    background: "#0f172a",
                                    color: "#ffffff",
                                    padding: "11px 18px",
                                    borderRadius: "7px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}
                            >
                                Create Your First Event
                            </Link>
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
                                    minWidth: "1000px",
                                }}
                            >
                                <thead>
                                    <tr
                                        style={{
                                            background:
                                                "#f8fafc",
                                            borderBottom:
                                                "1px solid #e2e8f0",
                                        }}
                                    >
                                        {[
                                            "EVENT",
                                            "DATE",
                                            "PRICE",
                                            "AVAILABLE",
                                            "STATUS",
                                            "ACTIONS",
                                        ].map((heading) => (
                                            <th
                                                key={heading}
                                                style={{
                                                    textAlign:
                                                        heading ===
                                                        "ACTIONS"
                                                            ? "right"
                                                            : "left",
                                                    padding:
                                                        "14px 20px",
                                                    color:
                                                        "#64748b",
                                                    fontSize:
                                                        "12px",
                                                    fontWeight:
                                                        "700",
                                                }}
                                            >
                                                {heading}
                                            </th>
                                        ))}
                                    </tr>
                                </thead>

                                <tbody>
                                    {events.map((event) => {
                                        const statusStyle =
                                            getStatusStyle(
                                                event.event_status
                                            );

                                        const canModify =
                                            event.event_status !==
                                                "CANCELLED" &&
                                            event.event_status !==
                                                "COMPLETED";

                                        return (
                                            <tr
                                                key={event.id}
                                                style={{
                                                    borderBottom:
                                                        "1px solid #f1f5f9",
                                                }}
                                            >
                                                {/* Event */}
                                                <td
                                                    style={{
                                                        padding:
                                                            "17px 20px",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            color:
                                                                "#0f172a",
                                                            fontSize:
                                                                "14px",
                                                            fontWeight:
                                                                "600",
                                                            marginBottom:
                                                                "4px",
                                                        }}
                                                    >
                                                        {event.title}
                                                    </div>

                                                    <div
                                                        style={{
                                                            color:
                                                                "#94a3b8",
                                                            fontSize:
                                                                "12px",
                                                        }}
                                                    >
                                                        Event ID:{" "}
                                                        {event.id}
                                                    </div>
                                                </td>

                                                {/* Date */}
                                                <td
                                                    style={{
                                                        padding:
                                                            "17px 20px",
                                                        color:
                                                            "#475569",
                                                        fontSize:
                                                            "13px",
                                                    }}
                                                >
                                                    {formatDate(
                                                        event.event_date
                                                    )}
                                                </td>

                                                {/* Price */}
                                                <td
                                                    style={{
                                                        padding:
                                                            "17px 20px",
                                                        color:
                                                            "#0f172a",
                                                        fontSize:
                                                            "13px",
                                                        fontWeight:
                                                            "600",
                                                    }}
                                                >
                                                    ₹
                                                    {Number(
                                                        event.ticket_price ||
                                                            0
                                                    ).toLocaleString(
                                                        "en-IN"
                                                    )}
                                                </td>

                                                {/* Available */}
                                                <td
                                                    style={{
                                                        padding:
                                                            "17px 20px",
                                                        color:
                                                            "#475569",
                                                        fontSize:
                                                            "13px",
                                                    }}
                                                >
                                                    {
                                                        event.available_tickets
                                                    }
                                                </td>

                                                {/* Status */}
                                                <td
                                                    style={{
                                                        padding:
                                                            "17px 20px",
                                                    }}
                                                >
                                                    <span
                                                        style={{
                                                            ...statusStyle,
                                                            display:
                                                                "inline-block",
                                                            padding:
                                                                "5px 9px",
                                                            borderRadius:
                                                                "6px",
                                                            fontSize:
                                                                "11px",
                                                            fontWeight:
                                                                "700",
                                                        }}
                                                    >
                                                        {event.event_status ||
                                                            "UPCOMING"}
                                                    </span>
                                                </td>

                                                {/* Actions */}
                                                <td
                                                    style={{
                                                        padding:
                                                            "17px 20px",
                                                        textAlign:
                                                            "right",
                                                    }}
                                                >
                                                    <div
                                                        style={{
                                                            display:
                                                                "flex",
                                                            justifyContent:
                                                                "flex-end",
                                                            gap: "8px",
                                                            flexWrap:
                                                                "wrap",
                                                        }}
                                                    >
                                                        <Link
                                                            to={`/organizer/events/${event.id}/bookings`}
                                                            style={{
                                                                textDecoration:
                                                                    "none",
                                                                color:
                                                                    "#334155",
                                                                border:
                                                                    "1px solid #cbd5e1",
                                                                padding:
                                                                    "7px 10px",
                                                                borderRadius:
                                                                    "6px",
                                                                fontSize:
                                                                    "12px",
                                                                fontWeight:
                                                                    "600",
                                                            }}
                                                        >
                                                            Bookings
                                                        </Link>

                                                        {canModify && (
                                                            <>
                                                                <Link
                                                                    to={`/organizer/events/edit/${event.id}`}
                                                                    style={{
                                                                        textDecoration:
                                                                            "none",
                                                                        color:
                                                                            "#ffffff",
                                                                        background:
                                                                            "#0f172a",
                                                                        padding:
                                                                            "7px 10px",
                                                                        borderRadius:
                                                                            "6px",
                                                                        fontSize:
                                                                            "12px",
                                                                        fontWeight:
                                                                            "600",
                                                                    }}
                                                                >
                                                                    Edit
                                                                </Link>

                                                                <button
                                                                    type="button"
                                                                    onClick={() =>
                                                                        handleCancelEvent(
                                                                            event
                                                                        )
                                                                    }
                                                                    disabled={
                                                                        cancellingEventId ===
                                                                        event.id
                                                                    }
                                                                    style={{
                                                                        color:
                                                                            "#dc2626",
                                                                        background:
                                                                            "#ffffff",
                                                                        border:
                                                                            "1px solid #fecaca",
                                                                        padding:
                                                                            "7px 10px",
                                                                        borderRadius:
                                                                            "6px",
                                                                        fontSize:
                                                                            "12px",
                                                                        fontWeight:
                                                                            "600",
                                                                        cursor:
                                                                            cancellingEventId ===
                                                                            event.id
                                                                                ? "not-allowed"
                                                                                : "pointer",
                                                                        opacity:
                                                                            cancellingEventId ===
                                                                            event.id
                                                                                ? 0.6
                                                                                : 1,
                                                                    }}
                                                                >
                                                                    {cancellingEventId ===
                                                                    event.id
                                                                        ? "Cancelling..."
                                                                        : "Cancel"}
                                                                </button>
                                                            </>
                                                        )}
                                                    </div>
                                                </td>
                                            </tr>
                                        );
                                    })}
                                </tbody>
                            </table>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

export default OrganizerDashboard;