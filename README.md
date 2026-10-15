# SmartEvent — Event Management and Ticket Booking Platform

## 1. Project Overview

SmartEvent is a full-stack web application designed to simplify event discovery, event management, and online ticket booking.

Users can explore events, search using advanced filters, book tickets, apply discount coupons, complete simulated payments, manage their bookings, save favorite events, and receive notifications.

The platform also provides dedicated functionality for event organizers and administrators. An integrated chatbot assistant helps users discover events and obtain booking-related information.

The application uses **React.js for the frontend, FastAPI for the backend, and SQLite for database storage**.

## 2. Objectives

* Provide a centralized platform for discovering and managing events.
* Simplify ticket booking and payment workflows.
* Enable organizers to manage events and monitor bookings.
* Provide administrators with management and analytics features.
* Improve user engagement through notifications, reviews, and wishlists.
* Support real-time interactions and personalized event discovery.
* Provide an integrated chatbot for event-related assistance.

## 3. Technology Stack

### Frontend

* React.js
* Vite
* JavaScript
* HTML5
* CSS3
* React Router
* Fetch API

### Backend

* Python
* FastAPI
* SQLAlchemy
* Pydantic
* JWT Authentication
* bcrypt Password Hashing
* WebSocket Support

### Database

* SQLite

### Additional Technologies

* QR Code Generation
* REST API
* Simulated Payment Processing
* Rule-Based Chatbot
* Git and GitHub (for version control, if configured)

## 4. User Roles

### User

* Register and log in.
* Browse and search events.
* View event details.
* Book event tickets.
* Apply discount coupons.
* Complete simulated payments.
* View booking history.
* Access ticket QR codes.
* Submit event reviews after ticket verification.
* Manage a personal wishlist.
* Receive notifications.
* Interact with the SmartEvent chatbot.

### Organizer

* Create and manage events.
* Update event information.
* View event bookings.
* Monitor ticket availability.
* Access organizer-related event management features.

### Administrator

* Manage users.
* Manage events.
* View bookings.
* Access administrative dashboards and analytics.
* Support ticket verification and platform administration.

## 5. Main Features

### Authentication and Authorization

* User registration and login.
* JWT-based authentication.
* Password hashing.
* Role-based access for users, organizers, and administrators.

### Event Management

* Create, view, update, and manage events.
* Organize events into Tech, Music, Sports, and Business categories.
* Display event descriptions, dates, locations, prices, and ticket availability.
* Track event status.

### Event Search and Filtering

* Search for events.
* Filter events by category and location.
* Filter using minimum and maximum ticket prices.
* Filter by date range.
* Sort by event date and ticket price.
* Support popularity-based sorting.
* Paginate event results.

### Ticket Booking

* Select the number of tickets.
* Check ticket availability.
* Calculate booking totals.
* Maintain booking history.
* Generate ticket QR codes.
* Verify tickets through the ticket verification functionality.

### Payment Processing

* Simulated payment workflow.
* Pending, successful, and failed payment states.
* Handle payment results and associated booking status changes.
* Generate ticket details following successful payment.

**Note:** Payment processing is simulated and does not represent a live payment gateway integration.

### Coupon Management

* Apply discount coupons to eligible bookings.
* Support percentage-based and fixed-amount discounts.
* Configure minimum booking amounts.
* Configure usage limits and expiration dates.
* Enable or disable coupons.

### Event Reviews

* Submit event ratings and reviews.
* Require ticket verification before submitting a review.
* Update or delete eligible reviews.
* Display event ratings and review counts.

### Notifications

* View notifications.
* Track unread notification counts.
* Mark notifications as read.
* Generate event reminders.

### Wishlist

* Save events for later.
* View saved events.
* Access saved events when planning future bookings.

### User Profile

* Access user profile information.
* Manage supported profile details.
* View booking-related information.

### Analytics and Dashboards

* Administrative dashboards.
* User, organizer, event, and booking information.
* Ticket sales and revenue statistics.
* Popular event information.
* Booking trends and revenue-related analytics.

### Real-Time Features

* Support for WebSocket-based communication.
* Interactive application features.
* Notifications and user engagement functionality.

### SmartEvent Chatbot Assistant

* Floating chatbot interface.
* Greeting and help responses.
* Discover events using category, location, and price filters.
* Display trending events using database booking counts.
* Show the authenticated user's recent bookings.
* Explain the ticket booking process.
* Provide basic payment and ticket assistance.
* Display event cards with details.
* Navigate to event pages from chatbot responses.
* Offer quick message suggestions.

The chatbot uses a rule-based approach and retrieves relevant event and booking information from the application's database.

## 6. Project Modules

The project has been developed incrementally through Module 24.

| Module       | Feature Area                                               | Status      |
| ------------ | ---------------------------------------------------------- | ----------- |
| Modules 1–11 | Initial application development and core platform features | Implemented |
| Module 12    | Simulated Payments                                         | Completed   |
| Module 13    | Coupon Management                                          | Completed   |
| Module 14    | Event Reviews and Ratings                                  | Completed   |
| Module 15    | Notifications and Reminders                                | Completed   |
| Module 16    | Advanced Event Search and Filtering API                    | Completed   |
| Module 17    | Event Pagination                                           | Completed   |
| Module 18    | Phase 4 functionality                                      | Completed   |
| Module 19    | Phase 4 functionality                                      | Completed   |
| Module 20    | Wishlist                                                   | Completed   |
| Module 21    | Phase 4 functionality                                      | Completed   |
| Module 22    | User Profile                                               | Completed   |
| Module 23    | Advanced Search and Filters                                | Completed   |
| Module 24    | Chatbot Assistant                                          | Completed   |

*Note: The descriptions for Modules 1–11 and the individual Phase 4 module numbers should be aligned with the original assignment specifications before submitting this README as formal project documentation.*

## 7. Project Folder Structure

The main project is organized into separate frontend and backend applications.

```text
SmartEvent/
│
├── backend/
│   ├── main.py
│   ├── models.py
│   ├── schemas.py
│   ├── database.py
│   ├── smartevent.db
│   ├── requirements.txt
│   └── other backend modules
│
├── frontend/
│   ├── src/
│   │   ├── components/
│   │   │   ├── Navbar.jsx
│   │   │   └── ChatbotWidget.jsx
│   │   │
│   │   ├── pages/
│   │   │   ├── Home.jsx
│   │   │   ├── EventDetails.jsx
│   │   │   ├── Booking.jsx
│   │   │   ├── BookingHistory.jsx
│   │   │   ├── BookingSuccess.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── Register.jsx
│   │   │   ├── Wishlist.jsx
│   │   │   └── other application pages
│   │   │
│   │   ├── styles/
│   │   │   ├── Common.css
│   │   │   └── ChatbotWidget.css
│   │   │
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── other frontend configuration files
│
└── README.md
```

*This is a representative structure. The actual project may contain additional files and directories.*

## 8. Installation and Setup

### Prerequisites

Install the following software:

* Python
* Node.js and npm
* Visual Studio Code (recommended)

### Step 1: Open the Project

Open the SmartEvent project folder in Visual Studio Code.

### Step 2: Start the Backend

Open a terminal and navigate to the backend folder.

```powershell
cd backend
```

Create a virtual environment if one does not already exist.

```powershell
python -m venv venv
```

Activate the virtual environment in Windows PowerShell.

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required Python packages.

```powershell
python -m pip install -r requirements.txt
```

Start the FastAPI server.

```powershell
python -m uvicorn main:app --reload
```

The backend will normally be available at:

http://127.0.0.1:8000

### Step 3: Open the API Documentation

Visit the following address in your browser:

http://127.0.0.1:8000/docs

The Swagger interface allows developers to inspect and test available API endpoints.

### Step 4: Start the Frontend

Open a second terminal.

Navigate to the frontend folder from the project root.

```powershell
cd frontend
```

Install the frontend dependencies.

```powershell
npm install
```

Start the Vite development server.

```powershell
npm run dev
```

The frontend will normally be available at:

http://localhost:5173

### Step 5: Access SmartEvent

Open the frontend address in your browser.

Register or log in, then explore the available event discovery, booking, organizer, administrative, and chatbot features according to your account permissions.

## 9. Database

SmartEvent uses SQLite for persistent application data.

The database file is configured as:

```text
backend/smartevent.db
```

The application uses SQLAlchemy to interact with the database.

Depending on the application's configuration, the database can store information such as:

* Users and roles.
* Events.
* Bookings.
* Payments.
* Coupons.
* Reviews.
* Notifications.
* Wishlists.
* Ticket verification information.

**Important:** Back up the database before making schema changes or resetting the application. Do not commit a database containing sensitive or personal user data to a public repository.

## 10. API Documentation

The backend exposes REST API endpoints for application functionality.

The complete interactive API documentation is available at:

http://127.0.0.1:8000/docs

Important endpoint examples include:

| Endpoint         | Method | Purpose                                    |
| ---------------- | ------ | ------------------------------------------ |
| `/events`        | GET    | Retrieve and filter events                 |
| `/events`        | POST   | Create an event, subject to authorization  |
| `/login`         | POST   | Authenticate a user                        |
| `/register`      | POST   | Register a user                            |
| `/bookings`      | GET    | Retrieve the authenticated user's bookings |
| `/payments`      | POST   | Initiate a simulated payment               |
| `/notifications` | GET    | Retrieve notifications                     |
| `/chatbot`       | POST   | Send a message to the chatbot              |

Additional endpoints support event details, event updates, booking creation, coupons, reviews, wishlists, profile management, analytics, ticket verification, and other implemented features.

Endpoint availability and authorization requirements are defined by the backend implementation.

## 11. Security Considerations

* Passwords should be stored as hashes rather than plaintext.
* Protected operations should validate authentication.
* User-specific booking information should only be accessible to the authorized user.
* Administrative and organizer operations should enforce role-based permissions.
* Production deployments should use secure configuration for JWT signing keys and other secrets.
* CORS should be configured for trusted frontend origins.
* Debug and development settings should be reviewed before production deployment.

The current project is configured for local development. Additional security and deployment configuration may be necessary before public production use.

## 12. Future Enhancements

Potential future improvements include:

* Integration with a supported live payment gateway.
* Improved personalized event recommendations.
* More advanced chatbot intent recognition.
* Persistent chatbot conversation history.
* Email and SMS notifications.
* Automated backend and frontend testing.
* Cloud deployment.
* Production logging and monitoring.
* Performance and accessibility improvements.

These are potential enhancements and should not be considered implemented unless they are added and tested.

## 13. Conclusion

SmartEvent is a full-stack event management and ticket booking platform that brings together event discovery, booking management, simulated payments, coupons, reviews, notifications, wishlists, user profiles, analytics, and chatbot-based assistance.

The project demonstrates the integration of a React frontend, a FastAPI backend, and an SQLite database into a single web application.

Its modular development approach makes it easier to extend the platform as additional requirements are introduced.

## 14. Project Status

**Current completed module:** Module 24 — Chatbot Assistant.

**Next step:** Await the Module 25 requirements before implementing further changes.

---

**Project Name:** SmartEvent
**Application Type:** Full-Stack Web Application
**Frontend:** React.js and Vite
**Backend:** Python and FastAPI
**Database:** SQLite
**Development Environment:** Visual Studio Code
