
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import axios from "axios";

function EditEvent() {
    const { eventId } = useParams();
    const navigate = useNavigate();

    const [title, setTitle] = useState("");
    const [description, setDescription] = useState("");
    const [category, setCategory] = useState("Technology");
    const [location, setLocation] = useState("");
    const [eventDate, setEventDate] = useState("");
    const [ticketPrice, setTicketPrice] = useState("");
    const [totalTickets, setTotalTickets] = useState("");

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [error, setError] = useState("");
    const [success, setSuccess] = useState("");

    const token = localStorage.getItem("access_token");

    const categories = [
        "Technology",
        "Music",
        "Sports",
        "Business",
    ];

    useEffect(() => {
        fetchEvent();
    }, [eventId]);

    const fetchEvent = async () => {
        try {
            const response = await axios.get(
                `http://127.0.0.1:8000/events/${eventId}`
            );

            const event = response.data;

            setTitle(event.title || "");
            setDescription(event.description || "");
            setCategory(event.category || "Technology");
            setLocation(event.location || "");
            setTicketPrice(event.ticket_price ?? "");
            setTotalTickets(event.total_tickets ?? "");

            if (event.event_date) {
                const date = new Date(event.event_date);

                const formattedDate = new Date(
                    date.getTime() -
                    date.getTimezoneOffset() * 60000
                )
                    .toISOString()
                    .slice(0, 16);

                setEventDate(formattedDate);
            }
        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to load event."
            );
        } finally {
            setLoading(false);
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");
        setSuccess("");

        if (!title.trim()) {
            setError("Please enter an event title.");
            return;
        }

        if (!description.trim()) {
            setError("Please enter an event description.");
            return;
        }

        if (!location.trim()) {
            setError("Please enter the event location.");
            return;
        }

        if (Number(ticketPrice) <= 0) {
            setError("Ticket price must be greater than 0.");
            return;
        }

        if (Number(totalTickets) <= 0) {
            setError("Total tickets must be greater than 0.");
            return;
        }

        setSaving(true);

        try {
            await axios.put(
                `http://127.0.0.1:8000/organizer/events/${eventId}`,
                {
                    title: title.trim(),
                    description: description.trim(),
                    category: category,
                    location: location.trim(),
                    event_date: eventDate,
                    ticket_price: Number(ticketPrice),
                    total_tickets: Number(totalTickets),
                },
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setSuccess("Event updated successfully.");

            setTimeout(() => {
                navigate("/organizer");
            }, 1000);

        } catch (err) {
            console.error(err);

            setError(
                err.response?.data?.detail ||
                "Unable to update event."
            );
        } finally {
            setSaving(false);
        }
    };

    if (loading) {
        return (
            <div
                style={{
                    minHeight: "100vh",
                    background: "#f5f7fb",
                    display: "flex",
                    justifyContent: "center",
                    alignItems: "center",
                    padding: "40px",
                }}
            >
                <div
                    style={{
                        background: "#ffffff",
                        padding: "40px",
                        borderRadius: "16px",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.08)",
                        textAlign: "center",
                    }}
                >
                    <h2
                        style={{
                            margin: 0,
                            color: "#1f2937",
                            fontSize: "22px",
                        }}
                    >
                        Loading Event
                    </h2>

                    <p
                        style={{
                            marginTop: "8px",
                            color: "#6b7280",
                        }}
                    >
                        Please wait while we load the event details.
                    </p>
                </div>
            </div>
        );
    }

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f5f7fb",
                padding: "45px 20px 60px",
            }}
        >
            <div
                style={{
                    maxWidth: "900px",
                    margin: "0 auto",
                }}
            >
                {/* Header */}
                <div
                    style={{
                        marginBottom: "28px",
                    }}
                >
                    <div
                        style={{
                            display: "inline-block",
                            background: "#eef2ff",
                            color: "#4f46e5",
                            padding: "7px 13px",
                            borderRadius: "20px",
                            fontSize: "13px",
                            fontWeight: "600",
                            marginBottom: "12px",
                        }}
                    >
                        ORGANIZER
                    </div>

                    <h1
                        style={{
                            margin: 0,
                            fontSize: "32px",
                            fontWeight: "700",
                            color: "#111827",
                        }}
                    >
                        Edit Event
                    </h1>

                    <p
                        style={{
                            marginTop: "8px",
                            marginBottom: 0,
                            color: "#6b7280",
                            fontSize: "15px",
                        }}
                    >
                        Update your event information and keep your
                        attendees informed.
                    </p>
                </div>

                {/* Form Card */}
                <div
                    style={{
                        background: "#ffffff",
                        borderRadius: "18px",
                        padding: "35px",
                        boxShadow: "0 8px 30px rgba(0,0,0,0.07)",
                        border: "1px solid #e5e7eb",
                    }}
                >
                    {/* Error */}
                    {error && (
                        <div
                            style={{
                                background: "#fef2f2",
                                border: "1px solid #fecaca",
                                color: "#b91c1c",
                                padding: "13px 15px",
                                borderRadius: "10px",
                                marginBottom: "22px",
                                fontSize: "14px",
                                fontWeight: "500",
                            }}
                        >
                            {error}
                        </div>
                    )}

                    {/* Success */}
                    {success && (
                        <div
                            style={{
                                background: "#f0fdf4",
                                border: "1px solid #bbf7d0",
                                color: "#15803d",
                                padding: "13px 15px",
                                borderRadius: "10px",
                                marginBottom: "22px",
                                fontSize: "14px",
                                fontWeight: "500",
                            }}
                        >
                            {success}
                        </div>
                    )}

                    <form onSubmit={handleSubmit}>
                        {/* Event Title */}
                        <div style={{ marginBottom: "22px" }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#374151",
                                }}
                            >
                                Event Title
                            </label>

                            <input
                                type="text"
                                value={title}
                                onChange={(e) =>
                                    setTitle(e.target.value)
                                }
                                placeholder="Enter your event title"
                                required
                                style={inputStyle}
                            />
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: "22px" }}>
                            <label
                                style={{
                                    display: "block",
                                    marginBottom: "8px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    color: "#374151",
                                }}
                            >
                                Description
                            </label>

                            <textarea
                                value={description}
                                onChange={(e) =>
                                    setDescription(e.target.value)
                                }
                                placeholder="Describe your event"
                                rows="5"
                                required
                                style={{
                                    ...inputStyle,
                                    resize: "vertical",
                                    minHeight: "120px",
                                }}
                            />
                        </div>

                        {/* Category + Location */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(250px, 1fr))",
                                gap: "20px",
                                marginBottom: "22px",
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    Category
                                </label>

                                <select
                                    value={category}
                                    onChange={(e) =>
                                        setCategory(e.target.value)
                                    }
                                    style={inputStyle}
                                    required
                                >
                                    {categories.map((item) => (
                                        <option
                                            key={item}
                                            value={item}
                                        >
                                            {item}
                                        </option>
                                    ))}
                                </select>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    Location
                                </label>

                                <input
                                    type="text"
                                    value={location}
                                    onChange={(e) =>
                                        setLocation(e.target.value)
                                    }
                                    placeholder="Enter event location"
                                    required
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Date */}
                        <div style={{ marginBottom: "22px" }}>
                            <label style={labelStyle}>
                                Event Date & Time
                            </label>

                            <input
                                type="datetime-local"
                                value={eventDate}
                                onChange={(e) =>
                                    setEventDate(e.target.value)
                                }
                                required
                                style={inputStyle}
                            />
                        </div>

                        {/* Price + Tickets */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(250px, 1fr))",
                                gap: "20px",
                                marginBottom: "30px",
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    Ticket Price
                                </label>

                                <div
                                    style={{
                                        position: "relative",
                                    }}
                                >
                                    <span
                                        style={{
                                            position: "absolute",
                                            left: "14px",
                                            top: "50%",
                                            transform:
                                                "translateY(-50%)",
                                            color: "#6b7280",
                                            fontWeight: "600",
                                        }}
                                    >
                                        ₹
                                    </span>

                                    <input
                                        type="number"
                                        value={ticketPrice}
                                        onChange={(e) =>
                                            setTicketPrice(
                                                e.target.value
                                            )
                                        }
                                        placeholder="0"
                                        min="1"
                                        required
                                        style={{
                                            ...inputStyle,
                                            paddingLeft: "34px",
                                        }}
                                    />
                                </div>
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    Total Tickets
                                </label>

                                <input
                                    type="number"
                                    value={totalTickets}
                                    onChange={(e) =>
                                        setTotalTickets(
                                            e.target.value
                                        )
                                    }
                                    placeholder="100"
                                    min="1"
                                    required
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Buttons */}
                        <div
                            style={{
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "12px",
                                flexWrap: "wrap",
                            }}
                        >
                            <button
                                type="button"
                                onClick={() =>
                                    navigate("/organizer")
                                }
                                disabled={saving}
                                style={{
                                    padding: "12px 22px",
                                    borderRadius: "9px",
                                    border: "1px solid #d1d5db",
                                    background: "#ffffff",
                                    color: "#374151",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: saving
                                        ? "not-allowed"
                                        : "pointer",
                                }}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={saving}
                                style={{
                                    padding: "12px 24px",
                                    borderRadius: "9px",
                                    border: "none",
                                    background: "#4f46e5",
                                    color: "#ffffff",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: saving
                                        ? "not-allowed"
                                        : "pointer",
                                    minWidth: "145px",
                                    opacity: saving ? 0.7 : 1,
                                }}
                            >
                                {saving
                                    ? "Updating..."
                                    : "Update Event"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

const labelStyle = {
    display: "block",
    marginBottom: "8px",
    fontSize: "14px",
    fontWeight: "600",
    color: "#374151",
};

const inputStyle = {
    width: "100%",
    boxSizing: "border-box",
    padding: "12px 14px",
    border: "1px solid #d1d5db",
    borderRadius: "9px",
    background: "#ffffff",
    color: "#111827",
    fontSize: "14px",
    outline: "none",
    transition: "border-color 0.2s ease",
};

export default EditEvent;
