
import { useEffect, useRef, useState } from "react";
import { Link } from "react-router-dom";
import axios from "axios";
import { Html5QrcodeScanner } from "html5-qrcode";

const API_URL = "http://127.0.0.1:8000";

function getStoredUser() {
    try {
        const value = localStorage.getItem("user");
        return value ? JSON.parse(value) : null;
    } catch {
        return null;
    }
}

function extractTicketCode(value) {
    const text = String(value || "").trim();

    if (!text) {
        return "";
    }

    // Support QR codes containing a URL with ?ticket_code=...
    try {
        const url = new URL(text);
        const queryCode = url.searchParams.get("ticket_code");

        if (queryCode) {
            return queryCode.trim();
        }

        // Support a URL whose last path segment is the ticket code.
        const segments = url.pathname.split("/").filter(Boolean);

        if (segments.length > 0) {
            return decodeURIComponent(
                segments[segments.length - 1]
            ).trim();
        }
    } catch {
        // The scanned value may simply be a ticket code.
    }

    // Support QR codes containing JSON with a ticket_code property.
    try {
        const parsed = JSON.parse(text);

        if (parsed && typeof parsed.ticket_code === "string") {
            return parsed.ticket_code.trim();
        }
    } catch {
        // The scanned value is not JSON.
    }

    return text;
}

function TicketVerification() {
    const [ticketCode, setTicketCode] = useState("");
    const [result, setResult] = useState(null);
    const [loading, setLoading] = useState(false);
    const [scannerOpen, setScannerOpen] = useState(false);
    const [error, setError] = useState("");

    const scannerRef = useRef(null);
    const processingRef = useRef(false);

    const token =
        localStorage.getItem("access_token") ||
        localStorage.getItem("token");

    const user = getStoredUser();
    const role = String(user?.role || "").toUpperCase();

    const isAuthorized =
        role === "ADMIN" || role === "ORGANIZER";

    const verifyTicket = async (rawCode) => {
        const code = extractTicketCode(rawCode);

        if (!code) {
            setError("Please enter a ticket code.");
            setResult(null);
            return;
        }

        if (!token) {
            setError("Please log in before verifying tickets.");
            setResult(null);
            return;
        }

        if (!isAuthorized) {
            setError(
                "Only Admins and Organizers can verify tickets."
            );
            setResult(null);
            return;
        }

        try {
            setLoading(true);
            setError("");
            setResult(null);

            const response = await axios.get(
                `${API_URL}/verify-ticket/${encodeURIComponent(code)}`,
                {
                    headers: {
                        Authorization: `Bearer ${token}`,
                    },
                }
            );

            setResult(response.data);
            setTicketCode(code);
        } catch (err) {
            console.error("Ticket verification failed:", err);

            if (err.response?.status === 401) {
                setError(
                    "Your session has expired. Please log in again."
                );
            } else if (err.response?.status === 403) {
                setError(
                    err.response?.data?.detail ||
                    "You do not have permission to verify this ticket."
                );
            } else if (err.response?.status === 404) {
                setResult({
                    valid: false,
                    attendance_recorded: false,
                    ticket_code: code,
                    message:
                        err.response?.data?.detail ||
                        "Invalid ticket. No matching ticket was found.",
                });
            } else {
                setError(
                    err.response?.data?.detail ||
                    "Unable to verify the ticket. Please try again."
                );
            }
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        if (!scannerOpen) {
            return undefined;
        }

        const scanner = new Html5QrcodeScanner(
            "ticket-qr-reader",
            {
                fps: 10,
                qrbox: {
                    width: 230,
                    height: 230,
                },
                rememberLastUsedCamera: true,
            },
            false
        );

        scannerRef.current = scanner;

        scanner.render(
            (decodedText) => {
                if (processingRef.current) {
                    return;
                }

                processingRef.current = true;

                const code = extractTicketCode(decodedText);

                setTicketCode(code);
                setScannerOpen(false);

                scanner.clear().catch(() => {});
                scannerRef.current = null;

                verifyTicket(code).finally(() => {
                    processingRef.current = false;
                });
            },
            () => {
                // Ignore intermediate QR scanning errors.
            }
        );

        return () => {
            if (scannerRef.current === scanner) {
                scannerRef.current = null;
            }

            scanner.clear().catch(() => {});
        };
    }, [scannerOpen]);

    const handleSubmit = (event) => {
        event.preventDefault();
        verifyTicket(ticketCode);
    };

    const resetVerification = () => {
        setTicketCode("");
        setResult(null);
        setError("");
        processingRef.current = false;
    };

    if (!token || !isAuthorized) {
        return (
            <main style={styles.page}>
                <section style={styles.accessCard}>
                    <div style={styles.lockIcon}>!</div>

                    <h1 style={styles.title}>
                        Ticket Verification
                    </h1>

                    <p style={styles.subtitle}>
                        {!token
                            ? "Please log in to access ticket verification."
                            : "Access denied. Only Admins and Organizers can verify tickets."}
                    </p>

                    <Link to="/login" style={styles.primaryButton}>
                        Go to Login
                    </Link>
                </section>
            </main>
        );
    }

    return (
        <main style={styles.page}>
            <div style={styles.container}>
                <header style={styles.header}>
                    <div>
                        <p style={styles.eyebrow}>
                            {role} PANEL
                        </p>

                        <h1 style={styles.title}>
                            Ticket Verification
                        </h1>

                        <p style={styles.subtitle}>
                            Verify attendee tickets using a QR
                            scanner or manual ticket entry.
                        </p>
                    </div>

                    <Link
                        to={role === "ADMIN" ? "/admin" : "/organizer"}
                        style={styles.backButton}
                    >
                        Back to Dashboard
                    </Link>
                </header>

                <section style={styles.infoBanner}>
                    <strong>Admission verification</strong>

                    <p style={{ margin: "6px 0 0" }}>
                        Verify the ticket before allowing entry.
                        A ticket that has already been checked in
                        should not count as a new admission.
                    </p>
                </section>

                <div style={styles.grid}>
                    <section style={styles.card}>
                        <div style={styles.cardHeading}>
                            <span style={styles.stepNumber}>
                                01
                            </span>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Scan QR Ticket
                                </h2>

                                <p style={styles.muted}>
                                    Use your device camera to scan
                                    the attendee's QR code.
                                </p>
                            </div>
                        </div>

                        {!scannerOpen ? (
                            <button
                                type="button"
                                onClick={() => {
                                    setError("");
                                    setResult(null);
                                    setScannerOpen(true);
                                }}
                                style={styles.primaryButton}
                            >
                                Open QR Scanner
                            </button>
                        ) : (
                            <>
                                <div
                                    id="ticket-qr-reader"
                                    style={styles.scanner}
                                />

                                <button
                                    type="button"
                                    onClick={() => setScannerOpen(false)}
                                    style={styles.secondaryButton}
                                >
                                    Stop Scanner
                                </button>
                            </>
                        )}

                        <p style={styles.helper}>
                            Allow camera access when prompted.
                            Camera access requires a supported
                            secure browser context, such as
                            localhost or HTTPS.
                        </p>
                    </section>

                    <section style={styles.card}>
                        <div style={styles.cardHeading}>
                            <span style={styles.stepNumber}>
                                02
                            </span>

                            <div>
                                <h2 style={styles.sectionTitle}>
                                    Enter Ticket Code
                                </h2>

                                <p style={styles.muted}>
                                    Verify a ticket without scanning.
                                </p>
                            </div>
                        </div>

                        <form onSubmit={handleSubmit}>
                            <label
                                htmlFor="ticket-code"
                                style={styles.label}
                            >
                                Ticket Code
                            </label>

                            <input
                                id="ticket-code"
                                type="text"
                                value={ticketCode}
                                onChange={(event) =>
                                    setTicketCode(event.target.value)
                                }
                                placeholder="Enter ticket code"
                                autoComplete="off"
                                style={styles.input}
                            />

                            <button
                                type="submit"
                                disabled={loading}
                                style={{
                                    ...styles.primaryButton,
                                    width: "100%",
                                    opacity: loading ? 0.65 : 1,
                                }}
                            >
                                {loading
                                    ? "Verifying..."
                                    : "Verify Ticket"}
                            </button>
                        </form>

                        <p style={styles.helper}>
                            Enter the ticket code exactly as it
                            appears on the ticket.
                        </p>
                    </section>
                </div>

                {error && (
                    <section
                        role="alert"
                        style={styles.errorBox}
                    >
                        <strong>Verification Error</strong>

                        <p style={{ margin: "6px 0 0" }}>
                            {error}
                        </p>
                    </section>
                )}

                {result && (
                    <section
                        aria-live="polite"
                        style={{
                            ...styles.resultCard,
                            borderColor: result.valid
                                ? "#86efac"
                                : "#fca5a5",
                            background: result.valid
                                ? "#f0fdf4"
                                : "#fef2f2",
                        }}
                    >
                        <div style={styles.resultHeader}>
                            <div>
                                <p
                                    style={{
                                        ...styles.eyebrow,
                                        color: result.valid
                                            ? "#15803d"
                                            : "#b91c1c",
                                    }}
                                >
                                    VERIFICATION RESULT
                                </p>

                                <h2
                                    style={{
                                        ...styles.resultTitle,
                                        color: result.valid
                                            ? "#166534"
                                            : "#991b1b",
                                    }}
                                >
                                    {result.valid
                                        ? "Valid Ticket"
                                        : "Invalid Ticket"}
                                </h2>
                            </div>

                            <span
                                style={{
                                    ...styles.statusBadge,
                                    background: result.valid
                                        ? "#dcfce7"
                                        : "#fee2e2",
                                    color: result.valid
                                        ? "#166534"
                                        : "#991b1b",
                                }}
                            >
                                {result.valid ? "VALID" : "INVALID"}
                            </span>
                        </div>

                        <p style={styles.resultMessage}>
                            {result.message}
                        </p>

                        <div style={styles.detailsGrid}>
                            <Detail
                                label="Ticket Code"
                                value={result.ticket_code}
                            />

                            <Detail
                                label="Booking ID"
                                value={result.booking_id}
                            />

                            <Detail
                                label="Event ID"
                                value={result.event_id}
                            />

                            <Detail
                                label="Booking Status"
                                value={result.booking_status}
                            />

                            <Detail
                                label="Attendance Recorded"
                                value={
                                    !result.valid
                                        ? "No"
                                        : result.attendance_recorded === true
                                            ? "Yes — First Verification"
                                            : result.attendance_recorded === false
                                                ? "No — Already Recorded"
                                                : "Not confirmed"
                                }
                            />

                            <Detail
                                label="Verified At"
                                value={
                                    result.verified_at
                                        ? new Date(
                                            result.verified_at
                                        ).toLocaleString("en-IN")
                                        : "Not available"
                                }
                            />
                        </div>

                        {/* Show this warning only on repeat verification. */}
                        {result.valid &&
                            result.attendance_recorded === false && (
                                <p style={styles.warningText}>
                                    Attendance was already recorded for
                                    this ticket. Do not count it as a
                                    new admission.
                                </p>
                            )}

                        <button
                            type="button"
                            onClick={resetVerification}
                            style={{
                                ...styles.secondaryButton,
                                marginTop: "20px",
                            }}
                        >
                            Verify Another Ticket
                        </button>
                    </section>
                )}
            </div>
        </main>
    );
}

function Detail({ label, value }) {
    return (
        <div style={styles.detailItem}>
            <span style={styles.detailLabel}>
                {label}
            </span>

            <strong style={styles.detailValue}>
                {value === undefined ||
                value === null ||
                value === ""
                    ? "Not available"
                    : String(value)}
            </strong>
        </div>
    );
}

const styles = {
    page: {
        minHeight: "100vh",
        background: "#f8fafc",
        padding: "40px 24px 60px",
        boxSizing: "border-box",
    },

    container: {
        maxWidth: "1100px",
        margin: "0 auto",
    },

    header: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "20px",
        flexWrap: "wrap",
        marginBottom: "28px",
    },

    eyebrow: {
        color: "#64748b",
        fontSize: "12px",
        fontWeight: "800",
        letterSpacing: "1.2px",
        margin: "0 0 8px",
    },

    title: {
        color: "#0f172a",
        fontSize: "clamp(27px, 4vw, 36px)",
        margin: 0,
    },

    subtitle: {
        color: "#64748b",
        lineHeight: 1.7,
        margin: "10px 0 0",
    },

    muted: {
        color: "#64748b",
        fontSize: "14px",
        lineHeight: 1.6,
        margin: "6px 0 0",
    },

    backButton: {
        textDecoration: "none",
        color: "#334155",
        border: "1px solid #cbd5e1",
        background: "#ffffff",
        padding: "11px 15px",
        borderRadius: "8px",
        fontSize: "13px",
        fontWeight: "700",
    },

    infoBanner: {
        background: "#eff6ff",
        border: "1px solid #bfdbfe",
        color: "#1e40af",
        borderRadius: "10px",
        padding: "17px 20px",
        marginBottom: "22px",
        fontSize: "14px",
        lineHeight: 1.6,
    },

    grid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
        gap: "22px",
    },

    card: {
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
        minWidth: 0,
    },

    cardHeading: {
        display: "flex",
        gap: "13px",
        alignItems: "flex-start",
        marginBottom: "24px",
    },

    stepNumber: {
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        minWidth: "38px",
        height: "38px",
        borderRadius: "10px",
        background: "#eef2ff",
        color: "#4338ca",
        fontSize: "12px",
        fontWeight: "800",
    },

    sectionTitle: {
        margin: 0,
        color: "#0f172a",
        fontSize: "19px",
    },

    primaryButton: {
        display: "inline-flex",
        justifyContent: "center",
        alignItems: "center",
        border: "none",
        borderRadius: "8px",
        background: "#0f172a",
        color: "#ffffff",
        padding: "12px 18px",
        fontSize: "14px",
        fontWeight: "700",
        textDecoration: "none",
        cursor: "pointer",
        boxSizing: "border-box",
    },

    secondaryButton: {
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        background: "#ffffff",
        color: "#334155",
        padding: "10px 15px",
        fontSize: "13px",
        fontWeight: "700",
        cursor: "pointer",
    },

    scanner: {
        width: "100%",
        maxWidth: "400px",
        margin: "0 auto 16px",
    },

    label: {
        display: "block",
        color: "#334155",
        fontSize: "13px",
        fontWeight: "700",
        marginBottom: "8px",
    },

    input: {
        width: "100%",
        boxSizing: "border-box",
        border: "1px solid #cbd5e1",
        borderRadius: "8px",
        padding: "13px 14px",
        color: "#0f172a",
        fontSize: "14px",
        outline: "none",
        marginBottom: "14px",
    },

    helper: {
        color: "#94a3b8",
        fontSize: "12px",
        lineHeight: 1.7,
        margin: "16px 0 0",
    },

    errorBox: {
        marginTop: "24px",
        background: "#fef2f2",
        border: "1px solid #fecaca",
        borderRadius: "10px",
        color: "#b91c1c",
        padding: "17px 20px",
        fontSize: "14px",
        lineHeight: 1.6,
    },

    resultCard: {
        marginTop: "26px",
        border: "1px solid",
        borderRadius: "14px",
        padding: "24px",
        boxShadow: "0 4px 14px rgba(15, 23, 42, 0.04)",
    },

    resultHeader: {
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        gap: "15px",
        flexWrap: "wrap",
    },

    resultTitle: {
        margin: 0,
        fontSize: "25px",
    },

    statusBadge: {
        borderRadius: "20px",
        padding: "7px 13px",
        fontSize: "12px",
        fontWeight: "800",
    },

    resultMessage: {
        color: "#334155",
        fontSize: "14px",
        lineHeight: 1.7,
        margin: "16px 0 20px",
    },

    detailsGrid: {
        display: "grid",
        gridTemplateColumns:
            "repeat(auto-fit, minmax(min(100%, 210px), 1fr))",
        gap: "12px",
    },

    detailItem: {
        background: "rgba(255,255,255,0.75)",
        border: "1px solid #e2e8f0",
        borderRadius: "8px",
        padding: "13px",
        minWidth: 0,
    },

    detailLabel: {
        display: "block",
        color: "#64748b",
        fontSize: "12px",
        marginBottom: "7px",
    },

    detailValue: {
        display: "block",
        color: "#0f172a",
        fontSize: "13px",
        overflowWrap: "anywhere",
    },

    warningText: {
        marginTop: "18px",
        color: "#92400e",
        background: "#fffbeb",
        border: "1px solid #fde68a",
        borderRadius: "8px",
        padding: "12px",
        fontSize: "13px",
        lineHeight: 1.6,
    },

    accessCard: {
        maxWidth: "480px",
        margin: "70px auto",
        background: "#ffffff",
        border: "1px solid #e2e8f0",
        borderRadius: "14px",
        padding: "32px",
        textAlign: "center",
    },

    lockIcon: {
        width: "42px",
        height: "42px",
        margin: "0 auto 16px",
        borderRadius: "50%",
        background: "#fee2e2",
        color: "#b91c1c",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        fontSize: "22px",
        fontWeight: "800",
    },
};

export default TicketVerification;
