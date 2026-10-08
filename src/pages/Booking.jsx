
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

function Booking() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState("");

    useEffect(() => {
        getEvent();
    }, [eventId]);

    const getEvent = async () => {
        try {
            const response = await axios.get(
                `http://127.0.0.1:8000/events/${eventId}`
            );

            setEvent(response.data);
            setError("");
        } catch (err) {
            console.error(err);

            setError(
                "Unable to load event details."
            );
        } finally {
            setLoading(false);
        }
    };

    const totalPrice = event
        ? event.ticket_price * quantity
        : 0;

    const decreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity(quantity - 1);
        }
    };

    const increaseQuantity = () => {
        if (
            event &&
            quantity < event.available_tickets &&
            quantity < 10
        ) {
            setQuantity(quantity + 1);
        }
    };

    const handleBooking = async () => {
        const token = localStorage.getItem(
            "access_token"
        );

        if (!token) {
            alert(
                "Please login before booking a ticket."
            );

            navigate("/login");

            return;
        }

        if (!event) {
            return;
        }

        if (quantity > event.available_tickets) {
            setError(
                `Only ${event.available_tickets} tickets are available.`
            );

            return;
        }

        try {
            setBooking(true);
            setError("");

            const response = await axios.post(
                "http://127.0.0.1:8000/bookings",
                {
                    event_id: event.id,
                    ticket_quantity: quantity
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            navigate("/booking-success", {
                state: {
                    booking: response.data,
                    event: event
                }
            });

        } catch (err) {
            console.error(err);

            if (err.response) {
                setError(
                    err.response.data.detail ||
                    "Booking failed."
                );
            } else {
                setError(
                    "Unable to connect to the server."
                );
            }
        } finally {
            setBooking(false);
        }
    };

    if (loading) {
        return (
            <div className="booking-page">
                <div className="booking-card">
                    <p>Loading booking details...</p>
                </div>
            </div>
        );
    }

    if (error && !event) {
        return (
            <div className="booking-page">
                <div className="booking-card">

                    <div className="booking-error">
                        {error}
                    </div>

                    <button
                        className="secondary-button"
                        onClick={() => navigate("/")}
                    >
                        Back to Events
                    </button>

                </div>
            </div>
        );
    }

    if (!event) {
        return null;
    }

    if (event.available_tickets === 0) {
        return (
            <div className="booking-page">

                <div className="booking-card">

                    <h1>
                        {event.title}
                    </h1>

                    <div className="sold-out-box">
                        Sold Out
                    </div>

                    <p>
                        There are no tickets available
                        for this event.
                    </p>

                    <button
                        className="secondary-button"
                        onClick={() =>
                            navigate(
                                `/events/${event.id}`
                            )
                        }
                    >
                        Back to Event
                    </button>

                </div>

            </div>
        );
    }

    return (
        <div className="booking-page">

            <div className="booking-card">

                {/* HEADER */}

                <div className="booking-header">

                    <span className="event-category">
                        {event.category}
                    </span>

                    <h1>
                        Book Ticket
                    </h1>

                    <p className="booking-event-title">
                        {event.title}
                    </p>

                </div>


                {/* EVENT INFORMATION */}

                <div className="booking-info">

                    <div className="booking-info-row">

                        <span>
                            Location
                        </span>

                        <strong>
                            {event.location}
                        </strong>

                    </div>

                    <div className="booking-info-row">

                        <span>
                            Date & Time
                        </span>

                        <strong>
                            {new Date(
                                event.event_date
                            ).toLocaleString()}
                        </strong>

                    </div>

                    <div className="booking-info-row">

                        <span>
                            Ticket Price
                        </span>

                        <strong className="booking-price">
                            ₹{event.ticket_price}
                        </strong>

                    </div>

                    <div className="booking-info-row">

                        <span>
                            Available Tickets
                        </span>

                        <strong>
                            {event.available_tickets}
                        </strong>

                    </div>

                </div>


                {/* QUANTITY */}

                <div className="quantity-section">

                    <label>
                        Number of Tickets
                    </label>

                    <div className="quantity-control">

                        <button
                            type="button"
                            onClick={decreaseQuantity}
                            disabled={quantity <= 1}
                        >
                            −
                        </button>

                        <span className="quantity-value">
                            {quantity}
                        </span>

                        <button
                            type="button"
                            onClick={increaseQuantity}
                            disabled={
                                quantity >=
                                    event.available_tickets ||
                                quantity >= 10
                            }
                        >
                            +
                        </button>

                    </div>

                    <p className="ticket-limit">
                        You can book up to 10 tickets.
                    </p>

                </div>


                {/* TOTAL */}

                <div className="total-section">

                    <span>
                        Total Price
                    </span>

                    <strong>
                        ₹{totalPrice}
                    </strong>

                </div>


                {/* ERROR */}

                {error && (
                    <div className="booking-error">
                        {error}
                    </div>
                )}


                {/* CONFIRM BUTTON */}

                <button
                    className="confirm-button"
                    onClick={handleBooking}
                    disabled={booking}
                >
                    {booking
                        ? "Booking..."
                        : "Confirm Booking"}
                </button>


                {/* BACK BUTTON */}

                <button
                    className="secondary-button"
                    onClick={() =>
                        navigate(
                            `/events/${event.id}`
                        )
                    }
                >
                    Back to Event
                </button>

            </div>

        </div>
    );
}

export default Booking;
