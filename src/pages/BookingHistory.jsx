
import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

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
        const token = localStorage.getItem("access_token");

        if (!token) {
            setError("Please login to view your bookings.");
            setLoading(false);
            return;
        }

        try {
            const response = await axios.get(
                "http://127.0.0.1:8000/bookings",
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            const bookingData = response.data;

            setBookings(bookingData);

            /*
             * Get event details for every booking.
             * This allows the history page to show
             * event name, location and date/time.
             */
            const eventData = {};

            for (const booking of bookingData) {
                try {
                    const eventResponse = await axios.get(
                        `http://127.0.0.1:8000/events/${booking.event_id}`
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
            }

            setEvents(eventData);
            setError("");

        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to load your bookings."
            );
        } finally {
            setLoading(false);
        }
    };

    const formatDate = (date) => {
        return new Date(date).toLocaleString();
    };

    const handleViewBooking = (booking) => {
        const event = events[booking.event_id];

        if (!event) {
            alert(
                "Unable to load the event details."
            );

            return;
        }

        /*
         * For confirmed bookings, open the booking
         * success page with the correct event data.
         */
        if (
            booking.booking_status === "CONFIRMED"
        ) {
            navigate("/booking-success", {
                state: {
                    booking: booking,
                    event: event
                }
            });

            return;
        }

        /*
         * Cancelled bookings should not generate
         * a QR ticket.
         */
        if (
            booking.booking_status === "CANCELLED"
        ) {
            alert(
                "This booking has been cancelled. QR ticket is not available."
            );

            return;
        }

        navigate("/booking-success", {
            state: {
                booking: booking,
                event: event
            }
        });
    };

    if (loading) {
        return (
            <div className="booking-history-page">
                <div className="booking-history-container">

                    <div className="history-status">
                        Loading your bookings...
                    </div>

                </div>
            </div>
        );
    }

    if (error) {
        return (
            <div className="booking-history-page">
                <div className="booking-history-container">

                    <div className="history-error">
                        {error}
                    </div>

                    <Link
                        to="/login"
                        className="history-button"
                    >
                        Login
                    </Link>

                </div>
            </div>
        );
    }

    return (
        <div className="booking-history-page">

            <div className="booking-history-container">

                <div className="booking-history-header">

                    <h1>
                        My Bookings
                    </h1>

                    <p>
                        View your event bookings and ticket details.
                    </p>

                </div>

                {bookings.length === 0 ? (

                    <div className="empty-bookings">

                        <h2>
                            No bookings found
                        </h2>

                        <p>
                            You have not booked any tickets yet.
                        </p>

                        <Link
                            to="/"
                            className="history-button"
                        >
                            Explore Events
                        </Link>

                    </div>

                ) : (

                    <div className="booking-history-list">

                        {bookings.map((booking) => {

                            const event =
                                events[booking.event_id];

                            return (
                                <div
                                    className="booking-history-card"
                                    key={booking.id}
                                >

                                    <div className="booking-history-card-header">

                                        <div>

                                            <span className="history-label">
                                                Booking ID
                                            </span>

                                            <strong>
                                                BOOK-
                                                {String(
                                                    booking.id
                                                ).padStart(4, "0")}
                                            </strong>

                                        </div>

                                        <span
                                            className={`history-status-badge ${
                                                booking.booking_status?.toLowerCase()
                                            }`}
                                        >
                                            {booking.booking_status}
                                        </span>

                                    </div>

                                    {event && (
                                        <div
                                            className="booking-history-event"
                                            style={{
                                                marginTop: "20px",
                                                marginBottom: "20px"
                                            }}
                                        >

                                            <span
                                                className="history-label"
                                            >
                                                Event
                                            </span>

                                            <strong
                                                style={{
                                                    display: "block",
                                                    color: "#111827",
                                                    fontSize: "18px",
                                                    marginTop: "5px"
                                                }}
                                            >
                                                {event.title}
                                            </strong>

                                        </div>
                                    )}

                                    <div className="booking-history-details">

                                        <div className="history-detail">

                                            <span>
                                                Location
                                            </span>

                                            <strong>
                                                {event
                                                    ? event.location
                                                    : "Loading..."}
                                            </strong>

                                        </div>

                                        <div className="history-detail">

                                            <span>
                                                Date & Time
                                            </span>

                                            <strong>
                                                {event
                                                    ? formatDate(
                                                        event.event_date
                                                    )
                                                    : "Loading..."}
                                            </strong>

                                        </div>

                                        <div className="history-detail">

                                            <span>
                                                Ticket Quantity
                                            </span>

                                            <strong>
                                                {booking.ticket_quantity}
                                            </strong>

                                        </div>

                                        <div className="history-detail">

                                            <span>
                                                Total Price
                                            </span>

                                            <strong className="history-price">
                                                ₹{booking.total_price}
                                            </strong>

                                        </div>

                                    </div>

                                    <div className="booking-history-footer">

                                        {booking.booking_status ===
                                            "CONFIRMED" ? (

                                            <button
                                                type="button"
                                                className="history-button secondary-history-button"
                                                onClick={() =>
                                                    handleViewBooking(
                                                        booking
                                                    )
                                                }
                                            >
                                                View Booking
                                            </button>

                                        ) : (

                                            <div
                                                className="cancelled-booking-message"
                                                style={{
                                                    color: "#b91c1c",
                                                    fontSize: "14px",
                                                    fontWeight: "600"
                                                }}
                                            >
                                                Booking Cancelled
                                            </div>

                                        )}

                                    </div>

                                </div>
                            );
                        })}

                    </div>

                )}

            </div>

        </div>
    );
}

export default BookingHistory;
