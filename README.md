# SmartEvent – Event Discovery & Ticket Booking System

A full-stack web application for discovering events, booking tickets, managing payments, and organizing events. SmartEvent provides dedicated functionality for Users, Organizers, and Administrators through a React frontend and a FastAPI backend.

---

## Table of Contents

* [Project Overview](#project-overview)
* [Objectives](#objectives)
* [Features](#features)
* [Technology Stack](#technology-stack)
* [System Architecture](#system-architecture)
* [Project Structure](#project-structure)
* [Prerequisites](#prerequisites)
* [Installation and Setup](#installation-and-setup)
* [User Roles](#user-roles)
* [API Documentation](#api-documentation)
* [Database](#database)
* [Testing](#testing)
* [Screenshots](#screenshots)
* [Security](#security)
* [Future Enhancements](#future-enhancements)
* [Conclusion](#conclusion)

---

## Project Overview

SmartEvent is an event discovery and ticket booking platform designed to simplify the process of finding events and reserving tickets online.

Users can explore upcoming events, search and filter events, view event details, book tickets, check payment status, access QR-code tickets, and manage their booking history.

Organizers can create and manage events and monitor ticket sales. Administrators can manage the platform and view analytics related to users, events, bookings, ticket sales, and revenue.

The application provides a responsive user interface, REST API integration, database persistence, authentication, and role-based access control.

## Objectives

* Provide a centralized platform for event discovery.
* Make event searching and filtering convenient.
* Enable users to book event tickets online.
* Track booking and payment statuses.
* Generate QR-code tickets for eligible bookings.
* Allow organizers to manage their events.
* Provide administrators with platform-level analytics.
* Implement secure authentication and role-based authorization.
* Deliver a responsive and user-friendly interface.

## Features

### 1. Event Discovery

* Browse available events.
* Explore events by category.
* Search events using keywords.
* Filter events by location, date, and ticket price.
* Sort events according to supported criteria.
* View featured and trending events.
* Navigate event listings using pagination.
* View event descriptions, schedules, locations, and ticket prices.
* Display event availability and status.

### 2. User Authentication

* User registration and login.
* Password hashing.
* JWT-based authentication.
* Protected API endpoints.
* Role-based access control.

### 3. Ticket Booking

* Select an event and ticket quantity.
* Calculate the booking total.
* Validate ticket availability.
* Manage booking records and statuses.
* View booking history.
* Access QR-code tickets for eligible bookings.
* Verify tickets using their ticket codes.

### 4. Payment Management

* Initiate the payment workflow.
* Simulate payment success and failure.
* Track payment status.
* Handle failed payments and booking cancellation according to the implemented workflow.
* Release reserved tickets when a failed payment requires it.

**Note:** Payment processing is simulated unless a real payment gateway has been configured.

### 5. Notifications and Reminders

* Display user notifications.
* Track unread notifications.
* Mark notifications as read.
* Generate event reminders through the implemented reminder functionality.
* Notify users about relevant booking or event updates.

### 6. Organizer Dashboard

* Create events.
* View organizer-managed events.
* Update event information.
* Manage event availability and status.
* View ticket sales and booking statistics.
* Access organizer analytics.

### 7. Admin Dashboard

* Access administrative functionality.
* View user and organizer statistics.
* Monitor events and bookings.
* View ticket sales and revenue analytics.
* Filter analytics by date where supported.

### 8. Additional Features

* Event reviews and ratings.
* Coupon functionality.
* Responsive page layouts.
* Loading, error, and empty states.
* Featured and trending event showcases.

---

## Technology Stack

| Layer                   | Technologies                   |
| ----------------------- | ------------------------------ |
| Frontend                | React, JavaScript, HTML5, CSS3 |
| Frontend Build Tool     | Vite                           |
| Routing                 | React Router                   |
| HTTP Requests           | Axios                          |
| Backend                 | Python, FastAPI                |
| Data Validation         | Pydantic                       |
| Authentication          | JWT                            |
| Password Security       | Password hashing               |
| Database                | SQLite                         |
| Ticket Generation       | QR-code generation             |
| Backend Testing         | Pytest                         |
| API Testing             | FastAPI Swagger UI             |
| Development Environment | Visual Studio Code             |

---

## System Architecture

SmartEvent follows a client-server architecture.

```text
                 USER / ORGANIZER / ADMIN
                            |
                            v
                 React Frontend (Vite)
                     localhost:5173
                            |
                            | HTTP / REST API
                            v
                    FastAPI Backend
                    127.0.0.1:8000
                            |
             +--------------+--------------+
             |              |              |
             v              v              v
         SQLite DB     JWT Security    QR Tickets
             |
             v
     Persistent Application Data
```

The frontend communicates with the backend using HTTP requests. The backend validates requests, applies business rules, interacts with the SQLite database, and returns responses to the frontend.

---

## Project Structure

The following is a representative project structure. Actual filenames may vary depending on the implementation.

```text
SmartEvent/
│
├── backend/
│   ├── main.py
│   ├── requirements.txt
│   ├── smartevent.db
│   ├── tickets/
│   └── tests/
│
├── frontend/
│   ├── public/
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── styles/
│   │   └── App.jsx
│   ├── package.json
│   ├── package-lock.json
│   └── index.html
│
├── screenshots/
└── README.md
```

**Folder descriptions:**

* `backend/` — FastAPI application, database configuration, and backend tests.
* `frontend/` — React application and frontend dependencies.
* `frontend/src/components/` — Reusable interface components.
* `frontend/src/pages/` — Application pages.
* `frontend/src/styles/` — CSS stylesheets.
* `backend/tests/` — Automated backend tests.
* `backend/tickets/` — Generated ticket files, depending on the implementation.
* `screenshots/` — Project screenshots for documentation.

---

## Prerequisites

Install the following software before running SmartEvent:

* Python 3.11 or another version supported by the project's dependencies.
* Node.js and npm.
* Visual Studio Code or another code editor.
* A modern web browser.

Check the installed versions:

```powershell
python --version
node --version
npm --version
```

---

## Installation and Setup

### Step 1: Open the Project

Open the `SmartEvent` project folder in Visual Studio Code.

Open a terminal using **Terminal → New Terminal**.

### Step 2: Set Up the Backend

Navigate to the backend folder:

```powershell
cd backend
```

Create a virtual environment if one does not already exist:

```powershell
python -m venv venv
```

Activate the environment in Windows PowerShell:

```powershell
.\venv\Scripts\Activate.ps1
```

Install the backend dependencies:

```powershell
python -m pip install -r requirements.txt
```

If PowerShell blocks virtual environment activation, use the appropriate activation policy for your development environment.

### Step 3: Start the Backend Server

From the backend directory, run:

```powershell
python -m uvicorn main:app --reload
```

The backend API will be available at:

`http://127.0.0.1:8000`

The interactive API documentation will be available at:

`http://127.0.0.1:8000/docs`

Keep this terminal running.

### Step 4: Set Up the Frontend

Open a second terminal in Visual Studio Code.

Navigate to the frontend folder from the project root:

```powershell
cd frontend
```

Install the frontend dependencies:

```powershell
npm install
```

### Step 5: Start the Frontend Server

Run:

```powershell
npm run dev
```

Open the application in your browser:

`http://localhost:5173`

Keep both frontend and backend servers running while using the application.

### Step 6: Verify the Application

Check that:

1. The home page loads successfully.
2. Events appear on the home page.
3. Registration and login work.
4. Event details open correctly.
5. Booking and payment workflows behave as expected.
6. User, Organizer, and Admin functionality is accessible to the appropriate roles.

**Database note:** SmartEvent uses SQLite. Database initialization and migrations depend on the backend configuration. Back up any database containing important test data before changing or recreating it.

---

## User Roles

### User

A User can:

* Register and log in.
* Discover and search for events.
* View event details.
* Book tickets.
* Access booking history.
* View eligible QR-code tickets.
* Access notifications.
* Use supported coupon and review functionality.

### Organizer

An Organizer can:

* Log in using an organizer account.
* Create events.
* View and update managed events.
* Monitor event ticket availability.
* Access supported booking and ticket-sales statistics.

### Admin

An Admin can:

* Access administrative features.
* View platform statistics.
* Monitor users, organizers, events, and bookings.
* Review ticket-sales and revenue analytics.
* Use supported date-based analytics filters.

---

## API Documentation

SmartEvent uses FastAPI to expose REST API endpoints.

The interactive API documentation is available at:

**Swagger UI:** `http://127.0.0.1:8000/docs`

The following table lists representative API operations. Refer to Swagger UI for the exact routes, methods, parameters, and request schemas implemented in the current backend.

| Operation           | Purpose                                          |
| ------------------- | ------------------------------------------------ |
| User registration   | Create a user account                            |
| User login          | Authenticate a user                              |
| Profile             | Retrieve the authenticated user's profile        |
| Events              | Retrieve event listings                          |
| Event management    | Create and manage organizer events               |
| Bookings            | Create or retrieve bookings                      |
| Ticket verification | Verify a ticket code                             |
| Notifications       | Retrieve and manage notifications                |
| Payment             | Process simulated payment outcomes               |
| Analytics           | Retrieve supported organizer or admin statistics |

### Authentication

Protected endpoints may require a JWT access token.

Use the authentication controls in Swagger UI where supported. Authenticate with an appropriate account and test only endpoints permitted for that role.

---

## Database

SmartEvent uses SQLite for persistent storage.

The database stores application information such as:

* User accounts and roles.
* Event details.
* Ticket availability.
* Booking records.
* Payment records.
* Notifications.
* Reviews and ratings.
* Coupons.

The database filename used by the project is `smartevent.db`, subject to the configured database path.

Database initialization and schema updates are handled according to the backend implementation.

For submission, determine whether the evaluator expects a pre-populated database or a clean database initialized when the application starts.

Do not include private or unnecessary personal data in a submitted database.

---

## Testing

### Backend Tests

Navigate to the backend directory and activate the virtual environment.

Run:

```powershell
python -m pytest
```

Review the test output and record the actual number of passed and failed tests.

### Frontend Build

Open a terminal in the frontend directory and run:

```powershell
npm run build
```

Confirm that the build completes successfully.

### Manual Testing

Verify the following workflows:

* Registration and login.
* Event discovery and category selection.
* Search, filters, sorting, and pagination.
* Featured and trending events.
* Event details.
* Booking and ticket availability.
* Payment success and failure.
* QR-ticket access and verification.
* Booking history.
* Notifications and reminders.
* Organizer event creation and management.
* Admin analytics.
* Responsive interface layouts.

Only report features and test results that have actually been verified.

---

## Screenshots

Add screenshots of the running application to the `screenshots/` directory.

Recommended screenshots:

1. Home page.
2. Featured Events and Trending Events.
3. Event search and filters.
4. Event details.
5. Ticket booking.
6. Payment result.
7. QR-code ticket.
8. Booking history.
9. Notifications.
10. Organizer dashboard.
11. Event management.
12. Admin dashboard.
13. Admin analytics.

Once the images are saved, reference them here using their actual filenames.

Example:

```markdown
### Home Page

![SmartEvent Home Page](screenshots/home.png)

### Event Details

![Event Details](screenshots/event-details.png)

### Organizer Dashboard

![Organizer Dashboard](screenshots/organizer-dashboard.png)

### Admin Analytics

![Admin Analytics](screenshots/admin-analytics.png)
```

---

## Security Considerations

* Store passwords as secure hashes rather than plaintext.
* Protect sensitive endpoints with authentication and authorization.
* Validate user input on the backend.
* Keep secret keys and credentials out of source control.
* Do not commit real payment credentials or access tokens.
* Configure CORS appropriately for the deployment environment.
* Use HTTPS and secure production configuration when deploying publicly.
* Avoid including private personal information in screenshots or test data.

---

## Future Enhancements

Potential future improvements include:

* Integration with a real payment gateway.
* Email and SMS notifications.
* Deployment to a cloud hosting platform.
* Automated end-to-end testing.
* Enhanced event recommendations.
* More advanced reporting and analytics.
* Improved accessibility and multilingual support.

---

## Conclusion

SmartEvent demonstrates the development of a full-stack event discovery and ticket booking application using React, FastAPI, and SQLite.

The project brings together event management, booking workflows, simulated payments, QR-code tickets, notifications, role-based access control, and administrative analytics in one application.

It provides practical experience in frontend development, REST API integration, database management, authentication, testing, and responsive interface design.

---

**Project Name:** SmartEvent – Event Discovery & Ticket Booking System

**Frontend:** React + Vite

**Backend:** Python + FastAPI

**Database:** SQLite

**API Documentation:** FastAPI Swagger UI
