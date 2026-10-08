
import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";

function BookingSuccess() {
    const location = useLocation();

    const booking = location.state?.booking;
    const event = location.state?.event;

    const [ticket, setTicket] = useState(null);
    const [loadingTicket, setLoadingTicket] = useState(true);
    const [ticketError, setTicketError] = useState("");

    const ticketRequested = useRef(false);

    useEffect(() => {
        if (!booking) {
            setLoadingTicket(false);
            return;
        }

        if (ticketRequested.current) {
            return;
        }

        ticketRequested.current = true;

        generateTicket();
    }, [booking]);

    const generateTicket = async () => {
        const token = localStorage.getItem("access_token");

        if (!token) {
            setTicketError("Login session not found.");
            setLoadingTicket(false);
            return;
        }

        try {
            const response = await axios.post(
                `http://127.0.0.1:8000/bookings/${booking.id}/ticket`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`
                    }
                }
            );

            setTicket(response.data);
            setTicketError("");
        } catch (error) {
            console.error("Ticket generation error:", error);

            setTicketError(
                error.response?.data?.detail ||
                error.message ||
                "Unable to generate QR ticket."
            );
        } finally {
            setLoadingTicket(false);
        }
    };

    if (!booking || !event) {
        return (
            <div className="success-page">
                <div className="success-card">
                    <h1>Booking Information Not Found</h1>

                    <p>
                        Please make a booking again to view
                        your ticket details.
                    </p>

                    <Link
                        to="/"
                        className="success-button"
                    >
                        Back to Events
                    </Link>
                </div>
            </div>
        );
    }

    const bookingId = `BOOK-${String(
        booking.id
    ).padStart(4, "0")}`;

    const ticketCode = ticket?.ticket_code || "";

    const qrCodeUrl = ticket?.qr_code_url
        ? `http://127.0.0.1:8000${ticket.qr_code_url}`
        : "";

    return (
        <div className="success-page">
            <div className="success-card">

                <div className="success-icon">
                    ✓
                </div>

                <h1>Booking Confirmed</h1>

                <p className="success-message">
                    Your ticket has been booked successfully.
                </p>

                <div className="booking-status">
                    {booking.booking_status || "CONFIRMED"}
                </div>

                <div className="ticket-details">

                    <div className="ticket-row">
                        <span>Event</span>
                        <strong>{event.title}</strong>
                    </div>

                    <div className="ticket-row">
                        <span>Location</span>
                        <strong>{event.location}</strong>
                    </div>

                    <div className="ticket-row">
                        <span>Date & Time</span>
                        <strong>
                            {new Date(
                                event.event_date
                            ).toLocaleString()}
                        </strong>
                    </div>

                    <div className="ticket-row">
                        <span>Ticket Quantity</span>
                        <strong>
                            {booking.ticket_quantity}
                        </strong>
                    </div>

                    <div className="ticket-row">
                        <span>Total Price</span>
                        <strong className="success-price">
                            ₹{booking.total_price}
                        </strong>
                    </div>

                    <div className="ticket-row">
                        <span>Booking ID</span>
                        <strong>{bookingId}</strong>
                    </div>

                </div>

                <div className="qr-section">

                    <h2>Your QR Ticket</h2>

                    {loadingTicket && (
                        <p className="qr-loading">
                            Generating your ticket...
                        </p>
                    )}

                    {!loadingTicket && ticketError && (
                        <div className="qr-error">
                            {ticketError}
                        </div>
                    )}

                    {!loadingTicket &&
                        !ticketError &&
                        qrCodeUrl && (
                            <>
                                <div className="qr-container">
                                    <img
                                        src={qrCodeUrl}
                                        alt="SmartEvent QR Ticket"
                                        className="qr-code"
                                    />
                                </div>

                                <div className="ticket-code-box">
                                    <span>
                                        Ticket Code
                                    </span>

                                    <strong>
                                        {ticketCode}
                                    </strong>
                                </div>
                            </>
                        )}

                </div>

                <div className="success-actions">
                    <Link
                        to="/"
                        className="success-button"
                    >
                        Back to Events
                    </Link>
                </div>

            </div>
        </div>
    );
}

export default BookingSuccess;
