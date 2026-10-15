import "../styles/Payment.css";
import { useEffect, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function PaymentCheckout() {
const location = useLocation();
const navigate = useNavigate();


const booking = location.state?.booking;
const event = location.state?.event;
const coupon = location.state?.coupon;

const [payment, setPayment] = useState(null);
const [processing, setProcessing] = useState(false);
const [loading, setLoading] = useState(false);
const [error, setError] = useState("");

useEffect(() => {
    if (!booking?.id || !event) {
        setError(
            "Booking details are missing. Please select your event and book again."
        );
    }
}, [booking, event]);

const ticketQuantity = Number(
    booking?.ticket_quantity ??
    booking?.quantity ??
    1
);

// The saved booking amount is authoritative.
const totalAmount = Number(
    booking?.total_price ??
    booking?.final_amount ??
    Number(event?.ticket_price ?? 0) * ticketQuantity
);

// Prefer amounts stored in the actual booking.
const originalAmount = Number(
    booking?.original_price ??
    booking?.original_amount ??
    Number(event?.ticket_price ?? 0) * ticketQuantity
);

const discountAmount = Number(
    booking?.discount_amount ??
    coupon?.discount_amount ??
    0
);

const couponCode =
    coupon?.coupon_code ??
    (booking?.coupon_id ? "Applied coupon" : "");

const formatPrice = (amount) =>
    Number(amount).toLocaleString("en-IN", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
    });

const handlePayment = async () => {
    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    if (!token) {
        navigate("/login");
        return;
    }

    if (!booking?.id || !event) {
        setError("Booking details are missing. Please book again.");
        return;
    }

    try {
        setProcessing(true);
        setError("");

        let currentPayment = payment;

        // Create a payment using the booking ID.
        // The backend should obtain the amount from the saved booking.
        if (!currentPayment) {
            setLoading(true);

            const createResponse = await axios.post(
                `${API_URL}/payments`,
                {
                    booking_id: booking.id,
                    payment_method: "SIMULATED",
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            currentPayment =
                createResponse.data.payment ??
                createResponse.data;

            if (!currentPayment?.id) {
                throw new Error(
                    "The payment record was not returned by the server."
                );
            }

            setPayment(currentPayment);
            setLoading(false);
        }

        // Process the simulated payment.
        const processResponse = await axios.post(
            `${API_URL}/payments/${currentPayment.id}/process`,
            null,
            {
                params: {
                    simulate_failure: false,
                },
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            }
        );

        const result = processResponse.data;

        navigate("/payment-confirmation", {
            replace: true,
            state: {
                result,
                event,
                booking: {
                    ...booking,
                    id: result.booking_id ?? booking.id,
                    booking_status:
                        result.booking_status ?? "CONFIRMED",
                },
            },
        });
    } catch (err) {
        console.error("Payment error:", err);

        const detail = err.response?.data?.detail;

        setError(
            typeof detail === "string"
                ? detail
                : err.message ||
                  "Payment could not be completed. Please try again."
        );
    } finally {
        setProcessing(false);
        setLoading(false);
    }
};

if (!booking || !event) {
    return (
        <div className="payment-page">
            <div className="payment-card">
                <h1>Checkout unavailable</h1>

                <p>
                    {error ||
                        "Booking details are missing."}
                </p>

                <button
                    type="button"
                    onClick={() => navigate("/")}
                >
                    Browse Events
                </button>
            </div>
        </div>
    );
}

return (
    <div className="payment-page">
        <div className="payment-card">
            <div className="payment-heading">
                <span className="payment-eyebrow">
                    SECURE CHECKOUT
                </span>

                <h1>Complete Your Booking</h1>

                <p>
                    Review your order before completing the simulated payment.
                </p>
            </div>

            <div className="payment-event">
                <div>
                    <span className="payment-label">
                        EVENT
                    </span>

                    <h2>{event.title}</h2>

                    <p>{event.location}</p>

                    <p>
                        {event.event_date
                            ? new Date(
                                  event.event_date
                              ).toLocaleString()
                            : "Date unavailable"}
                    </p>
                </div>
            </div>

            <div className="payment-summary">
                <h3>Order Summary</h3>

                <div className="payment-row">
                    <span>Ticket price</span>

                    <strong>
                        ₹{formatPrice(event.ticket_price)}
                    </strong>
                </div>

                <div className="payment-row">
                    <span>Number of tickets</span>

                    <strong>{ticketQuantity}</strong>
                </div>

                <div className="payment-row">
                    <span>Ticket subtotal</span>

                    <strong>
                        ₹{formatPrice(originalAmount)}
                    </strong>
                </div>

                {discountAmount > 0 && (
                    <div className="payment-row payment-discount-row">
                        <span>
                            Coupon discount
                            {couponCode
                                ? ` (${couponCode})`
                                : ""}
                        </span>

                        <strong>
                            −₹{formatPrice(discountAmount)}
                        </strong>
                    </div>
                )}

                <div className="payment-row payment-total">
                    <span>Total amount</span>

                    <strong>
                        ₹{formatPrice(totalAmount)}
                    </strong>
                </div>
            </div>

            <div className="simulation-notice">
                <strong>Demo payment</strong>

                <p>
                    This project uses simulated payments. No real money
                    will be charged.
                </p>
            </div>

            {error && (
                <div
                    className="payment-error"
                    role="alert"
                >
                    {error}
                </div>
            )}

            <button
                type="button"
                className="payment-primary-button"
                onClick={handlePayment}
                disabled={processing || loading}
            >
                {processing || loading
                    ? "Processing Payment..."
                    : `Pay ₹${formatPrice(totalAmount)}`}
            </button>

            <button
                type="button"
                className="payment-secondary-button"
                onClick={() =>
                    navigate(`/events/${event.id}`)
                }
                disabled={processing || loading}
            >
                Back to Event
            </button>

            <p className="payment-footnote">
                Your booking will be confirmed after successful payment.
            </p>
        </div>
    </div>
);


}

export default PaymentCheckout;
