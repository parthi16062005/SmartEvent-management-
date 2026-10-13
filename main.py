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
    ReviewResponse,
    EventRatingResponse,
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
        "version": "3.0.0", 
        "status": "RBAC and simulated payments enabled" 
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
# MODULE 16: SEARCH, FILTERING AND SORTING
# MODULE 17: EVENT PAGINATION
# =========================================================

@app.get(
    "/events",
    tags=["Events"]
)
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

    # START DATABASE QUERY
    query = db.query(models.Event)

    # SEARCH BY EVENT TITLE
    if search and search.strip():
        query = query.filter(
            models.Event.title.ilike(
                f"%{search.strip()}%"
            )
        )

    # FILTER BY CATEGORY
    if category and category.strip():
        query = query.filter(
            models.Event.category.ilike(
                category.strip()
            )
        )

    # FILTER BY LOCATION
    if location and location.strip():
        query = query.filter(
            models.Event.location.ilike(
                f"%{location.strip()}%"
            )
        )

    # FILTER BY START DATE
    if start_date:
        query = query.filter(
            models.Event.event_date >= start_date
        )

    # FILTER BY END DATE
    if end_date:
        query = query.filter(
            models.Event.event_date <= end_date
        )

    # FILTER BY MINIMUM PRICE
    if min_price is not None:
        if min_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Minimum price cannot be negative"
            )

        query = query.filter(
            models.Event.ticket_price >= min_price
        )

    # FILTER BY MAXIMUM PRICE
    if max_price is not None:
        if max_price < 0:
            raise HTTPException(
                status_code=400,
                detail="Maximum price cannot be negative"
            )

        query = query.filter(
            models.Event.ticket_price <= max_price
        )

    # VALIDATE PRICE RANGE
    if (
        min_price is not None
        and max_price is not None
        and min_price > max_price
    ):
        raise HTTPException(
            status_code=400,
            detail="Minimum price cannot exceed maximum price"
        )

    # VALIDATE DATE RANGE
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

    else:
        raise HTTPException(
            status_code=400,
            detail=(
                "Invalid sort_by value. Use date_asc, "
                "date_desc, price_asc, or price_desc."
            )
        )

    # COUNT ALL MATCHING EVENTS BEFORE PAGINATION
    total_events = query.count()

    # CALCULATE PAGINATION
    total_pages = (
        (total_events + page_size - 1) // page_size
    )

    # FETCH ONLY THE REQUESTED PAGE
    offset = (page - 1) * page_size

    events = (
        query
        .offset(offset)
        .limit(page_size)
        .all()
    )

    # UPDATE EVENT STATUS FOR RETURNED EVENTS
    for event in events:
        update_event_status(event)

    db.commit()

    # RETURN EVENTS WITH PAGINATION METADATA
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
# MODULE 12 - PAYMENT AND TICKET HELPERS 
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
        require_roles("USER", "ORGANIZER", "ADMIN")
    )
):
    # Find event
    event = (
        db.query(models.Event)
        .filter(models.Event.id == booking.event_id)
        .first()
    )

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    # Update event status
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

    # Check ticket availability
    if booking.ticket_quantity > event.available_tickets:
        raise HTTPException(
            status_code=400,
            detail=f"Only {event.available_tickets} tickets are available"
        )

    # Calculate original price
    original_price = round(
        float(event.ticket_price) * booking.ticket_quantity,
        2
    )

    discount_amount = 0.0
    coupon_id = None

    # Apply coupon when provided
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

        # Discount cannot exceed the original price
        discount_amount = round(
            min(discount_amount, original_price),
            2
        )

        coupon_id = coupon.id

    # Calculate final amount
    total_price = round(
        original_price - discount_amount,
        2
    )

    # Create pending booking
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

    # Reserve tickets while payment is pending
    event.available_tickets -= booking.ticket_quantity

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
                "Complete payment to confirm your booking "
                "and receive your QR ticket."
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

    except Exception:
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
 
    # Make creation idempotent: don't create duplicate payment records. 
    if existing_payment: 
        return existing_payment 
 
    if booking.booking_status != "PENDING": 
        raise HTTPException( 
            status_code=400, 
            detail="Only pending bookings can start a payment" 
        ) 
 
    event = db.query(models.Event).filter(models.Event.id == booking.event_id).first() 
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
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

    booking = payment.booking

    if booking is None or booking.user_id != current_user.id:
        raise HTTPException(
            status_code=404,
            detail="Payment not found"
        )

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

    # Do not process a payment that has already failed.
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
        payment.transaction_id = (
            "SIM-FAIL-" + uuid.uuid4().hex.upper()
        )
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
    payment.transaction_id = (
        "SIM-" + uuid.uuid4().hex.upper()
    )
    booking.booking_status = "CONFIRMED"

    # Generate one ticket for this booking.
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
        message=(
            "Payment successful. Booking confirmed and QR ticket generated."
        ),
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
            models.Booking.user_id == current_user.id
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
                original_price=booking.original_price,
                discount_amount=booking.discount_amount,
                coupon_id=booking.coupon_id,
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
    db: Session = Depends(get_db),
    current_user: models.User = Depends(
        require_roles("ORGANIZER", "ADMIN")
    )
):
    # Find the ticket.
    ticket = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.ticket_code == ticket_code
        )
        .first()
    )

    # Check whether the ticket exists.
    if ticket is None:
        raise HTTPException(
            status_code=404,
            detail="Invalid ticket"
        )

    booking = ticket.booking

    # Check booking status.
    if booking.booking_status != "CONFIRMED":
        return {
            "valid": False,
            "ticket_code": ticket.ticket_code,
            "booking_id": booking.id,
            "event_id": booking.event_id,
            "booking_status": booking.booking_status,
            "message": "Ticket is not valid"
        }

    # Organizers can verify tickets for their own events.
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
                detail=(
                    "You can verify tickets only "
                    "for your own events"
                )
            )

    # Record attendance during the first verification.
    if ticket.verified_at is None:
        ticket.verified_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(ticket)

        message = (
            "Ticket verified successfully. "
            "Attendance recorded."
        )
    else:
        message = (
            "Ticket is valid, but attendance "
            "was already recorded."
        )

    # Return the verification result.
    return {
        "valid": True,
        "ticket_code": ticket.ticket_code,
        "booking_id": booking.id,
        "event_id": booking.event_id,
        "booking_status": booking.booking_status,
        "verified_at": ticket.verified_at,
        "message": message
    }

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
    # SQLite event dates are stored without timezone information.
    # Use local server time as a naive datetime for comparison.
    now = datetime.now()
    reminder_limit = now + timedelta(hours=24)

    # Find events scheduled within the next 24 hours.
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

        # Only users with confirmed bookings should receive reminders.
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

        # Avoid creating another reminder for the same event.
        reminder_message = (
            f"Your event {event.title} "
            "is scheduled within the next 24 hours."
        )

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

        reminder = models.Notification(
            user_id=current_user.id,
            title="Event Reminder",
            message=reminder_message,
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
# MODULE 13 - COUPON MANAGEMENT 
# ========================================================= 
 
 
# ========================================================= 
# CREATE COUPON 
# ADMIN ONLY 
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
    current_user: models.User = Depends( 
        require_roles("ADMIN") 
    ) 
): 
 
    # ----------------------------------------------------- 
    # NORMALIZE COUPON CODE 
    # ----------------------------------------------------- 
 
    coupon_code = coupon_data.code.strip().upper() 
 
    if not coupon_code: 
        raise HTTPException( 
            status_code=400, 
            detail="Coupon code cannot be empty" 
        ) 
 
    # ----------------------------------------------------- 
    # CHECK DISCOUNT TYPE 
    # ----------------------------------------------------- 
 
    if coupon_data.discount_type == "PERCENTAGE": 
 
        if coupon_data.discount_value > 100: 
            raise HTTPException( 
                status_code=400, 
                detail="Percentage discount cannot exceed 100%" 
            ) 
 
    # ----------------------------------------------------- 
    # CHECK EXPIRY DATE 
    # ----------------------------------------------------- 
 
    if coupon_data.expires_at is not None: 
 
        expiry = coupon_data.expires_at 
 
        if expiry.tzinfo is not None: 
            expiry = expiry.replace(tzinfo=None) 
 
        if expiry <= datetime.now(): 
            raise HTTPException( 
                status_code=400, 
                detail="Coupon expiry date must be in the future" 
            ) 
 
    # ----------------------------------------------------- 
    # CHECK EXISTING COUPON 
    # ----------------------------------------------------- 
 
    existing_coupon = ( 
        db.query(models.Coupon) 
        .filter( 
            models.Coupon.code == coupon_code 
        ) 
        .first() 
    ) 
 
    if existing_coupon: 
 
        raise HTTPException( 
            status_code=400, 
            detail="Coupon code already exists" 
        ) 
 
    # ----------------------------------------------------- 
    # CREATE COUPON 
    # ----------------------------------------------------- 
 
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
 
 
# ========================================================= 
# GET ALL COUPONS 
# ADMIN ONLY 
# ========================================================= 
 
@app.get( 
    "/admin/coupons", 
    response_model=list[CouponResponse], 
    tags=["Admin Coupons"] 
) 
def get_all_coupons( 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends( 
        require_roles("ADMIN") 
    ) 
): 
 
    coupons = ( 
        db.query(models.Coupon) 
        .order_by( 
            models.Coupon.created_at.desc() 
        ) 
        .all() 
    ) 
 
    return coupons 
 
 
# ========================================================= 
# DELETE / DEACTIVATE COUPON 
# ADMIN ONLY 
# ========================================================= 
 
@app.delete( 
    "/admin/coupons/{coupon_id}", 
    response_model=CouponResponse, 
    tags=["Admin Coupons"] 
) 
def deactivate_coupon( 
    coupon_id: int, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends( 
        require_roles("ADMIN") 
    ) 
): 
 
    coupon = ( 
        db.query(models.Coupon) 
        .filter( 
            models.Coupon.id == coupon_id 
        ) 
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
 
 
# ========================================================= 
# APPLY COUPON 
# LOGGED-IN USERS 
# ========================================================= 
 
@app.post( 
    "/coupons/apply", 
    response_model=CouponApplyResponse, 
    tags=["Coupons"] 
) 
def apply_coupon( 
    coupon_data: CouponApplyRequest, 
    db: Session = Depends(get_db), 
    current_user: models.User = Depends( 
        require_roles( 
            "USER", 
            "ORGANIZER", 
            "ADMIN" 
        ) 
    ) 
): 
 
    # ----------------------------------------------------- 
    # NORMALIZE CODE 
    # ----------------------------------------------------- 
 
    coupon_code = ( 
        coupon_data.code 
        .strip() 
        .upper() 
    ) 
 
    # ----------------------------------------------------- 
    # FIND COUPON 
    # ----------------------------------------------------- 
 
    coupon = ( 
        db.query(models.Coupon) 
        .filter( 
            models.Coupon.code 
            == coupon_code 
        ) 
        .first() 
    ) 
 
    if coupon is None: 
 
        raise HTTPException( 
            status_code=404, 
            detail="Invalid coupon code" 
        ) 
 
    # ----------------------------------------------------- 
    # CHECK ACTIVE STATUS 
    # ----------------------------------------------------- 
 
    if not coupon.is_active: 
 
        raise HTTPException( 
            status_code=400, 
            detail="This coupon is inactive" 
        ) 
 
    # ----------------------------------------------------- 
    # CHECK EXPIRY 
    # ----------------------------------------------------- 
 
    if coupon.expires_at is not None: 
 
        expiry = coupon.expires_at 
 
        if expiry.tzinfo is not None: 
            expiry = expiry.replace(tzinfo=None) 
 
        if datetime.now() >= expiry: 
 
            raise HTTPException( 
                status_code=400, 
                detail="This coupon has expired" 
            ) 
 
    # ----------------------------------------------------- 
    # CHECK USAGE LIMIT 
    # ----------------------------------------------------- 
 
    if ( 
        coupon.usage_limit is not None 
        and coupon.used_count >= coupon.usage_limit 
    ): 
 
        raise HTTPException( 
            status_code=400, 
            detail="This coupon has reached its usage limit" 
        ) 
 
    # ----------------------------------------------------- 
    # CHECK MINIMUM AMOUNT 
    # ----------------------------------------------------- 
 
    original_amount = float( 
        coupon_data.booking_amount 
    ) 
 
    if original_amount < coupon.minimum_amount: 
 
        raise HTTPException( 
            status_code=400, 
            detail=( 
                f"Minimum booking amount for this coupon " 
                f"is ₹{coupon.minimum_amount:.2f}" 
            ) 
        ) 
 
    # ----------------------------------------------------- 
    # CALCULATE DISCOUNT 
    # ----------------------------------------------------- 
 
    if coupon.discount_type == "PERCENTAGE": 
 
        discount_amount = ( 
            original_amount 
            * coupon.discount_value 
            / 100 
        ) 
 
    else: 
 
        discount_amount = ( 
            coupon.discount_value 
        ) 
 
    # ----------------------------------------------------- 
    # NEVER ALLOW DISCOUNT ABOVE TOTAL 
    # ----------------------------------------------------- 
 
    discount_amount = min( 
        discount_amount, 
        original_amount 
    ) 
 
    final_amount = ( 
        original_amount 
        - discount_amount 
    ) 
 
    # ----------------------------------------------------- 
    # ROUND MONEY VALUES 
    # ----------------------------------------------------- 
 
    discount_amount = round( 
        discount_amount, 
        2 
    ) 
 
    final_amount = round( 
        final_amount, 
        2 
    ) 
 
    # ----------------------------------------------------- 
    # RESPONSE 
    # ----------------------------------------------------- 
 
    return CouponApplyResponse( 
        message="Coupon applied successfully", 
        coupon_code=coupon.code, 
        discount_amount=discount_amount, 
        original_amount=round( 
            original_amount, 
            2 
        ), 
        final_amount=final_amount 
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
# =========================================================
# MODULE 14 - SUBMIT EVENT REVIEW
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
    # Check whether the event exists.
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
            detail=(
                "No confirmed booking found for this user "
                "and event."
            )
        )

    # Find the ticket associated with this booking.
    ticket = (
        db.query(models.Ticket)
        .filter(
            models.Ticket.booking_id == booking.id
        )
        .first()
    )

    # Return diagnostic information if attendance is missing.
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

    # Validate the event ID in the request.
    if review_data.event_id != event_id:
        raise HTTPException(
            status_code=400,
            detail=(
                "Event ID in the request does not "
                "match the URL."
            )
        )

    # Validate the review text.
    review_text = review_data.review_text.strip()

    if not review_text:
        raise HTTPException(
            status_code=422,
            detail="Review text cannot be empty"
        )

    # Create the review.
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
# =========================================================
# MODULE 14 - GET EVENT REVIEWS
# =========================================================

@app.get("/events/{event_id}/reviews", tags=["Reviews"])
def get_event_reviews(
    event_id: int,
    db: Session = Depends(get_db)
):
    # Check whether the event exists.
    event = db.query(models.Event).filter(
        models.Event.id == event_id
    ).first()

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    # Retrieve reviews, newest first.
    reviews = (
        db.query(models.Review, models.User.username)
        .join(
            models.User,
            models.Review.user_id == models.User.id
        )
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

# =========================================================
# MODULE 14 - GET EVENT AVERAGE RATING
# =========================================================

@app.get("/events/{event_id}/rating", response_model=EventRatingResponse, tags=["Reviews"])
def get_event_rating(
    event_id: int,
    db: Session = Depends(get_db)
):
    # Check whether the event exists.
    event = db.query(models.Event).filter(
        models.Event.id == event_id
    ).first()

    if event is None:
        raise HTTPException(
            status_code=404,
            detail="Event not found"
        )

    # Calculate the average rating and review count.
    from sqlalchemy import func

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

# =========================================================
# MODULE 14 - UPDATE EVENT REVIEW
# =========================================================

@app.put("/reviews/{review_id}", tags=["Reviews"])
def update_event_review(
    review_id: int,
    review_data: ReviewUpdate,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the review.
    review = db.query(models.Review).filter(
        models.Review.id == review_id
    ).first()

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    # Users can edit only their own reviews.
    if review.user_id != current_user.id:
        raise HTTPException(
            status_code=403,
            detail="You can only edit your own reviews"
        )

    # Get only the fields provided by the user.
    update_data = review_data.model_dump(exclude_unset=True)

    if not update_data:
        raise HTTPException(
            status_code=400,
            detail="Provide a rating or review text to update"
        )

    # Validate review text if supplied.
    if "review_text" in update_data:
        update_data["review_text"] = update_data["review_text"].strip()

        if not update_data["review_text"]:
            raise HTTPException(
                status_code=422,
                detail="Review text cannot be empty"
            )

    # Apply the changes.
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

# =========================================================
# MODULE 14 - DELETE EVENT REVIEW
# =========================================================

@app.delete("/reviews/{review_id}", tags=["Reviews"])
def delete_event_review(
    review_id: int,
    current_user: models.User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Find the review.
    review = db.query(models.Review).filter(
        models.Review.id == review_id
    ).first()

    if review is None:
        raise HTTPException(
            status_code=404,
            detail="Review not found"
        )

    # Users can delete only their own reviews.
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