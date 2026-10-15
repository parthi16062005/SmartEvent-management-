import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import axios from "axios";
import "../styles/Ticket.css";

const API_URL = "http://127.0.0.1:8000";

function BookingSuccess() {
const location = useLocation();


const booking = location.state?.booking;
const event = location.state?.event;

const [ticket, setTicket] = useState(null);
const [loadingTicket, setLoadingTicket] = useState(true);
const [ticketError, setTicketError] = useState("");

const ticketRequested = useRef(false);

useEffect(() => {
    if (!booking?.id) {
        setLoadingTicket(false);
        return;
    }

    if (ticketRequested.current) {
        return;
    }

    ticketRequested.current = true;

    const generateTicket = async () => {
        const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");

        if (!token) {
            setTicketError("Your login session has expired. Please log in again.");
            setLoadingTicket(false);
            return;
        }

        try {
            const response = await axios.post(
                `${API_URL}/bookings/${booking.id}/ticket`,
                {},
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setTicket(response.data);
            setTicketError("");
        } catch (error) {
            console.error("Ticket generation error:", error);

            setTicketError(
                error.response?.data?.detail ||
                "Unable to load your QR ticket. Please try again."
            );
        } finally {
            setLoadingTicket(false);
        }
    };

    generateTicket();
}, [booking]);

if (!booking || !event) {
    return (
        <div className="ticket-page">
            <div className="ticket-message-card">
                <div className="ticket-message-icon">!</div>

                <h1>Booking Details Not Found</h1>

                <p>
                    We couldn't find your booking details.
                    Please visit your bookings to view your ticket.
                </p>

                <Link to="/bookings" className="ticket-primary-button">
                    View My Bookings
                </Link>

                <Link to="/" className="ticket-secondary-button">
                    Browse Events
                </Link>
            </div>
        </div>
    );
}

const bookingId = `BOOK-${String(booking.id).padStart(4, "0")}`;

const ticketCode = ticket?.ticket_code || "";

const qrCodeUrl = ticket?.qr_code_url
    ? ticket.qr_code_url.startsWith("http")
        ? ticket.qr_code_url
        : `${API_URL}${ticket.qr_code_url}`
    : "";

const eventDate = event.event_date
    ? new Date(event.event_date)
    : null;

const formattedDate =
    eventDate && !Number.isNaN(eventDate.getTime())
        ? eventDate.toLocaleDateString("en-IN", {
              day: "2-digit",
              month: "short",
              year: "numeric",
          })
        : "Date unavailable";

const formattedTime =
    eventDate && !Number.isNaN(eventDate.getTime())
        ? eventDate.toLocaleTimeString("en-IN", {
              hour: "2-digit",
              minute: "2-digit",
          })
        : "Time unavailable";

const ticketQuantity = Number(
    booking.ticket_quantity ?? booking.quantity ?? 1
);

const totalPrice = Number(
    booking.total_price ?? booking.final_amount ?? 0
);

const handlePrint = () => {
    window.print();
};

return (
    <main className="ticket-page">
        <div className="ticket-content">

            <header className="ticket-success-heading no-print">
                <div className="ticket-success-symbol">✓</div>

                <h1>Booking Confirmed!</h1>

                <p>
                    You're all set! Your event ticket is ready.
                </p>

                <span className="ticket-success-badge">
                    PAYMENT & BOOKING CONFIRMED
                </span>
            </header>

            <section className="event-ticket">

                <div className="event-ticket-header">
                    <div className="ticket-brand">
                        <span className="ticket-brand-symbol">S</span>

                        <div>
                            <strong>SmartEvent</strong>
                            <span>YOUR EVENT. YOUR EXPERIENCE.</span>
                        </div>
                    </div>

                    <span className="ticket-confirmed-label">
                        CONFIRMED
                    </span>
                </div>

                <div className="event-ticket-body">

                    <div className="event-ticket-information">
                        <span className="ticket-section-label">
                            YOUR EVENT TICKET
                        </span>

                        <h2>{event.title}</h2>

                        <p className="ticket-event-description">
                            Keep this ticket ready when attending your event.
                        </p>

                        <div className="ticket-event-info-grid">

                            <div className="ticket-info-item">
                                <span className="ticket-info-icon">
                                    DATE
                                </span>

                                <div>
                                    <span>Date</span>
                                    <strong>{formattedDate}</strong>
                                </div>
                            </div>

                            <div className="ticket-info-item">
                                <span className="ticket-info-icon">
                                    TIME
                                </span>

                                <div>
                                    <span>Time</span>
                                    <strong>{formattedTime}</strong>
                                </div>
                            </div>

                            <div className="ticket-info-item">
                                <span className="ticket-info-icon">
                                    VENUE
                                </span>

                                <div>
                                    <span>Location</span>
                                    <strong>{event.location || "Not specified"}</strong>
                                </div>
                            </div>

                            <div className="ticket-info-item">
                                <span className="ticket-info-icon">
                                    QTY
                                </span>

                                <div>
                                    <span>Tickets</span>
                                    <strong>{ticketQuantity}</strong>
                                </div>
                            </div>

                        </div>
                    </div>

                    <div className="ticket-qr-panel">
                        <h3>Your QR Ticket</h3>

                        {loadingTicket && (
                            <div className="ticket-qr-placeholder">
                                <div className="ticket-spinner"></div>
                                <p>Preparing your ticket...</p>
                            </div>
                        )}

                        {!loadingTicket && ticketError && (
                            <div className="ticket-qr-error">
                                <p>{ticketError}</p>

                                <button
                                    type="button"
                                    onClick={() => window.location.reload()}
                                >
                                    Try Again
                                </button>
                            </div>
                        )}

                        {!loadingTicket && !ticketError && qrCodeUrl && (
                            <>
                                <div className="ticket-qr-image-container">
                                    <img
                                        src={qrCodeUrl}
                                        alt="SmartEvent ticket QR code"
                                        className="ticket-qr-image"
                                    />
                                </div>

                                <p className="ticket-qr-instruction">
                                    Present this QR code at the event entrance.
                                </p>

                                <div className="ticket-code-container">
                                    <span>TICKET CODE</span>
                                    <strong>{ticketCode || "Unavailable"}</strong>
                                </div>
                            </>
                        )}

                        {!loadingTicket &&
                            !ticketError &&
                            !qrCodeUrl && (
                                <div className="ticket-qr-error">
                                    <p>
                                        Your ticket was returned, but its QR image
                                        URL is unavailable.
                                    </p>
                                </div>
                            )}
                    </div>

                </div>

                <div className="ticket-perforation">
                    <span></span>
                    <span></span>
                </div>

                <footer className="event-ticket-footer">

                    <div className="ticket-booking-reference">
                        <span>BOOKING REFERENCE</span>
                        <strong>{bookingId}</strong>
                    </div>

                    <div className="ticket-price-reference">
                        <span>TOTAL PAID</span>
                        <strong>
                            ₹{totalPrice.toLocaleString("en-IN")}
                        </strong>
                    </div>

                </footer>

            </section>

            <div className="ticket-actions no-print">
                <button
                    type="button"
                    className="ticket-primary-button"
                    onClick={handlePrint}
                >
                    Print Ticket
                </button>

                <Link
                    to="/bookings"
                    className="ticket-secondary-button"
                >
                    View My Bookings
                </Link>

                <Link
                    to="/"
                    className="ticket-text-link"
                >
                    Explore More Events
                </Link>
            </div>

            <p className="ticket-help-text no-print">
                Keep your QR code accessible so it can be scanned at the venue.
            </p>

        </div>
    </main>
);


}

export default BookingSuccess;
