import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import "../styles/ChatbotWidget.css";

const API_URL = "http://127.0.0.1:8000";

const QUICK_MESSAGES = [
    "Show trending events",
    "Show upcoming events",
    "Show music events",
    "Show my bookings",
];

function ChatbotWidget() {
    const [isOpen, setIsOpen] = useState(false);
    const [message, setMessage] = useState("");
    const [messages, setMessages] = useState([
        {
            sender: "bot",
            text: "Hi! Welcome to SmartEvent Assistant. 👋\n\nI can help you discover events, find trending events, check your bookings, and answer ticket questions.",
        },
    ]);
    const [isLoading, setIsLoading] = useState(false);

    const messagesEndRef = useRef(null);
    const inputRef = useRef(null);
    const navigate = useNavigate();

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({
            behavior: "smooth",
        });
    }, [messages, isOpen, isLoading]);

    useEffect(() => {
        if (isOpen) {
            inputRef.current?.focus();
        }
    }, [isOpen]);

    const sendMessage = async (text = message) => {
        const userMessage = text.trim();

        if (!userMessage || isLoading) return;

        setMessage("");

        setMessages((previous) => [
            ...previous,
            {
                sender: "user",
                text: userMessage,
            },
        ]);

        setIsLoading(true);

        try {
            const token =
                localStorage.getItem("access_token") ||
                localStorage.getItem("token");

            const response = await fetch(`${API_URL}/chatbot`, {
                method: "POST",
                headers: {
                    "Content-Type": "application/json",
                    ...(token
                        ? { Authorization: `Bearer ${token}` }
                        : {}),
                },
                body: JSON.stringify({
                    message: userMessage,
                }),
            });

            const data = await response.json();

            if (!response.ok) {
                if (response.status === 401) {
                    throw new Error(
                        "Please log in to use the SmartEvent assistant."
                    );
                }

                throw new Error(
                    data.detail || "Unable to get a response right now."
                );
            }

            setMessages((previous) => [
                ...previous,
                {
                    sender: "bot",
                    text: data.reply || "I couldn't generate a response.",
                    events: data.events || [],
                    bookings: data.bookings || [],
                    suggestions: data.suggestions || [],
                },
            ]);
        } catch (error) {
            setMessages((previous) => [
                ...previous,
                {
                    sender: "bot",
                    text:
                        error.message ||
                        "Unable to connect to SmartEvent. Please try again.",
                    isError: true,
                },
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    const openEvent = (eventId) => {
        setIsOpen(false);
        navigate(`/events/${eventId}`);
    };

    const openBookings = () => {
        setIsOpen(false);
        navigate("/bookings");
    };

    const formatDate = (dateString) => {
        if (!dateString) return "Date not available";

        const date = new Date(dateString);

        if (Number.isNaN(date.getTime())) {
            return "Date not available";
        }

        return date.toLocaleString("en-IN", {
            day: "numeric",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    const formatPrice = (price) => {
        const amount = Number(price);

        if (!Number.isFinite(amount)) return "Price unavailable";

        return amount.toLocaleString("en-IN", {
            style: "currency",
            currency: "INR",
            maximumFractionDigits: 2,
        });
    };

    return (
        <div className="chatbot-widget">
            {isOpen && (
                <section
                    className="chatbot-window"
                    aria-label="SmartEvent chatbot"
                >
                    <header className="chatbot-header">
                        <div className="chatbot-header-info">
                            <div className="chatbot-avatar">S</div>

                            <div>
                                <h3>SmartEvent Assistant</h3>
                                <p>
                                    <span className="chatbot-status-dot"></span>
                                    Event support assistant
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="chatbot-close"
                            onClick={() => setIsOpen(false)}
                            aria-label="Close chatbot"
                        >
                            ×
                        </button>
                    </header>

                    <div className="chatbot-messages">
                        <div className="chatbot-date-label">
                            SmartEvent Support
                        </div>

                        {messages.map((item, index) => (
                            <div
                                key={`${index}-${item.sender}`}
                                className={`chatbot-message-row ${
                                    item.sender === "user"
                                        ? "user-message-row"
                                        : "bot-message-row"
                                }`}
                            >
                                {item.sender === "bot" && (
                                    <div className="chatbot-small-avatar">
                                        S
                                    </div>
                                )}

                                <div className="chatbot-message-content">
                                    <div
                                        className={`chatbot-bubble ${
                                            item.sender === "user"
                                                ? "user-bubble"
                                                : "bot-bubble"
                                        } ${
                                            item.isError ? "error-bubble" : ""
                                        }`}
                                    >
                                        {item.text}
                                    </div>

                                    {item.events?.length > 0 && (
                                        <div className="chatbot-result-list">
                                            {item.events.map((event) => (
                                                <article
                                                    key={event.id}
                                                    className="chatbot-event-card"
                                                >
                                                    <div className="chatbot-event-top">
                                                        <span className="chatbot-category">
                                                            {event.category}
                                                        </span>

                                                        {event.booking_count !==
                                                            undefined && (
                                                            <span className="chatbot-booking-count">
                                                                {event.booking_count} bookings
                                                            </span>
                                                        )}
                                                    </div>

                                                    <h4>{event.title}</h4>

                                                    <p>
                                                        <span>Location:</span>{" "}
                                                        {event.location}
                                                    </p>

                                                    <p>
                                                        <span>Date:</span>{" "}
                                                        {formatDate(
                                                            event.event_date
                                                        )}
                                                    </p>

                                                    <div className="chatbot-event-footer">
                                                        <strong>
                                                            {formatPrice(
                                                                event.ticket_price
                                                            )}
                                                        </strong>

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                openEvent(
                                                                    event.id
                                                                )
                                                            }
                                                        >
                                                            View Event
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}

                                    {item.bookings?.length > 0 && (
                                        <div className="chatbot-result-list">
                                            {item.bookings.map((booking) => (
                                                <article
                                                    key={booking.booking_id}
                                                    className="chatbot-event-card"
                                                >
                                                    <span className="chatbot-category">
                                                        Booking #
                                                        {booking.booking_id}
                                                    </span>

                                                    <h4>
                                                        {booking.event_name}
                                                    </h4>

                                                    <p>
                                                        <span>Tickets:</span>{" "}
                                                        {booking.ticket_quantity}
                                                    </p>

                                                    <p>
                                                        <span>Total:</span>{" "}
                                                        {formatPrice(
                                                            booking.total_price
                                                        )}
                                                    </p>

                                                    <div className="chatbot-event-footer">
                                                        <span
                                                            className={`chatbot-booking-status status-${String(
                                                                booking.booking_status ||
                                                                    "unknown"
                                                            ).toLowerCase()}`}
                                                        >
                                                            {booking.booking_status}
                                                        </span>

                                                        <button
                                                            type="button"
                                                            onClick={
                                                                openBookings
                                                            }
                                                        >
                                                            View Bookings
                                                        </button>
                                                    </div>
                                                </article>
                                            ))}
                                        </div>
                                    )}

                                    {item.suggestions?.length > 0 && (
                                        <div className="chatbot-suggestions">
                                            {item.suggestions.map(
                                                (suggestion) => (
                                                    <button
                                                        type="button"
                                                        key={suggestion}
                                                        disabled={isLoading}
                                                        onClick={() =>
                                                            sendMessage(
                                                                suggestion
                                                            )
                                                        }
                                                    >
                                                        {suggestion}
                                                    </button>
                                                )
                                            )}
                                        </div>
                                    )}
                                </div>
                            </div>
                        ))}

                        {isLoading && (
                            <div className="chatbot-message-row bot-message-row">
                                <div className="chatbot-small-avatar">S</div>

                                <div className="chatbot-typing">
                                    <span></span>
                                    <span></span>
                                    <span></span>
                                </div>
                            </div>
                        )}

                        <div ref={messagesEndRef} />
                    </div>

                    <div className="chatbot-quick-actions">
                        {QUICK_MESSAGES.map((quickMessage) => (
                            <button
                                type="button"
                                key={quickMessage}
                                disabled={isLoading}
                                onClick={() => sendMessage(quickMessage)}
                            >
                                {quickMessage}
                            </button>
                        ))}
                    </div>

                    <form
                        className="chatbot-input-area"
                        onSubmit={(event) => {
                            event.preventDefault();
                            sendMessage();
                        }}
                    >
                        <input
                            ref={inputRef}
                            type="text"
                            value={message}
                            onChange={(event) =>
                                setMessage(event.target.value)
                            }
                            placeholder="Ask me anything..."
                            maxLength={1000}
                            disabled={isLoading}
                            aria-label="Message the SmartEvent assistant"
                        />

                        <button
                            type="submit"
                            disabled={!message.trim() || isLoading}
                            aria-label="Send message"
                        >
                            Send
                        </button>
                    </form>

                    <div className="chatbot-footer-note">
                        SmartEvent Assistant · Powered by your event data
                    </div>
                </section>
            )}

            <button
                type="button"
                className={`chatbot-toggle ${isOpen ? "chatbot-toggle-open" : ""}`}
                onClick={() => setIsOpen((previous) => !previous)}
                aria-label={
                    isOpen
                        ? "Close SmartEvent assistant"
                        : "Open SmartEvent assistant"
                }
                aria-expanded={isOpen}
            >
                {isOpen ? (
                    <span className="chatbot-toggle-x">×</span>
                ) : (
                    <svg
                        viewBox="0 0 24 24"
                        aria-hidden="true"
                        className="chatbot-toggle-icon"
                    >
                        <path d="M20 11.5a7.5 7.5 0 0 1-7.5 7.5H7l-4 2v-5.2A7.5 7.5 0 1 1 20 11.5Z" />
                        <path d="M8 10h8M8 14h5" />
                    </svg>
                )}
            </button>
        </div>
    );
}

export default ChatbotWidget;