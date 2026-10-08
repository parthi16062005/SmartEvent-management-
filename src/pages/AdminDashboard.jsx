import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";

import {
    BarChart,
    Bar,
    LineChart,
    Line,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    Legend,
    ResponsiveContainer,
} from "recharts";


function AdminDashboard() {
    const [analytics, setAnalytics] = useState(null);

    const [startDate, setStartDate] = useState("");
    const [endDate, setEndDate] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");


    const fetchAnalytics = async (start = "", end = "") => {
        try {
            setLoading(true);
            setError("");

            const token = localStorage.getItem("access_token");

            const params = {};

            if (start) {
                params.start_date = start;
            }

            if (end) {
                params.end_date = end;
            }

            const response = await axios.get(
                "http://127.0.0.1:8000/admin/analytics",
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                    params,
                }
            );

            setAnalytics(response.data);
        } catch (err) {
            console.error(err);

            if (err.response?.status === 401) {
                setError("Your session has expired. Please login again.");
            } else if (err.response?.status === 403) {
                setError("Admin access required.");
            } else {
                setError("Unable to load admin analytics.");
            }
        } finally {
            setLoading(false);
        }
    };


    useEffect(() => {
        fetchAnalytics();
    }, []);


    const handleApplyFilter = () => {
        fetchAnalytics(startDate, endDate);
    };


    const handleClearFilter = () => {
        setStartDate("");
        setEndDate("");

        setTimeout(() => {
            fetchAnalytics("", "");
        }, 0);
    };


    if (loading && !analytics) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#f8fafc",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    color: "#475569",
                    fontSize: "16px",
                }}
            >
                Loading admin dashboard...
            </div>
        );
    }


    if (error && !analytics) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#f8fafc",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "30px",
                }}
            >
                <div
                    style={{
                        background: "white",
                        padding: "30px",
                        borderRadius: "14px",
                        border: "1px solid #e2e8f0",
                        textAlign: "center",
                        maxWidth: "450px",
                    }}
                >
                    <h2
                        style={{
                            marginTop: 0,
                            color: "#0f172a",
                        }}
                    >
                        Unable to Load Dashboard
                    </h2>

                    <p
                        style={{
                            color: "#64748b",
                        }}
                    >
                        {error}
                    </p>

                    <button
                        onClick={() => fetchAnalytics()}
                        style={{
                            border: "none",
                            background: "#0f172a",
                            color: "white",
                            padding: "11px 20px",
                            borderRadius: "8px",
                            cursor: "pointer",
                            fontWeight: "600",
                        }}
                    >
                        Try Again
                    </button>
                </div>
            </div>
        );
    }


    const data = analytics || {};

    const dailyTicketSales = data.daily_ticket_sales || [];
    const monthlyBookingTrends = data.monthly_booking_trends || [];
    const popularEvents = data.popular_events || [];
    const topRevenueEvents = data.top_revenue_events || [];


    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f8fafc",
                padding: "40px 24px 60px",
            }}
        >
            <div
                style={{
                    maxWidth: "1250px",
                    margin: "0 auto",
                }}
            >

                {/* Header */}

                <div
                    style={{
                        marginBottom: "30px",
                    }}
                >
                    <p
                        style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: "700",
                            letterSpacing: "1px",
                        }}
                    >
                        ADMINISTRATION
                    </p>

                    <h1
                        style={{
                            margin: "7px 0",
                            fontSize: "34px",
                            color: "#0f172a",
                        }}
                    >
                        Admin Dashboard
                    </h1>

                    <p
                        style={{
                            margin: 0,
                            color: "#64748b",
                            fontSize: "15px",
                        }}
                    >
                        Monitor SmartEvent platform activity and performance.
                    </p>
                </div>


                {/* Date Filter */}

                <div
                    style={{
                        background: "white",
                        border: "1px solid #e2e8f0",
                        borderRadius: "14px",
                        padding: "20px",
                        marginBottom: "25px",
                    }}
                >
                    <div
                        style={{
                            display: "flex",
                            justifyContent: "space-between",
                            alignItems: "center",
                            gap: "15px",
                            flexWrap: "wrap",
                        }}
                    >
                        <div>
                            <h3
                                style={{
                                    margin: 0,
                                    color: "#0f172a",
                                    fontSize: "17px",
                                }}
                            >
                                Analytics Filter
                            </h3>

                            <p
                                style={{
                                    margin: "5px 0 0",
                                    color: "#64748b",
                                    fontSize: "13px",
                                }}
                            >
                                Filter platform analytics by date.
                            </p>
                        </div>

                        <div
                            style={{
                                display: "flex",
                                gap: "10px",
                                flexWrap: "wrap",
                            }}
                        >
                            <input
                                type="date"
                                value={startDate}
                                onChange={(e) =>
                                    setStartDate(e.target.value)
                                }
                                style={inputStyle}
                            />

                            <input
                                type="date"
                                value={endDate}
                                onChange={(e) =>
                                    setEndDate(e.target.value)
                                }
                                style={inputStyle}
                            />

                            <button
                                onClick={handleApplyFilter}
                                style={{
                                    ...buttonStyle,
                                    background: "#0f172a",
                                    color: "white",
                                }}
                            >
                                Apply Filter
                            </button>

                            <button
                                onClick={handleClearFilter}
                                style={{
                                    ...buttonStyle,
                                    background: "#f1f5f9",
                                    color: "#334155",
                                }}
                            >
                                Clear
                            </button>
                        </div>
                    </div>
                </div>


                {/* KPI Cards */}

                <div
                    style={{
                        display: "grid",
                        gridTemplateColumns:
                            "repeat(auto-fit, minmax(180px, 1fr))",
                        gap: "16px",
                        marginBottom: "30px",
                    }}
                >
                    <KpiCard
                        title="Total Users"
                        value={data.total_users || 0}
                    />

                    <KpiCard
                        title="Organizers"
                        value={data.total_organizers || 0}
                    />

                    <KpiCard
                        title="Total Events"
                        value={data.total_events || 0}
                    />

                    <KpiCard
                        title="Total Bookings"
                        value={data.total_bookings || 0}
                    />

                    <KpiCard
                        title="Tickets Sold"
                        value={data.total_tickets_sold || 0}
                    />

                    <KpiCard
                        title="Platform Revenue"
                        value={`₹${Number(
                            data.total_revenue || 0
                        ).toLocaleString("en-IN")}`}
                    />
                </div>


                {/* Management Overview */}

                <div
                    style={{
                        marginBottom: "30px",
                    }}
                >
                    <div style={{ marginBottom: "16px" }}>
                        <h2
                            style={{
                                margin: 0,
                                color: "#0f172a",
                                fontSize: "22px",
                            }}
                        >
                            Management Overview
                        </h2>

                        <p
                            style={{
                                margin: "6px 0 0",
                                color: "#64748b",
                                fontSize: "14px",
                            }}
                        >
                            Use the admin tools to monitor the SmartEvent
                            platform.
                        </p>
                    </div>


                    <div
                        style={{
                            display: "grid",
                            gridTemplateColumns:
                                "repeat(auto-fit, minmax(250px, 1fr))",
                            gap: "18px",
                        }}
                    >

                        {/* User Management */}

                        <Link
                            to="/admin/users"
                            style={{
                                textDecoration: "none",
                            }}
                        >
                            <ManagementCard
                                title="User Management"
                                description="View registered users and their roles."
                                buttonText="View Users"
                            />
                        </Link>


                        {/* Event Management */}

                        <Link
                            to="/admin/events"
                            style={{
                                textDecoration: "none",
                            }}
                        >
                            <ManagementCard
                                title="Event Management"
                                description="Monitor all events and their current status."
                                buttonText="View Events"
                            />
                        </Link>


                        {/* Booking Management */}

                        <Link
                            to="/admin/bookings"
                            style={{
                                textDecoration: "none",
                            }}
                        >
                            <ManagementCard
                                title="Booking Management"
                                description="Review bookings and ticket sales."
                                buttonText="View Bookings"
                            />
                        </Link>

                    </div>
                </div>


                {/* Daily Ticket Sales */}

                <ChartCard
                    title="Daily Ticket Sales"
                    description="Tickets sold and revenue generated each day."
                >
                    {dailyTicketSales.length > 0 ? (
                        <ResponsiveContainer width="100%" height={330}>
                            <BarChart data={dailyTicketSales}>
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis dataKey="date" />

                                <YAxis />

                                <Tooltip />

                                <Legend />

                                <Bar
                                    dataKey="tickets_sold"
                                    name="Tickets Sold"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>


                {/* Monthly Booking Trends */}

                <ChartCard
                    title="Monthly Booking Trends"
                    description="Monthly booking and ticket sales performance."
                >
                    {monthlyBookingTrends.length > 0 ? (
                        <ResponsiveContainer width="100%" height={330}>
                            <LineChart data={monthlyBookingTrends}>
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis dataKey="month" />

                                <YAxis />

                                <Tooltip />

                                <Legend />

                                <Line
                                    type="monotone"
                                    dataKey="bookings"
                                    name="Bookings"
                                />

                                <Line
                                    type="monotone"
                                    dataKey="tickets_sold"
                                    name="Tickets Sold"
                                />
                            </LineChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>


                {/* Most Popular Events */}

                <ChartCard
                    title="Most Popular Events"
                    description="Events ranked by number of tickets sold."
                >
                    {popularEvents.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart
                                data={popularEvents}
                                layout="vertical"
                                margin={{
                                    left: 30,
                                    right: 30,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis type="number" />

                                <YAxis
                                    type="category"
                                    dataKey="event_title"
                                    width={180}
                                />

                                <Tooltip />

                                <Legend />

                                <Bar
                                    dataKey="tickets_sold"
                                    name="Tickets Sold"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>


                {/* Top Revenue Events */}

                <ChartCard
                    title="Top Revenue-Generating Events"
                    description="Events generating the highest platform revenue."
                >
                    {topRevenueEvents.length > 0 ? (
                        <ResponsiveContainer width="100%" height={350}>
                            <BarChart
                                data={topRevenueEvents}
                                layout="vertical"
                                margin={{
                                    left: 30,
                                    right: 30,
                                }}
                            >
                                <CartesianGrid strokeDasharray="3 3" />

                                <XAxis type="number" />

                                <YAxis
                                    type="category"
                                    dataKey="event_title"
                                    width={180}
                                />

                                <Tooltip
                                    formatter={(value) =>
                                        `₹${Number(
                                            value || 0
                                        ).toLocaleString("en-IN")}`
                                    }
                                />

                                <Legend />

                                <Bar
                                    dataKey="revenue"
                                    name="Revenue"
                                />
                            </BarChart>
                        </ResponsiveContainer>
                    ) : (
                        <EmptyChart />
                    )}
                </ChartCard>


                {/* Footer */}

                <div
                    style={{
                        textAlign: "center",
                        marginTop: "35px",
                        color: "#94a3b8",
                        fontSize: "13px",
                    }}
                >
                    SmartEvent Admin Dashboard
                </div>

            </div>
        </div>
    );
}


/* KPI CARD */

function KpiCard({ title, value }) {
    return (
        <div
            style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "22px",
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
                {title}
            </p>

            <h2
                style={{
                    margin: "9px 0 0",
                    color: "#0f172a",
                    fontSize: "27px",
                }}
            >
                {value}
            </h2>
        </div>
    );
}


/* MANAGEMENT CARD */

function ManagementCard({
    title,
    description,
    buttonText,
}) {
    return (
        <div
            style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "24px",
                minHeight: "145px",
                transition: "transform 0.2s ease, box-shadow 0.2s ease",
                cursor: "pointer",
            }}
            onMouseEnter={(e) => {
                e.currentTarget.style.transform =
                    "translateY(-3px)";
                e.currentTarget.style.boxShadow =
                    "0 10px 25px rgba(15, 23, 42, 0.08)";
            }}
            onMouseLeave={(e) => {
                e.currentTarget.style.transform =
                    "translateY(0)";
                e.currentTarget.style.boxShadow =
                    "none";
            }}
        >
            <h3
                style={{
                    margin: "0 0 8px",
                    color: "#0f172a",
                    fontSize: "18px",
                }}
            >
                {title}
            </h3>

            <p
                style={{
                    margin: "0 0 20px",
                    color: "#64748b",
                    fontSize: "14px",
                    lineHeight: "1.5",
                }}
            >
                {description}
            </p>

            <span
                style={{
                    color: "#2563eb",
                    fontSize: "14px",
                    fontWeight: "700",
                }}
            >
                {buttonText} →
            </span>
        </div>
    );
}


/* CHART CARD */

function ChartCard({ title, description, children }) {
    return (
        <div
            style={{
                background: "white",
                border: "1px solid #e2e8f0",
                borderRadius: "14px",
                padding: "24px",
                marginBottom: "24px",
            }}
        >
            <h2
                style={{
                    margin: 0,
                    color: "#0f172a",
                    fontSize: "20px",
                }}
            >
                {title}
            </h2>

            <p
                style={{
                    margin: "6px 0 22px",
                    color: "#64748b",
                    fontSize: "14px",
                }}
            >
                {description}
            </p>

            {children}
        </div>
    );
}


/* EMPTY CHART */

function EmptyChart() {
    return (
        <div
            style={{
                height: "280px",
                display: "flex",
                justifyContent: "center",
                alignItems: "center",
                color: "#94a3b8",
                fontSize: "14px",
            }}
        >
            No analytics data available.
        </div>
    );
}


const inputStyle = {
    padding: "10px 12px",
    border: "1px solid #cbd5e1",
    borderRadius: "8px",
    color: "#334155",
    background: "white",
    outline: "none",
};


const buttonStyle = {
    border: "none",
    padding: "10px 16px",
    borderRadius: "8px",
    cursor: "pointer",
    fontWeight: "600",
};


export default AdminDashboard;