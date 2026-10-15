import { useEffect, useState } from "react";
import {
    Link,
    useNavigate,
    useSearchParams,
} from "react-router-dom";
import axios from "axios";
import { Heart } from "lucide-react";
import "../styles/Home.css";

const API_URL = "http://127.0.0.1:8000";
const PAGE_SIZE = 6;

const CATEGORIES = [
    {
        name: "Tech",
        description: "Discover ideas and innovation",
        icon: "T",
        className: "tech",
    },
    {
        name: "Music",
        description: "Experience live performances",
        icon: "M",
        className: "music",
    },
    {
        name: "Sports",
        description: "Feel the excitement",
        icon: "S",
        className: "sports",
    },
    {
        name: "Business",
        description: "Connect and grow together",
        icon: "B",
        className: "business",
    },
];

const INITIAL_FILTERS = {
    location: "",
    start_date: "",
    end_date: "",
    min_price: "",
    max_price: "",
    sort_by: "date_asc",
};

function Home() {
    const navigate = useNavigate();

    const [events, setEvents] = useState([]);

    // MODULE 20: WISHLIST STATE
    const [wishlistEventIds, setWishlistEventIds] = useState([]);
    const [wishlistLoadingIds, setWishlistLoadingIds] = useState([]);
    const [wishlistMessage, setWishlistMessage] = useState("");

    const [loading, setLoading] = useState(true);
    const [error, setError] = useState("");
    const [selectedCategory, setSelectedCategory] = useState("");

    const [searchParams, setSearchParams] = useSearchParams();
    const searchText = searchParams.get("search") || "";

    const [filters, setFilters] = useState({ ...INITIAL_FILTERS });

    // MODULE 17: FEATURED AND TRENDING EVENTS
    const [showcaseEvents, setShowcaseEvents] = useState([]);
    const [showcaseLoading, setShowcaseLoading] = useState(true);

    const [appliedFilters, setAppliedFilters] = useState({
        ...INITIAL_FILTERS,
    });

    const [filterError, setFilterError] = useState("");

    // MODULE 17: PAGINATION STATE
    const [currentPage, setCurrentPage] = useState(1);

    const [pagination, setPagination] = useState({
        total: 0,
        page: 1,
        page_size: PAGE_SIZE,
        total_pages: 0,
        has_next: false,
        has_previous: false,
    });

    // MODULE 19: PERSONALIZED RECOMMENDATIONS
    const [recommendations, setRecommendations] = useState([]);
    const [preferredCategories, setPreferredCategories] = useState([]);
    const [recommendationsLoading, setRecommendationsLoading] =
        useState(false);

    // =====================================================
    // MODULE 20: LOAD USER WISHLIST
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const loadWishlist = async () => {
            const token =
                localStorage.getItem("access_token") ||
                localStorage.getItem("token");

            if (!token) {
                if (isMounted) {
                    setWishlistEventIds([]);
                }
                return;
            }

            try {
                const response = await axios.get(
                    `${API_URL}/wishlist`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (isMounted) {
                    const items = Array.isArray(response.data?.items)
                        ? response.data.items
                        : [];

                    setWishlistEventIds(
                        items
                            .map((item) => Number(item.event_id))
                            .filter((id) => Number.isFinite(id))
                    );
                }
            } catch (err) {
                console.error("Unable to load wishlist:", err);
            }
        };

        loadWishlist();

        return () => {
            isMounted = false;
        };
    }, []);

    // =====================================================
    // MODULE 20: ADD OR REMOVE WISHLIST EVENT
    // =====================================================

    const handleWishlistToggle = async (event, clickEvent) => {
        clickEvent.preventDefault();
        clickEvent.stopPropagation();

        const token =
            localStorage.getItem("access_token") ||
            localStorage.getItem("token");

        if (!token) {
            navigate("/login");
            return;
        }

        const eventId = Number(event.id);

        if (wishlistLoadingIds.includes(eventId)) {
            return;
        }

        const isSaved = wishlistEventIds.includes(eventId);

        setWishlistLoadingIds((previous) => [
            ...previous,
            eventId,
        ]);

        setWishlistMessage("");

        try {
            if (isSaved) {
                await axios.delete(
                    `${API_URL}/wishlist/${eventId}`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setWishlistEventIds((previous) =>
                    previous.filter((id) => id !== eventId)
                );

                setWishlistMessage(
                    `"${event.title}" removed from your wishlist.`
                );
            } else {
                await axios.post(
                    `${API_URL}/wishlist/${eventId}`,
                    {},
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                setWishlistEventIds((previous) =>
                    previous.includes(eventId)
                        ? previous
                        : [...previous, eventId]
                );

                setWishlistMessage(
                    `"${event.title}" added to your wishlist.`
                );
            }
        } catch (err) {
            console.error("Unable to update wishlist:", err);

            setWishlistMessage(
                err.response?.data?.detail ||
                    "Unable to update your wishlist. Please try again."
            );
        } finally {
            setWishlistLoadingIds((previous) =>
                previous.filter((id) => id !== eventId)
            );
        }
    };

    // =====================================================
    // FETCH EVENTS
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const getEvents = async () => {
            setLoading(true);
            setError("");

            try {
                const params = {
                    sort_by: appliedFilters.sort_by || "date_asc",
                    page: currentPage,
                    page_size: PAGE_SIZE,
                };

                if (searchText.trim()) {
                    params.search = searchText.trim();
                }

                if (selectedCategory) {
                    params.category = selectedCategory;
                }

                if (appliedFilters.location.trim()) {
                    params.location = appliedFilters.location.trim();
                }

                if (appliedFilters.start_date) {
                    params.start_date =
                        `${appliedFilters.start_date}T00:00:00`;
                }

                if (appliedFilters.end_date) {
                    params.end_date =
                        `${appliedFilters.end_date}T23:59:59`;
                }

                if (appliedFilters.min_price !== "") {
                    params.min_price = Number(
                        appliedFilters.min_price
                    );
                }

                if (appliedFilters.max_price !== "") {
                    params.max_price = Number(
                        appliedFilters.max_price
                    );
                }

                const response = await axios.get(
                    `${API_URL}/events`,
                    { params }
                );

                if (isMounted) {
                    const data = response.data;

                    setEvents(
                        Array.isArray(data.items)
                            ? data.items
                            : Array.isArray(data)
                              ? data
                              : []
                    );

                    setPagination({
                        total: data.total || 0,
                        page: data.page || currentPage,
                        page_size: data.page_size || PAGE_SIZE,
                        total_pages: data.total_pages || 0,
                        has_next: data.has_next || false,
                        has_previous: data.has_previous || false,
                    });

                    setError("");
                }
            } catch (err) {
                console.error("Unable to load events:", err);

                if (isMounted) {
                    setEvents([]);

                    setPagination({
                        total: 0,
                        page: currentPage,
                        page_size: PAGE_SIZE,
                        total_pages: 0,
                        has_next: false,
                        has_previous: false,
                    });

                    setError(
                        err.response?.data?.detail ||
                            "Unable to load events. Please make sure the backend server is running."
                    );
                }
            } finally {
                if (isMounted) {
                    setLoading(false);
                }
            }
        };

        getEvents();

        return () => {
            isMounted = false;
        };
    }, [
        searchText,
        selectedCategory,
        appliedFilters,
        currentPage,
    ]);

    // =====================================================
    // MODULE 17: LOAD FEATURED AND TRENDING EVENTS
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const loadShowcaseEvents = async () => {
            try {
                setShowcaseLoading(true);

                const response = await axios.get(
                    `${API_URL}/events`,
                    {
                        params: {
                            page: 1,
                            page_size: 100,
                            sort_by: "date_asc",
                        },
                    }
                );

                const data = response.data;

                const items = Array.isArray(data?.items)
                    ? data.items
                    : Array.isArray(data)
                      ? data
                      : [];

                if (isMounted) {
                    setShowcaseEvents(items);
                }
            } catch (err) {
                console.error(
                    "Unable to load featured and trending events:",
                    err
                );

                if (isMounted) {
                    setShowcaseEvents([]);
                }
            } finally {
                if (isMounted) {
                    setShowcaseLoading(false);
                }
            }
        };

        loadShowcaseEvents();

        return () => {
            isMounted = false;
        };
    }, []);

    // =====================================================
    // MODULE 19: LOAD PERSONALIZED RECOMMENDATIONS
    // =====================================================

    useEffect(() => {
        let isMounted = true;

        const loadRecommendations = async () => {
            const token =
                localStorage.getItem("access_token") ||
                localStorage.getItem("token");

            if (!token) {
                if (isMounted) {
                    setRecommendations([]);
                    setPreferredCategories([]);
                    setRecommendationsLoading(false);
                }

                return;
            }

            try {
                setRecommendationsLoading(true);

                const response = await axios.get(
                    `${API_URL}/recommendations`,
                    {
                        headers: {
                            Authorization: `Bearer ${token}`,
                        },
                    }
                );

                if (isMounted) {
                    const data = response.data || {};

                    setRecommendations(
                        Array.isArray(data.recommendations)
                            ? data.recommendations
                            : []
                    );

                    setPreferredCategories(
                        Array.isArray(data.preferred_categories)
                            ? data.preferred_categories
                            : []
                    );
                }
            } catch (err) {
                console.error(
                    "Unable to load personalized recommendations:",
                    err
                );

                if (isMounted) {
                    setRecommendations([]);
                    setPreferredCategories([]);
                }
            } finally {
                if (isMounted) {
                    setRecommendationsLoading(false);
                }
            }
        };

        loadRecommendations();

        return () => {
            isMounted = false;
        };
    }, []);

    // =====================================================
    // RESET PAGE WHEN SEARCH/CATEGORY CHANGES
    // =====================================================

    useEffect(() => {
        setCurrentPage(1);
    }, [searchText, selectedCategory]);

    // =====================================================
    // SEARCH
    // =====================================================

    const handleSearchChange = (value) => {
        const updatedParams = new URLSearchParams(searchParams);

        if (value.trim()) {
            updatedParams.set("search", value);
        } else {
            updatedParams.delete("search");
        }

        setCurrentPage(1);
        setSearchParams(updatedParams, { replace: true });
    };

    // =====================================================
    // FILTER CHANGE
    // =====================================================

    const handleFilterChange = (field, value) => {
        setFilters((previous) => ({
            ...previous,
            [field]: value,
        }));

        setFilterError("");
    };

    // =====================================================
    // APPLY FILTERS
    // =====================================================

    const handleApplyFilters = (event) => {
        event.preventDefault();

        if (
            filters.min_price !== "" &&
            Number(filters.min_price) < 0
        ) {
            setFilterError("Minimum price cannot be negative.");
            return;
        }

        if (
            filters.max_price !== "" &&
            Number(filters.max_price) < 0
        ) {
            setFilterError("Maximum price cannot be negative.");
            return;
        }

        if (
            filters.min_price !== "" &&
            filters.max_price !== "" &&
            Number(filters.min_price) > Number(filters.max_price)
        ) {
            setFilterError(
                "Minimum price cannot exceed maximum price."
            );
            return;
        }

        if (
            filters.start_date &&
            filters.end_date &&
            filters.start_date > filters.end_date
        ) {
            setFilterError(
                "Start date cannot be after the end date."
            );
            return;
        }

        setCurrentPage(1);
        setAppliedFilters({ ...filters });
        setFilterError("");
    };

    // =====================================================
    // CLEAR FILTERS
    // =====================================================

    const clearFilters = () => {
        setCurrentPage(1);
        setSelectedCategory("");
        setFilters({ ...INITIAL_FILTERS });
        setAppliedFilters({ ...INITIAL_FILTERS });
        setFilterError("");
        setSearchParams({}, { replace: true });
    };

    // =====================================================
    // PAGE CHANGE
    // =====================================================

    const handlePageChange = (page) => {
        if (
            page < 1 ||
            page > pagination.total_pages ||
            page === currentPage
        ) {
            return;
        }

        setCurrentPage(page);

        document.getElementById("events")?.scrollIntoView({
            behavior: "smooth",
            block: "start",
        });
    };

    // =====================================================
    // PAGE NUMBERS
    // =====================================================

    const getPageNumbers = () => {
        const totalPages = pagination.total_pages;

        if (totalPages <= 5) {
            return Array.from(
                { length: totalPages },
                (_, index) => index + 1
            );
        }

        if (currentPage <= 3) {
            return [1, 2, 3, 4, "...", totalPages];
        }

        if (currentPage >= totalPages - 2) {
            return [
                1,
                "...",
                totalPages - 3,
                totalPages - 2,
                totalPages - 1,
                totalPages,
            ];
        }

        return [
            1,
            "...",
            currentPage - 1,
            currentPage,
            currentPage + 1,
            "...",
            totalPages,
        ];
    };

    // =====================================================
    // ACTIVE FILTER CHECK
    // =====================================================

    const hasActiveFilters =
        Boolean(searchText) ||
        Boolean(selectedCategory) ||
        Boolean(appliedFilters.location) ||
        Boolean(appliedFilters.start_date) ||
        Boolean(appliedFilters.end_date) ||
        appliedFilters.min_price !== "" ||
        appliedFilters.max_price !== "" ||
        appliedFilters.sort_by !== "date_asc";

    // =====================================================
    // STATUS CLASS
    // =====================================================

    const getStatusClass = (status) => {
        switch (status?.toUpperCase()) {
            case "UPCOMING":
                return "home-status-upcoming";
            case "ONGOING":
                return "home-status-ongoing";
            case "COMPLETED":
                return "home-status-completed";
            case "CANCELLED":
                return "home-status-cancelled";
            default:
                return "home-status-default";
        }
    };

    // =====================================================
    // FORMAT DATE
    // =====================================================

    const formatDate = (date) => {
        if (!date) {
            return "Date unavailable";
        }

        const parsedDate = new Date(date);

        if (Number.isNaN(parsedDate.getTime())) {
            return "Date unavailable";
        }

        return parsedDate.toLocaleString("en-IN", {
            day: "2-digit",
            month: "short",
            year: "numeric",
            hour: "2-digit",
            minute: "2-digit",
        });
    };

    // =====================================================
    // FORMAT PRICE
    // =====================================================

    const formatPrice = (price) => {
        const amount = Number(price);

        if (!Number.isFinite(amount)) {
            return "Price unavailable";
        }

        return `₹${amount.toLocaleString("en-IN")}`;
    };

    // =====================================================
    // CATEGORY CLASS
    // =====================================================

    const getCategoryClass = (category) => {
        switch (category?.toLowerCase()) {
            case "tech":
                return "home-event-art-tech";
            case "music":
                return "home-event-art-music";
            case "sports":
                return "home-event-art-sports";
            case "business":
                return "home-event-art-business";
            default:
                return "home-event-art-default";
        }
    };

    // =====================================================
    // CATEGORY INITIAL
    // =====================================================

    const getCategoryInitial = (category) => {
        switch (category?.toLowerCase()) {
            case "tech":
                return "T";
            case "music":
                return "M";
            case "sports":
                return "S";
            case "business":
                return "B";
            default:
                return "E";
        }
    };

    // =====================================================
    // MODULE 17: SHOWCASE EVENTS
    // =====================================================

    const upcomingShowcaseEvents = showcaseEvents.filter((event) => {
        const eventDate = new Date(event.event_date);

        const status = String(
            event.event_status || "UPCOMING"
        ).toUpperCase();

        return (
            !Number.isNaN(eventDate.getTime()) &&
            eventDate > new Date() &&
            status !== "CANCELLED" &&
            status !== "COMPLETED" &&
            status !== "ONGOING"
        );
    });

    const featuredEvents = [...upcomingShowcaseEvents]
        .sort(
            (a, b) =>
                new Date(a.event_date).getTime() -
                new Date(b.event_date).getTime()
        )
        .slice(0, 3);

    const trendingEvents = [...upcomingShowcaseEvents]
        .sort((a, b) => {
            const soldA = Math.max(
                0,
                Number(a.total_tickets || 0) -
                    Number(a.available_tickets || 0)
            );

            const soldB = Math.max(
                0,
                Number(b.total_tickets || 0) -
                    Number(b.available_tickets || 0)
            );

            return (
                soldB - soldA ||
                new Date(a.event_date).getTime() -
                    new Date(b.event_date).getTime()
            );
        })
        .slice(0, 4);

    // =====================================================
    // PAGINATION RANGE
    // =====================================================

    const firstVisibleEvent =
        pagination.total === 0
            ? 0
            : (currentPage - 1) * PAGE_SIZE + 1;

    const lastVisibleEvent = Math.min(
        currentPage * PAGE_SIZE,
        pagination.total
    );

    return (
        <main className="home-page">
            {/* HERO SECTION */}

            <section className="home-hero">
                <div className="home-hero-decoration home-hero-decoration-one" />
                <div className="home-hero-decoration home-hero-decoration-two" />

                <div className="home-hero-inner">
                    <div className="home-hero-content">
                        <div className="home-hero-eyebrow">
                            <span className="home-eyebrow-dot" />
                            YOUR NEXT EXPERIENCE STARTS HERE
                        </div>

                        <h1>
                            Discover events.
                            <br />
                            <span>Make memories.</span>
                        </h1>

                        <p className="home-hero-description">
                            From inspiring tech conferences to unforgettable
                            live concerts, find experiences worth showing up for.
                        </p>

                        <form
                            className="home-search-form"
                            onSubmit={(event) => event.preventDefault()}
                        >
                            <span
                                className="home-search-icon"
                                aria-hidden="true"
                            >
                                <svg
                                    width="21"
                                    height="21"
                                    viewBox="0 0 24 24"
                                    fill="none"
                                    stroke="currentColor"
                                    strokeWidth="1.8"
                                    strokeLinecap="round"
                                >
                                    <circle cx="11" cy="11" r="7" />
                                    <path d="m16 16 4 4" />
                                </svg>
                            </span>

                            <input
                                type="search"
                                value={searchText}
                                onChange={(event) =>
                                    handleSearchChange(event.target.value)
                                }
                                placeholder="Search events, locations, categories..."
                                aria-label="Search events"
                            />

                            {searchText && (
                                <button
                                    type="button"
                                    className="home-search-clear"
                                    onClick={() => handleSearchChange("")}
                                    aria-label="Clear search"
                                >
                                    ×
                                </button>
                            )}
                        </form>

                        <div className="home-hero-note">
                            <span className="home-hero-note-check">✓</span>
                            Explore events and book your tickets in one place
                        </div>
                    </div>

                    <div
                        className="home-hero-visual"
                        aria-hidden="true"
                    >
                        <div className="home-visual-orbit home-visual-orbit-one" />
                        <div className="home-visual-orbit home-visual-orbit-two" />

                        <div className="home-visual-card home-visual-card-back">
                            <span className="home-visual-card-small-label">
                                YOUR NEXT CHAPTER
                            </span>

                            <div className="home-visual-card-lines">
                                <span />
                                <span />
                                <span />
                            </div>
                        </div>

                        <div className="home-visual-card home-visual-card-main">
                            <div className="home-visual-card-top">
                                <span className="home-visual-live-dot" />
                                FIND YOUR EXPERIENCE
                            </div>

                            <div className="home-visual-symbols">
                                <div className="home-visual-symbol symbol-one">T</div>
                                <div className="home-visual-symbol symbol-two">M</div>
                                <div className="home-visual-symbol symbol-three">S</div>
                            </div>

                            <h2>
                                Something
                                <br />
                                amazing awaits.
                            </h2>

                            <div className="home-visual-card-bottom">
                                <span>Discover something new</span>
                                <span className="home-visual-arrow">↗</span>
                            </div>
                        </div>

                        <div className="home-floating-badge">
                            <span className="home-floating-badge-icon">✦</span>

                            <div>
                                <strong>Live experiences</strong>
                                <span>Made for you</span>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="home-hero-bottom">
                    <span>DISCOVER</span>
                    <span className="home-hero-bottom-line" />
                    <span>BOOK</span>
                    <span className="home-hero-bottom-line" />
                    <span>EXPERIENCE</span>
                </div>
            </section>

            {/* CATEGORY SECTION */}

            <section
                className="home-category-section"
                id="categories"
            >
                <div className="home-section-heading">
                    <div>
                        <span className="home-section-eyebrow">
                            FIND YOUR INTEREST
                        </span>

                        <h2>Explore by category</h2>

                        <p>
                            Whatever you are passionate about, there is an
                            experience waiting for you.
                        </p>
                    </div>

                    <button
                        type="button"
                        className={`home-category-all ${
                            selectedCategory === "" ? "active" : ""
                        }`}
                        onClick={() => {
                            setCurrentPage(1);
                            setSelectedCategory("");
                        }}
                    >
                        All events <span>→</span>
                    </button>
                </div>

                <div className="home-category-grid">
                    {CATEGORIES.map((category) => {
                        const isSelected =
                            selectedCategory.toLowerCase() ===
                            category.name.toLowerCase();

                        return (
                            <button
                                type="button"
                                key={category.name}
                                className={`home-category-card home-category-${category.className} ${
                                    isSelected ? "selected" : ""
                                }`}
                                onClick={() => {
                                    setCurrentPage(1);
                                    setSelectedCategory(
                                        isSelected ? "" : category.name
                                    );
                                }}
                                aria-pressed={isSelected}
                            >
                                <span className="home-category-icon">
                                    {category.icon}
                                </span>

                                <span className="home-category-text">
                                    <strong>{category.name}</strong>
                                    <span>{category.description}</span>
                                </span>

                                <span className="home-category-arrow">↗</span>
                            </button>
                        );
                    })}
                </div>
            </section>

            {/* MODULE 17: FEATURED EVENTS */}

            <section className="home-showcase-section home-featured-section">
                <div className="home-showcase-heading">
                    <div>
                        <span className="home-section-eyebrow">
                            HANDPICKED FOR YOU
                        </span>

                        <h2>Featured Events</h2>

                        <p>
                            Discover upcoming experiences worth looking forward to.
                        </p>
                    </div>
                </div>

                {showcaseLoading ? (
                    <div className="home-showcase-message">
                        Loading featured events...
                    </div>
                ) : featuredEvents.length > 0 ? (
                    <div className="home-featured-grid">
                        {featuredEvents.map((event, index) => (
                            <Link
                                to={`/events/${event.id}`}
                                className="home-featured-card"
                                key={event.id}
                            >
                                <div
                                    className={`home-featured-art ${getCategoryClass(
                                        event.category
                                    )}`}
                                >
                                    <span className="home-showcase-number">
                                        0{index + 1}
                                    </span>

                                    <span className="home-showcase-category">
                                        {event.category || "Event"}
                                    </span>

                                    <span className="home-showcase-initial">
                                        {getCategoryInitial(event.category)}
                                    </span>
                                </div>

                                <div className="home-featured-content">
                                    <span className="home-showcase-date">
                                        {formatDate(event.event_date)}
                                    </span>

                                    <h3>{event.title}</h3>

                                    <p className="home-showcase-location">
                                        {event.location ||
                                            "Location to be announced"}
                                    </p>

                                    <div className="home-showcase-footer">
                                        <strong>
                                            {formatPrice(event.ticket_price)}
                                        </strong>

                                        <span>Explore event →</span>
                                    </div>
                                </div>
                            </Link>
                        ))}
                    </div>
                ) : (
                    <div className="home-showcase-message">
                        No upcoming featured events are available right now.
                    </div>
                )}
            </section>

            {/* MODULE 17: TRENDING EVENTS */}

            <section className="home-showcase-section home-trending-section">
                <div className="home-showcase-heading">
                    <div>
                        <span className="home-section-eyebrow">
                            POPULAR EXPERIENCES
                        </span>

                        <h2>Trending Events</h2>

                        <p>
                            Explore upcoming events attracting ticket bookings.
                        </p>
                    </div>
                </div>

                {showcaseLoading ? (
                    <div className="home-showcase-message">
                        Loading trending events...
                    </div>
                ) : trendingEvents.length > 0 ? (
                    <div className="home-trending-grid">
                        {trendingEvents.map((event, index) => {
                            const sold = Math.max(
                                0,
                                Number(event.total_tickets || 0) -
                                    Number(event.available_tickets || 0)
                            );

                            return (
                                <Link
                                    to={`/events/${event.id}`}
                                    className="home-trending-card"
                                    key={event.id}
                                >
                                    <div
                                        className={`home-trending-art ${getCategoryClass(
                                            event.category
                                        )}`}
                                    >
                                        <span className="home-trending-rank">
                                            #{index + 1}
                                        </span>

                                        <span className="home-trending-initial">
                                            {getCategoryInitial(event.category)}
                                        </span>
                                    </div>

                                    <div className="home-trending-content">
                                        <span className="home-showcase-category-text">
                                            {event.category || "Event"}
                                        </span>

                                        <h3>{event.title}</h3>

                                        <p className="home-showcase-location">
                                            {event.location ||
                                                "Location to be announced"}
                                        </p>

                                        <div className="home-trending-meta">
                                            <span>
                                                {formatDate(event.event_date)}
                                            </span>

                                            <span>{sold} tickets sold*</span>
                                        </div>

                                        <div className="home-showcase-footer">
                                            <strong>
                                                {formatPrice(event.ticket_price)}
                                            </strong>

                                            <span>View event →</span>
                                        </div>
                                    </div>
                                </Link>
                            );
                        })}
                    </div>
                ) : (
                    <div className="home-showcase-message">
                        No upcoming trending events are available right now.
                    </div>
                )}

                {!showcaseLoading && trendingEvents.length > 0 && (
                    <p className="home-trending-note">
                        *Trending order is estimated from total tickets minus available tickets.
                    </p>
                )}
            </section>

            {/* MODULE 19: PERSONALIZED RECOMMENDATIONS */}

            {!recommendationsLoading &&
                recommendations.length > 0 && (
                    <section className="home-recommendations-section">
                        <div className="home-recommendations-heading">
                            <div>
                                <span className="home-section-eyebrow">
                                    PERSONALIZED FOR YOU
                                </span>

                                <h2>Recommended For You</h2>

                                <p>
                                    Events selected based on the categories
                                    you enjoy.
                                </p>
                            </div>

                            {preferredCategories.length > 0 && (
                                <div className="home-recommendation-preferences">
                                    <span>Based on</span>

                                    <div>
                                        {preferredCategories.map((category) => (
                                            <span
                                                key={category}
                                                className="home-recommendation-category"
                                            >
                                                {category}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            )}
                        </div>

                        <div className="home-recommendations-grid">
                            {recommendations.map((event) => (
                                <Link
                                    to={`/events/${event.id}`}
                                    className="home-recommendation-card"
                                    key={event.id}
                                >
                                    <div
                                        className={`home-recommendation-art ${getCategoryClass(
                                            event.category
                                        )}`}
                                    >
                                        <span className="home-recommendation-badge">
                                            FOR YOU
                                        </span>

                                        <span className="home-recommendation-initial">
                                            {getCategoryInitial(event.category)}
                                        </span>

                                        <span className="home-recommendation-category">
                                            {event.category || "Event"}
                                        </span>
                                    </div>

                                    <div className="home-recommendation-content">
                                        <div className="home-recommendation-date">
                                            {formatDate(event.event_date)}
                                        </div>

                                        <h3>{event.title}</h3>

                                        {event.description && (
                                            <p>
                                                {event.description.length > 110
                                                    ? `${event.description.slice(
                                                          0,
                                                          110
                                                      )}...`
                                                    : event.description}
                                            </p>
                                        )}

                                        <div className="home-recommendation-details">
                                            <span>
                                                <strong>Location</strong>
                                                {event.location ||
                                                    "To be announced"}
                                            </span>

                                            <span>
                                                <strong>Availability</strong>
                                                {event.available_tickets} tickets
                                            </span>
                                        </div>

                                        <div className="home-recommendation-footer">
                                            <div>
                                                <span>Starting from</span>

                                                <strong>
                                                    {formatPrice(
                                                        event.ticket_price
                                                    )}
                                                </strong>
                                            </div>

                                            <span className="home-recommendation-arrow">
                                                View event →
                                            </span>
                                        </div>
                                    </div>
                                </Link>
                            ))}
                        </div>
                    </section>
                )}

            {/* EVENTS SECTION */}

            <section className="home-events-section" id="events">
                <div className="home-section-heading home-events-heading">
                    <div>
                        <span className="home-section-eyebrow">
                            THE LATEST EXPERIENCES
                        </span>

                        <h2>
                            {selectedCategory
                                ? `${selectedCategory} events`
                                : searchText
                                  ? "Search results"
                                  : "Discover all events"}
                        </h2>

                        <p>
                            Find your next experience and reserve your spot.
                        </p>
                    </div>

                    {!loading && !error && (
                        <div className="home-event-count">
                            <span>{pagination.total}</span>
                            {pagination.total === 1 ? " event" : " events"}
                        </div>
                    )}
                </div>

                {/* ADVANCED FILTER PANEL */}

                <form
                    className="home-filter-panel"
                    onSubmit={handleApplyFilters}
                >
                    <div className="home-filter-panel-heading">
                        <div>
                            <span className="home-section-eyebrow">
                                FIND YOUR PERFECT EVENT
                            </span>

                            <h3>Advanced filters</h3>

                            <p>
                                Refine your results by location, date, and budget.
                            </p>
                        </div>

                        <button
                            type="button"
                            className="home-filter-clear"
                            onClick={clearFilters}
                        >
                            <span
                                className="home-filter-clear-icon"
                                aria-hidden="true"
                            >
                                ↺
                            </span>

                            <span>Clear filters</span>
                        </button>
                    </div>

                    <div className="home-filter-grid">
                        <label className="home-filter-field">
                            <span>Location</span>

                            <input
                                type="text"
                                placeholder="Enter a city or location"
                                value={filters.location}
                                onChange={(event) =>
                                    handleFilterChange(
                                        "location",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="home-filter-field">
                            <span>Start date</span>

                            <input
                                type="date"
                                value={filters.start_date}
                                onChange={(event) =>
                                    handleFilterChange(
                                        "start_date",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="home-filter-field">
                            <span>End date</span>

                            <input
                                type="date"
                                value={filters.end_date}
                                min={filters.start_date || undefined}
                                onChange={(event) =>
                                    handleFilterChange(
                                        "end_date",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="home-filter-field">
                            <span>Minimum price (₹)</span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="0"
                                value={filters.min_price}
                                onChange={(event) =>
                                    handleFilterChange(
                                        "min_price",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="home-filter-field">
                            <span>Maximum price (₹)</span>

                            <input
                                type="number"
                                min="0"
                                step="0.01"
                                placeholder="Any budget"
                                value={filters.max_price}
                                onChange={(event) =>
                                    handleFilterChange(
                                        "max_price",
                                        event.target.value
                                    )
                                }
                            />
                        </label>

                        <label className="home-filter-field">
                            <span>Sort events by</span>

                            <select
                                value={filters.sort_by}
                                onChange={(event) =>
                                    handleFilterChange(
                                        "sort_by",
                                        event.target.value
                                    )
                                }
                            >
                                <option value="date_asc">
                                    Date: Earliest first
                                </option>

                                <option value="date_desc">
                                    Date: Latest first
                                </option>

                                <option value="price_asc">
                                    Price: Low to high
                                </option>

                                <option value="price_desc">
                                    Price: High to low
                                </option>

                                <option value="popularity">
                                    Popularity: Most popular first
                                </option>
                            </select>
                        </label>
                    </div>

                    {filterError && (
                        <p className="home-filter-error" role="alert">
                            {filterError}
                        </p>
                    )}

                    <div className="home-filter-actions">
                        <span>
                            Filters are applied when you click the button.
                        </span>

                        <button
                            type="submit"
                            className="home-filter-apply"
                            disabled={loading}
                        >
                            {loading ? "Loading events..." : "Apply filters"}
                            <span>→</span>
                        </button>
                    </div>
                </form>

                {/* SEARCH RESULTS MESSAGE */}

                {searchText && (
                    <div className="home-search-result">
                        Showing results for{" "}
                        <strong>“{searchText}”</strong>

                        <button
                            type="button"
                            onClick={() => handleSearchChange("")}
                        >
                            Clear search
                        </button>
                    </div>
                )}

                {/* ACTIVE CATEGORY FILTER */}

                {selectedCategory && (
                    <div className="home-active-filter">
                        <span>Category: {selectedCategory}</span>

                        <button
                            type="button"
                            onClick={() => {
                                setCurrentPage(1);
                                setSelectedCategory("");
                            }}
                            aria-label="Clear category filter"
                        >
                            ×
                        </button>
                    </div>
                )}

                {/* LOADING STATE */}

                {loading && (
                    <div className="home-state-card">
                        <div className="home-spinner" />

                        <h3>Finding amazing events</h3>

                        <p>
                            Please wait while we load the latest experiences.
                        </p>
                    </div>
                )}

                {/* ERROR STATE */}

                {!loading && error && (
                    <div className="home-state-card home-state-error">
                        <div className="home-state-icon">!</div>

                        <h3>We couldn't load the events</h3>

                        <p>{error}</p>

                        <button
                            type="button"
                            className="home-primary-button"
                            onClick={() => {
                                setError("");
                                setCurrentPage((previous) => previous + 1);
                                setCurrentPage((previous) => Math.max(1, previous - 1));
                            }}
                        >
                            Try again
                        </button>
                    </div>
                )}

                {/* EMPTY RESULTS */}

                {!loading && !error && events.length === 0 && (
                    <div className="home-state-card">
                        <div className="home-state-icon">⌕</div>

                        <h3>No events found</h3>

                        <p>
                            Try changing your search, category, location, dates,
                            or budget.
                        </p>

                        <button
                            type="button"
                            className="home-primary-button"
                            onClick={clearFilters}
                        >
                            Clear filters
                        </button>
                    </div>
                )}

                {/* MODULE 20: WISHLIST MESSAGE */}

                {wishlistMessage && (
                    <div className="home-wishlist-message" role="status">
                        <span>{wishlistMessage}</span>

                        <Link to="/wishlist">
                            View Wishlist →
                        </Link>
                    </div>
                )}

                {/* EVENT CARDS */}

                {!loading && !error && events.length > 0 && (
                    <div className="home-event-grid">
                        {events.map((event) => {
                            const eventId = Number(event.id);
                            const isSaved =
                                wishlistEventIds.includes(eventId);
                            const isWishlistLoading =
                                wishlistLoadingIds.includes(eventId);

                            return (
                                <article
                                    className="home-event-card"
                                    key={event.id}
                                >
                                    <div
                                        className={`home-event-art ${getCategoryClass(
                                            event.category
                                        )}`}
                                    >
                                        <div className="home-event-art-pattern" />

                                        <div className="home-event-art-top">
                                            <span className="home-event-category-badge">
                                                {event.category || "Event"}
                                            </span>

                                            <div className="home-event-card-actions">
                                                <span
                                                    className={`home-event-status ${getStatusClass(
                                                        event.event_status
                                                    )}`}
                                                >
                                                    {event.event_status ||
                                                        "AVAILABLE"}
                                                </span>

                                                <button
                                                    type="button"
                                                    className={`home-wishlist-button ${
                                                        isSaved ? "saved" : ""
                                                    }`}
                                                    onClick={(clickEvent) =>
                                                        handleWishlistToggle(
                                                            event,
                                                            clickEvent
                                                        )
                                                    }
                                                    disabled={isWishlistLoading}
                                                    aria-label={
                                                        isSaved
                                                            ? "Remove from wishlist"
                                                            : "Save to wishlist"
                                                    }
                                                    aria-pressed={isSaved}
                                                    title={
                                                        isSaved
                                                            ? "Remove from wishlist"
                                                            : "Save to wishlist"
                                                    }
                                                >
                                                    <Heart
                                                        size={19}
                                                        fill={
                                                            isSaved
                                                                ? "currentColor"
                                                                : "none"
                                                        }
                                                    />
                                                </button>
                                            </div>
                                        </div>

                                        <div className="home-event-art-center">
                                            <span className="home-event-art-initial">
                                                {getCategoryInitial(
                                                    event.category
                                                )}
                                            </span>
                                        </div>

                                        <div className="home-event-art-bottom">
                                            <span>SMARTEVENT EXPERIENCE</span>

                                            <span>
                                                #{String(event.id).padStart(3, "0")}
                                            </span>
                                        </div>
                                    </div>

                                    <div className="home-event-card-body">
                                        <h3 className="home-event-title">
                                            {event.title}
                                        </h3>

                                        {event.description && (
                                            <p className="home-event-description">
                                                {event.description}
                                            </p>
                                        )}

                                        <div className="home-event-details">
                                            <div className="home-event-detail-row">
                                                <span className="home-detail-icon">
                                                    <svg
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.7"
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

                                                <span className="home-detail-value">
                                                    {event.location ||
                                                        "Location to be announced"}
                                                </span>
                                            </div>

                                            <div className="home-event-detail-row">
                                                <span className="home-detail-icon">
                                                    <svg
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <rect
                                                            x="3"
                                                            y="4"
                                                            width="18"
                                                            height="17"
                                                            rx="2"
                                                        />
                                                        <path d="M16 2v4M8 2v4M3 10h18" />
                                                    </svg>
                                                </span>

                                                <span className="home-detail-value">
                                                    {formatDate(event.event_date)}
                                                </span>
                                            </div>

                                            <div className="home-event-detail-row">
                                                <span className="home-detail-icon">
                                                    <svg
                                                        width="18"
                                                        height="18"
                                                        viewBox="0 0 24 24"
                                                        fill="none"
                                                        stroke="currentColor"
                                                        strokeWidth="1.7"
                                                        strokeLinecap="round"
                                                        strokeLinejoin="round"
                                                    >
                                                        <circle
                                                            cx="9"
                                                            cy="8"
                                                            r="4"
                                                        />
                                                        <path d="M3 21v-2a6 6 0 0 1 12 0v2M19 8v6M22 11h-6" />
                                                    </svg>
                                                </span>

                                                <span className="home-detail-value">
                                                    {Number(
                                                        event.available_tickets
                                                    ) >= 0
                                                        ? `${event.available_tickets} tickets available`
                                                        : "Availability unavailable"}
                                                </span>
                                            </div>
                                        </div>

                                        <div className="home-event-card-footer">
                                            <div className="home-event-price-wrap">
                                                <span className="home-event-price-label">
                                                    Starting from
                                                </span>

                                                <strong className="home-event-price">
                                                    {formatPrice(
                                                        event.ticket_price
                                                    )}
                                                </strong>
                                            </div>

                                            <Link
                                                to={`/events/${event.id}`}
                                                className="home-view-event-button"
                                            >
                                                View event <span>→</span>
                                            </Link>
                                        </div>
                                    </div>
                                </article>
                            );
                        })}
                    </div>
                )}

                {/* PAGINATION */}

                {!loading &&
                    !error &&
                    pagination.total_pages > 1 && (
                        <nav
                            className="home-pagination"
                            aria-label="Event pagination"
                        >
                            <div className="home-pagination-info">
                                Showing{" "}
                                <strong>{firstVisibleEvent}</strong>
                                {"–"}
                                <strong>{lastVisibleEvent}</strong>
                                {" of "}
                                <strong>{pagination.total}</strong>
                                {" events"}
                            </div>

                            <div className="home-pagination-controls">
                                <button
                                    type="button"
                                    className="home-pagination-button home-pagination-previous"
                                    disabled={!pagination.has_previous}
                                    onClick={() =>
                                        handlePageChange(currentPage - 1)
                                    }
                                >
                                    <span aria-hidden="true">←</span>
                                    <span>Previous</span>
                                </button>

                                <div className="home-pagination-pages">
                                    {getPageNumbers().map((page, index) =>
                                        page === "..." ? (
                                            <span
                                                className="home-pagination-ellipsis"
                                                key={`ellipsis-${index}`}
                                            >
                                                …
                                            </span>
                                        ) : (
                                            <button
                                                type="button"
                                                key={page}
                                                className={`home-pagination-page ${
                                                    currentPage === page
                                                        ? "active"
                                                        : ""
                                                }`}
                                                aria-label={`Go to page ${page}`}
                                                aria-current={
                                                    currentPage === page
                                                        ? "page"
                                                        : undefined
                                                }
                                                onClick={() =>
                                                    handlePageChange(page)
                                                }
                                            >
                                                {page}
                                            </button>
                                        )
                                    )}
                                </div>

                                <button
                                    type="button"
                                    className="home-pagination-button home-pagination-next"
                                    disabled={!pagination.has_next}
                                    onClick={() =>
                                        handlePageChange(currentPage + 1)
                                    }
                                >
                                    <span>Next</span>
                                    <span aria-hidden="true">→</span>
                                </button>
                            </div>
                        </nav>
                    )}

                {/* EVENTS FOOTER */}

                {!loading && !error && events.length > 0 && (
                    <div className="home-events-footer">
                        <span>
                            Showing {firstVisibleEvent}–{lastVisibleEvent} of{" "}
                            {pagination.total}{" "}
                            {pagination.total === 1 ? "event" : "events"}
                        </span>

                        {hasActiveFilters && (
                            <button
                                type="button"
                                onClick={clearFilters}
                            >
                                View all events →
                            </button>
                        )}
                    </div>
                )}
            </section>

            {/* BOTTOM CALL TO ACTION */}

            <section className="home-cta-section">
                <div className="home-cta-decoration" />

                <div className="home-cta-content">
                    <span className="home-section-eyebrow">
                        YOUR NEXT EXPERIENCE IS CLOSER
                    </span>

                    <h2>
                        Make room for
                        <br />
                        <span>something memorable.</span>
                    </h2>

                    <p>
                        Explore the possibilities, find your people, and
                        experience something new.
                    </p>

                    <button
                        type="button"
                        className="home-cta-button"
                        onClick={() =>
                            document.getElementById("events")?.scrollIntoView({
                                behavior: "smooth",
                            })
                        }
                    >
                        Explore events <span>↓</span>
                    </button>
                </div>
            </section>
        </main>
    );
}

export default Home;