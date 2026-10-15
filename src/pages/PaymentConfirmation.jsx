import "../styles/Payment.css";
import { useLocation, useNavigate } from "react-router-dom";

function PaymentConfirmation() {
const location = useLocation();
const navigate = useNavigate();


const result = location.state?.result;
const event = location.state?.event;
const booking = location.state?.booking;

const payment = result?.payment ?? {};
const isSuccess =
    payment.payment_status === "SUCCESS" ||
    result?.booking_status === "CONFIRMED";

const transactionId =
    payment.transaction_id ?? "Not available";

const amount = Number(
    payment.amount ??
    booking?.total_price ??
    0
);

if (!result || !booking) {
    return (
        <div className="payment-page">
            <div className="payment-card">
                <h1>Booking Details Unavailable</h1>

                <p>
                    We couldn't find the payment confirmation
                    details. Please check your booking history.
                </p>

                <button
                    type="button"
                    className="payment-primary-button"
                    onClick={() => navigate("/bookings")}
                >
                    View My Bookings
                </button>

                <button
                    type="button"
                    className="payment-secondary-button"
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
        <div className="payment-card confirmation-card">
            <div
                className={`confirmation-icon ${
                    isSuccess ? "success-icon" : "failure-icon"
                }`}
            >
                {isSuccess ? "✓" : "!"}
            </div>

            <div className="payment-heading">
                <span className="payment-eyebrow">
                    PAYMENT CONFIRMATION
                </span>

                <h1>
                    {isSuccess
                        ? "Payment Successful!"
                        : "Payment Unsuccessful"}
                </h1>

                <p>
                    {isSuccess
                        ? "Your payment has been processed and your booking is confirmed."
                        : "Your payment was not successful. Please check your booking status."}
                </p>
            </div>

            <div className="confirmation-status">
                <div className="payment-row">
                    <span>Payment Status</span>

                    <strong
                        className={
                            isSuccess
                                ? "status-success"
                                : "status-failed"
                        }
                    >
                        {payment.payment_status ??
                            (isSuccess ? "SUCCESS" : "FAILED")}
                    </strong>
                </div>

                <div className="payment-row">
                    <span>Booking Status</span>

                    <strong>
                        {result.booking_status ??
                            booking.booking_status ??
                            "UNKNOWN"}
                    </strong>
                </div>

                <div className="payment-row">
                    <span>Booking ID</span>

                    <strong>
                        #{result.booking_id ?? booking.id}
                    </strong>
                </div>

                <div className="payment-row">
                    <span>Event</span>

                    <strong>
                        {event?.title ?? "SmartEvent"}
                    </strong>
                </div>

                <div className="payment-row">
                    <span>Amount</span>

                    <strong>
                        ₹{amount.toLocaleString("en-IN")}
                    </strong>
                </div>

                <div className="payment-row transaction-row">
                    <span>Transaction ID</span>

                    <strong>{transactionId}</strong>
                </div>
            </div>

            {isSuccess && (
                <div className="simulation-notice">
                    <strong>Your booking is confirmed</strong>

                    <p>
                        Your payment confirmation has been recorded.
                        Visit My Bookings to view your booking and
                        available ticket details.
                    </p>
                </div>
            )}

            {!isSuccess && (
                <div className="payment-error" role="alert">
                    Your booking may not be confirmed. Check My
                    Bookings before attempting to book again.
                </div>
            )}

            <button
                type="button"
                className="payment-primary-button"
                onClick={() => navigate("/bookings")}
            >
                View My Bookings
            </button>

            <button
                type="button"
                className="payment-secondary-button"
                onClick={() => navigate("/")}
            >
                Browse More Events
            </button>

            <p className="payment-footnote">
                SmartEvent · Event Discovery & Ticket Booking
            </p>
        </div>
    </div>
);


}

export default PaymentConfirmation;
