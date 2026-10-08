import os
import uuid
import qrcode

from datetime import datetime, timedelta, timezone

from fastapi import FastAPI, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session

import models
from database import engine, get_db, migrate_database

from schemas import (
    UserRegister,
    UserResponse,
    TokenResponse,
    EventCreate,
    EventUpdate,
    EventResponse,
    BookingCreate,
    BookingResponse,
    BookingHistoryResponse,
    OrganizerBookingResponse,
    TicketResponse,
    NotificationResponse,
    AdminAnalyticsResponse,
    DailyTicketSalesResponse,
    MonthlyBookingTrendResponse,
    PopularEventResponse,
    TopRevenueEventResponse
)

from auth import (
    hash_password,
    verify_password,
    create_access_token,
    get_user_id_from_token
)


# =========================================================
# DATABASE
# =========================================================

models.Base.metadata.create_all(bind=engine)

migrate_database()


# =========================================================
# EVENT STATUS
# =========================================================
def update_event_status(event):
    """
    Automatically update event status based on event date.

    UPCOMING:
        Event has not started yet.

    ONGOING:
        Event has started and is within 2 hours.

    COMPLETED:
        Event ended more than 2 hours ago.

    CANCELLED:
        Keep cancelled status unchanged.
    """

    if event.event_status == "CANCELLED":
        return

    now = datetime.now()

    event_date = event.event_date

    # Convert timezone-aware datetime to naive datetime
    # so it can safely be compared with database datetime.
    if event_date.tzinfo is not None:
        event_date = event_date.replace(tzinfo=None)

    event.event_date = event_date

    event_end_time = event_date + timedelta(hours=2)

    if now < event_date:
        event.event_status = "UPCOMING"

    elif event_date <= now < event_end_time:
        event.event_status = "ONGOING"

    else:
        event.event_status = "COMPLETED"

# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="SmartEvent - Event Discovery & Ticket Booking System",
    description=(
        "SmartEvent API with RBAC, "
        "event management and ticket booking"
    ),
    version="2.0.0"
)


# =========================================================
# CORS
# =========================================================

app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "http://127.0.0.1:5173"
    ],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# =========================================================
# OAUTH2
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(
    tokenUrl="/login"
)


# =========================================================
# QR TICKET STORAGE
# =========================================================

TICKETS_DIR = "tickets"

os.makedirs(
    TICKETS_DIR,
    exist_ok=True
)

app.mount(
    "/tickets",
    StaticFiles(directory=TICKETS_DIR),
    name="tickets"
)


# =========================================================
# ROOT
# =========================================================

@app.get(
    "/",
    tags=["Root"]
)
def root():

    return {
        "message": "SmartEvent API is running",
        "version": "2.0.0",
        "status": "RBAC enabled"
    }


# =========================================================
# AUTHENTICATION
# =========================================================


# =========================================================
# REGISTER
# =========================================================

@app.post(
    "/register",
    response_model=UserResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Authentication"]
)
def register(
    user: UserRegister,
    db: Session = Depends(get_db)
):

    # Check username

    existing_username = (
        db.query(models.User)
        .filter(
            models.User.username
            == user.username
        )
        .first()
    )

    if existing_username:

        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    # Check email

    existing_email = (
        db.query(models.User)
        .filter(
            models.User.email
            == user.email
        )
        .first()
    )

    if existing_email:

        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    # Hash password

    hashed_password = hash_password(
        user.password
    )

    # Create user

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hashed_password,
        role="USER"
    )

    db.add(new_user)

    db.commit()

    db.refresh(new_user)

    return new_user


# =========================================================
# LOGIN
# =========================================================

@app.post(
    "/login",
    response_model=TokenResponse,
    tags=["Authentication"]
)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db)
):

    existing_user = (
        db.query(models.User)
        .filter(
            models.User.email
            == form_data.username
        )
        .first()
    )

    if not existing_user:

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    if not verify_password(
        form_data.password,
        existing_user.hashed_password
    ):

        raise HTTPException(
            status_code=401,
            detail="Invalid email or password"
        )

    access_token = create_access_token(
        existing_user.id,
        existing_user.role
    )

    return {
        "access_token": access_token,
        "token_type": "bearer"
    }


# =========================================================
# CURRENT USER / RBAC
# =========================================================


# =========================================================
# GET CURRENT USER
# =========================================================

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):

    user_id = get_user_id_from_token(
        token
    )

    if user_id is None:

        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = (
        db.query(models.User)
        .filter(
            models.User.id == user_id
        )
        .first()
    )

    if user is None:

        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


# =========================================================
# ROLE CHECK
# =========================================================

def require_roles(*allowed_roles):

    def role_checker(
        current_user: models.User = Depends(
            get_current_user
        )
    ):

        if current_user.role not in allowed_roles:

            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=(
                    "Access denied. Required role: "
                    + ", ".join(allowed_roles)
                )
            )

        return current_user

    return role_checker


# =========================================================
# PROFILE
# =========================================================

@app.get(
    "/profile",
    response_model=UserResponse,
    tags=["Authentication"]
)
def profile(
    current_user: models.User = Depends(
        get_current_user
    )
):

    return current_user


# =========================================================
# EVENT DISCOVERY
# =========================================================


# =========================================================
# CREATE EVENT
# ORGANIZER ONLY
# =========================================================

@app.post(
    "/events",
    response_model=EventResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Events"]
)
def create_event(
    event: EventCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):

    new_event = models.Event(
        title=event.title,
        description=event.description,
        category=event.category,
        location=event.location,
        event_date=event.event_date,
        ticket_price=event.ticket_price,
        banner_image=event.banner_image,
        total_tickets=event.total_tickets,
        available_tickets=event.total_tickets,
        organizer_id=current_user.id,
        event_status="UPCOMING"
    )

    db.add(new_event)

    db.commit()

    db.refresh(new_event)

    return new_event


# =========================================================
# GET EVENTS
# PUBLIC
# =========================================================

@app.get(
    "/events",
    response_model=list[EventResponse],
    tags=["Events"]
)
def get_events(
    category: str | None = None,
    search: str | None = None,
    db: Session = Depends(get_db)
):

    query = db.query(
        models.Event
    )

    # Category filter

    if category:

        query = query.filter(
            models.Event.category.ilike(
                category
            )
        )

    # Search filter

    if search:

        search_text = (
            f"%{search}%"
        )

        query = query.filter(
            models.Event.title.ilike(
                search_text
            )
        )

    events = (
        query
        .order_by(
            models.Event.event_date
        )
        .all()
    )

    # Update event status

    for event in events:

        update_event_status(event)

    db.commit()

    return events


# =========================================================
# GET EVENT DETAILS
# PUBLIC
# =========================================================

@app.get(
    "/events/{event_id}",
    response_model=EventResponse,
    tags=["Events"]
)
def get_event(
    event_id: int,
    db: Session = Depends(get_db)
):

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id == event_id
        )
        .first()
    )

    if event is None:

        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    update_event_status(event)

    db.commit()

    return event


# =========================================================
# ORGANIZER EVENT MANAGEMENT
# =========================================================


# =========================================================
# UPDATE OWN EVENT
# ORGANIZER ONLY
#
# IMPORTANT:
# There is ONLY ONE PUT route for this endpoint.
# It also creates Event Updated notifications.
# =========================================================

@app.put(
    "/organizer/events/{event_id}",
    response_model=EventResponse,
    tags=["Organizer"]
)
def update_organizer_event(
    event_id: int,
    event_data: EventUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):

    # -----------------------------------------------------
    # FIND EVENT
    # -----------------------------------------------------

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id == event_id,
            models.Event.organizer_id
            == current_user.id
        )
        .first()
    )

    if event is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Event not found or "
                "not owned by you"
            )
        )

    # -----------------------------------------------------
    # GET UPDATE DATA
    # -----------------------------------------------------

    update_data = event_data.model_dump(
        exclude_unset=True
    )

    if not update_data:

        raise HTTPException(
            status_code=400,
            detail="No event changes provided"
        )

    # -----------------------------------------------------
    # CHECK TOTAL TICKETS
    # -----------------------------------------------------

    if "total_tickets" in update_data:

        tickets_sold = (
            event.total_tickets
            - event.available_tickets
        )

        new_total_tickets = (
            update_data["total_tickets"]
        )

        if new_total_tickets < tickets_sold:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Total tickets cannot be "
                    "less than tickets already sold"
                )
            )

        event.available_tickets = (
            new_total_tickets
            - tickets_sold
        )

    # -----------------------------------------------------
    # UPDATE EVENT FIELDS
    # -----------------------------------------------------

    for field, value in update_data.items():

        setattr(
            event,
            field,
            value
        )

    # -----------------------------------------------------
    # UPDATE EVENT STATUS
    # -----------------------------------------------------

    update_event_status(event)

    # -----------------------------------------------------
    # FIND CONFIRMED BOOKINGS
    # -----------------------------------------------------

    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.event_id
            == event.id,
            models.Booking.booking_status
            == "CONFIRMED"
        )
        .all()
    )

    # -----------------------------------------------------
    # CREATE EVENT UPDATED NOTIFICATIONS
    # -----------------------------------------------------

    for booking in bookings:

        notification = models.Notification(
            user_id=booking.user_id,
            title="Event Updated",
            message=(
                f"The event '{event.title}' "
                "has been updated. "
                "Please check the latest "
                "event details."
            ),
            type="EVENT",
            is_read=False
        )

        db.add(notification)

    # -----------------------------------------------------
    # SAVE
    # -----------------------------------------------------

    db.commit()

    db.refresh(event)

    return event


# =========================================================
# CANCEL OWN EVENT
# ORGANIZER ONLY
# =========================================================

@app.post(
    "/organizer/events/{event_id}/cancel",
    response_model=EventResponse,
    tags=["Organizer"]
)
def cancel_organizer_event(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):

    # Find own event

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id == event_id,
            models.Event.organizer_id
            == current_user.id
        )
        .first()
    )

    if event is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Event not found or "
                "not owned by you"
            )
        )

    # Check if already cancelled

    if event.event_status == "CANCELLED":

        raise HTTPException(
            status_code=400,
            detail="Event is already cancelled"
        )

    # Cancel event

    event.event_status = "CANCELLED"

    # Find confirmed bookings

    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.event_id
            == event.id,
            models.Booking.booking_status
            == "CONFIRMED"
        )
        .all()
    )

    # Notify booked users

    for booking in bookings:

        notification = models.Notification(
            user_id=booking.user_id,
            title="Event Cancelled",
            message=(
                f"The event '{event.title}' "
                "has been cancelled."
            ),
            type="EVENT",
            is_read=False
        )

        db.add(notification)

    db.commit()

    db.refresh(event)

    return event


# =========================================================
# GET ORGANIZER EVENTS
# ORGANIZER ONLY
# =========================================================

@app.get(
    "/organizer/events",
    response_model=list[EventResponse],
    tags=["Organizer"]
)
def get_organizer_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):

    events = (
        db.query(models.Event)
        .filter(
            models.Event.organizer_id
            == current_user.id
        )
        .order_by(
            models.Event.event_date
        )
        .all()
    )

    for event in events:

        update_event_status(event)

    db.commit()

    return events


# =========================================================
# GET BOOKINGS FOR ORGANIZER EVENT
# ORGANIZER ONLY
# =========================================================

@app.get(
    "/organizer/events/{event_id}/bookings",
    response_model=list[OrganizerBookingResponse],
    tags=["Organizer"]
)
def get_organizer_event_bookings(
    event_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):

    # Check ownership

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id == event_id,
            models.Event.organizer_id
            == current_user.id
        )
        .first()
    )

    if event is None:

        raise HTTPException(
            status_code=404,
            detail=(
                "Event not found or "
                "not owned by you"
            )
        )

    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.event_id
            == event.id
        )
        .order_by(
            models.Booking.created_at.desc()
        )
        .all()
    )

    result = []

    for booking in bookings:

        result.append(
            OrganizerBookingResponse(
                booking_id=booking.id,
                user_id=booking.user_id,
                username=booking.user.username,
                email=booking.user.email,
                event_id=booking.event_id,
                event_title=booking.event.title,
                ticket_quantity=booking.ticket_quantity,
                total_price=booking.total_price,
                booking_status=booking.booking_status,
                created_at=booking.created_at
            )
        )

    return result


# =========================================================
# ORGANIZER ANALYTICS
# =========================================================

@app.get(
    "/organizer/analytics",
    tags=["Organizer Analytics"]
)
def get_organizer_analytics(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):

    events = (
        db.query(models.Event)
        .filter(
            models.Event.organizer_id
            == current_user.id
        )
        .order_by(
            models.Event.event_date
        )
        .all()
    )

    for event in events:

        update_event_status(event)

    db.commit()

    event_analytics = []

    total_tickets_sold = 0
    total_revenue = 0.0
    total_bookings = 0

    for event in events:

        confirmed_bookings = (
            db.query(models.Booking)
            .filter(
                models.Booking.event_id
                == event.id,
                models.Booking.booking_status
                == "CONFIRMED"
            )
            .all()
        )

        tickets_sold = sum(
            booking.ticket_quantity
            for booking in confirmed_bookings
        )

        revenue = sum(
            float(
                booking.total_price or 0
            )
            for booking in confirmed_bookings
        )

        booking_count = len(
            confirmed_bookings
        )

        remaining_tickets = (
            event.available_tickets
        )

        total_tickets_sold += (
            tickets_sold
        )

        total_revenue += revenue

        total_bookings += (
            booking_count
        )

        event_analytics.append({
            "event_id": event.id,
            "event_title": event.title,
            "total_tickets": event.total_tickets,
            "tickets_sold": tickets_sold,
            "remaining_tickets": remaining_tickets,
            "total_revenue": revenue,
            "booking_count": booking_count,
            "event_status": event.event_status
        })

    return {
        "summary": {
            "total_events": len(events),
            "total_tickets_sold": total_tickets_sold,
            "total_revenue": total_revenue,
            "total_bookings": total_bookings
        },
        "events": event_analytics
    }


# =========================================================
# TICKET BOOKING
# =========================================================

@app.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Bookings"]
)
def create_booking(
    booking: BookingCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(
            "USER",
            "ORGANIZER",
            "ADMIN"
        )
    )
):

    # Find event

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id
            == booking.event_id
        )
        .first()
    )

    if event is None:

        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    # Update status

    update_event_status(event)

    db.commit()

    # Prevent booking cancelled event

    if event.event_status == "CANCELLED":

        raise HTTPException(
            status_code=400,
            detail=(
                "This event has been cancelled"
            )
        )

    # Prevent booking completed event

    if event.event_status == "COMPLETED":

        raise HTTPException(
            status_code=400,
            detail=(
                "This event has already "
                "been completed"
            )
        )

    # Prevent booking ongoing event

    if event.event_status == "ONGOING":

        raise HTTPException(
            status_code=400,
            detail=(
                "This event is currently ongoing"
            )
        )

    # Check availability

    if (
        booking.ticket_quantity
        > event.available_tickets
    ):

        raise HTTPException(
            status_code=400,
            detail=(
                f"Only {event.available_tickets} "
                "tickets are available"
            )
        )

    # Calculate price

    total_price = (
        event.ticket_price
        * booking.ticket_quantity
    )

    # Create booking

    new_booking = models.Booking(
        user_id=current_user.id,
        event_id=event.id,
        ticket_quantity=booking.ticket_quantity,
        total_price=total_price,
        booking_status="CONFIRMED"
    )

    # Reduce available tickets

    event.available_tickets -= (
        booking.ticket_quantity
    )

    db.add(new_booking)

    db.commit()

    db.refresh(new_booking)

    # Booking notification

    new_notification = models.Notification(
        user_id=current_user.id,
        title="Booking Confirmed",
        message=(
            f"Your booking for {event.title} "
            f"has been confirmed. "
            f"Ticket quantity: "
            f"{booking.ticket_quantity}."
        ),
        type="BOOKING",
        is_read=False
    )

    db.add(new_notification)

    db.commit()

    return new_booking


# =========================================================
# BOOKING HISTORY
# =========================================================

@app.get(
    "/bookings",
    response_model=list[BookingHistoryResponse],
    tags=["Bookings"]
)
def get_booking_history(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(
            "USER",
            "ORGANIZER",
            "ADMIN"
        )
    )
):

    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.user_id
            == current_user.id
        )
        .order_by(
            models.Booking.created_at.desc()
        )
        .all()
    )

    history = []

    for booking in bookings:

        history.append(
            BookingHistoryResponse(
                id=booking.id,
                event_id=booking.event_id,
                event_title=booking.event.title,
                ticket_quantity=booking.ticket_quantity,
                total_price=booking.total_price,
                booking_status=booking.booking_status,
                created_at=booking.created_at
            )
        )

    return history


# =========================================================
# CANCEL BOOKING
# =========================================================

@app.post(
    "/bookings/{booking_id}/cancel",
    response_model=BookingResponse,
    tags=["Bookings"]
)
def cancel_booking(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(
            "USER",
            "ORGANIZER",
            "ADMIN"
        )
    )
):

    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.id
            == booking_id,
            models.Booking.user_id
            == current_user.id
        )
        .first()
    )

    if booking is None:

        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.booking_status == "CANCELLED":

        raise HTTPException(
            status_code=400,
            detail="Booking is already cancelled"
        )

    # Cancel booking

    booking.booking_status = "CANCELLED"

    # Find event

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id
            == booking.event_id
        )
        .first()
    )

    if event:

        event.available_tickets += (
            booking.ticket_quantity
        )

        if (
            event.available_tickets
            > event.total_tickets
        ):

            event.available_tickets = (
                event.total_tickets
            )

    db.commit()

    db.refresh(booking)

    return booking


# =========================================================
# QR CODE TICKET
# =========================================================

@app.post(
    "/bookings/{booking_id}/ticket",
    response_model=TicketResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Tickets"]
)
def generate_ticket(
    booking_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles(
            "USER",
            "ORGANIZER",
            "ADMIN"
        )
    )
):

    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.id
            == booking_id,
            models.Booking.user_id
            == current_user.id
        )
        .first()
    )

    if booking is None:

        raise HTTPException(
            status_code=404,
            detail="Booking not found"
        )

    if booking.booking_status != "CONFIRMED":

        raise HTTPException(
            status_code=400,
            detail=(
                "QR ticket can only be generated "
                "for confirmed bookings"
            )
        )

    # Check existing ticket

    existing_ticket = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.booking_id
            == booking.id
        )
        .first()
    )

    if existing_ticket:

        return existing_ticket

    # Generate ticket code

    ticket_code = (
        "TKT-"
        + uuid.uuid4().hex[:12].upper()
    )

    # QR content

    qr_data = (
        "SmartEvent Ticket\n"
        f"Ticket Code: {ticket_code}\n"
        f"Booking ID: {booking.id}\n"
        f"Event ID: {booking.event_id}"
    )

    # Generate QR

    qr = qrcode.make(
        qr_data
    )

    filename = (
        f"{ticket_code}.png"
    )

    filepath = os.path.join(
        TICKETS_DIR,
        filename
    )

    qr.save(filepath)

    qr_code_url = (
        f"/tickets/{filename}"
    )

    # Save ticket

    new_ticket = models.Ticket(
        booking_id=booking.id,
        ticket_code=ticket_code,
        qr_code_url=qr_code_url
    )

    db.add(new_ticket)

    db.commit()

    db.refresh(new_ticket)

    return new_ticket


# =========================================================
# VERIFY QR TICKET
# =========================================================

@app.get(
    "/verify-ticket/{ticket_code}",
    tags=["Tickets"]
)
def verify_ticket(
    ticket_code: str,
    db: Session = Depends(get_db)
):

    ticket = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.ticket_code
            == ticket_code
        )
        .first()
    )

    if ticket is None:

        raise HTTPException(
            status_code=404,
            detail="Invalid ticket"
        )

    booking = ticket.booking

    if booking.booking_status != "CONFIRMED":

        return {
            "valid": False,
            "ticket_code": ticket.ticket_code,
            "booking_id": booking.id,
            "event_id": booking.event_id,
            "booking_status": (
                booking.booking_status
            ),
            "message": "Ticket is not valid"
        }

    return {
        "valid": True,
        "ticket_code": ticket.ticket_code,
        "booking_id": booking.id,
        "event_id": booking.event_id,
        "booking_status": (
            booking.booking_status
        ),
        "message": "Ticket is valid"
    }


# =========================================================
# NOTIFICATIONS
# =========================================================


# =========================================================
# GET NOTIFICATIONS
# =========================================================

@app.get(
    "/notifications",
    response_model=list[NotificationResponse],
    tags=["Notifications"]
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    )
):

    notifications = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id
            == current_user.id
        )
        .order_by(
            models.Notification.created_at.desc()
        )
        .all()
    )

    return notifications


# =========================================================
# UNREAD COUNT
# =========================================================

@app.get(
    "/notifications/unread-count",
    tags=["Notifications"]
)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    )
):

    unread_count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id
            == current_user.id,
            models.Notification.is_read == False
        )
        .count()
    )

    return {
        "unread_count": unread_count
    }


# =========================================================
# MARK NOTIFICATION READ
# =========================================================

@app.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse,
    tags=["Notifications"]
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    )
):

    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id
            == notification_id,
            models.Notification.user_id
            == current_user.id
        )
        .first()
    )

    if notification is None:

        raise HTTPException(
            status_code=404,
            detail="Notification not found"
        )

    notification.is_read = True

    db.commit()

    db.refresh(notification)

    return notification


# =========================================================
# CREATE EVENT REMINDERS
# =========================================================

@app.post(
    "/notifications/create-reminders",
    tags=["Notifications"]
)
def create_event_reminders(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        get_current_user
    )
):

    now = datetime.now(
        timezone.utc
    )

    reminder_limit = (
        now
        + timedelta(hours=24)
    )

    upcoming_events = (
        db.query(models.Event)
        .filter(
            models.Event.event_date >= now,
            models.Event.event_date
            <= reminder_limit
        )
        .all()
    )

    reminders_created = 0

    for event in upcoming_events:

        booking = (
            db.query(models.Booking)
            .filter(
                models.Booking.event_id
                == event.id,
                models.Booking.user_id
                == current_user.id,
                models.Booking.booking_status
                == "CONFIRMED"
            )
            .first()
        )

        if booking is None:
            continue

        existing_reminder = (
            db.query(models.Notification)
            .filter(
                models.Notification.user_id
                == current_user.id,
                models.Notification.type
                == "EVENT",
                models.Notification.title
                == "Event Reminder",
                models.Notification.message.contains(
                    event.title
                )
            )
            .first()
        )

        if existing_reminder:
            continue

        reminder = models.Notification(
            user_id=current_user.id,
            title="Event Reminder",
            message=(
                f"Your event {event.title} "
                "is scheduled within the "
                "next 24 hours."
            ),
            type="EVENT",
            is_read=False
        )

        db.add(reminder)

        reminders_created += 1

    db.commit()

    return {
        "message": "Event reminders checked",
        "reminders_created": reminders_created
    }


# =========================================================
# ADMIN - USER MANAGEMENT
# =========================================================


# =========================================================
# VIEW ALL USERS
# ADMIN ONLY
# =========================================================

@app.get(
    "/admin/users",
    response_model=list[UserResponse],
    tags=["Admin"]
)
def admin_get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ADMIN")
    )
):

    users = (
        db.query(models.User)
        .order_by(
            models.User.id
        )
        .all()
    )

    return users


# =========================================================
# ADMIN - EVENT MANAGEMENT
# =========================================================


# =========================================================
# VIEW ALL EVENTS
# ADMIN ONLY
# =========================================================

@app.get(
    "/admin/events",
    response_model=list[EventResponse],
    tags=["Admin"]
)
def admin_get_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ADMIN")
    )
):

    events = (
        db.query(models.Event)
        .order_by(
            models.Event.event_date
        )
        .all()
    )

    for event in events:

        update_event_status(event)

    db.commit()

    return events


# =========================================================
# ADMIN - BOOKING MANAGEMENT
# =========================================================


# =========================================================
# VIEW ALL BOOKINGS
# ADMIN ONLY
# =========================================================

@app.get(
    "/admin/bookings",
    response_model=list[OrganizerBookingResponse],
    tags=["Admin"]
)
def admin_get_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ADMIN")
    )
):

    bookings = (
        db.query(models.Booking)
        .order_by(
            models.Booking.created_at.desc()
        )
        .all()
    )

    result = []

    for booking in bookings:

        result.append(
            OrganizerBookingResponse(
                booking_id=booking.id,
                user_id=booking.user_id,
                username=booking.user.username,
                email=booking.user.email,
                event_id=booking.event_id,
                event_title=booking.event.title,
                ticket_quantity=(
                    booking.ticket_quantity
                ),
                total_price=(
                    booking.total_price
                ),
                booking_status=(
                    booking.booking_status
                ),
                created_at=(
                    booking.created_at
                )
            )
        )

    return result


# =========================================================
# ADMIN - ANALYTICS
# =========================================================

@app.get(
    "/admin/analytics",
    response_model=AdminAnalyticsResponse,
    tags=["Admin Analytics"]
)
def admin_analytics(
    start_date: str | None = None,
    end_date: str | None = None,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ADMIN")
    )
):

    # =====================================================
    # TOTAL USERS
    # =====================================================

    total_users = (
        db.query(models.User)
        .count()
    )

    # =====================================================
    # TOTAL ORGANIZERS
    # =====================================================

    total_organizers = (
        db.query(models.User)
        .filter(
            models.User.role
            == "ORGANIZER"
        )
        .count()
    )

    # =====================================================
    # TOTAL EVENTS
    # =====================================================

    total_events = (
        db.query(models.Event)
        .count()
    )

    # =====================================================
    # BOOKINGS QUERY
    # =====================================================

    bookings_query = db.query(
        models.Booking
    )

    # =====================================================
    # START DATE FILTER
    # =====================================================

    if start_date:

        try:

            start_datetime = datetime.strptime(
                start_date,
                "%Y-%m-%d"
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid start_date format. "
                    "Use YYYY-MM-DD."
                )
            )

        bookings_query = (
            bookings_query
            .filter(
                models.Booking.created_at
                >= start_datetime
            )
        )

    # =====================================================
    # END DATE FILTER
    # =====================================================

    if end_date:

        try:

            end_datetime = (
                datetime.strptime(
                    end_date,
                    "%Y-%m-%d"
                )
                + timedelta(days=1)
            )

        except ValueError:

            raise HTTPException(
                status_code=400,
                detail=(
                    "Invalid end_date format. "
                    "Use YYYY-MM-DD."
                )
            )

        bookings_query = (
            bookings_query
            .filter(
                models.Booking.created_at
                < end_datetime
            )
        )

    # =====================================================
    # GET BOOKINGS
    # =====================================================

    bookings = (
        bookings_query
        .order_by(
            models.Booking.created_at
        )
        .all()
    )

    # =====================================================
    # TOTAL BOOKINGS
    # =====================================================

    total_bookings = len(
        bookings
    )

    # =====================================================
    # CONFIRMED BOOKINGS
    # =====================================================

    confirmed_bookings = [
        booking
        for booking in bookings
        if booking.booking_status
        == "CONFIRMED"
    ]

    # =====================================================
    # TOTAL TICKETS SOLD
    # =====================================================

    total_tickets_sold = sum(
        booking.ticket_quantity
        for booking in confirmed_bookings
    )

    # =====================================================
    # TOTAL REVENUE
    # =====================================================

    total_revenue = sum(
        float(
            booking.total_price or 0
        )
        for booking in confirmed_bookings
    )

    # =====================================================
    # DAILY TICKET SALES
    # =====================================================

    daily_sales_data = {}

    for booking in confirmed_bookings:

        date_key = (
            booking.created_at.strftime(
                "%Y-%m-%d"
            )
        )

        if date_key not in daily_sales_data:

            daily_sales_data[date_key] = {
                "date": date_key,
                "tickets_sold": 0,
                "revenue": 0.0
            }

        daily_sales_data[
            date_key
        ]["tickets_sold"] += (
            booking.ticket_quantity
        )

        daily_sales_data[
            date_key
        ]["revenue"] += float(
            booking.total_price or 0
        )

    daily_ticket_sales = [
        DailyTicketSalesResponse(
            date=item["date"],
            tickets_sold=item[
                "tickets_sold"
            ],
            revenue=item["revenue"]
        )
        for item in sorted(
            daily_sales_data.values(),
            key=lambda x: x["date"]
        )
    ]

    # =====================================================
    # MONTHLY BOOKING TRENDS
    # =====================================================

    monthly_data = {}

    for booking in confirmed_bookings:

        month_key = (
            booking.created_at.strftime(
                "%Y-%m"
            )
        )

        if month_key not in monthly_data:

            monthly_data[month_key] = {
                "month": month_key,
                "bookings": 0,
                "tickets_sold": 0
            }

        monthly_data[
            month_key
        ]["bookings"] += 1

        monthly_data[
            month_key
        ]["tickets_sold"] += (
            booking.ticket_quantity
        )

    monthly_booking_trends = [
        MonthlyBookingTrendResponse(
            month=item["month"],
            bookings=item["bookings"],
            tickets_sold=item[
                "tickets_sold"
            ]
        )
        for item in sorted(
            monthly_data.values(),
            key=lambda x: x["month"]
        )
    ]

    # =====================================================
    # MOST POPULAR EVENTS
    # =====================================================

    event_sales = {}

    for booking in confirmed_bookings:

        event_id = booking.event_id

        if event_id not in event_sales:

            event_sales[event_id] = {
                "event_id": event_id,
                "event_title": (
                    booking.event.title
                ),
                "tickets_sold": 0,
                "bookings": 0
            }

        event_sales[
            event_id
        ]["tickets_sold"] += (
            booking.ticket_quantity
        )

        event_sales[
            event_id
        ]["bookings"] += 1

    popular_events = [
        PopularEventResponse(
            event_id=item["event_id"],
            event_title=item[
                "event_title"
            ],
            tickets_sold=item[
                "tickets_sold"
            ],
            bookings=item["bookings"]
        )
        for item in sorted(
            event_sales.values(),
            key=lambda x: x[
                "tickets_sold"
            ],
            reverse=True
        )
    ]

    # =====================================================
    # TOP REVENUE EVENTS
    # =====================================================

    revenue_data = {}

    for booking in confirmed_bookings:

        event_id = booking.event_id

        if event_id not in revenue_data:

            revenue_data[event_id] = {
                "event_id": event_id,
                "event_title": (
                    booking.event.title
                ),
                "revenue": 0.0
            }

        revenue_data[
            event_id
        ]["revenue"] += float(
            booking.total_price or 0
        )

    top_revenue_events = [
        TopRevenueEventResponse(
            event_id=item["event_id"],
            event_title=item[
                "event_title"
            ],
            revenue=item["revenue"]
        )
        for item in sorted(
            revenue_data.values(),
            key=lambda x: x[
                "revenue"
            ],
            reverse=True
        )
    ]

    # =====================================================
    # FINAL RESPONSE
    # =====================================================

    return AdminAnalyticsResponse(
        total_users=total_users,
        total_organizers=total_organizers,
        total_events=total_events,
        total_bookings=total_bookings,
        total_tickets_sold=total_tickets_sold,
        total_revenue=total_revenue,
        daily_ticket_sales=daily_ticket_sales,
        monthly_booking_trends=monthly_booking_trends,
        popular_events=popular_events,
        top_revenue_events=top_revenue_events
    )