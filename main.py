import os
import uuid
import qrcode

from datetime import datetime, timedelta, timezone

from fastapi import (
    FastAPI,
    Depends,
    HTTPException,
    status,
    BackgroundTasks,
    WebSocket,
    WebSocketDisconnect
)
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from fastapi.middleware.cors import CORSMiddleware

from sqlalchemy.orm import Session
from sqlalchemy import func
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
    PaymentCreate,
    PaymentResponse,
    PaymentResultResponse,
    NotificationResponse,
    AdminAnalyticsResponse,
    DailyTicketSalesResponse,
    MonthlyBookingTrendResponse,
    PopularEventResponse,
    TopRevenueEventResponse,
    CouponCreate,
    CouponResponse,
    CouponApplyRequest,
    CouponApplyResponse,
    ReviewCreate,
    ReviewUpdate,
    EventRatingResponse,
    EventAnnouncementCreate,
    EventAnnouncementResponse,
    UserProfileUpdate,
    UserProfileResponse,
    UserBookingSummaryResponse,
    ChatbotRequest,
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
# HELPERS
# =========================================================

def update_event_status(event):
    """
    Automatically update event status based on event date.

    UPCOMING:  event has not started yet.
    ONGOING:   event started and is within 2 hours.
    COMPLETED: event ended more than 2 hours ago.
    CANCELLED: left unchanged.
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


def get_event_or_404(db: Session, event_id: int) -> models.Event:
    """Return the event or raise a 404."""

    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    return event


def get_owned_event_or_404(
    db: Session,
    event_id: int,
    organizer_id: int
) -> models.Event:
    """Return an event owned by the organizer or raise a 404."""

    event = (
        db.query(models.Event)
        .filter(
            models.Event.id == event_id,
            models.Event.organizer_id == organizer_id
        )
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found or not owned by you"
        )

    return event


def build_organizer_booking(booking) -> OrganizerBookingResponse:
    return OrganizerBookingResponse(
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


# =========================================================
# FASTAPI APP
# =========================================================

app = FastAPI(
    title="SmartEvent - Event Discovery & Ticket Booking System",
    description=(
        "SmartEvent API with RBAC, "
        "event management and ticket booking"
    ),
    version="3.0.0"
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
# MODULE 18 - REAL-TIME AVAILABILITY
# WEBSOCKET CONNECTION MANAGER
# =========================================================

class AvailabilityConnectionManager:
    def __init__(self):
        # event_id -> set of connected WebSocket clients
        self.connections: dict[int, set[WebSocket]] = {}

    async def connect(self, event_id: int, websocket: WebSocket):
        await websocket.accept()

        if event_id not in self.connections:
            self.connections[event_id] = set()

        self.connections[event_id].add(websocket)

    def disconnect(self, event_id: int, websocket: WebSocket):
        if event_id not in self.connections:
            return

        self.connections[event_id].discard(websocket)

        if not self.connections[event_id]:
            del self.connections[event_id]

    async def broadcast(
        self,
        event_id: int,
        available_tickets: int,
        total_tickets: int
    ):
        if event_id not in self.connections:
            return

        message = {
            "event_id": event_id,
            "available_tickets": available_tickets,
            "total_tickets": total_tickets,
            "tickets_sold": total_tickets - available_tickets
        }

        disconnected = []

        for websocket in list(self.connections[event_id]):
            try:
                await websocket.send_json(message)
            except Exception:
                disconnected.append(websocket)

        for websocket in disconnected:
            self.disconnect(event_id, websocket)


availability_manager = AvailabilityConnectionManager()


# =========================================================
# OAUTH2
# =========================================================

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/login")


# =========================================================
# QR TICKET STORAGE
# =========================================================

TICKETS_DIR = "tickets"

os.makedirs(TICKETS_DIR, exist_ok=True)

app.mount(
    "/tickets",
    StaticFiles(directory=TICKETS_DIR),
    name="tickets"
)


# =========================================================
# ROOT
# =========================================================

@app.get("/", tags=["Root"])
def root():
    return {
        "message": "SmartEvent API is running",
        "version": "3.0.0",
        "status": "RBAC and simulated payments enabled"
    }


# =========================================================
# AUTHENTICATION - REGISTER
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
    existing_username = (
        db.query(models.User)
        .filter(models.User.username == user.username)
        .first()
    )

    if existing_username:
        raise HTTPException(
            status_code=400,
            detail="Username already exists"
        )

    existing_email = (
        db.query(models.User)
        .filter(models.User.email == user.email)
        .first()
    )

    if existing_email:
        raise HTTPException(
            status_code=400,
            detail="Email already exists"
        )

    new_user = models.User(
        username=user.username,
        email=user.email,
        hashed_password=hash_password(user.password),
        role="USER"
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return new_user


# =========================================================
# AUTHENTICATION - LOGIN
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
        .filter(models.User.email == form_data.username)
        .first()
    )

    if not existing_user or not verify_password(
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

def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    user_id = get_user_id_from_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=401,
            detail="Invalid or expired token"
        )

    user = (
        db.query(models.User)
        .filter(models.User.id == user_id)
        .first()
    )

    if user is None:
        raise HTTPException(
            status_code=401,
            detail="User not found"
        )

    return user


def require_roles(*allowed_roles):

    def role_checker(
        current_user: models.User = Depends(get_current_user)
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
# MODULE 22 - USER PROFILE ENHANCEMENTS
# =========================================================


# ---------------------------------------------------------
# GET USER PROFILE
# ---------------------------------------------------------

@app.get(
    "/profile",
    response_model=UserProfileResponse,
    tags=["Profile"]
)
def profile(
    current_user: models.User = Depends(get_current_user)
):
    return current_user


# ---------------------------------------------------------
# UPDATE USER PROFILE
# ---------------------------------------------------------

@app.put(
    "/profile",
    response_model=UserProfileResponse,
    tags=["Profile"]
)
def update_profile(
    profile_data: UserProfileUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    update_data = profile_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Please provide at least one field to update"
        )

    # Validate required fields.
    for field in ("username", "email"):
        if field in update_data:
            value = update_data[field]

            if value is None or not str(value).strip():
                raise HTTPException(
                    status_code=400,
                    detail=f"{field.capitalize()} cannot be empty"
                )

    # Check username uniqueness.
    if "username" in update_data:
        update_data["username"] = update_data["username"].strip()

        existing_username = (
            db.query(models.User)
            .filter(
                models.User.username == update_data["username"],
                models.User.id != current_user.id
            )
            .first()
        )

        if existing_username:
            raise HTTPException(
                status_code=400,
                detail="Username already exists"
            )

    # Check email uniqueness.
    if "email" in update_data:
        update_data["email"] = str(update_data["email"]).strip()

        existing_email = (
            db.query(models.User)
            .filter(
                models.User.email == update_data["email"],
                models.User.id != current_user.id
            )
            .first()
        )

        if existing_email:
            raise HTTPException(
                status_code=400,
                detail="Email already exists"
            )

    # Apply changes.
    for field, value in update_data.items():
        setattr(current_user, field, value)

    try:
        db.commit()
        db.refresh(current_user)

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=400,
            detail="Unable to update profile"
        )

    return current_user


# ---------------------------------------------------------
# USER BOOKING SUMMARY
# ---------------------------------------------------------

@app.get(
    "/profile/booking-summary",
    response_model=UserBookingSummaryResponse,
    tags=["Profile"]
)
def get_profile_booking_summary(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.user_id == current_user.id
        )
        .all()
    )

    total_bookings = len(bookings)
    confirmed_bookings = 0
    pending_bookings = 0
    cancelled_bookings = 0
    total_tickets = 0
    total_spent = 0.0

    for booking in bookings:
        booking_status = (
            booking.booking_status or ""
        ).upper()

        if booking_status == "CONFIRMED":
            confirmed_bookings += 1

            total_tickets += (
                booking.ticket_quantity or 0
            )

            total_spent += float(
                booking.total_price or 0
            )

        elif booking_status == "PENDING":
            pending_bookings += 1

        elif booking_status == "CANCELLED":
            cancelled_bookings += 1

    return {
        "total_bookings": total_bookings,
        "confirmed_bookings": confirmed_bookings,
        "pending_bookings": pending_bookings,
        "cancelled_bookings": cancelled_bookings,
        "total_tickets": total_tickets,
        "total_spent": round(total_spent, 2)
    }

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
# MODULE 16: SEARCH, FILTERING AND SORTING
# MODULE 17: EVENT PAGINATION
# =========================================================

@app.get("/events", tags=["Events"])
def get_events(
    category: str | None = None,
    search: str | None = None,
    location: str | None = None,
    start_date: datetime | None = None,
    end_date: datetime | None = None,
    min_price: float | None = None,
    max_price: float | None = None,
    sort_by: str = "date_asc",
    page: int = 1,
    page_size: int = 6,
    db: Session = Depends(get_db)
):
    # VALIDATE PAGINATION
    if page < 1:
        raise HTTPException(
            status_code=400,
            detail="Page must be at least 1"
        )

    if page_size < 1 or page_size > 100:
        raise HTTPException(
            status_code=400,
            detail="Page size must be between 1 and 100"
        )

    query = db.query(models.Event)

    if search and search.strip():
        query = query.filter(
            models.Event.title.ilike(f"%{search.strip()}%")
        )

    if category and category.strip():
        query = query.filter(
            models.Event.category.ilike(category.strip())
        )

    if location and location.strip():
        query = query.filter(
            models.Event.location.ilike(f"%{location.strip()}%")
        )

    if start_date:
        query = query.filter(models.Event.event_date >= start_date)

    if end_date:
        query = query.filter(models.Event.event_date <= end_date)

    if min_price is not None:
        if min_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Minimum price cannot be negative"
            )

        query = query.filter(models.Event.ticket_price >= min_price)

    if max_price is not None:
        if max_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Maximum price cannot be negative"
            )

        query = query.filter(models.Event.ticket_price <= max_price)

    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=400,
            detail="Minimum price cannot exceed maximum price"
        )

    if (
        start_date is not None
        and end_date is not None
        and start_date > end_date
    ):
        raise HTTPException(
            status_code=400,
            detail="Start date cannot be after end date"
        )

    # SORT EVENTS
    if sort_by == "date_asc":
        query = query.order_by(
            models.Event.event_date.asc(),
            models.Event.id.asc()
        )

    elif sort_by == "date_desc":
        query = query.order_by(
            models.Event.event_date.desc(),
            models.Event.id.desc()
        )

    elif sort_by == "price_asc":
        query = query.order_by(
            models.Event.ticket_price.asc(),
            models.Event.id.asc()
        )

    elif sort_by == "price_desc":
        query = query.order_by(
            models.Event.ticket_price.desc(),
            models.Event.id.desc()
        )

    elif sort_by == "popularity":
        # Most popular events appear first.
        # Popularity is measured by tickets sold.
        tickets_sold = (
            models.Event.total_tickets
            - models.Event.available_tickets
        )

        query = query.order_by(
            tickets_sold.desc(),
            models.Event.id.asc()
        )

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sort_by value. Use date_asc, "
                "date_desc, price_asc, price_desc, or popularity."
            )
        )

    total_events = query.count()
    total_pages = (total_events + page_size - 1) // page_size
    offset = (page - 1) * page_size

    events = query.offset(offset).limit(page_size).all()

    for event in events:
        update_event_status(event)

    db.commit()

    return {
        "items": [
            EventResponse.model_validate(event)
            for event in events
        ],
        "total": total_events,
        "page": page,
        "page_size": page_size,
        "total_pages": total_pages,
        "has_next": page < total_pages,
        "has_previous": page > 1
    }


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
    event = get_event_or_404(db, event_id)

    update_event_status(event)
    db.commit()

    return event


# =========================================================
# MODULE 21 - LIVE EVENT UPDATES & ANNOUNCEMENTS
# =========================================================

@app.post(
    "/events/{event_id}/updates",
    response_model=EventAnnouncementResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Event Updates"]
)
def create_event_announcement(
    event_id: int,
    announcement: EventAnnouncementCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER", "ADMIN")
    )
):
    event = get_event_or_404(db, event_id)

    # Organizers can publish announcements only for events
    # they own. Admins can manage any event.
    if (
        current_user.role == "ORGANIZER"
        and event.organizer_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only post updates for your own events"
        )

    message = announcement.message.strip()

    if len(message) < 3:
        raise HTTPException(
            status_code=422,
            detail="Announcement must contain at least 3 characters"
        )

    new_update = models.EventUpdate(
        event_id=event.id,
        message=message
    )

    try:
        db.add(new_update)
        db.commit()
        db.refresh(new_update)

        return new_update

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to create event announcement"
        )


@app.get(
    "/events/{event_id}/updates",
    response_model=list[EventAnnouncementResponse],
    tags=["Event Updates"]
)
def get_event_announcements(
    event_id: int,
    db: Session = Depends(get_db)
):
    get_event_or_404(db, event_id)

    return (
        db.query(models.EventUpdate)
        .filter(models.EventUpdate.event_id == event_id)
        .order_by(
            models.EventUpdate.created_at.desc(),
            models.EventUpdate.id.desc()
        )
        .all()
    )


@app.delete(
    "/event-updates/{update_id}",
    tags=["Event Updates"]
)
def delete_event_announcement(
    update_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER", "ADMIN")
    )
):
    announcement = (
        db.query(models.EventUpdate)
        .filter(models.EventUpdate.id == update_id)
        .first()
    )

    if announcement is None:
        raise HTTPException(
            status_code=404,
            detail="Announcement not found"
        )

    event = (
        db.query(models.Event)
        .filter(models.Event.id == announcement.event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Associated event not found"
        )

    if (
        current_user.role == "ORGANIZER"
        and event.organizer_id != current_user.id
    ):
        raise HTTPException(
            status_code=403,
            detail="You can only delete updates for your own events"
        )

    try:
        db.delete(announcement)
        db.commit()

        return {
            "message": "Announcement deleted successfully",
            "update_id": update_id
        }

    except Exception:
        db.rollback()

        raise HTTPException(
            status_code=500,
            detail="Failed to delete event announcement"
        )


# =========================================================
# UPDATE ORGANIZER EVENT
# MODULE 18 - REAL-TIME TICKET AVAILABILITY
# ORGANIZER ONLY
# =========================================================

@app.put(
    "/organizer/events/{event_id}",
    response_model=EventResponse,
    tags=["Organizer"]
)
def update_organizer_event(
    event_id: int,
    event_data: EventUpdate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER")
    )
):
    try:
        event = get_owned_event_or_404(db, event_id, current_user.id)

        update_data = event_data.model_dump(exclude_unset=True)

        if not update_data:
            raise HTTPException(
                status_code=400,
                detail="No event changes provided"
            )

        # Validate and update ticket capacity.
        tickets_reserved_or_sold = (
            event.total_tickets - event.available_tickets
        )

        if "total_tickets" in update_data:

            new_total_tickets = update_data.pop("total_tickets")

            if new_total_tickets < 0:
                raise HTTPException(
                    status_code=400,
                    detail="Total tickets cannot be negative"
                )

            if new_total_tickets < tickets_reserved_or_sold:
                raise HTTPException(
                    status_code=400,
                    detail=(
                        "Total tickets cannot be less than "
                        f"the {tickets_reserved_or_sold} "
                        "tickets already reserved or sold."
                    )
                )

            event.available_tickets = (
                new_total_tickets - tickets_reserved_or_sold
            )
            event.total_tickets = new_total_tickets

        # Update other event fields.
        for field, value in update_data.items():
            setattr(event, field, value)

        update_event_status(event)

        # Notify users with confirmed bookings.
        bookings = (
            db.query(models.Booking)
            .filter(
                models.Booking.event_id == event.id,
                models.Booking.booking_status == "CONFIRMED"
            )
            .all()
        )

        for booking in bookings:
            db.add(
                models.Notification(
                    user_id=booking.user_id,
                    title="Event Updated",
                    message=(
                        f"The event '{event.title}' has been updated. "
                        "Please check the latest event details."
                    ),
                    type="EVENT",
                    is_read=False
                )
            )

        # Capture availability before commit.
        updated_event_id = event.id
        updated_available_tickets = event.available_tickets
        updated_total_tickets = event.total_tickets

        db.commit()
        db.refresh(event)

        background_tasks.add_task(
            availability_manager.broadcast,
            updated_event_id,
            updated_available_tickets,
            updated_total_tickets
        )

        return event

    except Exception:
        db.rollback()
        raise


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
    event = get_owned_event_or_404(db, event_id, current_user.id)

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="Event is already cancelled"
        )

    event.event_status = "CANCELLED"

    bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.event_id == event.id,
            models.Booking.booking_status == "CONFIRMED"
        )
        .all()
    )

    for booking in bookings:
        db.add(
            models.Notification(
                user_id=booking.user_id,
                title="Event Cancelled",
                message=(
                    f"The event '{event.title}' "
                    "has been cancelled."
                ),
                type="EVENT",
                is_read=False
            )
        )

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
        .filter(models.Event.organizer_id == current_user.id)
        .order_by(models.Event.event_date)
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
    event = get_owned_event_or_404(db, event_id, current_user.id)

    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.event_id == event.id)
        .order_by(models.Booking.created_at.desc())
        .all()
    )

    return [build_organizer_booking(b) for b in bookings]


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
        .filter(models.Event.organizer_id == current_user.id)
        .order_by(models.Event.event_date)
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
                models.Booking.event_id == event.id,
                models.Booking.booking_status == "CONFIRMED"
            )
            .all()
        )

        tickets_sold = sum(
            booking.ticket_quantity
            for booking in confirmed_bookings
        )

        revenue = sum(
            float(booking.total_price or 0)
            for booking in confirmed_bookings
        )

        booking_count = len(confirmed_bookings)

        total_tickets_sold += tickets_sold
        total_revenue += revenue
        total_bookings += booking_count

        event_analytics.append({
            "event_id": event.id,
            "event_title": event.title,
            "total_tickets": event.total_tickets,
            "tickets_sold": tickets_sold,
            "remaining_tickets": event.available_tickets,
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
# MODULE 12 - TICKET HELPER
# =========================================================

def create_ticket_record(db: Session, booking: models.Booking):
    """Create one QR ticket for a booking, if it does not exist."""

    existing_ticket = (
        db.query(models.Ticket)
        .filter(models.Ticket.booking_id == booking.id)
        .first()
    )

    if existing_ticket:
        return existing_ticket

    ticket_code = "TKT-" + uuid.uuid4().hex[:12].upper()
    qr_data = (
        "SmartEvent Ticket\n"
        f"Ticket Code: {ticket_code}\n"
        f"Booking ID: {booking.id}\n"
        f"Event ID: {booking.event_id}"
    )

    qr = qrcode.make(qr_data)
    filename = f"{ticket_code}.png"
    filepath = os.path.join(TICKETS_DIR, filename)
    qr.save(filepath)

    new_ticket = models.Ticket(
        booking_id=booking.id,
        ticket_code=ticket_code,
        qr_code_url=f"/tickets/{filename}"
    )
    db.add(new_ticket)
    db.flush()
    return new_ticket


# =========================================================
# TICKET BOOKING
# MODULE 18 - ATOMIC TICKET RESERVATION
# =========================================================

@app.post(
    "/bookings",
    response_model=BookingResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Bookings"]
)
def create_booking(
    booking: BookingCreate,
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    event = get_event_or_404(db, booking.event_id)

    update_event_status(event)

    if event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="This event has been cancelled"
        )

    if event.event_status == "COMPLETED":
        raise HTTPException(
            status_code=400,
            detail="This event has already been completed"
        )

    if event.event_status == "ONGOING":
        raise HTTPException(
            status_code=400,
            detail="This event is currently ongoing"
        )

    if booking.ticket_quantity <= 0:
        raise HTTPException(
            status_code=400,
            detail="Ticket quantity must be greater than zero"
        )

    original_price = round(
        float(event.ticket_price) * booking.ticket_quantity,
        2
    )

    discount_amount = 0.0
    coupon_id = None

    # APPLY COUPON
    if booking.coupon_code:

        coupon_code = booking.coupon_code.strip().upper()

        coupon = (
            db.query(models.Coupon)
            .filter(models.Coupon.code == coupon_code)
            .first()
        )

        if coupon is None:
            raise HTTPException(
                status_code=404,
                detail="Invalid coupon code"
            )

        if not coupon.is_active:
            raise HTTPException(
                status_code=400,
                detail="This coupon is inactive"
            )

        if coupon.expires_at is not None:

            expiry = coupon.expires_at

            if expiry.tzinfo is not None:
                expiry = expiry.replace(tzinfo=None)

            if datetime.now() >= expiry:
                raise HTTPException(
                    status_code=400,
                    detail="This coupon has expired"
                )

        if original_price < float(coupon.minimum_amount):
            raise HTTPException(
                status_code=400,
                detail=(
                    "Minimum booking amount for this coupon is "
                    f"₹{coupon.minimum_amount:.2f}"
                )
            )

        if coupon.discount_type == "PERCENTAGE":
            discount_amount = (
                original_price
                * float(coupon.discount_value)
                / 100
            )
        else:
            discount_amount = float(coupon.discount_value)

        # Discount cannot exceed original price
        discount_amount = round(
            min(discount_amount, original_price),
            2
        )

        coupon_id = coupon.id

    total_price = round(original_price - discount_amount, 2)

    # -----------------------------------------------------
    # ATOMIC TICKET RESERVATION
    # This UPDATE succeeds only when enough tickets are
    # still available, so two simultaneous requests cannot
    # both reserve the same tickets.
    # -----------------------------------------------------

    reservation_result = (
        db.query(models.Event)
        .filter(
            models.Event.id == event.id,
            models.Event.available_tickets >= booking.ticket_quantity
        )
        .update(
            {
                models.Event.available_tickets:
                    models.Event.available_tickets
                    - booking.ticket_quantity
            },
            synchronize_session=False
        )
    )

    if reservation_result == 0:

        db.rollback()

        latest_event = (
            db.query(models.Event)
            .filter(models.Event.id == booking.event_id)
            .first()
        )

        available_tickets = (
            latest_event.available_tickets
            if latest_event is not None
            else 0
        )

        raise HTTPException(
            status_code=400,
            detail=f"Only {available_tickets} tickets are available"
        )

    db.refresh(event)

    new_booking = models.Booking(
        user_id=current_user.id,
        event_id=event.id,
        ticket_quantity=booking.ticket_quantity,
        original_price=original_price,
        discount_amount=discount_amount,
        coupon_id=coupon_id,
        total_price=total_price,
        booking_status="PENDING"
    )

    db.add(new_booking)

    try:
        db.flush()

        if coupon_id is not None:
            notification_message = (
                f"Your booking for {event.title} has been created. "
                f"Original price: ₹{original_price:.2f}. "
                f"Discount: ₹{discount_amount:.2f}. "
                f"Final amount: ₹{total_price:.2f}. "
                "Complete payment to confirm your booking."
            )
        else:
            notification_message = (
                f"Your booking for {event.title} has been created. "
                "Complete payment to confirm your booking and "
                "receive your QR ticket."
            )

        db.add(
            models.Notification(
                user_id=current_user.id,
                title="Booking Created",
                message=notification_message,
                type="BOOKING",
                is_read=False
            )
        )

        db.commit()
        db.refresh(new_booking)

        background_tasks.add_task(
            availability_manager.broadcast,
            event.id,
            event.available_tickets,
            event.total_tickets
        )

    except Exception:
        # If booking creation fails, the atomic ticket
        # reservation is rolled back as well.
        db.rollback()
        raise

    return new_booking


# =========================================================
# MODULE 12 - PAYMENT SYSTEM
# =========================================================

@app.post(
    "/payments",
    response_model=PaymentResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Payments"]
)
def create_payment(
    payment_data: PaymentCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    """Create a pending simulated payment for the user's own booking."""

    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.id == payment_data.booking_id,
            models.Booking.user_id == current_user.id
        )
        .first()
    )

    if booking is None:
        raise HTTPException(status_code=404, detail="Booking not found")

    existing_payment = (
        db.query(models.Payment)
        .filter(models.Payment.booking_id == booking.id)
        .first()
    )

    # Idempotent: don't create duplicate payment records.
    if existing_payment:
        return existing_payment

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="Only pending bookings can start a payment"
        )

    event = (
        db.query(models.Event)
        .filter(models.Event.id == booking.event_id)
        .first()
    )

    if event is None or event.event_status == "CANCELLED":
        raise HTTPException(
            status_code=400,
            detail="The event is unavailable for payment"
        )

    new_payment = models.Payment(
        booking_id=booking.id,
        payment_method=payment_data.payment_method,
        payment_status="PENDING",
        transaction_id=None,
        amount=float(booking.total_price)
    )

    db.add(new_payment)
    db.commit()
    db.refresh(new_payment)
    return new_payment


@app.post(
    "/payments/{payment_id}/process",
    response_model=PaymentResultResponse,
    tags=["Payments"]
)
def process_payment(
    payment_id: int,
    background_tasks: BackgroundTasks,
    simulate_failure: bool = False,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    """Process a simulated payment on the backend."""

    payment = (
        db.query(models.Payment)
        .filter(models.Payment.id == payment_id)
        .first()
    )

    if payment is None:
        raise HTTPException(status_code=404, detail="Payment not found")

    booking = payment.booking

    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Payment not found")

    # Prevent processing an already completed payment again.
    if payment.payment_status == "SUCCESS":
        existing_ticket = (
            db.query(models.Ticket)
            .filter(models.Ticket.booking_id == booking.id)
            .first()
        )

        return PaymentResultResponse(
            message="Payment was already successful",
            payment=payment,
            booking_id=booking.id,
            booking_status=booking.booking_status,
            ticket_generated=existing_ticket is not None
        )

    if payment.payment_status == "FAILED":
        return PaymentResultResponse(
            message="Payment has already failed",
            payment=payment,
            booking_id=booking.id,
            booking_status=booking.booking_status,
            ticket_generated=False
        )

    if booking.booking_status != "PENDING":
        raise HTTPException(
            status_code=400,
            detail="This booking is no longer awaiting payment"
        )

    event = (
        db.query(models.Event)
        .filter(models.Event.id == booking.event_id)
        .first()
    )

    if event is None or event.event_status == "CANCELLED":
        simulate_failure = True

    # Handle simulated payment failure.
    if simulate_failure:
        payment.payment_status = "FAILED"
        payment.transaction_id = "SIM-FAIL-" + uuid.uuid4().hex.upper()
        booking.booking_status = "CANCELLED"

        # Release reserved tickets.
        if event is not None:
            event.available_tickets = min(
                event.total_tickets,
                event.available_tickets + booking.ticket_quantity
            )

        db.add(
            models.Notification(
                user_id=current_user.id,
                title="Payment Failed",
                message=(
                    f"Payment for booking #{booking.id} failed. "
                    "The booking was cancelled and reserved tickets "
                    "were released."
                ),
                type="PAYMENT",
                is_read=False
            )
        )

        db.commit()
        db.refresh(payment)

        if event is not None:
            background_tasks.add_task(
                availability_manager.broadcast,
                event.id,
                event.available_tickets,
                event.total_tickets
            )

        return PaymentResultResponse(
            message="Simulated payment failed",
            payment=payment,
            booking_id=booking.id,
            booking_status=booking.booking_status,
            ticket_generated=False
        )

    # Validate and increment coupon usage only when a coupon exists.
    if booking.coupon_id is not None:
        coupon = (
            db.query(models.Coupon)
            .filter(models.Coupon.id == booking.coupon_id)
            .with_for_update()
            .first()
        )

        if coupon is None:
            raise HTTPException(
                status_code=400,
                detail="The coupon associated with this booking was not found"
            )

        if (
            coupon.usage_limit is not None
            and coupon.used_count >= coupon.usage_limit
        ):
            raise HTTPException(
                status_code=400,
                detail="This coupon has reached its usage limit"
            )

        coupon.used_count += 1

    # Mark the payment successful exactly once.
    payment.payment_status = "SUCCESS"
    payment.transaction_id = "SIM-" + uuid.uuid4().hex.upper()
    booking.booking_status = "CONFIRMED"

    ticket = create_ticket_record(db, booking)

    db.add(
        models.Notification(
            user_id=current_user.id,
            title="Payment Successful",
            message=(
                f"Payment for booking #{booking.id} was successful. "
                "Your booking is confirmed and your QR ticket is ready."
            ),
            type="PAYMENT",
            is_read=False
        )
    )

    db.add(
        models.Notification(
            user_id=current_user.id,
            title="Booking Confirmed",
            message=(
                f"Your booking for "
                f"{event.title if event else 'the event'} "
                "has been confirmed after successful payment."
            ),
            type="BOOKING",
            is_read=False
        )
    )

    db.commit()
    db.refresh(payment)

    return PaymentResultResponse(
        message="Payment successful. Booking confirmed and QR ticket generated.",
        payment=payment,
        booking_id=booking.id,
        booking_status=booking.booking_status,
        ticket_generated=ticket is not None
    )


@app.get(
    "/payments/{payment_id}",
    response_model=PaymentResponse,
    tags=["Payments"]
)
def get_payment(
    payment_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    payment = (
        db.query(models.Payment)
        .filter(models.Payment.id == payment_id)
        .first()
    )

    if payment is None or payment.booking.user_id != current_user.id:
        raise HTTPException(status_code=404, detail="Payment not found")

    return payment


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
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    bookings = (
        db.query(models.Booking)
        .filter(models.Booking.user_id == current_user.id)
        .order_by(models.Booking.created_at.desc())
        .all()
    )

    return [
        BookingHistoryResponse(
            id=booking.id,
            event_id=booking.event_id,
            event_title=booking.event.title,
            ticket_quantity=booking.ticket_quantity,
            original_price=booking.original_price,
            discount_amount=booking.discount_amount,
            coupon_id=booking.coupon_id,
            total_price=booking.total_price,
            booking_status=booking.booking_status,
            created_at=booking.created_at
        )
        for booking in bookings
    ]


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
    background_tasks: BackgroundTasks,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.id == booking_id,
            models.Booking.user_id == current_user.id
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

    if (
        booking.payment is not None
        and booking.payment.payment_status == "SUCCESS"
    ):
        raise HTTPException(
            status_code=400,
            detail=(
                "This booking has been paid. "
                "Cancellation/refund is not available yet."
            )
        )

    event = get_event_or_404(db, booking.event_id)

    booking.booking_status = "CANCELLED"

    # Release reserved tickets, never exceeding total capacity.
    event.available_tickets = min(
        event.total_tickets,
        event.available_tickets + booking.ticket_quantity
    )

    # Capture availability before committing
    event_id = event.id
    available_tickets = event.available_tickets
    total_tickets = event.total_tickets

    db.commit()
    db.refresh(booking)

    background_tasks.add_task(
        availability_manager.broadcast,
        event_id,
        available_tickets,
        total_tickets
    )

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
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.id == booking_id,
            models.Booking.user_id == current_user.id
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
            detail="QR ticket can only be generated for confirmed bookings"
        )

    # Returns the existing ticket if one was already created.
    ticket = create_ticket_record(db, booking)

    db.commit()
    db.refresh(ticket)

    return ticket


# =========================================================
# VERIFY QR TICKET
# =========================================================

@app.get(
    "/verify-ticket/{ticket_code}",
    tags=["Tickets"]
)
def verify_ticket(
    ticket_code: str,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER", "ADMIN")
    )
):
    ticket = (
        db.query(models.Ticket)
        .filter(models.Ticket.ticket_code == ticket_code)
        .first()
    )

    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Invalid ticket"
        )

    booking = ticket.booking

    # Only confirmed bookings can be admitted.
    if booking.booking_status != "CONFIRMED":
        return {
            "valid": False,
            "ticket_code": ticket.ticket_code,
            "booking_id": booking.id,
            "event_id": booking.event_id,
            "booking_status": booking.booking_status,
            "attendance_recorded": False,
            "verified_at": ticket.verified_at,
            "message": "Ticket is not valid because the booking is not confirmed."
        }

    # Organizers can verify tickets only for their own events.
    if current_user.role == "ORGANIZER":
        event = (
            db.query(models.Event)
            .filter(
                models.Event.id == booking.event_id,
                models.Event.organizer_id == current_user.id
            )
            .first()
        )

        if event is None:
            raise HTTPException(
                status_code=403,
                detail="You can verify tickets only for your own events."
            )

    # Record attendance only on the first verification.
    if ticket.verified_at is None:
        ticket.verified_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(ticket)

        attendance_recorded = True
        message = "Ticket verified successfully. Attendance recorded."

    else:
        attendance_recorded = False
        message = "Ticket is valid, but attendance was already recorded."

    return {
        "valid": True,
        "ticket_code": ticket.ticket_code,
        "booking_id": booking.id,
        "event_id": booking.event_id,
        "booking_status": booking.booking_status,
        "attendance_recorded": attendance_recorded,
        "verified_at": ticket.verified_at,
        "message": message
    }


# =========================================================
# NOTIFICATIONS
# =========================================================

@app.get(
    "/notifications",
    response_model=list[NotificationResponse],
    tags=["Notifications"]
)
def get_notifications(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    return (
        db.query(models.Notification)
        .filter(models.Notification.user_id == current_user.id)
        .order_by(models.Notification.created_at.desc())
        .all()
    )


@app.get(
    "/notifications/unread-count",
    tags=["Notifications"]
)
def get_unread_notification_count(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    unread_count = (
        db.query(models.Notification)
        .filter(
            models.Notification.user_id == current_user.id,
            models.Notification.is_read == False
        )
        .count()
    )

    return {"unread_count": unread_count}


@app.post(
    "/notifications/{notification_id}/read",
    response_model=NotificationResponse,
    tags=["Notifications"]
)
def mark_notification_as_read(
    notification_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    notification = (
        db.query(models.Notification)
        .filter(
            models.Notification.id == notification_id,
            models.Notification.user_id == current_user.id
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
    current_user: models.User = Depends(get_current_user)
):
    # SQLite event dates are stored without timezone information.
    now = datetime.now()
    reminder_limit = now + timedelta(hours=24)

    upcoming_events = (
        db.query(models.Event)
        .filter(
            models.Event.event_date >= now,
            models.Event.event_date <= reminder_limit,
            models.Event.event_status == "UPCOMING"
        )
        .all()
    )

    reminders_created = 0

    for event in upcoming_events:

        # Only users with confirmed bookings receive reminders.
        booking = (
            db.query(models.Booking)
            .filter(
                models.Booking.event_id == event.id,
                models.Booking.user_id == current_user.id,
                models.Booking.booking_status == "CONFIRMED"
            )
            .first()
        )

        if booking is None:
            continue

        reminder_message = (
            f"Your event {event.title} "
            "is scheduled within the next 24 hours."
        )

        # Avoid creating another reminder for the same event.
        existing_reminder = (
            db.query(models.Notification)
            .filter(
                models.Notification.user_id == current_user.id,
                models.Notification.type == "EVENT",
                models.Notification.title == "Event Reminder",
                models.Notification.message == reminder_message
            )
            .first()
        )

        if existing_reminder:
            continue

        db.add(
            models.Notification(
                user_id=current_user.id,
                title="Event Reminder",
                message=reminder_message,
                type="EVENT",
                is_read=False
            )
        )
        reminders_created += 1

    db.commit()

    return {
        "message": "Event reminders checked",
        "reminders_created": reminders_created
    }


# =========================================================
# ADMIN - USERS / EVENTS / BOOKINGS
# =========================================================

@app.get(
    "/admin/users",
    response_model=list[UserResponse],
    tags=["Admin"]
)
def admin_get_users(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    return db.query(models.User).order_by(models.User.id).all()


@app.get(
    "/admin/events",
    response_model=list[EventResponse],
    tags=["Admin"]
)
def admin_get_events(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    events = (
        db.query(models.Event)
        .order_by(models.Event.event_date)
        .all()
    )

    for event in events:
        update_event_status(event)

    db.commit()

    return events


@app.get(
    "/admin/bookings",
    response_model=list[OrganizerBookingResponse],
    tags=["Admin"]
)
def admin_get_bookings(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    bookings = (
        db.query(models.Booking)
        .order_by(models.Booking.created_at.desc())
        .all()
    )

    return [build_organizer_booking(b) for b in bookings]


# =========================================================
# MODULE 13 - COUPON MANAGEMENT
# =========================================================

@app.post(
    "/admin/coupons",
    response_model=CouponResponse,
    status_code=status.HTTP_201_CREATED,
    tags=["Admin Coupons"]
)
def create_coupon(
    coupon_data: CouponCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    coupon_code = coupon_data.code.strip().upper()

    if not coupon_code:
        raise HTTPException(
            status_code=400,
            detail="Coupon code cannot be empty"
        )

    if (
        coupon_data.discount_type == "PERCENTAGE"
        and coupon_data.discount_value > 100
    ):
        raise HTTPException(
            status_code=400,
            detail="Percentage discount cannot exceed 100%"
        )

    if coupon_data.expires_at is not None:

        expiry = coupon_data.expires_at

        if expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)

        if expiry <= datetime.now():
            raise HTTPException(
                status_code=400,
                detail="Coupon expiry date must be in the future"
            )

    existing_coupon = (
        db.query(models.Coupon)
        .filter(models.Coupon.code == coupon_code)
        .first()
    )

    if existing_coupon:
        raise HTTPException(
            status_code=400,
            detail="Coupon code already exists"
        )

    new_coupon = models.Coupon(
        code=coupon_code,
        discount_type=coupon_data.discount_type,
        discount_value=coupon_data.discount_value,
        minimum_amount=coupon_data.minimum_amount,
        usage_limit=coupon_data.usage_limit,
        used_count=0,
        expires_at=coupon_data.expires_at,
        is_active=coupon_data.is_active
    )

    db.add(new_coupon)
    db.commit()
    db.refresh(new_coupon)

    return new_coupon


@app.get(
    "/admin/coupons",
    response_model=list[CouponResponse],
    tags=["Admin Coupons"]
)
def get_all_coupons(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    return (
        db.query(models.Coupon)
        .order_by(models.Coupon.created_at.desc())
        .all()
    )


@app.delete(
    "/admin/coupons/{coupon_id}",
    response_model=CouponResponse,
    tags=["Admin Coupons"]
)
def deactivate_coupon(
    coupon_id: int,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    coupon = (
        db.query(models.Coupon)
        .filter(models.Coupon.id == coupon_id)
        .first()
    )

    if coupon is None:
        raise HTTPException(
            status_code=404,
            detail="Coupon not found"
        )

    coupon.is_active = False

    db.commit()
    db.refresh(coupon)

    return coupon


@app.post(
    "/coupons/apply",
    response_model=CouponApplyResponse,
    tags=["Coupons"]
)
def apply_coupon(
    coupon_data: CouponApplyRequest,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    coupon_code = coupon_data.code.strip().upper()

    coupon = (
        db.query(models.Coupon)
        .filter(models.Coupon.code == coupon_code)
        .first()
    )

    if coupon is None:
        raise HTTPException(
            status_code=404,
            detail="Invalid coupon code"
        )

    if not coupon.is_active:
        raise HTTPException(
            status_code=400,
            detail="This coupon is inactive"
        )

    if coupon.expires_at is not None:

        expiry = coupon.expires_at

        if expiry.tzinfo is not None:
            expiry = expiry.replace(tzinfo=None)

        if datetime.now() >= expiry:
            raise HTTPException(
                status_code=400,
                detail="This coupon has expired"
            )

    if (
        coupon.usage_limit is not None
        and coupon.used_count >= coupon.usage_limit
    ):
        raise HTTPException(
            status_code=400,
            detail="This coupon has reached its usage limit"
        )

    original_amount = float(coupon_data.booking_amount)

    if original_amount < coupon.minimum_amount:
        raise HTTPException(
            status_code=400,
            detail=(
                "Minimum booking amount for this coupon "
                f"is ₹{coupon.minimum_amount:.2f}"
            )
        )

    if coupon.discount_type == "PERCENTAGE":
        discount_amount = (
            original_amount * coupon.discount_value / 100
        )
    else:
        discount_amount = coupon.discount_value

    # Never allow discount above total.
    discount_amount = min(discount_amount, original_amount)
    final_amount = original_amount - discount_amount

    return CouponApplyResponse(
        message="Coupon applied successfully",
        coupon_code=coupon.code,
        discount_amount=round(discount_amount, 2),
        original_amount=round(original_amount, 2),
        final_amount=round(final_amount, 2)
    )


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
    current_user: models.User = Depends(require_roles("ADMIN"))
):
    total_users = db.query(models.User).count()

    total_organizers = (
        db.query(models.User)
        .filter(models.User.role == "ORGANIZER")
        .count()
    )

    total_events = db.query(models.Event).count()

    bookings_query = db.query(models.Booking)

    if start_date:
        try:
            start_datetime = datetime.strptime(start_date, "%Y-%m-%d")
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid start_date format. Use YYYY-MM-DD."
            )

        bookings_query = bookings_query.filter(
            models.Booking.created_at >= start_datetime
        )

    if end_date:
        try:
            end_datetime = (
                datetime.strptime(end_date, "%Y-%m-%d")
                + timedelta(days=1)
            )
        except ValueError:
            raise HTTPException(
                status_code=400,
                detail="Invalid end_date format. Use YYYY-MM-DD."
            )

        bookings_query = bookings_query.filter(
            models.Booking.created_at < end_datetime
        )

    bookings = bookings_query.order_by(models.Booking.created_at).all()

    total_bookings = len(bookings)

    confirmed_bookings = [
        booking
        for booking in bookings
        if booking.booking_status == "CONFIRMED"
    ]

    total_tickets_sold = sum(
        booking.ticket_quantity for booking in confirmed_bookings
    )

    total_revenue = sum(
        float(booking.total_price or 0)
        for booking in confirmed_bookings
    )

    # Aggregate everything in a single pass.
    daily_sales_data = {}
    monthly_data = {}
    event_sales = {}
    revenue_data = {}

    for booking in confirmed_bookings:

        price = float(booking.total_price or 0)
        quantity = booking.ticket_quantity

        date_key = booking.created_at.strftime("%Y-%m-%d")
        month_key = booking.created_at.strftime("%Y-%m")
        event_id = booking.event_id

        day = daily_sales_data.setdefault(
            date_key,
            {"date": date_key, "tickets_sold": 0, "revenue": 0.0}
        )
        day["tickets_sold"] += quantity
        day["revenue"] += price

        month = monthly_data.setdefault(
            month_key,
            {"month": month_key, "bookings": 0, "tickets_sold": 0}
        )
        month["bookings"] += 1
        month["tickets_sold"] += quantity

        sales = event_sales.setdefault(
            event_id,
            {
                "event_id": event_id,
                "event_title": booking.event.title,
                "tickets_sold": 0,
                "bookings": 0
            }
        )
        sales["tickets_sold"] += quantity
        sales["bookings"] += 1

        revenue = revenue_data.setdefault(
            event_id,
            {
                "event_id": event_id,
                "event_title": booking.event.title,
                "revenue": 0.0
            }
        )
        revenue["revenue"] += price

    daily_ticket_sales = [
        DailyTicketSalesResponse(
            date=item["date"],
            tickets_sold=item["tickets_sold"],
            revenue=item["revenue"]
        )
        for item in sorted(
            daily_sales_data.values(),
            key=lambda x: x["date"]
        )
    ]

    monthly_booking_trends = [
        MonthlyBookingTrendResponse(
            month=item["month"],
            bookings=item["bookings"],
            tickets_sold=item["tickets_sold"]
        )
        for item in sorted(
            monthly_data.values(),
            key=lambda x: x["month"]
        )
    ]

    popular_events = [
        PopularEventResponse(
            event_id=item["event_id"],
            event_title=item["event_title"],
            tickets_sold=item["tickets_sold"],
            bookings=item["bookings"]
        )
        for item in sorted(
            event_sales.values(),
            key=lambda x: x["tickets_sold"],
            reverse=True
        )
    ]

    top_revenue_events = [
        TopRevenueEventResponse(
            event_id=item["event_id"],
            event_title=item["event_title"],
            revenue=item["revenue"]
        )
        for item in sorted(
            revenue_data.values(),
            key=lambda x: x["revenue"],
            reverse=True
        )
    ]

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


# =========================================================
# MODULE 14 - REVIEWS
# =========================================================

@app.post(
    "/events/{event_id}/reviews",
    tags=["Reviews"]
)
def submit_event_review(
    event_id: int,
    review_data: ReviewCreate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    get_event_or_404(db, event_id)

    # Find the confirmed booking owned by the current user.
    booking = (
        db.query(models.Booking)
        .filter(
            models.Booking.user_id == current_user.id,
            models.Booking.event_id == event_id,
            models.Booking.booking_status == "CONFIRMED"
        )
        .first()
    )

    if booking is None:
        raise HTTPException(
            status_code=403,
            detail="No confirmed booking found for this user and event."
        )

    ticket = (
        db.query(models.Ticket)
        .filter(models.Ticket.booking_id == booking.id)
        .first()
    )

    # Diagnostic information is returned if attendance is missing.
    if ticket is None:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "No ticket found for the confirmed booking.",
                "current_user_id": current_user.id,
                "booking_id": booking.id,
                "event_id": event_id
            }
        )

    if ticket.verified_at is None:
        raise HTTPException(
            status_code=403,
            detail={
                "message": "The ticket has not been verified.",
                "current_user_id": current_user.id,
                "booking_id": booking.id,
                "event_id": event_id,
                "ticket_code": ticket.ticket_code,
                "verified_at": None
            }
        )

    # Allow only one review per user per event.
    existing_review = (
        db.query(models.Review)
        .filter(
            models.Review.user_id == current_user.id,
            models.Review.event_id == event_id
        )
        .first()
    )

    if existing_review is not None:
        raise HTTPException(
            status_code=409,
            detail=(
                "You have already reviewed this event. "
                "You can edit your existing review."
            )
        )

    if review_data.event_id != event_id:
        raise HTTPException(
            status_code=400,
            detail="Event ID in the request does not match the URL."
        )

    review_text = review_data.review_text.strip()

    if not review_text:
        raise HTTPException(
            status_code=422,
            detail="Review text cannot be empty"
        )

    new_review = models.Review(
        user_id=current_user.id,
        event_id=event_id,
        rating=review_data.rating,
        review_text=review_text
    )

    db.add(new_review)
    db.commit()
    db.refresh(new_review)

    return {
        "message": "Review submitted successfully",
        "review": {
            "id": new_review.id,
            "user_id": current_user.id,
            "username": current_user.username,
            "event_id": new_review.event_id,
            "rating": new_review.rating,
            "review_text": new_review.review_text,
            "created_at": new_review.created_at
        }
    }


@app.get("/events/{event_id}/reviews", tags=["Reviews"])
def get_event_reviews(
    event_id: int,
    db: Session = Depends(get_db)
):
    get_event_or_404(db, event_id)

    reviews = (
        db.query(models.Review, models.User.username)
        .join(models.User, models.Review.user_id == models.User.id)
        .filter(models.Review.event_id == event_id)
        .order_by(models.Review.created_at.desc())
        .all()
    )

    return [
        {
            "id": review.id,
            "user_id": review.user_id,
            "username": username,
            "event_id": review.event_id,
            "rating": review.rating,
            "review_text": review.review_text,
            "created_at": review.created_at
        }
        for review, username in reviews
    ]


@app.get(
    "/events/{event_id}/rating",
    response_model=EventRatingResponse,
    tags=["Reviews"]
)
def get_event_rating(
    event_id: int,
    db: Session = Depends(get_db)
):
    get_event_or_404(db, event_id)

    result = db.query(
        func.avg(models.Review.rating),
        func.count(models.Review.id)
    ).filter(
        models.Review.event_id == event_id
    ).first()

    average_rating = float(result[0]) if result[0] is not None else 0.0
    total_reviews = result[1] or 0

    return {
        "event_id": event_id,
        "average_rating": round(average_rating, 2),
        "total_reviews": total_reviews
    }


@app.put("/reviews/{review_id}", tags=["Reviews"])
def update_event_review(
    review_id: int,
    review_data: ReviewUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    review = (
        db.query(models.Review)
        .filter(models.Review.id == review_id)
        .first()
    )

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own reviews"
        )

    update_data = review_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Provide a rating or review text to update"
        )

    if "review_text" in update_data:
        update_data["review_text"] = update_data["review_text"].strip()

        if not update_data["review_text"]:
            raise HTTPException(
                status_code=422,
                detail="Review text cannot be empty"
            )

    for field, value in update_data.items():
        setattr(review, field, value)

    db.commit()
    db.refresh(review)

    return {
        "message": "Review updated successfully",
        "review": {
            "id": review.id,
            "user_id": review.user_id,
            "username": current_user.username,
            "event_id": review.event_id,
            "rating": review.rating,
            "review_text": review.review_text,
            "created_at": review.created_at
        }
    }


@app.delete("/reviews/{review_id}", tags=["Reviews"])
def delete_event_review(
    review_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    review = (
        db.query(models.Review)
        .filter(models.Review.id == review_id)
        .first()
    )

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only delete your own reviews"
        )

    db.delete(review)
    db.commit()

    return {
        "message": "Review deleted successfully",
        "review_id": review_id
    }


# =========================================================
# MODULE 18 - REAL-TIME EVENT AVAILABILITY
# =========================================================

@app.websocket("/ws/events/{event_id}/availability")
async def event_availability_websocket(
    websocket: WebSocket,
    event_id: int,
    db: Session = Depends(get_db)
):
    event = (
        db.query(models.Event)
        .filter(models.Event.id == event_id)
        .first()
    )

    if event is None:
        await websocket.close(
            code=1008,
            reason="Event not found"
        )
        return

    update_event_status(event)
    db.commit()

    await availability_manager.connect(event_id, websocket)

    try:
        # Send current availability immediately.
        await websocket.send_json({
            "event_id": event.id,
            "available_tickets": event.available_tickets,
            "total_tickets": event.total_tickets,
            "tickets_sold": event.total_tickets - event.available_tickets
        })

        # Keep connection alive.
        while True:
            await websocket.receive_text()

    except WebSocketDisconnect:
        availability_manager.disconnect(event_id, websocket)

    except Exception:
        availability_manager.disconnect(event_id, websocket)


@app.get(
    "/events/{event_id}/availability",
    tags=["Real-Time Availability"]
)
def get_event_availability(
    event_id: int,
    db: Session = Depends(get_db)
):
    event = get_event_or_404(db, event_id)

    update_event_status(event)
    db.commit()

    return {
        "event_id": event.id,
        "available_tickets": event.available_tickets,
        "total_tickets": event.total_tickets,
        "tickets_sold": event.total_tickets - event.available_tickets,
        "event_status": event.event_status
    }


# =========================================================
# MODULE 19 - PERSONALIZED EVENT RECOMMENDATIONS
# =========================================================

@app.get(
    "/recommendations",
    tags=["Recommendations"]
)
def get_recommendations(
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Return personalized event recommendations for the logged-in user.

    1. Check the user's confirmed booking history.
    2. Identify the categories the user books most often.
    3. Recommend upcoming events from those categories.
    4. Exclude events already booked or sold out.
    5. If the user has no history, return general upcoming events.
    """

    user_bookings = (
        db.query(models.Booking)
        .filter(
            models.Booking.user_id == current_user.id,
            models.Booking.booking_status == "CONFIRMED"
        )
        .all()
    )

    booked_event_ids = {booking.event_id for booking in user_bookings}

    # Count bookings per category (case-insensitive).
    category_counts = {}

    for booking in user_bookings:
        event = booking.event

        if event is None:
            continue

        category = event.category.strip()

        if not category:
            continue

        category_key = category.lower()

        if category_key not in category_counts:
            category_counts[category_key] = {
                "name": category,
                "count": 0
            }

        category_counts[category_key]["count"] += 1

    preferred_categories = sorted(
        category_counts.values(),
        key=lambda item: item["count"],
        reverse=True
    )

    preferred_category_names = [
        item["name"] for item in preferred_categories
    ]

    # Build the query first, then add the exclusion filter only
    # when needed.
    upcoming_query = db.query(models.Event).filter(
        models.Event.event_status == "UPCOMING",
        models.Event.available_tickets > 0
    )

    if booked_event_ids:
        upcoming_query = upcoming_query.filter(
            models.Event.id.notin_(booked_event_ids)
        )

    upcoming_events = upcoming_query.order_by(
        models.Event.event_date.asc()
    ).all()

    # Refresh status before recommending.
    valid_events = []

    for event in upcoming_events:
        update_event_status(event)

        if (
            event.event_status == "UPCOMING"
            and event.available_tickets > 0
        ):
            valid_events.append(event)

    db.commit()

    if preferred_category_names:

        recommended_events = []

        # Events matching the user's preferences first.
        for preferred_category in preferred_category_names:
            for event in valid_events:

                if event in recommended_events:
                    continue

                if (
                    event.category.strip().lower()
                    == preferred_category.strip().lower()
                ):
                    recommended_events.append(event)

        # Fill up with other upcoming events.
        for event in valid_events:
            if event not in recommended_events:
                recommended_events.append(event)

    else:
        recommended_events = valid_events

    recommended_events = recommended_events[:6]

    recommendations = [
        {
            "id": event.id,
            "title": event.title,
            "description": event.description,
            "category": event.category,
            "location": event.location,
            "event_date": event.event_date,
            "ticket_price": event.ticket_price,
            "banner_image": event.banner_image,
            "total_tickets": event.total_tickets,
            "available_tickets": event.available_tickets,
            "event_status": event.event_status
        }
        for event in recommended_events
    ]

    return {
        "personalized": bool(preferred_category_names),
        "preferred_categories": preferred_category_names,
        "recommendations": recommendations
    }


# =========================================================
# MODULE 20 - WISHLIST APIs
# =========================================================

@app.post("/wishlist/{event_id}", tags=["Wishlist"])
def add_to_wishlist(
    event_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    get_event_or_404(db, event_id)

    # Prevent duplicate wishlist entries
    existing_item = (
        db.query(models.Wishlist)
        .filter(
            models.Wishlist.user_id == current_user.id,
            models.Wishlist.event_id == event_id,
        )
        .first()
    )

    if existing_item:
        return {
            "message": "Event is already in your wishlist",
            "event_id": event_id,
        }

    wishlist_item = models.Wishlist(
        user_id=current_user.id,
        event_id=event_id,
    )

    db.add(wishlist_item)
    db.commit()
    db.refresh(wishlist_item)

    return {
        "message": "Event added to wishlist successfully",
        "wishlist_id": wishlist_item.id,
        "event_id": wishlist_item.event_id,
    }


@app.get("/wishlist", tags=["Wishlist"])
def get_wishlist(
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wishlist_items = (
        db.query(models.Wishlist)
        .filter(models.Wishlist.user_id == current_user.id)
        .order_by(models.Wishlist.created_at.desc())
        .all()
    )

    saved_events = []

    for item in wishlist_items:
        event = (
            db.query(models.Event)
            .filter(models.Event.id == item.event_id)
            .first()
        )

        # Skip events that no longer exist
        if not event:
            continue

        saved_events.append({
            "wishlist_id": item.id,
            "event_id": event.id,
            "title": event.title,
            "description": event.description,
            "category": event.category,
            "location": event.location,
            "event_date": event.event_date,
            "ticket_price": event.ticket_price,
            "banner_image": event.banner_image,
            "event_status": event.event_status,
            "total_tickets": event.total_tickets,
            "available_tickets": event.available_tickets,
            "saved_at": item.created_at,
        })

    return {
        "total": len(saved_events),
        "items": saved_events,
    }


@app.delete("/wishlist/{event_id}", tags=["Wishlist"])
def remove_from_wishlist(
    event_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    wishlist_item = (
        db.query(models.Wishlist)
        .filter(
            models.Wishlist.user_id == current_user.id,
            models.Wishlist.event_id == event_id,
        )
        .first()
    )

    if not wishlist_item:
        raise HTTPException(
            status_code=404,
            detail="Event not found in your wishlist",
        )

    db.delete(wishlist_item)
    db.commit()

    return {
        "message": "Event removed from wishlist successfully",
        "event_id": event_id,
    }

# =========================================================
# MODULE 24: SMART EVENT CHATBOT ASSISTANT
# =========================================================

@app.post("/chatbot")
def chatbot_assistant(
    request: ChatbotRequest,
    db: Session = Depends(get_db),
    current_user=Depends(get_current_user)
):
    message = request.message.strip().lower()

    if not message:
        return {
            "reply": "Please enter a message so I can help you."
        }

    # -----------------------------------------------------
    # 1. GREETINGS
    # -----------------------------------------------------
    if any(word in message for word in [
        "hello", "hi", "hey", "good morning", "good evening"
    ]):
        return {
            "reply": (
                f"Hello, {current_user.username}! Welcome to SmartEvent. "
                "I can help you discover events, find trending events, "
                "check your bookings, and answer ticket-related questions."
            ),
            "suggestions": [
                "Show upcoming events",
                "Show trending events",
                "Show my bookings",
                "How do I book tickets?"
            ]
        }

    # -----------------------------------------------------
    # 2. HELP / CAPABILITIES
    # -----------------------------------------------------
    if any(word in message for word in [
        "help", "what can you do", "how can you help"
    ]):
        return {
            "reply": (
                "I'm your SmartEvent assistant! Here's what I can help with:\n\n"
                "1. Find upcoming events.\n"
                "2. Search events by name or location.\n"
                "3. Discover Tech, Music, Sports, and Business events.\n"
                "4. Find trending events.\n"
                "5. Check your bookings.\n"
                "6. Explain how ticket booking works.\n"
                "7. Help with payment and ticket questions.\n\n"
                "Try asking: 'Show music events in Chennai'."
            )
        }

    # -----------------------------------------------------
    # 3. MY BOOKINGS
    # -----------------------------------------------------
    if any(phrase in message for phrase in [
        "my bookings",
        "my booking",
        "my tickets",
        "booking history",
        "tickets i booked"
    ]):
        bookings = (
            db.query(models.Booking)
            .filter(models.Booking.user_id == current_user.id)
            .order_by(models.Booking.id.desc())
            .limit(10)
            .all()
        )

        if not bookings:
            return {
                "reply": (
                    "You haven't made any bookings yet. "
                    "Explore upcoming events and book your first ticket!"
                ),
                "suggestions": ["Show upcoming events"]
            }

        booking_details = []

        for booking in bookings:
            event = db.query(models.Event).filter(
                models.Event.id == booking.event_id
            ).first()

            booking_details.append({
                "booking_id": booking.id,
                "event_name": event.title if event else "Event unavailable",
                "ticket_quantity": booking.ticket_quantity,
                "total_price": booking.total_price,
                "booking_status": booking.booking_status
            })

        return {
            "reply": (
                f"I found {len(booking_details)} of your recent bookings. "
                "Here are your booking details."
            ),
            "bookings": booking_details
        }

    # -----------------------------------------------------
    # 4. HOW TO BOOK TICKETS
    # -----------------------------------------------------
    if any(phrase in message for phrase in [
        "how to book",
        "book tickets",
        "how do i book",
        "booking process"
    ]):
        return {
            "reply": (
                "Here's how to book tickets on SmartEvent:\n\n"
                "1. Open the Home page.\n"
                "2. Search for an event you like.\n"
                "3. Open the event details.\n"
                "4. Select the number of tickets.\n"
                "5. Apply a coupon if you have one.\n"
                "6. Continue to payment.\n"
                "7. After successful payment, check your booking "
                "history for your ticket details."
            )
        }

    # -----------------------------------------------------
    # 5. PAYMENT AND TICKET HELP
    # -----------------------------------------------------
    if any(word in message for word in [
        "payment failed",
        "payment issue",
        "payment problem",
        "refund",
        "ticket issue",
        "qr code",
        "qr ticket"
    ]):
        return {
            "reply": (
                "I can help with ticket and payment questions.\n\n"
                "• Payment failed: Check your booking history to see "
                "the latest booking status.\n"
                "• Ticket details: Open My Bookings to view your booking.\n"
                "• QR ticket: Open the relevant booking or ticket page "
                "to access your ticket details.\n"
                "• Refund questions: Refund eligibility depends on the "
                "app's implemented booking and payment policies.\n\n"
                "If the issue continues, contact the SmartEvent support team."
            )
        }

    # -----------------------------------------------------
    # 6. TRENDING EVENTS
    # -----------------------------------------------------
    if any(word in message for word in [
        "trending",
        "popular events",
        "most popular",
        "most booked"
    ]):
        popular_events = (
            db.query(
                models.Event,
                func.count(models.Booking.id).label("booking_count")
            )
            .outerjoin(
                models.Booking,
                models.Booking.event_id == models.Event.id
            )
            .group_by(models.Event.id)
            .order_by(func.count(models.Booking.id).desc())
            .limit(5)
            .all()
        )

        if not popular_events:
            return {
                "reply": "There are no events available right now."
            }

        event_details = []

        for event, booking_count in popular_events:
            event_details.append({
                "id": event.id,
                "title": event.title,
                "category": event.category,
                "location": event.location,
                "ticket_price": event.ticket_price,
                "event_date": (
                    event.event_date.isoformat()
                    if event.event_date else None
                ),
                "booking_count": booking_count
            })

        return {
            "reply": "Here are the events with the most bookings on SmartEvent.",
            "events": event_details
        }

    # -----------------------------------------------------
    # 7. EVENT SEARCH AND CATEGORY FILTER
    # -----------------------------------------------------
    category = None

    for category_name in ["tech", "music", "sports", "business"]:
        if category_name in message:
            category = category_name.capitalize()
            break

    location = None

    # Support simple location searches such as:
    # "events in Chennai" or "music events in Salem"
    location_match = None

    import re

    location_match = re.search(
        r"\b(?:in|near|at)\s+([a-zA-Z][a-zA-Z\s-]*?)(?:\s+under\b|\s+below\b|\s+between\b|\s+from\b|[?.!,]|$)",
        message
    )

    if location_match:
        possible_location = location_match.group(1).strip()

        ignored_locations = {
            "the weekend",
            "weekend",
            "my area",
            "me",
            "this weekend",
            "next weekend",
            "the city"
        }

        if possible_location.lower() not in ignored_locations:
            location = possible_location

    # Extract a maximum ticket price, for example "events under 500"
    price_match = re.search(
        r"\b(?:under|below|less than)\s*(?:₹|rs\.?\s*)?(\d+)",
        message
    )

    max_price = float(price_match.group(1)) if price_match else None

    # Decide whether this message is asking for events.
    event_keywords = [
        "event", "events", "find", "search", "show",
        "recommend", "suggest", "discover", "upcoming",
        "concert", "conference", "festival"
    ]

    is_event_request = (
        any(word in message for word in event_keywords)
        or category is not None
        or location is not None
        or max_price is not None
    )

    if is_event_request:
        query = db.query(models.Event)

        if category:
            query = query.filter(
                models.Event.category == category
            )

        if location:
            query = query.filter(
                models.Event.location.ilike(f"%{location}%")
            )

        if max_price is not None:
            query = query.filter(
                models.Event.ticket_price <= max_price
            )

        # Search for event names using the user's message.
        search_words = [
            word for word in re.findall(r"[a-zA-Z0-9]+", message)
            if len(word) > 2
        ]

        ignored_words = {
            "show", "find", "search", "events", "event",
            "upcoming", "recommend", "suggest", "discover",
            "please", "some", "near", "under", "below",
            "music", "tech", "sports", "business",
            "popular", "trending", "cheap", "tickets",
            "ticket", "the", "for", "and", "with",
            "price", "less", "than"
        }

        search_terms = [
            word for word in search_words
            if word not in ignored_words
        ]

        # Apply title matching when a specific event name is supplied.
        # Category and location filters remain independent.
        if search_terms and not category and not location:
            title_conditions = [
                models.Event.title.ilike(f"%{word}%")
                for word in search_terms
            ]

            query = query.filter(
                title_conditions[0]
                if len(title_conditions) == 1
                else __import__("sqlalchemy").or_(*title_conditions)
            )

        query = query.order_by(models.Event.event_date.asc())

        found_events = query.limit(10).all()

        if not found_events:
            return {
                "reply": (
                    "I couldn't find events matching those details. "
                    "Try a different category, location, event name, "
                    "or price limit."
                ),
                "suggestions": [
                    "Show upcoming events",
                    "Show music events",
                    "Show events under 500"
                ]
            }

        event_details = []

        for event in found_events:
            event_details.append({
                "id": event.id,
                "title": event.title,
                "category": event.category,
                "location": event.location,
                "ticket_price": event.ticket_price,
                "event_date": (
                    event.event_date.isoformat()
                    if event.event_date else None
                ),
                "available_tickets": event.available_tickets
            })

        return {
            "reply": f"I found {len(event_details)} matching events for you.",
            "events": event_details
        }

    # -----------------------------------------------------
    # 8. DEFAULT RESPONSE
    # -----------------------------------------------------
    return {
        "reply": (
            "I'm still learning how to answer that question. "
            "You can ask me to find events, discover trending events, "
            "check your bookings, or explain the ticket booking process."
        ),
        "suggestions": [
            "Show upcoming events",
            "Show trending events",
            "Show my bookings",
            "How do I book tickets?"
        ]
    }