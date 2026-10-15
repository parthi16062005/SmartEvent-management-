import "../styles/EventDetails.css";
import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import axios from "axios";

const API_URL = "http://127.0.0.1:8000";
const WS_URL = "ws://127.0.0.1:8000";

function EventDetails() {
    const { eventId } = useParams();

    const [event, setEvent] = useState(null);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    // =====================================================
    // MODULE 18: REAL-TIME AVAILABILITY STATES
    // =====================================================

    const [availability, setAvailability] = useState(null);

    const [availabilityConnection, setAvailabilityConnection] =
        useState("connecting");

    // Review states
    const [reviews, setReviews] = useState([]);
    const [averageRating, setAverageRating] = useState(0);
    const [totalReviews, setTotalReviews] = useState(0);
    const [reviewsLoading, setReviewsLoading] = useState(true);

    const [rating, setRating] = useState(5);
    const [reviewText, setReviewText] = useState("");

    const [editingReviewId, setEditingReviewId] = useState(null);
    const [reviewLoading, setReviewLoading] = useState(false);

    const [reviewMessage, setReviewMessage] = useState("");
    const [reviewError, setReviewError] = useState("");

    // =====================================================
    // MODULE 21: LIVE EVENT ANNOUNCEMENTS
    // =====================================================

    const [announcements, setAnnouncements] = useState([]);
    const [announcementsLoading, setAnnouncementsLoading] = useState(true);
    const [announcementText, setAnnouncementText] = useState("");
    const [announcementMessage, setAnnouncementMessage] = useState("");
    const [announcementError, setAnnouncementError] = useState("");
    const [announcementSubmitting, setAnnouncementSubmitting] = useState(false);
    const [announcementDeletingId, setAnnouncementDeletingId] = useState(null);

    // Read the logged-in user and token
    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    let currentUser = null;

    try {
        const storedUser = localStorage.getItem("user");

        if (storedUser) {
            currentUser = JSON.parse(storedUser);
        }
    } catch {
        currentUser = null;
    }

    const currentUserId = currentUser?.id;

    const isLoggedIn = Boolean(token);

    // Read role from stored user data first, then fall back to the JWT.
    let currentUserRole = String(currentUser?.role || "").toUpperCase();

    if (!currentUserRole && token) {
        try {
            const tokenPayload = token.split(".")[1];
            const normalizedPayload = tokenPayload
                .replace(/-/g, "+")
                .replace(/_/g, "/");
            const decodedPayload = JSON.parse(
                window.atob(
                    normalizedPayload +
                    "=".repeat((4 - (normalizedPayload.length % 4)) % 4)
                )
            );

            currentUserRole = String(
                decodedPayload.role || decodedPayload.user_role || ""
            ).toUpperCase();
        } catch {
            currentUserRole = "";
        }
    }

    const canManageAnnouncements =
        isLoggedIn &&
        ["ORGANIZER", "ADMIN"].includes(currentUserRole);

    // =====================================================
    // LOAD EVENT DETAILS
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const getEvent = async () => {
            setLoading(true);
            setError("");

            try {
                const response = await axios.get(
                    `${API_URL}/events/${eventId}`
                );

                if (isMounted) {
                    setEvent(response.data);
                }
            } catch (err) {
                console.error("Event loading error:", err);

                if (isMounted) {
                    setError("Unable to load event details.");
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        getEvent();

        return () => {
            isMounted = false;
        };
    }, [eventId]);

    // =====================================================
    // MODULE 18: INITIAL AVAILABILITY + WEBSOCKET UPDATES
    // =====================================================

    useEffect(() => {
        let isMounted = true;
        let socket = null;
        let reconnectTimer = null;
        let retryDelay = 2000;
        let manuallyClosed = false;

        // Fetch current ticket availability using REST API.
        // This works even when WebSocket is unavailable.
        const fetchAvailability = async () => {
            try {
                const response = await axios.get(
                    `${API_URL}/events/${eventId}/availability`
                );

                if (!isMounted) {
                    return;
                }

                const data = response.data;

                setAvailability(data);

                // Keep the main event data synchronized.
                setEvent((previousEvent) => {
                    if (!previousEvent) {
                        return previousEvent;
                    }

                    return {
                        ...previousEvent,
                        available_tickets:
                            data.available_tickets,
                        total_tickets:
                            data.total_tickets,
                        event_status:
                            data.event_status ??
                            previousEvent.event_status,
                    };
                });
            } catch (err) {
                console.error(
                    "Initial availability loading error:",
                    err
                );

                // The event details endpoint can still provide
                // the ticket count if this request fails.
            }
        };

        const connectWebSocket = () => {
            if (!isMounted || manuallyClosed) {
                return;
            }

            setAvailabilityConnection("connecting");

            try {
                socket = new WebSocket(
                    `${WS_URL}/ws/events/${eventId}/availability`
                );
            } catch (err) {
                console.error(
                    "Unable to create WebSocket:",
                    err
                );

                scheduleReconnect();
                return;
            }

            socket.onopen = () => {
                if (!isMounted) {
                    socket.close();
                    return;
                }

                retryDelay = 2000;

                setAvailabilityConnection("connected");

                console.info(
                    `Live availability connected for event ${eventId}`
                );
            };

            socket.onmessage = (messageEvent) => {
                if (!isMounted) {
                    return;
                }

                try {
                    const data = JSON.parse(messageEvent.data);

                    if (
                        data.event_id != null &&
                        Number(data.event_id) !== Number(eventId)
                    ) {
                        return;
                    }

                    setAvailability({
                        event_id: data.event_id,
                        available_tickets:
                            Number(data.available_tickets),
                        total_tickets:
                            Number(data.total_tickets),
                        tickets_sold:
                            Number(data.tickets_sold),
                    });

                    setEvent((previousEvent) => {
                        if (!previousEvent) {
                            return previousEvent;
                        }

                        return {
                            ...previousEvent,
                            available_tickets:
                                Number(data.available_tickets),
                            total_tickets:
                                Number(data.total_tickets),
                        };
                    });
                } catch (err) {
                    console.error(
                        "Invalid availability message:",
                        err
                    );
                }
            };

            socket.onerror = () => {
                console.warn(
                    "WebSocket connection failed. " +
                    "The application will retry."
                );
            };

            socket.onclose = () => {
                if (!isMounted || manuallyClosed) {
                    return;
                }

                setAvailabilityConnection("disconnected");

                scheduleReconnect();
            };
        };

        const scheduleReconnect = () => {
            if (!isMounted || manuallyClosed) {
                return;
            }

            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
            }

            reconnectTimer = window.setTimeout(() => {
                reconnectTimer = null;
                connectWebSocket();
            }, retryDelay);

            retryDelay = Math.min(
                retryDelay * 2,
                15000
            );
        };

        // Load the initial count before relying on live updates.
        fetchAvailability();

        // Attempt to connect to the WebSocket.
        connectWebSocket();

        return () => {
            isMounted = false;
            manuallyClosed = true;

            if (reconnectTimer !== null) {
                window.clearTimeout(reconnectTimer);
            }

            if (socket) {
                socket.onopen = null;
                socket.onmessage = null;
                socket.onerror = null;
                socket.onclose = null;

                if (
                    socket.readyState === WebSocket.OPEN ||
                    socket.readyState === WebSocket.CONNECTING
                ) {
                    socket.close();
                }
            }
        };
    }, [eventId]);

    // =====================================================
    // MODULE 21: LOAD AND REFRESH EVENT ANNOUNCEMENTS
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const loadAnnouncements = async (showLoading = false) => {
            if (showLoading && isMounted) {
                setAnnouncementsLoading(true);
            }

            try {
                const response = await axios.get(
                    `${API_URL}/events/${eventId}/updates`
                );

                if (isMounted) {
                    setAnnouncements(
                        Array.isArray(response.data) ? response.data : []
                    );
                    setAnnouncementError("");
                }
            } catch (err) {
                console.error("Announcement loading error:", err);

                if (isMounted && showLoading) {
                    setAnnouncementError(
                        "Unable to load event announcements right now."
                    );
                }
            } finally {
                if (isMounted && showLoading) {
                    setAnnouncementsLoading(false);
                }
            }
        };

        loadAnnouncements(true);

        // The backend announcement endpoints use REST, so poll periodically
        // to make newly posted announcements appear without a page refresh.
        const refreshTimer = window.setInterval(() => {
            loadAnnouncements(false);
        }, 15000);

        return () => {
            isMounted = false;
            window.clearInterval(refreshTimer);
        };
    }, [eventId]);

    const handleAnnouncementSubmit = async (submitEvent) => {
        submitEvent.preventDefault();
        setAnnouncementError("");
        setAnnouncementMessage("");

        const message = announcementText.trim();

        if (message.length < 3) {
            setAnnouncementError(
                "Announcement must contain at least 3 characters."
            );
            return;
        }

        if (message.length > 2000) {
            setAnnouncementError(
                "Announcement cannot exceed 2000 characters."
            );
            return;
        }

        if (!token) {
            setAnnouncementError("Please log in to post an announcement.");
            return;
        }

        setAnnouncementSubmitting(true);

        try {
            await axios.post(
                `${API_URL}/events/${eventId}/updates`,
                { message },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setAnnouncementText("");
            setAnnouncementMessage("Announcement posted successfully.");

            const response = await axios.get(
                `${API_URL}/events/${eventId}/updates`
            );

            setAnnouncements(
                Array.isArray(response.data) ? response.data : []
            );
        } catch (err) {
            console.error("Announcement submission error:", err);
            const detail = err.response?.data?.detail;

            setAnnouncementError(
                typeof detail === "string"
                    ? detail
                    : "Unable to post the announcement. Please try again."
            );
        } finally {
            setAnnouncementSubmitting(false);
        }
    };

    const handleAnnouncementDelete = async (announcementId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete this announcement?"
        );

        if (!confirmed) {
            return;
        }

        setAnnouncementError("");
        setAnnouncementMessage("");
        setAnnouncementDeletingId(announcementId);

        try {
            await axios.delete(
                `${API_URL}/event-updates/${announcementId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setAnnouncements((previous) =>
                previous.filter((item) => item.id !== announcementId)
            );
            setAnnouncementMessage("Announcement deleted successfully.");
        } catch (err) {
            console.error("Announcement deletion error:", err);
            const detail = err.response?.data?.detail;

            setAnnouncementError(
                typeof detail === "string"
                    ? detail
                    : "Unable to delete the announcement. Please try again."
            );
        } finally {
            setAnnouncementDeletingId(null);
        }
    };

    // =====================================================
    // LOAD REVIEWS AND EVENT RATING
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const getReviews = async () => {
            setReviewsLoading(true);

            try {
                const [
                    reviewsResponse,
                    ratingResponse,
                ] = await Promise.all([
                    axios.get(
                        `${API_URL}/events/${eventId}/reviews`
                    ),
                    axios.get(
                        `${API_URL}/events/${eventId}/rating`
                    ),
                ]);

                if (isMounted) {
                    setReviews(
                        Array.isArray(reviewsResponse.data)
                            ? reviewsResponse.data
                            : []
                    );

                    setAverageRating(
                        Number(
                            ratingResponse.data.average_rating || 0
                        )
                    );

                    setTotalReviews(
                        Number(
                            ratingResponse.data.total_reviews || 0
                        )
                    );
                }
            } catch (err) {
                console.error(
                    "Review loading error:",
                    err
                );

                if (isMounted) {
                    setReviewError(
                        "Unable to load reviews. Please refresh the page."
                    );
                }
            } finally {
                if (isMounted) {
                    setReviewsLoading(false);
                }
            }
        };

        getReviews();

        return () => {
            isMounted = false;
        };
    }, [eventId]);

    // Find the current user's review
    const myReview = reviews.find(
        (review) =>
            currentUserId != null &&
            String(review.user_id) === String(currentUserId)
    );

    // =====================================================
    // REFRESH REVIEWS AFTER CHANGES
    // =====================================================

    const refreshReviews = async () => {
        try {
            const [
                reviewsResponse,
                ratingResponse,
            ] = await Promise.all([
                axios.get(
                    `${API_URL}/events/${eventId}/reviews`
                ),
                axios.get(
                    `${API_URL}/events/${eventId}/rating`
                ),
            ]);

            setReviews(
                Array.isArray(reviewsResponse.data)
                    ? reviewsResponse.data
                    : []
            );

            setAverageRating(
                Number(
                    ratingResponse.data.average_rating || 0
                )
            );

            setTotalReviews(
                Number(
                    ratingResponse.data.total_reviews || 0
                )
            );
        } catch (err) {
            console.error(
                "Unable to refresh reviews:",
                err
            );

            setReviewError(
                "Your action may have succeeded, but the reviews could not be refreshed."
            );
        }
    };

    // =====================================================
    // SUBMIT OR UPDATE A REVIEW
    // =====================================================

    const handleReviewSubmit = async (event) => {
        event.preventDefault();

        setReviewError("");
        setReviewMessage("");

        if (!token) {
            setReviewError(
                "Please log in to submit a review."
            );
            return;
        }

        if (rating < 1 || rating > 5) {
            setReviewError(
                "Please select a rating from 1 to 5."
            );
            return;
        }

        setReviewLoading(true);

        const headers = {
            Authorization: `Bearer ${token}`,
        };

        try {
            if (editingReviewId !== null) {
                await axios.put(
                    `${API_URL}/reviews/${editingReviewId}`,
                    {
                        rating: Number(rating),
                        review_text: reviewText.trim(),
                    },
                    { headers }
                );

                setReviewMessage(
                    "Your review was updated successfully."
                );
            } else {
                await axios.post(
                    `${API_URL}/events/${eventId}/reviews`,
                    {
                        event_id: Number(eventId),
                        rating: Number(rating),
                        review_text: reviewText.trim(),
                    },
                    { headers }
                );

                setReviewMessage(
                    "Your review was submitted successfully."
                );
            }

            setEditingReviewId(null);
            setRating(5);
            setReviewText("");

            await refreshReviews();
        } catch (err) {
            console.error(
                "Review submission error:",
                err
            );

            const detail = err.response?.data?.detail;

            setReviewError(
                typeof detail === "string"
                    ? detail
                    : "Unable to submit your review. Please try again."
            );
        } finally {
            setReviewLoading(false);
        }
    };

    // =====================================================
    // EDIT REVIEW
    // =====================================================

    const handleEditReview = (review) => {
        setEditingReviewId(review.id);
        setRating(Number(review.rating));
        setReviewText(review.review_text || "");
        setReviewError("");
        setReviewMessage("");

        document
            .getElementById("review-form")
            ?.scrollIntoView({
                behavior: "smooth",
                block: "center",
            });
    };

    // =====================================================
    // CANCEL REVIEW EDITING
    // =====================================================

    const handleCancelEdit = () => {
        setEditingReviewId(null);
        setRating(5);
        setReviewText("");
        setReviewError("");
        setReviewMessage("");
    };

    // =====================================================
    // DELETE REVIEW
    // =====================================================

    const handleDeleteReview = async (reviewId) => {
        const confirmed = window.confirm(
            "Are you sure you want to delete your review?"
        );

        if (!confirmed) {
            return;
        }

        setReviewError("");
        setReviewMessage("");
        setReviewLoading(true);

        try {
            await axios.delete(
                `${API_URL}/reviews/${reviewId}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setReviewMessage(
                "Your review was deleted successfully."
            );

            if (editingReviewId === reviewId) {
                handleCancelEdit();
            }

            await refreshReviews();
        } catch (err) {
            console.error(
                "Review deletion error:",
                err
            );

            const detail = err.response?.data?.detail;

            setReviewError(
                typeof detail === "string"
                    ? detail
                    : "Unable to delete your review. Please try again."
            );
        } finally {
            setReviewLoading(false);
        }
    };

    // =====================================================
    // LOADING STATE
    // =====================================================

    if (loading) {
        return (
            <div className="event-details">
                <div className="status-message">
                    Loading event details...
                </div>
            </div>
        );
    }

    // =====================================================
    // ERROR STATE
    // =====================================================

    if (error) {
        return (
            <div className="event-details">
                <div className="status-message error-message">
                    {error}
                </div>

                <Link to="/" className="back-link">
                    Back to Events
                </Link>
            </div>
        );
    }

    if (!event) {
        return null;
    }

    // =====================================================
    // EVENT STATUS
    // =====================================================

    const isCancelled =
        event.event_status === "CANCELLED";

    const isCompleted =
        event.event_status === "COMPLETED";

    const isOngoing =
        event.event_status === "ONGOING";

    const isUpcoming =
        event.event_status === "UPCOMING";

    // Prefer real-time availability when it is available.
    const availableTickets =
        availability?.available_tickets ??
        event.available_tickets;

    const canBook =
        !isCancelled &&
        !isCompleted &&
        !isOngoing &&
        Number(availableTickets) > 0;

    // =====================================================
    // MAIN PAGE
    // =====================================================

    return (
        <div className="event-details">

            <Link to="/" className="back-link">
                ← Back to Events
            </Link>

            <div className="details-card">

                {/* EVENT IMAGE */}

                {event.banner_image ? (
                    <div className="event-image-container">
                        <img
                            src={event.banner_image}
                            alt={event.title}
                            className="event-image"
                        />
                    </div>
                ) : (
                    <div className="no-image">
                        No event image available
                    </div>
                )}

                {/* EVENT INFORMATION */}

                <div className="details-content">

                    <span className="event-category">
                        {event.category}
                    </span>

                    <div
                        className={`event-status status-${String(
                            event.event_status || ""
                        ).toLowerCase()}`}
                    >
                        {event.event_status}
                    </div>

                    {/* MODULE 18: LIVE CONNECTION INDICATOR */}

                    <div
                        className={`availability-live-status availability-${availabilityConnection}`}
                        aria-live="polite"
                    >
                        <span className="availability-status-dot"></span>

                        <span>
                            {availabilityConnection === "connected"
                                ? "Live availability connected"
                                : availabilityConnection === "connecting"
                                    ? "Connecting to live availability..."
                                    : "Live updates unavailable"}
                        </span>
                    </div>

                    <h1>{event.title}</h1>

                    {/* EVENT RATING SUMMARY */}

                    <div className="event-rating-summary">
                        <span className="rating-star">
                            ★
                        </span>

                        <strong>
                            {averageRating.toFixed(1)}
                        </strong>

                        <span className="rating-summary-text">
                            ({totalReviews}{" "}
                            {totalReviews === 1
                                ? "review"
                                : "reviews"}
                            )
                        </span>
                    </div>

                    {/* DESCRIPTION */}

                    <div className="description-section">
                        <h3>About this event</h3>

                        <p>
                            {event.description}
                        </p>
                    </div>

                    {/* EVENT STATUS MESSAGES */}

                    {isCancelled && (
                        <div className="event-notice cancelled-notice">
                            <strong>Event Cancelled</strong>

                            <p>
                                This event has been cancelled.
                                Booking is not available.
                            </p>
                        </div>
                    )}

                    {isCompleted && (
                        <div className="event-notice completed-notice">
                            <strong>Event Completed</strong>

                            <p>
                                This event has already been completed.
                                Booking is no longer available.
                            </p>
                        </div>
                    )}

                    {isOngoing && (
                        <div className="event-notice ongoing-notice">
                            <strong>Event is Ongoing</strong>

                            <p>
                                This event is currently in progress.
                                Booking is no longer available.
                            </p>
                        </div>
                    )}

                    {isUpcoming && (
                        <div className="event-notice upcoming-notice">
                            <strong>Upcoming Event</strong>

                            <p>
                                Booking is available for this upcoming event.
                            </p>
                        </div>
                    )}

                    {/* EVENT DETAILS */}

                    <div className="event-details-grid">

                        <div className="detail-item">
                            <span className="detail-label">
                                Location
                            </span>

                            <strong>
                                {event.location}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span className="detail-label">
                                Date & Time
                            </span>

                            <strong>
                                {new Date(
                                    event.event_date
                                ).toLocaleString()}
                            </strong>
                        </div>

                        <div className="detail-item">
                            <span className="detail-label">
                                Ticket Price
                            </span>

                            <strong className="detail-price">
                                ₹{event.ticket_price}
                            </strong>
                        </div>

                        {/* MODULE 18: LIVE AVAILABLE TICKETS */}

                        <div className="detail-item availability-detail-item">

                            <span className="detail-label">
                                Available Tickets
                            </span>

                            <strong
                                className="availability-ticket-count"
                                aria-live="polite"
                            >
                                {availableTickets}
                            </strong>

                            <span className="availability-helper-text">
                                {availabilityConnection === "connected"
                                    ? "Updates automatically when availability changes"
                                    : "Showing the latest availability received from the server"}
                            </span>

                        </div>

                    </div>

                    {/* BOOK BUTTON */}

                    {canBook ? (
                        <Link
                            to={`/book/${event.id}`}
                            className="book-event-button"
                        >
                            Book Ticket
                        </Link>
                    ) : isCancelled ? (
                        <div className="booking-disabled-message">
                            Booking Unavailable
                        </div>
                    ) : isCompleted ? (
                        <div className="booking-disabled-message">
                            Event Completed
                        </div>
                    ) : isOngoing ? (
                        <div className="booking-disabled-message">
                            Event Ongoing
                        </div>
                    ) : (
                        <div className="sold-out-message">
                            Sold Out
                        </div>
                    )}

                </div>
            </div>

            {/* =====================================================
                MODULE 21: EVENT ANNOUNCEMENTS
            ===================================================== */}

            <section className="event-announcements-section">
                <div className="event-announcements-header">
                    <div>
                        <span className="event-announcements-eyebrow">
                            EVENT NEWS
                        </span>
                        <h2>Live Updates & Announcements</h2>
                        <p>
                            Important news and updates shared by the event
                            organizer.
                        </p>
                    </div>

                    <span className="event-announcements-live-badge">
                        Refreshes every 15 seconds
                    </span>
                </div>

                {canManageAnnouncements && (
                    <form
                        className="announcement-form-card"
                        onSubmit={handleAnnouncementSubmit}
                    >
                        <label htmlFor="event-announcement-message">
                            Post an announcement
                        </label>

                        <textarea
                            id="event-announcement-message"
                            value={announcementText}
                            onChange={(inputEvent) =>
                                setAnnouncementText(inputEvent.target.value)
                            }
                            placeholder="Share an important update with attendees..."
                            rows={4}
                            minLength={3}
                            maxLength={2000}
                            required
                        />

                        <div className="announcement-form-footer">
                            <span>
                                {announcementText.length}/2000 characters
                            </span>

                            <button
                                type="submit"
                                disabled={announcementSubmitting}
                            >
                                {announcementSubmitting
                                    ? "Posting..."
                                    : "Post Announcement"}
                            </button>
                        </div>
                    </form>
                )}

                {announcementError && (
                    <div
                        className="announcement-alert announcement-alert-error"
                        role="alert"
                    >
                        {announcementError}
                    </div>
                )}

                {announcementMessage && (
                    <div
                        className="announcement-alert announcement-alert-success"
                        role="status"
                    >
                        {announcementMessage}
                    </div>
                )}

                {announcementsLoading ? (
                    <div className="announcement-empty-state">
                        Loading announcements...
                    </div>
                ) : announcements.length === 0 ? (
                    <div className="announcement-empty-state">
                        <h3>No announcements yet</h3>
                        <p>
                            Event updates will appear here when the organizer
                            shares them.
                        </p>
                    </div>
                ) : (
                    <div className="event-announcements-list">
                        {announcements.map((announcement) => (
                            <article
                                className="event-announcement-card"
                                key={announcement.id}
                            >
                                <div className="event-announcement-card-top">
                                    <span className="event-announcement-label">
                                        Announcement
                                    </span>

                                    <time
                                        dateTime={announcement.created_at}
                                        className="event-announcement-date"
                                    >
                                        {announcement.created_at
                                            ? new Date(
                                                announcement.created_at
                                            ).toLocaleString()
                                            : ""}
                                    </time>
                                </div>

                                <p className="event-announcement-message">
                                    {announcement.message}
                                </p>

                                {canManageAnnouncements && (
                                    <div className="event-announcement-actions">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                handleAnnouncementDelete(
                                                    announcement.id
                                                )
                                            }
                                            disabled={
                                                announcementDeletingId ===
                                                announcement.id
                                            }
                                        >
                                            {announcementDeletingId ===
                                            announcement.id
                                                ? "Deleting..."
                                                : "Delete Announcement"}
                                        </button>
                                    </div>
                                )}
                            </article>
                        ))}
                    </div>
                )}
            </section>

            {/* =====================================================
                EVENT REVIEWS SECTION
            ===================================================== */}

            <section className="reviews-section">

                <div className="reviews-header">

                    <div>
                        <span className="reviews-eyebrow">
                            COMMUNITY FEEDBACK
                        </span>

                        <h2>Event Reviews</h2>

                        <p>
                            Discover what attendees think about this event.
                        </p>
                    </div>

                    <div className="reviews-rating-card">

                        <span className="rating-star">
                            ★
                        </span>

                        <strong>
                            {averageRating.toFixed(1)}
                        </strong>

                        <span>
                            out of 5
                        </span>

                        <small>
                            {totalReviews}{" "}
                            {totalReviews === 1
                                ? "review"
                                : "reviews"}
                        </small>

                    </div>

                </div>

                {/* REVIEW FORM */}

                <div
                    className="review-form-card"
                    id="review-form"
                >

                    <h3>
                        {editingReviewId !== null
                            ? "Edit Your Review"
                            : "Share Your Experience"}
                    </h3>

                    {!isLoggedIn ? (
                        <div className="review-login-prompt">

                            <p>
                                Please log in to share your experience.
                            </p>

                            <Link
                                to="/login"
                                className="review-login-button"
                            >
                                Login to Review
                            </Link>

                        </div>
                    ) : myReview && editingReviewId === null ? (
                        <div className="existing-review-notice">

                            <strong>
                                You have already reviewed this event.
                            </strong>

                            <p>
                                You can edit or delete your review below.
                            </p>

                        </div>
                    ) : (
                        <form onSubmit={handleReviewSubmit}>

                            <label className="review-field-label">
                                Your Rating
                            </label>

                            <div
                                className="star-rating-input"
                                role="group"
                                aria-label="Choose a rating from 1 to 5"
                            >
                                {[1, 2, 3, 4, 5].map((star) => (
                                    <button
                                        key={star}
                                        type="button"
                                        className={`rating-star-button ${
                                            star <= rating
                                                ? "selected"
                                                : ""
                                        }`}
                                        onClick={() =>
                                            setRating(star)
                                        }
                                        aria-label={`${star} ${
                                            star === 1
                                                ? "star"
                                                : "stars"
                                        }`}
                                        aria-pressed={
                                            rating === star
                                        }
                                    >
                                        ★
                                    </button>
                                ))}
                            </div>

                            <p className="rating-hint">
                                {rating} out of 5 stars
                            </p>

                            <label
                                htmlFor="review-text"
                                className="review-field-label"
                            >
                                Your Review
                            </label>

                            <textarea
                                id="review-text"
                                value={reviewText}
                                onChange={(event) =>
                                    setReviewText(
                                        event.target.value
                                    )
                                }
                                placeholder="Tell us about your experience..."
                                rows={5}
                            />

                            {reviewError && (
                                <div className="review-alert review-alert-error">
                                    {reviewError}
                                </div>
                            )}

                            {reviewMessage && (
                                <div className="review-alert review-alert-success">
                                    {reviewMessage}
                                </div>
                            )}

                            <div className="review-form-actions">

                                <button
                                    type="submit"
                                    className="submit-review-button"
                                    disabled={reviewLoading}
                                >
                                    {reviewLoading
                                        ? "Please wait..."
                                        : editingReviewId !== null
                                            ? "Update Review"
                                            : "Submit Review"}
                                </button>

                                {editingReviewId !== null && (
                                    <button
                                        type="button"
                                        className="cancel-edit-button"
                                        onClick={handleCancelEdit}
                                        disabled={reviewLoading}
                                    >
                                        Cancel
                                    </button>
                                )}

                            </div>

                            <p className="review-policy-note">
                                Reviews are available to eligible attendees
                                after their tickets have been verified.
                            </p>

                        </form>
                    )}

                    {reviewError && !isLoggedIn && (
                        <div className="review-alert review-alert-error">
                            {reviewError}
                        </div>
                    )}

                    {reviewMessage &&
                        myReview &&
                        editingReviewId === null && (
                            <div className="review-alert review-alert-success">
                                {reviewMessage}
                            </div>
                        )}

                </div>

                {/* REVIEWS LIST */}

                <div className="reviews-list-section">

                    <div className="reviews-list-heading">

                        <h3>Attendee Feedback</h3>

                        <span>
                            {totalReviews}{" "}
                            {totalReviews === 1
                                ? "review"
                                : "reviews"}
                        </span>

                    </div>

                    {reviewsLoading ? (
                        <div className="reviews-empty-state">
                            Loading reviews...
                        </div>
                    ) : reviews.length === 0 ? (
                        <div className="reviews-empty-state">

                            <div className="empty-review-icon">
                                ★
                            </div>

                            <h4>Be the first to review</h4>

                            <p>
                                No reviews have been submitted for this event yet.
                            </p>

                        </div>
                    ) : (
                        <div className="reviews-list">

                            {reviews.map((review) => {
                                const isMyReview =
                                    currentUserId != null &&
                                    String(review.user_id) ===
                                        String(currentUserId);

                                return (
                                    <article
                                        className="review-card"
                                        key={review.id}
                                    >

                                        <div className="review-card-top">

                                            <div className="reviewer-avatar">
                                                {(
                                                    review.username || "A"
                                                )
                                                    .charAt(0)
                                                    .toUpperCase()}
                                            </div>

                                            <div className="reviewer-information">

                                                <div className="reviewer-name-row">

                                                    <strong>
                                                        {review.username ||
                                                            "Attendee"}
                                                    </strong>

                                                    {isMyReview && (
                                                        <span className="your-review-badge">
                                                            Your review
                                                        </span>
                                                    )}

                                                </div>

                                                <div className="review-card-rating">

                                                    <span>
                                                        {"★".repeat(
                                                            Math.max(
                                                                0,
                                                                Math.min(
                                                                    5,
                                                                    Number(
                                                                        review.rating
                                                                    ) || 0
                                                                )
                                                            )
                                                        )}
                                                    </span>

                                                    <strong>
                                                        {review.rating}/5
                                                    </strong>

                                                </div>

                                            </div>

                                        </div>

                                        <p className="review-card-text">
                                            {review.review_text ||
                                                "No written feedback provided."}
                                        </p>

                                        {isMyReview && (
                                            <div className="review-card-actions">

                                                <button
                                                    type="button"
                                                    className="edit-review-button"
                                                    onClick={() =>
                                                        handleEditReview(
                                                            review
                                                        )
                                                    }
                                                    disabled={reviewLoading}
                                                >
                                                    Edit Review
                                                </button>

                                                <button
                                                    type="button"
                                                    className="delete-review-button"
                                                    onClick={() =>
                                                        handleDeleteReview(
                                                            review.id
                                                        )
                                                    }
                                                    disabled={reviewLoading}
                                                >
                                                    Delete Review
                                                </button>

                                            </div>
                                        )}

                                    </article>
                                );
                            })}

                        </div>
                    )}

                </div>

            </section>

        </div>
    );
}

export default EventDetails;