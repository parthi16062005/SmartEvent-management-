
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";
import "../styles/BookingHistory.css";

const API_URL = "http://127.0.0.1:8000";

function BookingHistory() {
    const [bookings, setBookings] = useState([]);
    const [events, setEvents] = useState({});
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    useEffect(() => {
        getBookings();
    }, []);

    const getBookings = async () => {
        const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");

        
    

        if (!token) {
            setError("Please login to view your bookings.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(
                `${API_URL}/bookings`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const bookingData = response.data;
            setBookings(bookingData);
    

            const eventData = {};

            await Promise.all(
                bookingData.map(async (booking) => {
                    try {
                        const eventResponse = await axios.get(
                            `${API_URL}/events/${booking.event_id}`
                        );

                        eventData[booking.event_id] =
                            eventResponse.data;
                    } catch (eventError) {
                        console.error(
                            "Unable to load event:",
                            booking.event_id,
                            eventError
                        );
                    }
                })
            );

            setEvents(eventData);
            setError("");
        } catch (err) {
            console.error("Unable to load bookings:", err);

            setError(
                err.response?.data?.detail ||
                "Unable to load your bookings. Please try again."
            );
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        if (!date) return "Date unavailable";

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
            hour12: true,
        });
    };

    const formatPrice = (price) => {
        return Number(price || 0).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    const getStatusClass = (status) => {
        switch (status?.toUpperCase()) {
            case "CONFIRMED":
                return "status-confirmed";

            case "PENDING":
                return "status-pending";

            case "CANCELLED":
                return "status-cancelled";

            case "FAILED":
                return "status-failed";

            default:
                return "status-default";
        }
    };

    const handleViewBooking = (booking) => {
        const event = events[booking.event_id];

        if (!event) {
            alert("Unable to load the event details. Please try again.");
            return;
        }

        if (booking.booking_status === "CANCELLED") {
            alert(
                "This booking has been cancelled. A QR ticket is not available."
            );
            return;
        }

        if (booking.booking_status !== "CONFIRMED") {
            alert(
                "Your booking is not confirmed yet. Please complete the payment first."
            );
            return;
        }

        navigate("/booking-success", {
            state: {
                booking,
                event,
            },
        });
    };

    const confirmedCount = bookings.filter(
        (booking) => booking.booking_status === "CONFIRMED"
    ).length;

    const cancelledCount = bookings.filter(
        (booking) => booking.booking_status === "CANCELLED"
    ).length;

    const totalTickets = bookings.reduce(
        (total, booking) => {
            if (booking.booking_status === "CONFIRMED") {
                return total + Number(booking.ticket_quantity || 0);
            }

            return total;
        },
        0
    );

    const totalSpent = bookings.reduce(
        (total, booking) => {
            if (booking.booking_status === "CONFIRMED") {
                return total + Number(booking.total_price || 0);
            }

            return total;
        },
        0
    );

    if (loading) {
        return (
            <div className="booking-history-modern">
                <div className="booking-history-modern-container">
                    <div className="booking-history-loading">
                        <div className="booking-history-spinner"></div>
                        <h2>Loading your bookings</h2>
                        <p>Please wait while we fetch your tickets.</p>
                    </div>
                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="booking-history-modern">
                <div className="booking-history-modern-container">
                    <div className="booking-history-error">
                        <div className="booking-history-error-icon">!</div>

                        <h2>Unable to load bookings</h2>

                        <p>{error}</p>

                        <div className="booking-history-error-actions">
                            <button
                                type="button"
                                className="booking-history-btn booking-history-btn-primary"
                                onClick={() => {
                                    setLoading(true);
                                    setError("");
                                    getBookings();
                                }}
                            >
                                Try Again
                            </button>

                            <Link
                                to="/login"
                                className="booking-history-btn booking-history-btn-secondary"
                            >
                                Login
                            </Link>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className="booking-history-modern">
            <div className="booking-history-modern-container">

                {/* PAGE HEADER */}

                <header className="booking-history-page-header">
                    <div className="booking-history-heading-content">
                        <span className="booking-history-eyebrow">
                            YOUR SMART EVENT ACCOUNT
                        </span>

                        <h1>My Bookings</h1>

                        <p>
                            Manage your event reservations, check booking
                            status, and access your tickets in one place.
                        </p>
                    </div>

                    <Link
                        to="/"
                        className="booking-history-explore-btn"
                    >
                        <span aria-hidden="true">+</span>
                        Explore Events
                    </Link>
                </header>

                {/* SUMMARY CARDS */}

                <section
                    className="booking-history-summary"
                    aria-label="Booking summary"
                >
                    <div className="booking-summary-card">
                        <div className="booking-summary-icon summary-icon-blue">
                            BK
                        </div>

                        <div className="booking-summary-information">
                            <span>Total Bookings</span>
                            <strong>{bookings.length}</strong>
                            <small>All reservations</small>
                        </div>
                    </div>

                    <div className="booking-summary-card">
                        <div className="booking-summary-icon summary-icon-green">
                            OK
                        </div>

                        <div className="booking-summary-information">
                            <span>Confirmed</span>
                            <strong>{confirmedCount}</strong>
                            <small>Successful bookings</small>
                        </div>
                    </div>

                    <div className="booking-summary-card">
                        <div className="booking-summary-icon summary-icon-purple">
                            TK
                        </div>

                        <div className="booking-summary-information">
                            <span>Tickets Booked</span>
                            <strong>{totalTickets}</strong>
                            <small>Confirmed tickets</small>
                        </div>
                    </div>

                    <div className="booking-summary-card">
                        <div className="booking-summary-icon summary-icon-orange">
                            ₹
                        </div>

                        <div className="booking-summary-information">
                            <span>Total Spent</span>
                            <strong>₹{formatPrice(totalSpent)}</strong>
                            <small>Confirmed bookings</small>
                        </div>
                    </div>
                </section>

                {/* BOOKING LIST HEADER */}

                <div className="booking-history-section-header">
                    <div>
                        <h2>Your Reservations</h2>
                        <p>
                            {bookings.length === 0
                                ? "Your bookings will appear here."
                                : `${bookings.length} booking${
                                      bookings.length === 1 ? "" : "s"
                                  } found`}
                        </p>
                    </div>

                    {cancelledCount > 0 && (
                        <span className="booking-history-cancelled-count">
                            {cancelledCount} cancelled
                        </span>
                    )}
                </div>

                {/* EMPTY STATE */}

                {bookings.length === 0 ? (
                    <div className="booking-history-empty">
                        <div className="booking-history-empty-icon">
                            <span aria-hidden="true">+</span>
                        </div>

                        <h2>No bookings yet</h2>

                        <p>
                            You haven't booked any events yet. Discover
                            upcoming events and reserve your tickets.
                        </p>

                        <Link
                            to="/"
                            className="booking-history-btn booking-history-btn-primary"
                        >
                            Discover Events
                        </Link>
                    </div>
                ) : (

                    /* BOOKING CARDS */

                    <div className="booking-history-modern-list">
                        {bookings.map((booking) => {
                            const event = events[booking.event_id];

                            const status =
                                booking.booking_status?.toUpperCase() ||
                                "UNKNOWN";

                            return (
                                <article
                                    className="booking-modern-card"
                                    key={booking.id}
                                >
                                    {/* CARD TOP */}

                                    <div className="booking-modern-card-top">
                                        <div className="booking-modern-reference">
                                            <span className="booking-modern-label">
                                                BOOKING REFERENCE
                                            </span>

                                            <strong>
                                                BOOK-
                                                {String(booking.id).padStart(
                                                    4,
                                                    "0"
                                                )}
                                            </strong>
                                        </div>

                                        <span
                                            className={`booking-modern-status ${getStatusClass(
                                                status
                                            )}`}
                                        >
                                            <span className="booking-status-dot"></span>
                                            {status}
                                        </span>
                                    </div>

                                    {/* EVENT INFORMATION */}

                                    <div className="booking-modern-event">
                                        <div className="booking-modern-event-icon">
                                            <span aria-hidden="true">EV</span>
                                        </div>

                                        <div className="booking-modern-event-title">
                                            <span className="booking-modern-label">
                                                EVENT
                                            </span>

                                            <h3>
                                                {event
                                                    ? event.title
                                                    : "Event details unavailable"}
                                            </h3>

                                            <p>
                                                {event?.category ||
                                                    "Event reservation"}
                                            </p>
                                        </div>
                                    </div>

                                    {/* EVENT DETAILS */}

                                    <div className="booking-modern-details">
                                        <div className="booking-modern-detail">
                                            <span className="booking-modern-detail-icon">
                                                LOC
                                            </span>

                                            <div>
                                                <span>Venue</span>

                                                <strong>
                                                    {event
                                                        ? event.location
                                                        : "Unavailable"}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="booking-modern-detail">
                                            <span className="booking-modern-detail-icon">
                                                DAT
                                            </span>

                                            <div>
                                                <span>Event Date</span>

                                                <strong>
                                                    {event
                                                        ? formatDate(
                                                              event.event_date
                                                          )
                                                        : "Unavailable"}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="booking-modern-detail">
                                            <span className="booking-modern-detail-icon">
                                                TKT
                                            </span>

                                            <div>
                                                <span>Ticket Quantity</span>

                                                <strong>
                                                    {booking.ticket_quantity}
                                                    {Number(
                                                        booking.ticket_quantity
                                                    ) === 1
                                                        ? " ticket"
                                                        : " tickets"}
                                                </strong>
                                            </div>
                                        </div>

                                        <div className="booking-modern-detail">
                                            <span className="booking-modern-detail-icon">
                                                INR
                                            </span>

                                            <div>
                                                <span>Total Amount</span>

                                                <strong className="booking-modern-price">
                                                    ₹
                                                    {formatPrice(
                                                        booking.total_price
                                                    )}
                                                </strong>
                                            </div>
                                        </div>
                                    </div>

                                    {/* CARD FOOTER */}

                                    <div className="booking-modern-card-footer">
                                        <div className="booking-modern-payment-info">
                                            <span
                                                className={`booking-payment-indicator ${
                                                    status === "CONFIRMED"
                                                        ? "payment-indicator-success"
                                                        : status === "CANCELLED" ||
                                                            status === "FAILED"
                                                          ? "payment-indicator-failed"
                                                          : "payment-indicator-pending"
                                                }`}
                                            ></span>

                                            <span>
                                                {status === "CONFIRMED"
                                                    ? "Booking confirmed"
                                                    : status === "CANCELLED"
                                                      ? "Booking cancelled"
                                                      : status === "FAILED"
                                                        ? "Booking failed"
                                                        : "Awaiting confirmation"}
                                            </span>
                                        </div>

                                        {status === "CONFIRMED" ? (
                                            <button
                                                type="button"
                                                className="booking-history-btn booking-history-btn-primary booking-view-ticket-btn"
                                                onClick={() =>
                                                    handleViewBooking(booking)
                                                }
                                            >
                                                View Ticket
                                                <span aria-hidden="true">
                                                    →
                                                </span>
                                            </button>
                                        ) : status === "CANCELLED" ||
                                          status === "FAILED" ? (
                                            <span className="booking-history-unavailable">
                                                Ticket unavailable
                                            </span>
                                        ) : (
                                            <span className="booking-history-pending-message">
                                                Confirmation pending
                                            </span>
                                        )}
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {/* BOTTOM INFORMATION */}

                <div className="booking-history-help">
                    <div className="booking-history-help-icon">i</div>

                    <p>
                        Need to access a ticket? Select{" "}
                        <strong>View Ticket</strong> on a confirmed booking
                        to open your ticket and QR code.
                    </p>
                </div>

            </div>
        </div>
    );
}

export default BookingHistory;
