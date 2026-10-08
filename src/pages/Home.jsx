import { useEffect, useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import axios from "axios";

function Home() {
    const [events, setEvents] = useState([]);
    const [filteredEvents, setFilteredEvents] = useState([]);

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");

    const [selectedCategory, setSelectedCategory] = useState("");

    const [searchParams] = useSearchParams();

    const searchText = searchParams.get("search") || "";

    useEffect(() => {
        getEvents();
    }, []);

    useEffect(() => {
        filterEvents(searchText, selectedCategory);
    }, [events, searchText, selectedCategory]);

    const getEvents = async () => {
        try {
            const response = await axios.get(
                "http://127.0.0.1:8000/events"
            );

            setEvents(response.data);
            setError("");
        } catch (err) {
            console.error(err);

            setError(
                "Unable to load events. Please make sure the FastAPI server is running."
            );
        } finally {
            setLoading(false);
        }
    };

    const filterEvents = (search, category) => {
        let result = [...events];

        const searchValue = search.trim().toLowerCase();

        if (searchValue) {
            result = result.filter((event) =>
                event.title?.toLowerCase().includes(searchValue) ||
                event.description?.toLowerCase().includes(searchValue) ||
                event.location?.toLowerCase().includes(searchValue) ||
                event.category?.toLowerCase().includes(searchValue)
            );
        }

        if (category) {
            result = result.filter(
                (event) =>
                    event.category?.toLowerCase() ===
                    category.toLowerCase()
            );
        }

        setFilteredEvents(result);
    };

    const categories = [
        ...new Set(
            events
                .map((event) => event.category)
                .filter(Boolean)
        )
    ];

    const clearFilters = () => {
        setSelectedCategory("");
        window.history.pushState({}, "", "/");
        window.location.reload();
    };

    const getStatusClass = (status) => {
        switch (status) {
            case "UPCOMING":
                return "status-upcoming";

            case "ONGOING":
                return "status-ongoing";

            case "COMPLETED":
                return "status-completed";

            case "CANCELLED":
                return "status-cancelled";

            default:
                return "";
        }
    };

    const formatDate = (date) => {
        if (!date) {
            return "Date unavailable";
        }

        return new Date(date).toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    return (
        <div className="home">

            {/* HERO SECTION */}

            <section className="hero">

                <div className="hero-content">

                    <div className="hero-accent-line"></div>

                    <p className="hero-label">
                        SMART EVENT PLATFORM
                    </p>

                    <h1>
                        Discover Amazing Events
                    </h1>

                    <p className="hero-description">
                        Find events, book tickets and manage your
                        bookings easily with SmartEvent.
                    </p>

                </div>

            </section>


            {/* EVENTS SECTION */}

            <section
                className="events-section"
                id="categories"
            >

                <div className="section-header">

                    <div>
                        <p className="section-label">
                            EXPLORE
                        </p>

                        <h2>
                            All Events
                        </h2>

                        <p>
                            Explore events and book your tickets
                            for upcoming experiences.
                        </p>
                    </div>

                </div>


                {/* CATEGORY FILTER */}

                {!loading &&
                    !error &&
                    categories.length > 0 && (

                        <div className="category-filter">

                            <button
                                type="button"
                                className={
                                    selectedCategory === ""
                                        ? "category-filter-button active"
                                        : "category-filter-button"
                                }
                                onClick={() =>
                                    setSelectedCategory("")
                                }
                            >
                                All
                            </button>


                            {categories.map((category) => (

                                <button
                                    type="button"
                                    key={category}
                                    className={
                                        selectedCategory === category
                                            ? "category-filter-button active"
                                            : "category-filter-button"
                                    }
                                    onClick={() =>
                                        setSelectedCategory(
                                            selectedCategory === category
                                                ? ""
                                                : category
                                        )
                                    }
                                >
                                    {category}
                                </button>

                            ))}

                        </div>

                    )}


                {/* SEARCH RESULT */}

                {searchText && !loading && !error && (

                    <div className="search-result-info">

                        <span>
                            Search results for
                        </span>

                        <strong>
                            "{searchText}"
                        </strong>

                    </div>

                )}


                {/* LOADING */}

                {loading && (

                    <div className="status-message">

                        <div className="loading-line"></div>

                        <p>
                            Loading events...
                        </p>

                    </div>

                )}


                {/* ERROR */}

                {error && (

                    <div className="status-message error-message">

                        <strong>
                            Unable to load events
                        </strong>

                        <p>
                            {error}
                        </p>

                    </div>

                )}


                {/* NO EVENTS */}

                {!loading &&
                    !error &&
                    filteredEvents.length === 0 && (

                        <div className="status-message empty-message">

                            <h3>
                                No events found
                            </h3>

                            <p>
                                There are no events matching
                                your current selection.
                            </p>

                            {(searchText || selectedCategory) && (

                                <button
                                    type="button"
                                    onClick={clearFilters}
                                    className="clear-search-button"
                                >
                                    Clear Filters
                                </button>

                            )}

                        </div>

                    )}


                {/* EVENT GRID */}

                {!loading &&
                    !error &&
                    filteredEvents.length > 0 && (

                        <div className="event-grid">

                            {filteredEvents.map((event) => (

                                <article
                                    className="event-card"
                                    key={event.id}
                                >

                                    <div className="event-card-content">

                                        {/* CATEGORY + STATUS */}

                                        <div className="event-badges">

                                            <span className="event-category">
                                                {event.category}
                                            </span>

                                            <span
                                                className={`event-status ${getStatusClass(
                                                    event.event_status
                                                )}`}
                                            >
                                                {event.event_status}
                                            </span>

                                        </div>


                                        {/* TITLE */}

                                        <h3 className="event-title">
                                            {event.title}
                                        </h3>


                                        {/* EVENT INFORMATION */}

                                        <div className="event-info">

                                            <div className="event-info-row">

                                                <span className="event-info-icon">
                                                    <svg
                                                        width="17"
                                                        height="17"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M20 10c0 5-8 11-8 11S4 15 4 10a8 8 0 1 1 16 0Z" />
                                                        <circle
                                                            cx="12"
                                                            cy="10"
                                                            r="2.5"
                                                        />
                                                    </svg>
                                                </span>

                                                <div>
                                                    <span className="event-info-label">
                                                        Location
                                                    </span>

                                                    <span className="event-info-value">
                                                        {event.location}
                                                    </span>
                                                </div>

                                            </div>


                                            <div className="event-info-row">

                                                <span className="event-info-icon">
                                                    <svg
                                                        width="17"
                                                        height="17"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <rect
                                                            x="3"
                                                            y="4"
                                                            width="18"
                                                            height="18"
                                                            rx="2"
                                                        />

                                                        <line
                                                            x1="16"
                                                            y1="2"
                                                            x2="16"
                                                            y2="6"
                                                        />

                                                        <line
                                                            x1="8"
                                                            y1="2"
                                                            x2="8"
                                                            y2="6"
                                                        />

                                                        <line
                                                            x1="3"
                                                            y1="10"
                                                            x2="21"
                                                            y2="10"
                                                        />
                                                    </svg>
                                                </span>

                                                <div>
                                                    <span className="event-info-label">
                                                        Date
                                                    </span>

                                                    <span className="event-info-value">
                                                        {formatDate(
                                                            event.event_date
                                                        )}
                                                    </span>
                                                </div>

                                            </div>


                                            <div className="event-info-row">

                                                <span className="event-info-icon">
                                                    <svg
                                                        width="17"
                                                        height="17"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.8"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                                                        <circle
                                                            cx="9"
                                                            cy="7"
                                                            r="4"
                                                        />
                                                        <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                                                        <path d="M16 3.13a4 4 0 0 1 0 7.75" />
                                                    </svg>
                                                </span>

                                                <div>
                                                    <span className="event-info-label">
                                                        Availability
                                                    </span>

                                                    <span className="event-info-value">
                                                        {event.available_tickets}{" "}
                                                        tickets available
                                                    </span>
                                                </div>

                                            </div>

                                        </div>


                                        {/* CARD FOOTER */}

                                        <div className="event-card-footer">

                                            <div>

                                                <span className="event-price-label">
                                                    Ticket Price
                                                </span>

                                                <span className="event-price">
                                                    ₹
                                                    {Number(
                                                        event.ticket_price
                                                    ).toLocaleString("en-IN")}
                                                </span>

                                            </div>


                                            <Link
                                                to={`/events/${event.id}`}
                                                className="view-event-button"
                                            >
                                                View Event
                                            </Link>

                                        </div>

                                    </div>

                                </article>

                            ))}

                        </div>

                    )}

            </section>

        </div>
    );
}

export default Home;