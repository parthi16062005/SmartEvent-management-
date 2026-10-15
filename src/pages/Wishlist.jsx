import { useCallback, useEffect, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import {
    Heart,
    CalendarDays,
    MapPin,
    Ticket,
    ArrowRight,
    Compass,
    Bookmark,
    RefreshCw,
} from "lucide-react";

import "../styles/Wishlist.css";

const API_URL = "http://127.0.0.1:8000";

function Wishlist() {
    const [items, setItems] = useState([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [removingId, setRemovingId] = useState(null);

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    const fetchWishlist = useCallback(async () => {
        if (!token) {
            setError("Please log in to view your wishlist.");
            setLoading(false);
            return;
        }

        try {
            setLoading(true);
            setError("");

            const response = await axios.get(`${API_URL}/wishlist`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setItems(response.data.items || []);
        } catch (err) {
            if (err.response?.status === 401) {
                setError("Your session has expired. Please log in again.");
            } else {
                setError(
                    err.response?.data?.detail ||
                    "Unable to load your wishlist. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    }, [token]);

    useEffect(() => {
        fetchWishlist();
    }, [fetchWishlist]);

    const handleRemove = async (eventId) => {
        if (removingId !== null || !token) return;

        try {
            setRemovingId(eventId);
            setError("");

            await axios.delete(`${API_URL}/wishlist/${eventId}`, {
                headers: {
                    Authorization: `Bearer ${token}`,
                },
            });

            setItems((previousItems) =>
                previousItems.filter(
                    (item) => item.event_id !== eventId
                )
            );
        } catch (err) {
            setError(
                err.response?.data?.detail ||
                "Unable to remove this event. Please try again."
            );
        } finally {
            setRemovingId(null);
        }
    };

    const formatDate = (dateValue) => {
        if (!dateValue) return "Date not available";

        const date = new Date(dateValue);

        if (Number.isNaN(date.getTime())) {
            return "Date not available";
        }

        return date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "numeric",
            minute: "2-digit",
        });
    };

    const formatPrice = (price) => {
        const amount = Number(price);

        if (!Number.isFinite(amount)) {
            return "Price unavailable";
        }

        return amount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        });
    };

    const getCategoryClass = (category) => {
        const normalized = String(category || "").toLowerCase();

        if (normalized === "tech") return "wishlist-category-tech";
        if (normalized === "music") return "wishlist-category-music";
        if (normalized === "sports") return "wishlist-category-sports";
        if (normalized === "business") return "wishlist-category-business";

        return "wishlist-category-default";
    };

    const getCategoryInitial = (category) => {
        return String(category || "E").charAt(0).toUpperCase();
    };

    const getAvailability = (event) => {
        if (event.event_status === "CANCELLED") {
            return {
                label: "Cancelled",
                className: "wishlist-status-cancelled",
            };
        }

        if (Number(event.available_tickets) <= 0) {
            return {
                label: "Sold out",
                className: "wishlist-status-sold-out",
            };
        }

        return {
            label: `${event.available_tickets} available`,
            className: "wishlist-status-available",
        };
    };

    if (loading) {
        return (
            <main className="wishlist-page">
                <div className="wishlist-loading">
                    <div className="wishlist-spinner"></div>
                    <h2>Loading your collection</h2>
                    <p>Finding the events you saved for later.</p>
                </div>
            </main>
        );
    }

    if (!token) {
        return (
            <main className="wishlist-page">
                <section className="wishlist-empty wishlist-auth-empty">
                    <div className="wishlist-empty-icon">
                        <Heart size={34} />
                    </div>

                    <span className="wishlist-eyebrow">
                        YOUR PERSONAL COLLECTION
                    </span>

                    <h1>Keep your favourite events close</h1>

                    <p>
                        Log in to discover your saved events and pick up
                        where you left off.
                    </p>

                    <Link
                        to="/login"
                        className="wishlist-primary-button"
                    >
                        Log In
                        <ArrowRight size={18} />
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main className="wishlist-page">
            <div className="wishlist-container">
                <section className="wishlist-hero">
                    <div className="wishlist-hero-content">
                        <div className="wishlist-eyebrow">
                            <span className="wishlist-eyebrow-dot"></span>
                            YOUR PERSONAL COLLECTION
                        </div>

                        <h1>
                            Events worth
                            <span> remembering.</span>
                        </h1>

                        <p>
                            All the experiences you love, collected in one
                            place. Your next great memory could be right here.
                        </p>

                        <Link
                            to="/"
                            className="wishlist-hero-link"
                        >
                            Discover upcoming events
                            <ArrowRight size={18} />
                        </Link>
                    </div>

                    <div className="wishlist-hero-visual">
                        <div className="wishlist-hero-orbit wishlist-orbit-one"></div>
                        <div className="wishlist-hero-orbit wishlist-orbit-two"></div>

                        <div className="wishlist-hero-heart">
                            <Heart size={64} strokeWidth={1.5} />
                        </div>

                        <div className="wishlist-floating-card wishlist-floating-top">
                            <Bookmark size={17} />
                            <span>Saved for you</span>
                        </div>

                        <div className="wishlist-floating-card wishlist-floating-bottom">
                            <span className="wishlist-floating-indicator"></span>
                            <span>Your next experience awaits</span>
                        </div>
                    </div>

                    <div className="wishlist-hero-count">
                        <div className="wishlist-count-icon">
                            <Heart size={21} />
                        </div>

                        <div>
                            <span>Saved events</span>
                            <strong>{items.length}</strong>
                        </div>
                    </div>
                </section>

                {error && (
                    <div className="wishlist-error" role="alert">
                        <div className="wishlist-error-text">
                            <strong>Something went wrong</strong>
                            <span>{error}</span>
                        </div>

                        {error.includes("log in") ||
                        error.includes("session has expired") ? (
                            <Link
                                to="/login"
                                className="wishlist-retry-button"
                            >
                                Log In
                            </Link>
                        ) : (
                            <button
                                type="button"
                                onClick={fetchWishlist}
                                className="wishlist-retry-button"
                            >
                                <RefreshCw size={15} />
                                Try Again
                            </button>
                        )}
                    </div>
                )}

                {items.length === 0 && !error ? (
                    <section className="wishlist-empty">
                        <div className="wishlist-empty-illustration">
                            <div className="wishlist-empty-circle">
                                <Heart size={40} strokeWidth={1.5} />
                            </div>

                            <span className="wishlist-empty-spark wishlist-spark-one">
                                +
                            </span>
                            <span className="wishlist-empty-spark wishlist-spark-two">
                                +
                            </span>
                        </div>

                        <span className="wishlist-eyebrow">
                            A LITTLE SPACE FOR SOMETHING GREAT
                        </span>

                        <h2>Your wishlist starts here</h2>

                        <p>
                            You haven't saved any events yet. Explore our
                            collection and save the experiences you don't
                            want to miss.
                        </p>

                        <Link
                            to="/"
                            className="wishlist-primary-button"
                        >
                            <Compass size={18} />
                            Explore Events
                            <ArrowRight size={17} />
                        </Link>
                    </section>
                ) : (
                    items.length > 0 && (
                        <section className="wishlist-results">
                            <div className="wishlist-section-heading">
                                <div>
                                    <span className="wishlist-section-kicker">
                                        YOUR COLLECTION
                                    </span>

                                    <h2>Saved for later</h2>

                                    <p>
                                        The events you love, all in one place.
                                    </p>
                                </div>

                                <div className="wishlist-section-total">
                                    <span>COLLECTION SIZE</span>
                                    <strong>
                                        {String(items.length).padStart(2, "0")}
                                        <span> events</span>
                                    </strong>
                                </div>
                            </div>

                            <div className="wishlist-grid">
                                {items.map((event) => {
                                    const unavailable =
                                        event.event_status === "CANCELLED" ||
                                        Number(event.available_tickets) <= 0;

                                    const availability = getAvailability(event);

                                    return (
                                        <article
                                            className="wishlist-card"
                                            key={event.wishlist_id}
                                        >
                                            <div
                                                className={`wishlist-card-art ${getCategoryClass(
                                                    event.category
                                                )}`}
                                            >
                                                {event.banner_image ? (
                                                    <img
                                                        src={event.banner_image}
                                                        alt={event.title}
                                                        className="wishlist-banner-image"
                                                    />
                                                ) : (
                                                    <div className="wishlist-art-placeholder">
                                                        <span className="wishlist-art-initial">
                                                            {getCategoryInitial(
                                                                event.category
                                                            )}
                                                        </span>
                                                        <span className="wishlist-art-caption">
                                                            SMART
                                                            <br />
                                                            EXPERIENCE
                                                        </span>
                                                    </div>
                                                )}

                                                <div className="wishlist-image-overlay"></div>

                                                <span className="wishlist-category-badge">
                                                    {event.category || "Event"}
                                                </span>

                                                <button
                                                    type="button"
                                                    className={`wishlist-remove-button ${
                                                        removingId === event.event_id
                                                            ? "is-removing"
                                                            : ""
                                                    }`}
                                                    onClick={() =>
                                                        handleRemove(event.event_id)
                                                    }
                                                    disabled={removingId !== null}
                                                    aria-label={`Remove ${event.title} from wishlist`}
                                                    title="Remove from wishlist"
                                                >
                                                    {removingId === event.event_id ? (
                                                        <span className="wishlist-button-spinner"></span>
                                                    ) : (
                                                        <Heart
                                                            size={19}
                                                            fill="currentColor"
                                                        />
                                                    )}
                                                </button>

                                                <div className="wishlist-image-bottom">
                                                    <span className="wishlist-image-label">
                                                        SAVED EVENT
                                                    </span>
                                                </div>
                                            </div>

                                            <div className="wishlist-card-content">
                                                <div className="wishlist-event-date">
                                                    <CalendarDays size={15} />
                                                    <span>
                                                        {formatDate(event.event_date)}
                                                    </span>
                                                </div>

                                                <h3>{event.title}</h3>

                                                <p className="wishlist-description">
                                                    {event.description ||
                                                        "Discover this event and explore the experience."}
                                                </p>

                                                <div className="wishlist-event-info">
                                                    <div className="wishlist-info-row">
                                                        <span className="wishlist-info-icon">
                                                            <MapPin size={16} />
                                                        </span>

                                                        <div className="wishlist-info-text">
                                                            <span>LOCATION</span>
                                                            <strong>
                                                                {event.location ||
                                                                    "Not specified"}
                                                            </strong>
                                                        </div>
                                                    </div>

                                                    <div className="wishlist-info-row">
                                                        <span className="wishlist-info-icon">
                                                            <Ticket size={16} />
                                                        </span>

                                                        <div className="wishlist-info-text">
                                                            <span>AVAILABILITY</span>
                                                            <strong
                                                                className={`wishlist-availability ${availability.className}`}
                                                            >
                                                                {availability.label}
                                                            </strong>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="wishlist-card-footer">
                                                    <div className="wishlist-price">
                                                        <span>STARTING FROM</span>
                                                        <strong>
                                                            {formatPrice(
                                                                event.ticket_price
                                                            )}
                                                        </strong>
                                                    </div>

                                                    {unavailable ? (
                                                        <span className="wishlist-unavailable">
                                                            {event.event_status === "CANCELLED"
                                                                ? "Cancelled"
                                                                : "Sold out"}
                                                        </span>
                                                    ) : (
                                                        <Link
                                                            to={`/events/${event.event_id}`}
                                                            className="wishlist-view-button"
                                                        >
                                                            View Event
                                                            <ArrowRight size={17} />
                                                        </Link>
                                                    )}
                                                </div>
                                            </div>
                                        </article>
                                    );
                                })}
                            </div>

                            <div className="wishlist-bottom-cta">
                                <div className="wishlist-bottom-cta-icon">
                                    <Compass size={22} />
                                </div>

                                <div className="wishlist-bottom-cta-text">
                                    <h3>There's more to experience</h3>
                                    <p>
                                        Find your next favourite event and add it
                                        to your collection.
                                    </p>
                                </div>

                                <Link
                                    to="/"
                                    className="wishlist-bottom-cta-link"
                                >
                                    Explore events
                                    <ArrowRight size={18} />
                                </Link>
                            </div>
                        </section>
                    )
                )}
            </div>
        </main>
    );
}

export default Wishlist;