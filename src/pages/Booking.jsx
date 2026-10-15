import "../styles/Booking.css";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";

function Booking() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [event, setEvent] = useState(null);
    const [quantity, setQuantity] = useState(1);

    const [loading, setLoading] = useState(true);
    const [booking, setBooking] = useState(false);
    const [error, setError] = useState("");

    // Coupon states
    const [couponCode, setCouponCode] = useState("");
    const [appliedCoupon, setAppliedCoupon] = useState(null);
    const [couponLoading, setCouponLoading] = useState(false);
    const [couponError, setCouponError] = useState("");
    const [couponSuccess, setCouponSuccess] = useState("");

    // Load event details
    useEffect(() => {
        let active = true;

        const getEvent = async () => {
            try {
                const response = await axios.get(
                    `${API_URL}/events/${eventId}`
                );

                if (active) {
                    setEvent(response.data);
                    setError("");
                }
            } catch (err) {
                console.error(err);

                if (active) {
                    setError("Unable to load event details.");
                }
            } finally {
                if (active) {
                    setLoading(false);
                }
            }
        };

        getEvent();

        return () => {
            active = false;
        };
    }, [eventId]);

    // Authentication token
    const getToken = () => {
        return (
            localStorage.getItem("access_token") ||
            localStorage.getItem("token")
        );
    };

    // Original price before discount
    const originalPrice = event
        ? Number(event.ticket_price) * quantity
        : 0;

    // Discount amount
    const discountAmount = appliedCoupon
        ? Number(appliedCoupon.discount_amount)
        : 0;

    // Final price after discount
    const finalPrice = appliedCoupon
        ? Number(appliedCoupon.final_amount)
        : originalPrice;

    // Format currency
    const formatPrice = (amount) => {
        return Number(amount).toLocaleString("en-IN", {
            minimumFractionDigits: 2,
            maximumFractionDigits: 2,
        });
    };

    // Remove applied coupon
    const clearAppliedCoupon = () => {
        setAppliedCoupon(null);
        setCouponError("");
        setCouponSuccess("");
    };

    // Decrease ticket quantity
    const decreaseQuantity = () => {
        if (quantity > 1) {
            setQuantity((current) => current - 1);
            clearAppliedCoupon();
        }
    };

    // Increase ticket quantity
    const increaseQuantity = () => {
        if (
            event &&
            quantity < event.available_tickets &&
            quantity < 10
        ) {
            setQuantity((current) => current + 1);
            clearAppliedCoupon();
        }
    };

    // Apply coupon
    const handleApplyCoupon = async () => {
        const token = getToken();
        const code = couponCode.trim();

        setCouponError("");
        setCouponSuccess("");

        if (!token) {
            navigate("/login");
            return;
        }

        if (!code) {
            setCouponError("Please enter a coupon code.");
            return;
        }

        if (!event || originalPrice <= 0) {
            setCouponError("Unable to calculate the booking amount.");
            return;
        }

        try {
            setCouponLoading(true);

            const response = await axios.post(
                `${API_URL}/coupons/apply`,
                {
                    code: code,
                    booking_amount: originalPrice,
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const coupon = response.data;

            setAppliedCoupon({
                coupon_code: coupon.coupon_code,
                discount_amount: Number(coupon.discount_amount),
                original_amount: Number(coupon.original_amount),
                final_amount: Number(coupon.final_amount),
            });

            setCouponCode(coupon.coupon_code);

            setCouponSuccess(
                coupon.message || "Coupon applied successfully!"
            );
        } catch (err) {
            console.error("Coupon application failed:", err);

            const detail = err.response?.data?.detail;

            setAppliedCoupon(null);

            setCouponError(
                typeof detail === "string"
                    ? detail
                    : "Unable to apply the coupon. Please try again."
            );
        } finally {
            setCouponLoading(false);
        }
    };

    // Remove coupon
    const handleRemoveCoupon = () => {
        setAppliedCoupon(null);
        setCouponCode("");
        setCouponError("");
        setCouponSuccess("");
    };

    // Create booking and continue to payment
    const handleBooking = async () => {
        const token = getToken();

        if (!token) {
            alert("Please log in before booking a ticket.");
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

            const bookingPayload = {
                event_id: event.id,
                ticket_quantity: quantity,
            };

            // Send the coupon code to the booking API.
            // The backend calculates and stores the actual discount.
            if (appliedCoupon) {
                bookingPayload.coupon_code =
                    appliedCoupon.coupon_code;
            }

            const bookingResponse = await axios.post(
                `${API_URL}/bookings`,
                bookingPayload,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            const createdBooking = bookingResponse.data;

            if (!createdBooking?.id) {
                throw new Error(
                    "The booking was created, but its ID was not returned."
                );
            }

            // Preserve booking information for checkout.
            navigate("/payment-checkout", {
                state: {
                    booking: createdBooking,
                    event,
                    coupon: appliedCoupon,
                    originalPrice,
                    discountAmount,
                    finalPrice,
                },
            });
        } catch (err) {
            console.error("Booking failed:", err);

            if (err.response) {
                const detail = err.response.data?.detail;

                setError(
                    typeof detail === "string"
                        ? detail
                        : "Booking failed. Please try again."
                );
            } else {
                setError(
                    err.message ||
                    "Unable to connect to the server."
                );
            }
        } finally {
            setBooking(false);
        }
    };

    // Loading state
    if (loading) {
        return (
            <div className="booking-page">
                <div className="booking-card">
                    <p>Loading booking details...</p>
                </div>
            </div>
        );
    }

    // Event loading error
    if (error && !event) {
        return (
            <div className="booking-page">
                <div className="booking-card">
                    <div className="booking-error">
                        {error}
                    </div>

                    <button
                        type="button"
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

    // Sold-out event
    if (event.available_tickets <= 0) {
        return (
            <div className="booking-page">
                <div className="booking-card">
                    <h1>{event.title}</h1>

                    <div className="sold-out-box">
                        Sold Out
                    </div>

                    <p>
                        There are no tickets available for this event.
                    </p>

                    <button
                        type="button"
                        className="secondary-button"
                        onClick={() =>
                            navigate(`/events/${event.id}`)
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

                {/* Booking header */}
                <div className="booking-header">
                    <span className="event-category">
                        {event.category}
                    </span>

                    <h1>Book Tickets</h1>

                    <p className="booking-event-title">
                        {event.title}
                    </p>
                </div>

                {/* Event details */}
                <div className="booking-info">
                    <div className="booking-info-row">
                        <span>Location</span>
                        <strong>{event.location}</strong>
                    </div>

                    <div className="booking-info-row">
                        <span>Date &amp; Time</span>
                        <strong>
                            {new Date(
                                event.event_date
                            ).toLocaleString()}
                        </strong>
                    </div>

                    <div className="booking-info-row">
                        <span>Ticket Price</span>
                        <strong className="booking-price">
                            ₹
                            {formatPrice(event.ticket_price)}
                        </strong>
                    </div>

                    <div className="booking-info-row">
                        <span>Available Tickets</span>
                        <strong>
                            {event.available_tickets}
                        </strong>
                    </div>
                </div>

                {/* Ticket quantity */}
                <div className="quantity-section">
                    <label>Number of Tickets</label>

                    <div className="quantity-control">
                        <button
                            type="button"
                            onClick={decreaseQuantity}
                            disabled={
                                quantity <= 1 ||
                                booking ||
                                couponLoading
                            }
                            aria-label="Decrease ticket quantity"
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
                                quantity >= event.available_tickets ||
                                quantity >= 10 ||
                                booking ||
                                couponLoading
                            }
                            aria-label="Increase ticket quantity"
                        >
                            +
                        </button>
                    </div>

                    <p className="ticket-limit">
                        You can book up to 10 tickets.
                    </p>
                </div>

                {/* Coupon section */}
                <div className="coupon-section">
                    <div className="coupon-heading">
                        <h3>Apply Coupon</h3>

                        <p>
                            Have a coupon code? Use it to save
                            on your booking.
                        </p>
                    </div>

                    {!appliedCoupon ? (
                        <>
                            <div className="coupon-input-row">
                                <input
                                    type="text"
                                    value={couponCode}
                                    onChange={(e) => {
                                        setCouponCode(
                                            e.target.value.toUpperCase()
                                        );
                                        setCouponError("");
                                        setCouponSuccess("");
                                    }}
                                    placeholder="Enter coupon code"
                                    aria-label="Coupon code"
                                    disabled={
                                        couponLoading ||
                                        booking
                                    }
                                />

                                <button
                                    type="button"
                                    className="coupon-apply-button"
                                    onClick={handleApplyCoupon}
                                    disabled={
                                        couponLoading ||
                                        booking
                                    }
                                >
                                    {couponLoading
                                        ? "Checking..."
                                        : "Apply"}
                                </button>
                            </div>

                            {couponError && (
                                <p
                                    className="coupon-error"
                                    role="alert"
                                >
                                    {couponError}
                                </p>
                            )}
                        </>
                    ) : (
                        <div className="coupon-applied-box">
                            <div className="coupon-applied-details">
                                <span className="coupon-applied-icon">
                                    %
                                </span>

                                <div>
                                    <strong>
                                        {appliedCoupon.coupon_code}
                                    </strong>

                                    <p>
                                        You saved ₹
                                        {formatPrice(discountAmount)}
                                    </p>
                                </div>
                            </div>

                            <button
                                type="button"
                                className="coupon-remove-button"
                                onClick={handleRemoveCoupon}
                                disabled={booking}
                            >
                                Remove
                            </button>
                        </div>
                    )}

                    {couponSuccess && appliedCoupon && (
                        <p
                            className="coupon-success"
                            role="status"
                        >
                            {couponSuccess}
                        </p>
                    )}
                </div>

                {/* Price summary */}
                <div className="total-section">
                    <div className="price-summary-row">
                        <span>Ticket Subtotal</span>

                        <strong>
                            ₹{formatPrice(originalPrice)}
                        </strong>
                    </div>

                    {appliedCoupon && (
                        <div className="price-summary-row discount-row">
                            <span>
                                Coupon Discount (
                                {appliedCoupon.coupon_code})
                            </span>

                            <strong>
                                −₹{formatPrice(discountAmount)}
                            </strong>
                        </div>
                    )}

                    <div className="price-summary-row final-price-row">
                        <span>Total Payable</span>

                        <strong>
                            ₹{formatPrice(finalPrice)}
                        </strong>
                    </div>
                </div>

                {/* Booking errors */}
                {error && (
                    <div
                        className="booking-error"
                        role="alert"
                    >
                        {error}
                    </div>
                )}

                {/* Checkout button */}
                <button
                    type="button"
                    className="confirm-button"
                    onClick={handleBooking}
                    disabled={booking || couponLoading}
                >
                    {booking
                        ? "Preparing Checkout..."
                        : "Continue to Payment"}
                </button>

                {/* Back button */}
                <button
                    type="button"
                    className="secondary-button"
                    onClick={() =>
                        navigate(`/events/${event.id}`)
                    }
                    disabled={booking || couponLoading}
                >
                    Back to Event
                </button>

            </div>
        </div>
    );
}

export default Booking;