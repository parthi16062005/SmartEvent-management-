import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
    Bell,
    CheckCheck,
    Clock,
    ArrowLeft,
    RefreshCw
} from "lucide-react";
import "../styles/NotificationHistory.css";

const API_URL = "http://127.0.0.1:8000";

function NotificationHistory() {
    const [notifications, setNotifications] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [updatingId, setUpdatingId] = useState(null);

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    const loadNotifications = async () => {
        if (!token) {
            setError("Please log in to view your notifications.");
            setLoading(false);
            return;
        }

        setLoading(true);
        setError("");

        try {
            const response = await axios.get(
                `${API_URL}/notifications`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setNotifications(
                Array.isArray(response.data)
                    ? response.data
                    : []
            );
        } catch (err) {
            console.error("Unable to load notifications:", err);

            setError(
                err.response?.data?.detail ||
                "Unable to load notifications. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadNotifications();
    }, []);

    const markAsRead = async (notification) => {
        if (notification.is_read || !token) {
            return;
        }

        setUpdatingId(notification.id);

        try {
            const response = await axios.post(
                `${API_URL}/notifications/${notification.id}/read`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setNotifications((current) =>
                current.map((item) =>
                    item.id === notification.id
                        ? response.data
                        : item
                )
            );
        } catch (err) {
            console.error("Unable to mark notification as read:", err);

            setError(
                err.response?.data?.detail ||
                "Unable to mark notification as read."
            );
        } finally {
            setUpdatingId(null);
        }
    };

    const unreadCount = notifications.filter(
        (notification) => !notification.is_read
    ).length;

    const formatDate = (dateValue) => {
        if (!dateValue) {
            return "Date unavailable";
        }

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date unavailable";
        }

        return date.toLocaleString("en-IN", {
            dateStyle: "medium",
            timeStyle: "short",
        });
    };

    const getTypeLabel = (type) => {
        return type
            ? type.charAt(0) + type.slice(1).toLowerCase()
            : "General";
    };

    return (
        <main className="notification-history-page">
            <section className="notification-history-container">

                <Link
                    to="/"
                    className="notification-back-link"
                >
                    <ArrowLeft size={18} />
                    Back to Home
                </Link>

                <header className="notification-history-header">
                    <div className="notification-history-title">
                        <div className="notification-history-icon">
                            <Bell size={27} />
                        </div>

                        <div>
                            <p className="notification-eyebrow">
                                YOUR SMART EVENT ACCOUNT
                            </p>

                            <h1>Notification History</h1>

                            <p>
                                Stay updated on your bookings,
                                payments, and upcoming events.
                            </p>
                        </div>
                    </div>

                    <button
                        type="button"
                        className="notification-refresh-button"
                        onClick={loadNotifications}
                        disabled={loading}
                    >
                        <RefreshCw size={17} />
                        Refresh
                    </button>
                </header>

                <section className="notification-history-stats">
                    <div className="notification-stat-card">
                        <span>Total Notifications</span>
                        <strong>{notifications.length}</strong>
                    </div>

                    <div className="notification-stat-card">
                        <span>Unread Notifications</span>
                        <strong>{unreadCount}</strong>
                    </div>

                    <div className="notification-stat-card">
                        <span>Read Notifications</span>
                        <strong>
                            {notifications.length - unreadCount}
                        </strong>
                    </div>
                </section>

                {error && (
                    <div className="notification-history-error">
                        {error}
                    </div>
                )}

                <section className="notification-history-list-section">
                    <div className="notification-history-list-header">
                        <div>
                            <h2>All Notifications</h2>
                            <p>
                                Your recent activity and updates
                            </p>
                        </div>

                        <span className="notification-total-badge">
                            {notifications.length} notifications
                        </span>
                    </div>

                    {loading ? (
                        <div className="notification-history-loading">
                            <span className="notification-spinner" />
                            <p>Loading your notifications...</p>
                        </div>
                    ) : notifications.length === 0 ? (
                        <div className="notification-history-empty">
                            <Bell size={40} />

                            <h3>No notifications yet</h3>

                            <p>
                                Booking confirmations, payment updates,
                                and event reminders will appear here.
                            </p>

                            <Link
                                to="/"
                                className="notification-explore-button"
                            >
                                Explore Events
                            </Link>
                        </div>
                    ) : (
                        <div className="notification-history-list">
                            {notifications.map((notification) => (
                                <article
                                    key={notification.id}
                                    className={`notification-history-item ${
                                        notification.is_read
                                            ? "history-read"
                                            : "history-unread"
                                    }`}
                                >
                                    <div className="notification-history-item-icon">
                                        {notification.is_read ? (
                                            <CheckCheck size={21} />
                                        ) : (
                                            <Bell size={21} />
                                        )}
                                    </div>

                                    <div className="notification-history-content">
                                        <div className="notification-history-item-top">
                                            <h3>
                                                {notification.title}
                                            </h3>

                                            <span
                                                className={`notification-type-badge type-${(
                                                    notification.type ||
                                                    "system"
                                                ).toLowerCase()}`}
                                            >
                                                {getTypeLabel(
                                                    notification.type
                                                )}
                                            </span>
                                        </div>

                                        <p className="notification-history-message">
                                            {notification.message}
                                        </p>

                                        <div className="notification-history-meta">
                                            <span>
                                                <Clock size={14} />
                                                {formatDate(
                                                    notification.created_at
                                                )}
                                            </span>

                                            <span
                                                className={`notification-read-status ${
                                                    notification.is_read
                                                        ? "status-read"
                                                        : "status-unread"
                                                }`}
                                            >
                                                {notification.is_read
                                                    ? "Read"
                                                    : "Unread"}
                                            </span>
                                        </div>
                                    </div>

                                    {!notification.is_read && (
                                        <button
                                            type="button"
                                            className="notification-mark-read-button"
                                            onClick={() =>
                                                markAsRead(notification)
                                            }
                                            disabled={
                                                updatingId ===
                                                notification.id
                                            }
                                        >
                                            {updatingId ===
                                            notification.id
                                                ? "Updating..."
                                                : "Mark as read"}
                                        </button>
                                    )}
                                </article>
                            ))}
                        </div>
                    )}
                </section>
            </section>
        </main>
    );
}

export default NotificationHistory;