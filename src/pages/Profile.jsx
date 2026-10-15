import { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import "../styles/Profile.css";

const API_URL = "http://127.0.0.1:8000";

function Profile() {
const [profile, setProfile] = useState(null);
const [summary, setSummary] = useState(null);


const [formData, setFormData] = useState({
    username: "",
    email: "",
    profile_picture: "",
});

const [loading, setLoading] = useState(true);
const [saving, setSaving] = useState(false);
const [message, setMessage] = useState("");
const [error, setError] = useState("");

const token =
    localStorage.getItem("access_token") ||
    localStorage.getItem("token");

const authHeaders = {
    Authorization: `Bearer ${token}`,
};

useEffect(() => {
    loadProfile();
}, []);

const loadProfile = async () => {
    if (!token) {
        setError("Please log in to view your profile.");
        setLoading(false);
        return;
    }

    try {
        setLoading(true);
        setError("");

        const [profileResponse, summaryResponse] =
            await Promise.all([
                axios.get(`${API_URL}/profile`, {
                    headers: authHeaders,
                }),
                axios.get(
                    `${API_URL}/profile/booking-summary`,
                    { headers: authHeaders }
                ),
            ]);

        setProfile(profileResponse.data);
        setSummary(summaryResponse.data);

        setFormData({
            username: profileResponse.data.username || "",
            email: profileResponse.data.email || "",
            profile_picture:
                profileResponse.data.profile_picture || "",
        });
    } catch (err) {
        setError(
            err.response?.data?.detail ||
                "Unable to load your profile. Please try again."
        );
    } finally {
        setLoading(false);
    }
};

const handleChange = (event) => {
    const { name, value } = event.target;

    setFormData((previous) => ({
        ...previous,
        [name]: value,
    }));

    setMessage("");
    setError("");
};

const handleSubmit = async (event) => {
    event.preventDefault();

    setSaving(true);
    setMessage("");
    setError("");

    try {
        const payload = {
            username: formData.username.trim(),
            email: formData.email.trim(),
            profile_picture:
                formData.profile_picture.trim() || null,
        };

        const response = await axios.put(
            `${API_URL}/profile`,
            payload,
            { headers: authHeaders }
        );

        setProfile(response.data);

        setFormData({
            username: response.data.username || "",
            email: response.data.email || "",
            profile_picture:
                response.data.profile_picture || "",
        });

        setMessage("Your profile was updated successfully.");
    } catch (err) {
        setError(
            err.response?.data?.detail ||
                "Unable to update your profile."
        );
    } finally {
        setSaving(false);
    }
};

if (loading) {
    return (
        <main className="profile-page">
            <div className="profile-state">
                Loading your profile...
            </div>
        </main>
    );
}

if (!token) {
    return (
        <main className="profile-page">
            <div className="profile-state">
                <h2>Login required</h2>
                <p>Please log in to view your profile.</p>
                <Link className="profile-primary-button" to="/login">
                    Go to Login
                </Link>
            </div>
        </main>
    );
}

const initials = (profile?.username || "U")
    .trim()
    .slice(0, 1)
    .toUpperCase();

const stats = [
    {
        label: "Total Bookings",
        value: summary?.total_bookings ?? 0,
    },
    {
        label: "Confirmed",
        value: summary?.confirmed_bookings ?? 0,
    },
    {
        label: "Pending",
        value: summary?.pending_bookings ?? 0,
    },
    {
        label: "Cancelled",
        value: summary?.cancelled_bookings ?? 0,
    },
    {
        label: "Tickets Purchased",
        value: summary?.total_tickets ?? 0,
    },
];

return (
    <main className="profile-page">
        <section className="profile-hero">
            <div className="profile-hero-content">
                <span className="profile-eyebrow">
                    YOUR SMARTEVENT ACCOUNT
                </span>

                <h1>My Profile</h1>

                <p>
                    Manage your personal information and keep track
                    of your event experiences.
                </p>
            </div>

            <Link to="/bookings" className="profile-bookings-link">
                View My Bookings →
            </Link>
        </section>

        {message && (
            <div className="profile-alert profile-success">
                {message}
            </div>
        )}

        {error && (
            <div className="profile-alert profile-error">
                {error}
            </div>
        )}

        <section className="profile-overview">
            <div className="profile-avatar">
                {profile?.profile_picture ? (
                    <img
                        src={profile.profile_picture}
                        alt="Profile"
                        onError={(event) => {
                            event.currentTarget.style.display = "none";
                        }}
                    />
                ) : (
                    <span>{initials}</span>
                )}
            </div>

            <div className="profile-overview-details">
                <h2>{profile?.username}</h2>
                <p>{profile?.email}</p>

                <span className="profile-role">
                    {profile?.role || "USER"}
                </span>
            </div>

            <div className="profile-member">
                <span>MEMBER SINCE</span>
                <strong>
                    {profile?.created_at
                        ? new Date(
                              profile.created_at
                          ).toLocaleDateString("en-IN", {
                              day: "2-digit",
                              month: "short",
                              year: "numeric",
                          })
                        : "—"}
                </strong>
            </div>
        </section>

        <section className="profile-stats-section">
            <div className="profile-section-heading">
                <div>
                    <span className="profile-eyebrow">
                        YOUR ACTIVITY
                    </span>
                    <h2>Booking Overview</h2>
                </div>
            </div>

            <div className="profile-stats-grid">
                {stats.map((stat) => (
                    <article
                        className="profile-stat-card"
                        key={stat.label}
                    >
                        <span>{stat.label}</span>
                        <strong>
                            {Number(stat.value).toLocaleString("en-IN")}
                        </strong>
                    </article>
                ))}
            </div>

            <article className="profile-spending-card">
                <div>
                    <span>Total Confirmed Booking Spend</span>
                    <p>
                        Amount spent on confirmed bookings
                    </p>
                </div>

                <strong>
                    ₹
                    {Number(
                        summary?.total_spent ?? 0
                    ).toLocaleString("en-IN", {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2,
                    })}
                </strong>
            </article>
        </section>

        <section className="profile-edit-section">
            <div className="profile-section-heading">
                <div>
                    <span className="profile-eyebrow">
                        ACCOUNT SETTINGS
                    </span>
                    <h2>Edit Your Profile</h2>
                    <p>
                        Keep your account information up to date.
                    </p>
                </div>
            </div>

            <form
                className="profile-form"
                onSubmit={handleSubmit}
            >
                <div className="profile-form-grid">
                    <div className="profile-field">
                        <label htmlFor="username">
                            Username
                        </label>

                        <input
                            id="username"
                            name="username"
                            type="text"
                            value={formData.username}
                            onChange={handleChange}
                            minLength={3}
                            maxLength={50}
                            required
                        />
                    </div>

                    <div className="profile-field">
                        <label htmlFor="email">
                            Email Address
                        </label>

                        <input
                            id="email"
                            name="email"
                            type="email"
                            value={formData.email}
                            onChange={handleChange}
                            maxLength={100}
                            required
                        />
                    </div>

                    <div className="profile-field profile-field-full">
                        <label htmlFor="profile_picture">
                            Profile Picture URL
                        </label>

                        <input
                            id="profile_picture"
                            name="profile_picture"
                            type="url"
                            value={formData.profile_picture}
                            onChange={handleChange}
                            maxLength={500}
                            placeholder="https://example.com/your-photo.jpg"
                        />

                        <small>
                            Enter a publicly accessible image URL.
                            Leave empty to remove your profile picture.
                        </small>
                    </div>
                </div>

                <div className="profile-form-actions">
                    <button
                        type="submit"
                        className="profile-primary-button"
                        disabled={saving}
                    >
                        {saving
                            ? "Saving Changes..."
                            : "Save Changes"}
                    </button>

                    <button
                        type="button"
                        className="profile-secondary-button"
                        onClick={() => {
                            if (profile) {
                                setFormData({
                                    username: profile.username || "",
                                    email: profile.email || "",
                                    profile_picture:
                                        profile.profile_picture || "",
                                });
                            }

                            setMessage("");
                            setError("");
                        }}
                    >
                        Reset
                    </button>
                </div>
            </form>
        </section>

        <section className="profile-quick-links">
            <Link to="/bookings">
                <span>
                    <strong>My Bookings</strong>
                    <small>Review your reservations</small>
                </span>
                <span>→</span>
            </Link>

            <Link to="/wishlist">
                <span>
                    <strong>My Wishlist</strong>
                    <small>Discover your saved events</small>
                </span>
                <span>→</span>
            </Link>

            <Link to="/notifications">
                <span>
                    <strong>Notifications</strong>
                    <small>Check your latest updates</small>
                </span>
                <span>→</span>
            </Link>
        </section>
    </main>
);

}

export default Profile;
