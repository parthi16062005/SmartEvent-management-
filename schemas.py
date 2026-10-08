from pydantic import BaseModel, EmailStr, Field, ConfigDict
from datetime import datetime
from typing import Optional


# =========================
# USER SCHEMAS
# =========================

class UserRegister(BaseModel):
    username: str = Field(
        min_length=3,
        max_length=50
    )

    email: EmailStr

    password: str = Field(
        min_length=6,
        max_length=100
    )


class UserLogin(BaseModel):
    email: EmailStr
    password: str


class UserResponse(BaseModel):
    id: int
    username: str
    email: EmailStr
    role: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class TokenResponse(BaseModel):
    access_token: str
    token_type: str


# =========================
# EVENT SCHEMAS
# =========================

class EventCreate(BaseModel):
    title: str = Field(
        min_length=3,
        max_length=150
    )

    description: str = Field(
        min_length=5
    )

    category: str = Field(
        min_length=2,
        max_length=30
    )

    location: str = Field(
        min_length=2,
        max_length=200
    )

    event_date: datetime

    ticket_price: float = Field(
        gt=0
    )

    banner_image: Optional[str] = None

    total_tickets: int = Field(
        default=100,
        gt=0
    )


class EventUpdate(BaseModel):

    title: Optional[str] = Field(
        default=None,
        min_length=3,
        max_length=150
    )

    description: Optional[str] = Field(
        default=None,
        min_length=5
    )

    category: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=30
    )

    location: Optional[str] = Field(
        default=None,
        min_length=2,
        max_length=200
    )

    event_date: Optional[datetime] = None

    ticket_price: Optional[float] = Field(
        default=None,
        gt=0
    )

    banner_image: Optional[str] = None

    total_tickets: Optional[int] = Field(
        default=None,
        gt=0
    )


class EventResponse(BaseModel):
    id: int
    title: str
    description: str
    category: str
    location: str
    event_date: datetime
    ticket_price: float
    banner_image: Optional[str]

    total_tickets: int
    available_tickets: int

    organizer_id: Optional[int]
    event_status: str

    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================
# BOOKING SCHEMAS
# =========================

class BookingCreate(BaseModel):
    event_id: int

    ticket_quantity: int = Field(
        gt=0,
        le=10
    )


class BookingResponse(BaseModel):
    id: int
    user_id: int
    event_id: int
    ticket_quantity: int
    total_price: float
    booking_status: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


class BookingHistoryResponse(BaseModel):
    id: int
    event_id: int
    event_title: str
    ticket_quantity: int
    total_price: float
    booking_status: str
    created_at: datetime


# =========================
# ORGANIZER BOOKING SCHEMAS
# =========================

class OrganizerBookingResponse(BaseModel):
    booking_id: int
    user_id: int
    username: str
    email: EmailStr
    event_id: int
    event_title: str
    ticket_quantity: int
    total_price: float
    booking_status: str
    created_at: datetime


# =========================
# TICKET SCHEMAS
# =========================

class TicketResponse(BaseModel):
    id: int
    booking_id: int
    ticket_code: str
    qr_code_url: str
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================
# NOTIFICATION SCHEMAS
# =========================

class NotificationResponse(BaseModel):
    id: int
    title: str
    message: str
    type: str
    is_read: bool
    created_at: datetime

    model_config = ConfigDict(
        from_attributes=True
    )


# =========================================================
# ORGANIZER ANALYTICS
# =========================================================

class EventAnalyticsResponse(BaseModel):
    event_id: int
    event_title: str
    total_tickets: int
    tickets_sold: int
    remaining_tickets: int
    booking_count: int
    total_revenue: float
    event_status: Optional[str] = None


# =========================================================
# ADMIN ANALYTICS
# =========================================================

class DailyTicketSalesResponse(BaseModel):
    date: str
    tickets_sold: int
    revenue: float


class MonthlyBookingTrendResponse(BaseModel):
    month: str
    bookings: int
    tickets_sold: int


class PopularEventResponse(BaseModel):
    event_id: int
    event_title: str
    tickets_sold: int
    bookings: int


class TopRevenueEventResponse(BaseModel):
    event_id: int
    event_title: str
    revenue: float


class AdminAnalyticsResponse(BaseModel):
    total_users: int
    total_organizers: int
    total_events: int
    total_bookings: int
    total_tickets_sold: int
    total_revenue: float

    daily_ticket_sales: list[
        DailyTicketSalesResponse
    ]

    monthly_booking_trends: list[
        MonthlyBookingTrendResponse
    ]

    popular_events: list[
        PopularEventResponse
    ]

    top_revenue_events: list[
        TopRevenueEventResponse
    ]