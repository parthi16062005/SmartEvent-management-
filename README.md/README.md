# SmartEvent – Event Discovery & Ticket Booking Platform

SmartEvent is a full-stack event discovery and ticket booking platform built using **FastAPI, React, and SQLite**.

The platform allows users to discover events and book tickets, organizers to create and manage their own events, and administrators to monitor the entire platform through role-based access control and analytics.

---

## Project Overview

SmartEvent is developed in two phases.

### Phase 1 – Event Discovery & Ticket Booking

Phase 1 provides the core event booking functionality:

* User registration and login
* JWT authentication
* Event discovery
* Event search
* Category filtering
* Event details
* Ticket booking
* Booking history
* Digital ticket generation
* QR code ticket verification
* Notifications

### Phase 2 – RBAC, Event Management & Analytics

Phase 2 extends the platform with:

* Role-Based Access Control
* Organizer event management
* Organizer booking insights
* Event lifecycle management
* Event update and cancellation notifications
* Admin dashboard
* Platform analytics
* Sales and booking charts
* Date-based analytics filtering

---

# Technology Stack

## Backend

* Python
* FastAPI
* SQLAlchemy
* SQLite
* Pydantic
* JWT Authentication
* Passlib / bcrypt
* QR Code generation
* Uvicorn

## Frontend

* React
* Vite
* JavaScript
* React Router
* Axios
* Recharts
* CSS

## Development Tools

* Visual Studio Code
* Git
* GitHub
* Swagger / OpenAPI

---

# System Architecture

```text
                    SmartEvent Platform
                           |
             +-------------+-------------+
             |                           |
        React Frontend              FastAPI Backend
             |                           |
             |                      JWT Authentication
             |                           |
             |                     Role-Based Access
             |                           |
             +------------ API -----------+
                         |
                      SQLite
                         |
          +--------------+--------------+
          |              |              |
        Users          Events        Bookings
          |              |              |
          |              |            Tickets
          |              |              |
          +--------------+--------------+
                         |
                  Notifications
```

---

# User Roles

SmartEvent supports three user roles.

## USER

A normal user can:

* Register
* Login
* View events
* Search events
* Filter events by category
* View event details
* Book tickets
* View booking history
* Generate tickets
* View notifications

## ORGANIZER

An organizer can:

* Create events
* View their events
* Update their own events
* Cancel their own events
* View bookings for their events
* View ticket sales
* View remaining tickets
* View revenue
* View booking statistics
* View sales charts

## ADMIN

An administrator can:

* View all users
* View all events
* View all bookings
* View platform analytics
* View total users
* View total organizers
* View total events
* View total bookings
* View total tickets sold
* View platform revenue
* View daily ticket sales
* View monthly booking trends
* View popular events
* View top revenue-generating events
* Filter analytics by date

---

# Main Features

## Authentication

* User registration
* User login
* JWT authentication
* Protected API routes
* Role information stored in JWT
* Password hashing
* Token expiration

## Event Discovery

Users can:

* Browse available events
* Search by event title
* Search by description
* Search by location
* Search by category
* Filter events by category
* View event status
* View available tickets
* View ticket price

## Event Management

Organizers can:

* Create events
* Edit events
* Cancel events
* View their events
* View event bookings

Only the organizer who owns an event can modify that event.

## Booking System

Users can:

* Book tickets
* View booking history
* View ticket quantities
* View total booking price
* Cancel bookings
* Generate digital tickets

## Digital Tickets

The system supports:

* Unique ticket codes
* QR code generation
* Ticket verification

Ticket verification endpoint:

```text
GET /verify-ticket/{ticket_code}
```

## Notifications

The notification system supports:

* Event update notifications
* Event cancellation notifications
* Booking-related notifications
* Unread notification count
* Mark notification as read

---

# Event Lifecycle

Events use the following statuses:

```text
UPCOMING
    |
    v
ONGOING
    |
    v
COMPLETED
```

An event can also be:

```text
CANCELLED
```

The backend automatically updates event status based on the event date.

Cancelled events remain cancelled and are not automatically changed to another status.

---

# Organizer Analytics

The organizer dashboard provides:

### Summary

* Total events
* Total bookings
* Total tickets sold
* Total revenue

### Event Performance

For each organizer event:

* Event title
* Tickets sold
* Remaining tickets
* Booking count
* Revenue
* Event status

### Charts

The organizer dashboard includes a ticket sales chart for organizer events.

---

# Admin Analytics

The admin dashboard provides platform-wide analytics.

## KPI Cards

* Total users
* Total organizers
* Total events
* Total bookings
* Total tickets sold
* Total revenue

## Daily Ticket Sales

Shows:

* Date
* Tickets sold
* Revenue

## Monthly Booking Trends

Shows:

* Month
* Number of bookings
* Tickets sold

## Most Popular Events

Shows events based on:

* Tickets sold
* Booking count

## Top Revenue Events

Shows events based on:

* Revenue generated

## Date Filtering

Administrators can filter analytics using a date range.

---

# Frontend Pages

## Public Pages

```text
/
```

Home / Event Discovery

```text
/login
```

User Login

```text
/register
```

User Registration

```text
/events/{event_id}
```

Event Details

## User Pages

```text
/bookings
```

Booking History

```text
/notifications
```

Notifications

## Organizer Pages

```text
/organizer
```

Organizer Dashboard

```text
/organizer/events/create
```

Create Event

```text
/organizer/events/edit/{eventId}
```

Edit Event

```text
/organizer/events/{eventId}/bookings
```

Event Bookings

## Admin Pages

```text
/admin
```

Admin Dashboard

```text
/admin/users
```

Users Overview

```text
/admin/events
```

Events Overview

```text
/admin/bookings
```

Booking Overview

---

# Backend API

Main API URL:

```text
http://127.0.0.1:8000
```

Swagger API documentation:

```text
http://127.0.0.1:8000/docs
```

## Authentication APIs

```text
POST /register
POST /login
GET  /profile
```

## Event APIs

```text
POST /events
GET  /events
GET  /events/{event_id}
PUT  /organizer/events/{event_id}
POST /organizer/events/{event_id}/cancel
GET  /organizer/events
```

## Booking APIs

```text
POST /bookings
GET  /bookings
POST /bookings/{booking_id}/cancel
POST /bookings/{booking_id}/ticket
```

## Ticket APIs

```text
GET /verify-ticket/{ticket_code}
```

## Notification APIs

```text
GET  /notifications
GET  /notifications/unread-count
POST /notifications/{notification_id}/read
POST /notifications/create-reminders
```

## Organizer APIs

```text
GET /organizer/events
GET /organizer/events/{event_id}/bookings
GET /organizer/analytics
```

## Admin APIs

```text
GET /admin/users
GET /admin/events
GET /admin/bookings
GET /admin/analytics
```

---

# Project Structure

```text
SmartEvent/
│
├── backend/
│   │
│   ├── venv/
│   ├── tickets/
│   │
│   ├── database.py
│   ├── models.py
│   ├── schemas.py
│   ├── auth.py
│   ├── config.py
│   ├── main.py
│   ├── .env
│   │
│   └── tests/
│       └── test_api.py
│
├── frontend/
│   │
│   ├── src/
│   │   ├── components/
│   │   ├── pages/
│   │   ├── App.jsx
│   │   └── main.jsx
│   │
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

# Database

SmartEvent uses SQLite for development.

Main tables:

```text
Users
Events
Bookings
Tickets
Notifications
```

## Users

Important fields:

```text
id
username
email
hashed_password
role
created_at
```

## Events

Important fields:

```text
id
title
description
category
location
event_date
ticket_price
banner_image
total_tickets
available_tickets
organizer_id
event_status
created_at
```

---

# Security

The application implements:

* JWT authentication
* Role-based access control
* Protected API endpoints
* Organizer ownership validation
* Admin-only analytics
* Password hashing
* Pydantic input validation
* Environment-based secret configuration
* JWT expiration

Sensitive configuration is stored in `.env`.

Example:

```env
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Do not commit the actual `.env` file to GitHub.

---

# Installation

## 1. Clone the Project

```bash
git clone <your-github-repository-url>
cd SmartEvent
```

---

# Backend Setup

Open PowerShell in the backend folder:

```powershell
cd backend
```

Create and activate the virtual environment:

```powershell
python -m venv venv
```

```powershell
.\venv\Scripts\Activate.ps1
```

Install the required packages:

```powershell
pip install fastapi uvicorn sqlalchemy pydantic pydantic-settings python-dotenv python-jose passlib bcrypt email-validator qrcode
```

---

# Configure Environment

Create:

```text
backend/.env
```

Add:

```env
SECRET_KEY=your-secret-key
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60
```

Keep `.env` private and do not upload it to GitHub.

---

# Run Backend

From the `backend` folder:

```powershell
python -m uvicorn main:app --reload
```

Backend will run at:

```text
http://127.0.0.1:8000
```

Swagger documentation:

```text
http://127.0.0.1:8000/docs
```

---

# Frontend Setup

Open another terminal.

Go to the frontend folder:

```powershell
cd frontend
```

Install dependencies:

```powershell
npm install
```

Run the development server:

```powershell
npm run dev
```

Frontend will normally run at:

```text
http://localhost:5173
```

---

# Running the Complete Application

You need two terminals.

### Terminal 1 – Backend

```powershell
cd "C:\Users\parth\OneDrive\Desktop\SmartEvent\backend"
.\venv\Scripts\Activate.ps1
python -m uvicorn main:app --reload
```

### Terminal 2 – Frontend

```powershell
cd "C:\Users\parth\OneDrive\Desktop\SmartEvent\frontend"
npm run dev
```

Then open:

```text
http://localhost:5173
```

---

# Testing

Backend tests can be executed using:

```powershell
python -m pytest -v
```

Current test suite:

```text
8 passed
```

The tests cover protected routes, authentication behavior, notifications, ticket verification, and invalid login scenarios.

---

# Demo Roles

For local development, the project contains role-based accounts.

### Admin

```text
Username: parthi
Email: parthi@example.com
Role: ADMIN
```

### Organizer

```text
Username: organizer
Email: organizer@example.com
Role: ORGANIZER
```

A normal USER account can be created through the registration page.

> Change demo passwords before using the application outside local development.

---

# Application Flow

```text
User
 |
 +--> Register
 |
 +--> Login
 |
 +--> Browse Events
 |
 +--> Search / Filter
 |
 +--> View Event
 |
 +--> Book Tickets
 |
 +--> View Booking History
 |
 +--> Generate Ticket
 |
 +--> View Notifications
```

Organizer flow:

```text
Organizer
 |
 +--> Login
 |
 +--> Organizer Dashboard
 |
 +--> Create Event
 |
 +--> Manage Events
 |
 +--> Edit Event
 |
 +--> Cancel Event
 |
 +--> View Event Bookings
 |
 +--> View Sales Analytics
```

Admin flow:

```text
Admin
 |
 +--> Login
 |
 +--> Admin Dashboard
 |
 +--> View Users
 |
 +--> View Events
 |
 +--> View Bookings
 |
 +--> View Platform Analytics
 |
 +--> Daily Sales
 |
 +--> Monthly Trends
 |
 +--> Popular Events
 |
 +--> Top Revenue Events
 |
 +--> Date Filtering
```

---

# Phase 2 Deliverables

The following Phase 2 requirements have been implemented:

* [x] Role-Based Access Control
* [x] USER / ORGANIZER / ADMIN roles
* [x] JWT role information
* [x] Protected role-based APIs
* [x] Organizer event creation
* [x] Organizer event management
* [x] Organizer event editing
* [x] Organizer event cancellation
* [x] Organizer booking management
* [x] Organizer analytics
* [x] Ticket sales charts
* [x] Revenue statistics
* [x] Event lifecycle management
* [x] Automatic event status
* [x] Event update notifications
* [x] Event cancellation notifications
* [x] Admin dashboard
* [x] Platform analytics
* [x] Daily ticket sales
* [x] Monthly booking trends
* [x] Popular events
* [x] Top revenue-generating events
* [x] Graphical analytics
* [x] Date filtering
* [x] Admin user management
* [x] Admin event management
* [x] Admin booking management
* [x] Secure environment configuration
* [x] Backend testing

---

# Project Status

## Phase 1

**Completed**

## Phase 2

**Completed**

SmartEvent currently provides a multi-role event platform with user booking functionality, organizer management tools, and centralized administrative analytics.

---

# Future Improvements

Possible future enhancements include:

* Online payment integration
* Email notifications
* Cloud deployment
* Image upload for event banners
* Advanced event recommendations
* Mobile application
* More detailed analytics
* Production database deployment
* Automated CI/CD pipeline

---

# Author

**Parthiban V.**

BE Computer Science and Engineering

SmartEvent – Event Discovery & Ticket Booking Platform
