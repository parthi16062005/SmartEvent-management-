import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function CreateEvent() {
    const navigate = useNavigate();
    const token = localStorage.getItem("token");

    const [formData, setFormData] = useState({
        title: "",
        description: "",
        category: "",
        location: "",
        event_date: "",
        ticket_price: "",
        total_tickets: "",
        banner_image: "",
    });

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const categories = [
        "Tech",
        "Business",
        "Music",
        "Sports",
        
    ];

    const handleChange = (e) => {
        setFormData({
            ...formData,
            [e.target.name]: e.target.value,
        });
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        setError("");

        if (!formData.title.trim()) {
            setError("Event title is required.");
            return;
        }

        if (!formData.description.trim()) {
            setError("Event description is required.");
            return;
        }

        if (!formData.category) {
            setError("Please select an event category.");
            return;
        }

        if (!formData.location.trim()) {
            setError("Event location is required.");
            return;
        }

        if (!formData.event_date) {
            setError("Please select the event date and time.");
            return;
        }

        if (
            formData.ticket_price === "" ||
            Number(formData.ticket_price) < 0
        ) {
            setError("Please enter a valid ticket price.");
            return;
        }

        if (
            formData.total_tickets === "" ||
            Number(formData.total_tickets) <= 0
        ) {
            setError("Total tickets must be greater than 0.");
            return;
        }

        try {
            setLoading(true);

            const data = {
                title: formData.title,
                description: formData.description,
                category: formData.category,
                location: formData.location,
                event_date: formData.event_date,
                ticket_price: Number(formData.ticket_price),
                total_tickets: Number(formData.total_tickets),
            };

            if (formData.banner_image.trim()) {
                data.banner_image = formData.banner_image;
            }

            await axios.post(
                "http://127.0.0.1:8000/events",
                data,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                        "Content-Type": "application/json",
                    },
                }
            );

            navigate("/organizer");
        } catch (err) {
            console.error("Create event error:", err);

            if (err.response?.data?.detail) {
                setError(err.response.data.detail);
            } else {
                setError("Unable to create event. Please try again.");
            }
        } finally {
            setLoading(false);
        }
    };

    const inputStyle = {
        width: "100%",
        padding: "12px 13px",
        border: "1px solid #cbd5e1",
        borderRadius: "7px",
        fontSize: "14px",
        color: "#0f172a",
        background: "#ffffff",
        outline: "none",
        boxSizing: "border-box",
    };

    const labelStyle = {
        display: "block",
        marginBottom: "7px",
        color: "#334155",
        fontSize: "13px",
        fontWeight: "600",
    };

    return (
        <div
            style={{
                minHeight: "100vh",
                background: "#f8fafc",
                padding: "36px 24px 60px",
            }}
        >
            <div
                style={{
                    maxWidth: "900px",
                    margin: "0 auto",
                }}
            >
                {/* Header */}
                <div style={{ marginBottom: "28px" }}>
                    <Link
                        to="/organizer"
                        style={{
                            textDecoration: "none",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: "600",
                        }}
                    >
                        ← Back to Dashboard
                    </Link>

                    <p
                        style={{
                            margin: "22px 0 7px",
                            color: "#64748b",
                            fontSize: "13px",
                            fontWeight: "600",
                            letterSpacing: "0.4px",
                        }}
                    >
                        EVENT MANAGEMENT
                    </p>

                    <h1
                        style={{
                            margin: 0,
                            color: "#0f172a",
                            fontSize: "30px",
                            fontWeight: "700",
                        }}
                    >
                        Create New Event
                    </h1>

                    <p
                        style={{
                            margin: "9px 0 0",
                            color: "#64748b",
                            fontSize: "15px",
                        }}
                    >
                        Create an event and make it available for users to
                        discover and book.
                    </p>
                </div>

                {/* Form Card */}
                <div
                    style={{
                        background: "#ffffff",
                        border: "1px solid #e2e8f0",
                        borderRadius: "12px",
                        boxShadow:
                            "0 2px 8px rgba(15, 23, 42, 0.04)",
                        overflow: "hidden",
                    }}
                >
                    <div
                        style={{
                            padding: "22px 26px",
                            borderBottom: "1px solid #e2e8f0",
                        }}
                    >
                        <h2
                            style={{
                                margin: 0,
                                color: "#0f172a",
                                fontSize: "19px",
                                fontWeight: "700",
                            }}
                        >
                            Event Information
                        </h2>

                        <p
                            style={{
                                margin: "6px 0 0",
                                color: "#64748b",
                                fontSize: "13px",
                            }}
                        >
                            Enter the details of your event below.
                        </p>
                    </div>

                    <form
                        onSubmit={handleSubmit}
                        style={{
                            padding: "26px",
                        }}
                    >
                        {/* Error */}
                        {error && (
                            <div
                                style={{
                                    background: "#fef2f2",
                                    border: "1px solid #fecaca",
                                    color: "#b91c1c",
                                    padding: "12px 14px",
                                    borderRadius: "7px",
                                    marginBottom: "22px",
                                    fontSize: "13px",
                                }}
                            >
                                {error}
                            </div>
                        )}

                        {/* Title */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={labelStyle}>
                                Event Title
                            </label>

                            <input
                                type="text"
                                name="title"
                                value={formData.title}
                                onChange={handleChange}
                                placeholder="Enter event title"
                                style={inputStyle}
                            />
                        </div>

                        {/* Description */}
                        <div style={{ marginBottom: "20px" }}>
                            <label style={labelStyle}>
                                Description
                            </label>

                            <textarea
                                name="description"
                                value={formData.description}
                                onChange={handleChange}
                                placeholder="Describe your event"
                                rows="5"
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
                                gap: "18px",
                                marginBottom: "20px",
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    Category
                                </label>

                                <select
                                    name="category"
                                    value={formData.category}
                                    onChange={handleChange}
                                    style={{
                                        ...inputStyle,
                                        cursor: "pointer",
                                    }}
                                >
                                    <option value="">
                                        Select a category
                                    </option>

                                    {categories.map((category) => (
                                        <option
                                            key={category}
                                            value={category}
                                        >
                                            {category}
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
                                    name="location"
                                    value={formData.location}
                                    onChange={handleChange}
                                    placeholder="Example: Chennai"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Date + Price */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(250px, 1fr))",
                                gap: "18px",
                                marginBottom: "20px",
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    Event Date & Time
                                </label>

                                <input
                                    type="datetime-local"
                                    name="event_date"
                                    value={formData.event_date}
                                    onChange={handleChange}
                                    style={inputStyle}
                                />
                            </div>

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
                                            left: "13px",
                                            top: "50%",
                                            transform:
                                                "translateY(-50%)",
                                            color: "#64748b",
                                            fontSize: "14px",
                                        }}
                                    >
                                        ₹
                                    </span>

                                    <input
                                        type="number"
                                        name="ticket_price"
                                        value={formData.ticket_price}
                                        onChange={handleChange}
                                        placeholder="0"
                                        min="0"
                                        step="0.01"
                                        style={{
                                            ...inputStyle,
                                            paddingLeft: "30px",
                                        }}
                                    />
                                </div>
                            </div>
                        </div>

                        {/* Tickets + Banner */}
                        <div
                            style={{
                                display: "grid",
                                gridTemplateColumns:
                                    "repeat(auto-fit, minmax(250px, 1fr))",
                                gap: "18px",
                                marginBottom: "28px",
                            }}
                        >
                            <div>
                                <label style={labelStyle}>
                                    Total Tickets
                                </label>

                                <input
                                    type="number"
                                    name="total_tickets"
                                    value={formData.total_tickets}
                                    onChange={handleChange}
                                    placeholder="Example: 100"
                                    min="1"
                                    step="1"
                                    style={inputStyle}
                                />
                            </div>

                            <div>
                                <label style={labelStyle}>
                                    Banner Image URL
                                    <span
                                        style={{
                                            color: "#94a3b8",
                                            fontWeight: "400",
                                            marginLeft: "5px",
                                        }}
                                    >
                                        (Optional)
                                    </span>
                                </label>

                                <input
                                    type="url"
                                    name="banner_image"
                                    value={formData.banner_image}
                                    onChange={handleChange}
                                    placeholder="https://example.com/image.jpg"
                                    style={inputStyle}
                                />
                            </div>
                        </div>

                        {/* Actions */}
                        <div
                            style={{
                                borderTop: "1px solid #e2e8f0",
                                paddingTop: "22px",
                                display: "flex",
                                justifyContent: "flex-end",
                                gap: "10px",
                                flexWrap: "wrap",
                            }}
                        >
                            <Link
                                to="/organizer"
                                style={{
                                    textDecoration: "none",
                                    color: "#475569",
                                    background: "#ffffff",
                                    border: "1px solid #cbd5e1",
                                    padding: "11px 18px",
                                    borderRadius: "7px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                }}
                            >
                                Cancel
                            </Link>

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    border: "none",
                                    background: loading
                                        ? "#94a3b8"
                                        : "#0f172a",
                                    color: "#ffffff",
                                    padding: "11px 20px",
                                    borderRadius: "7px",
                                    fontSize: "14px",
                                    fontWeight: "600",
                                    cursor: loading
                                        ? "not-allowed"
                                        : "pointer",
                                }}
                            >
                                {loading
                                    ? "Creating Event..."
                                    : "Create Event"}
                            </button>
                        </div>
                    </form>
                </div>
            </div>
        </div>
    );
}

export default CreateEvent;