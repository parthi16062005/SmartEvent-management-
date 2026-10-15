
import {
    BrowserRouter,
    Routes,
    Route,
    useLocation,
} from "react-router-dom";

import Navbar from "./components/Navbar";
import "./styles/Common.css";

import Home from "./pages/Home";
import EventDetails from "./pages/EventDetails";
import Booking from "./pages/Booking";
import Login from "./pages/Login";
import Register from "./pages/Register";
import BookingSuccess from "./pages/BookingSuccess";
import BookingHistory from "./pages/BookingHistory";
import NotificationHistory from "./pages/NotificationHistory";
import Profile from "./pages/Profile";
import ChatbotWidget from "./components/ChatbotWidget";

/* Module 20 - Wishlist */
import Wishlist from "./pages/Wishlist";

import PaymentCheckout from "./pages/PaymentCheckout";
import PaymentConfirmation from "./pages/PaymentConfirmation";

import OrganizerDashboard from "./pages/OrganizerDashboard";
import CreateEvent from "./pages/CreateEvent";
import EditEvent from "./pages/EditEvent";
import EventBookings from "./pages/EventBookings";

import AdminUsers from "./pages/AdminUsers";
import AdminEvents from "./pages/AdminEvents";
import AdminBookings from "./pages/AdminBookings";
import AdminDashboard from "./pages/AdminDashboard";

import TicketVerification from "./pages/TicketVerification";

function AppContent() {
    const location = useLocation();

    const hideNavbar =
        location.pathname === "/login" ||
        location.pathname === "/register";

    return (
        <>
            {!hideNavbar && <Navbar />}

            <Routes>
                {/* User pages */}
                <Route
                    path="/"
                    element={<Home />}
                />
                <Route
                    path="/profile"
                    element={<Profile />}
                />

                <Route
                    path="/events/:eventId"
                    element={<EventDetails />}
                />

                <Route
                    path="/book/:eventId"
                    element={<Booking />}
                />

                <Route
                    path="/booking-success"
                    element={<BookingSuccess />}
                />

                <Route
                    path="/bookings"
                    element={<BookingHistory />}
                />

                {/* Module 20 - Wishlist */}
                <Route
                    path="/wishlist"
                    element={<Wishlist />}
                />

                {/* Notification History */}
                <Route
                    path="/notifications"
                    element={<NotificationHistory />}
                />

                {/* Payment pages */}
                <Route
                    path="/payment-checkout"
                    element={<PaymentCheckout />}
                />

                <Route
                    path="/payment-confirmation"
                    element={<PaymentConfirmation />}
                />

                {/* Authentication */}
                <Route
                    path="/login"
                    element={<Login />}
                />

                <Route
                    path="/register"
                    element={<Register />}
                />

                {/* Organizer pages */}
                <Route
                    path="/organizer"
                    element={<OrganizerDashboard />}
                />

                <Route
                    path="/organizer/events/create"
                    element={<CreateEvent />}
                />

                <Route
                    path="/organizer/events/edit/:eventId"
                    element={<EditEvent />}
                />

                <Route
                    path="/organizer/events/:eventId/bookings"
                    element={<EventBookings />}
                />

                {/* Admin pages */}
                <Route
                    path="/admin"
                    element={<AdminDashboard />}
                />

                {/* Module 22 - User Profile */}
                <Route
                    path="/profile"
                 element={<Profile />}
               />

                <Route
                    path="/admin/users"
                    element={<AdminUsers />}
                />

                <Route
                    path="/admin/events"
                    element={<AdminEvents />}
                />

                <Route
                    path="/admin/bookings"
                    element={<AdminBookings />}
                />

                {/* Admin and Organizer ticket verification */}
                <Route
                    path="/verify-ticket"
                    element={<TicketVerification />}
                />
            </Routes>
            {!hideNavbar && <ChatbotWidget />}
        </>
    );
}

function App() {
    return (
        <BrowserRouter>
            <AppContent />
        </BrowserRouter>
    );
}

export default App;
