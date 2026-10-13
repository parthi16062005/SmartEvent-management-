import "../styles/Navbar.css";
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Bell, History } from "lucide-react";
import axios from "axios";

function Navbar() {
const [notifications, setNotifications] = useState([]);
const [unreadCount, setUnreadCount] = useState(0);
const [showNotifications, setShowNotifications] = useState(false);


const navigate = useNavigate();

const token = localStorage.getItem("access_token");

const getUserRole = () => {
    if (!token) {
        return null;
    }

    try {
        const tokenParts = token.split(".");

        if (tokenParts.length !== 3) {
            return null;
        }

        const payload = JSON.parse(
            atob(
                tokenParts[1]
                    .replace(/-/g, "+")
                    .replace(/_/g, "/")
            )
        );

        return payload.role || null;
    } catch (error) {
        console.error("Unable to read user role:", error);
        return null;
    }
};

const userRole = getUserRole();

// Load notifications
const getNotifications = async () => {
    const currentToken = localStorage.getItem("access_token");

    if (!currentToken) {
        setNotifications([]);
        setUnreadCount(0);
        return;
    }

    try {
        const response = await axios.get(
            "http://127.0.0.1:8000/notifications",
            {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            }
        );

        setNotifications(
            Array.isArray(response.data) ? response.data : []
        );
    } catch (error) {
        console.error("Unable to load notifications:", error);
    }
};

// Load unread notification count
const getUnreadCount = async () => {
    const currentToken = localStorage.getItem("access_token");

    if (!currentToken) {
        setUnreadCount(0);
        return;
    }

    try {
        const response = await axios.get(
            "http://127.0.0.1:8000/notifications/unread-count",
            {
                headers: {
                    Authorization: `Bearer ${currentToken}`,
                },
            }
        );

        setUnreadCount(response.data.unread_count);
    } catch (error) {
        console.error("Unable to load unread count:", error);
    }
};

useEffect(() => {
    if (token && userRole !== "ADMIN") {
        getNotifications();
        getUnreadCount();
    } else {
        setNotifications([]);
        setUnreadCount(0);
        setShowNotifications(false);
    }
}, [token, userRole]);

// Mark notification as read
const handleNotificationClick = async (notification) => {
    const currentToken = localStorage.getItem("access_token");

    if (!currentToken) {
        return;
    }

    if (!notification.is_read) {
        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/notifications/${notification.id}/read`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${currentToken}`,
                    },
                }
            );

            setNotifications((currentNotifications) =>
                currentNotifications.map((item) =>
                    item.id === notification.id
                        ? response.data
                        : item
                )
            );

            setUnreadCount((count) =>
                count > 0 ? count - 1 : 0
            );
        } catch (error) {
            console.error(
                "Unable to mark notification as read:",
                error
            );
        }
    }
};

// Toggle notifications dropdown
const toggleNotifications = () => {
    const newState = !showNotifications;

    setShowNotifications(newState);

    if (newState) {
        getNotifications();
        getUnreadCount();
    }
};

// Close dropdown and open notification history
const openNotificationHistory = () => {
    setShowNotifications(false);
    navigate("/notifications");
};

// Logout
const handleLogout = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("token");
    localStorage.removeItem("user");

    setNotifications([]);
    setUnreadCount(0);
    setShowNotifications(false);

    navigate("/login");
    window.location.reload();
};

return (
    <header className="navbar">
        <div className="navbar-container">
            {/* BRAND */}
            <Link to="/" className="navbar-brand">
                SmartEvent
            </Link>

            {/* NAVIGATION LINKS */}
            <nav className="navbar-links">
                <Link to="/">
                    Home
                </Link>

                <a href="/#categories">
                    Categories
                </a>

                {userRole !== "ADMIN" && (
                    <Link to="/bookings">
                        My Bookings
                    </Link>
                )}

                {userRole === "ORGANIZER" && (
                    <Link to="/organizer">
                        Organizer
                    </Link>
                )}

                {userRole === "ADMIN" && (
                    <>
                        <Link to="/admin">
                            Admin Dashboard
                        </Link>

                        <Link to="/admin/users">
                            Users
                        </Link>

                        <Link to="/admin/events">
                            Events
                        </Link>

                        <Link to="/admin/bookings">
                            Bookings
                        </Link>
                    </>
                )}
            </nav>

            {/* ACTIONS: NOTIFICATIONS AND AUTHENTICATION */}
            <div className="navbar-actions">
                {/* NOTIFICATIONS */}
                {token && userRole !== "ADMIN" && (
                    <div className="notification-wrapper">
                        <button
                            type="button"
                            className="notification-button"
                            onClick={toggleNotifications}
                            aria-label="Notifications"
                            aria-expanded={showNotifications}
                        >
                            <Bell
                                size={21}
                                strokeWidth={2}
                            />

                            {unreadCount > 0 && (
                                <span className="notification-count">
                                    {unreadCount}
                                </span>
                            )}
                        </button>

                        {showNotifications && (
                            <div className="notification-dropdown">
                                <div className="notification-header">
                                    <strong>
                                        Notifications
                                    </strong>

                                    <span>
                                        {unreadCount} unread
                                    </span>
                                </div>

                                <div className="notification-list">
                                    {notifications.length === 0 ? (
                                        <div className="no-notifications">
                                            No notifications
                                        </div>
                                    ) : (
                                        notifications.map(
                                            (notification) => (
                                                <button
                                                    type="button"
                                                    key={notification.id}
                                                    className={`notification-item ${
                                                        notification.is_read
                                                            ? "read"
                                                            : "unread"
                                                    }`}
                                                    onClick={() =>
                                                        handleNotificationClick(
                                                            notification
                                                        )
                                                    }
                                                >
                                                    <div className="notification-title">
                                                        {notification.title}
                                                    </div>

                                                    <div className="notification-message">
                                                        {notification.message}
                                                    </div>

                                                    <div className="notification-date">
                                                        {new Date(
                                                            notification.created_at
                                                        ).toLocaleString("en-IN")}
                                                    </div>
                                                </button>
                                            )
                                        )
                                    )}
                                </div>

                                {/* VIEW ALL NOTIFICATIONS */}
                                <div className="notification-footer">
                                    <button
                                        type="button"
                                        className="notification-history-link"
                                        onClick={openNotificationHistory}
                                    >
                                        <History size={16} />
                                        View Notification History
                                    </button>
                                </div>
                            </div>
                        )}
                    </div>
                )}

                {/* LOGIN AND REGISTER */}
                {!token && (
                    <>
                        <Link
                            to="/login"
                            className="login-button"
                        >
                            Login
                        </Link>

                        <Link
                            to="/register"
                            className="register-button"
                        >
                            Register
                        </Link>
                    </>
                )}

                {/* LOGOUT */}
                {token && (
                    <button
                        type="button"
                        className="login-button"
                        onClick={handleLogout}
                    >
                        Logout
                    </button>
                )}
            </div>
        </div>
    </header>
);


}

export default Navbar;
