
import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import axios from "axios";

function Login() {
    const [email, setEmail] = useState("");
    const [password, setPassword] = useState("");

    const [loading, setLoading] = useState(false);
    const [error, setError] = useState("");

    const navigate = useNavigate();

    const handleSubmit = async (event) => {
        event.preventDefault();

        setLoading(true);
        setError("");

        const formData = new URLSearchParams();

        formData.append("username", email);
        formData.append("password", password);

        try {
            const response = await axios.post(
                "http://127.0.0.1:8000/login",
                formData,
                {
                    headers: {
                        "Content-Type": "application/x-www-form-urlencoded",
                    },
                }
            );

            const accessToken = response.data.access_token;

            // Store token using both names
            // This keeps existing pages working.
            localStorage.setItem("access_token", accessToken);
            localStorage.setItem("token", accessToken);

            // Decode JWT payload to get user role
            try {
                const payload = JSON.parse(
                    atob(
                        accessToken
                            .split(".")[1]
                            .replace(/-/g, "+")
                            .replace(/_/g, "/")
                    )
                );

                const userData = {
                    id: payload.sub,
                    role: payload.role,
                };

                localStorage.setItem(
                    "user",
                    JSON.stringify(userData)
                );
            } catch (decodeError) {
                console.error(
                    "Could not read user information:",
                    decodeError
                );
            }

            // Redirect based on role
            try {
                const payload = JSON.parse(
                    atob(
                        accessToken
                            .split(".")[1]
                            .replace(/-/g, "+")
                            .replace(/_/g, "/")
                    )
                );

                if (payload.role === "ADMIN") {
                    navigate("/admin");
                } else if (payload.role === "ORGANIZER") {
                    navigate("/organizer");
                } else {
                    navigate("/");
                }
            } catch (decodeError) {
                console.error(
                    "Role redirect error:",
                    decodeError
                );

                navigate("/");
            }

        } catch (error) {
            console.error("Login error:", error);

            setError(
                error.response?.data?.detail ||
                "Login failed. Please check your email and password."
            );
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="login-page">
            <div className="login-card">

                <div className="login-header">
                    <h1>SmartEvent</h1>

                    <h2>Welcome Back</h2>

                    <p>
                        Login to your account to continue.
                    </p>
                </div>

                {error && (
                    <div className="login-error">
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit}>

                    <div className="form-group">
                        <label htmlFor="login-email">
                            Email Address
                        </label>

                        <input
                            id="login-email"
                            type="email"
                            value={email}
                            onChange={(event) =>
                                setEmail(event.target.value)
                            }
                            placeholder="Enter your email"
                            required
                        />
                    </div>

                    <div className="form-group">
                        <label htmlFor="login-password">
                            Password
                        </label>

                        <input
                            id="login-password"
                            type="password"
                            value={password}
                            onChange={(event) =>
                                setPassword(event.target.value)
                            }
                            placeholder="Enter your password"
                            required
                        />
                    </div>

                    <button
                        type="submit"
                        className="login-submit-button"
                        disabled={loading}
                    >
                        {loading
                            ? "Logging in..."
                            : "Login"}
                    </button>

                </form>

                <div className="login-footer">
                    <span>
                        Don't have an account?
                    </span>

                    <Link to="/register">
                        Create an account
                    </Link>
                </div>

            </div>
        </div>
    );
}

export default Login;
