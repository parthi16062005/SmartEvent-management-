from sqlalchemy import Column, Integer, String, Float, DateTime, ForeignKey, Boolean, Text
from sqlalchemy.orm import relationship
from datetime import datetime, timezone

from database import Base


def current_time():
    return datetime.now(timezone.utc)


# =========================
# USER MODEL
# =========================

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)

    username = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    email = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    hashed_password = Column(
        String(255),
        nullable=False
    )

    # USER / ORGANIZER / ADMIN
    role = Column(
        String(20),
        nullable=False,
        default="USER"
    )

    created_at = Column(
        DateTime,
        default=current_time
    )
        
    profile_picture = Column(
        String(500),
        nullable=True
    )
    
    bookings = relationship(
        "Booking",
        back_populates="user",
        cascade="all, delete"
    )

    notifications = relationship(
        "Notification",
        back_populates="user",
        cascade="all, delete"
    )

    organized_events = relationship(
        "Event",
        back_populates="organizer"
    )


# =========================
# EVENT MODEL
# =========================

class Event(Base):
    __tablename__ = "events"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    title = Column(
        String(150),
        nullable=False,
        index=True
    )

    description = Column(
        Text,
        nullable=False
    )

    category = Column(
        String(30),
        nullable=False,
        index=True
    )

    location = Column(
        String(200),
        nullable=False
    )

    event_date = Column(
        DateTime,
        nullable=False
    )

    ticket_price = Column(
        Float,
        nullable=False
    )

    banner_image = Column(
        String(500),
        nullable=True
    )

    created_at = Column(
        DateTime,
        default=current_time
    )

    # =========================
    # PHASE 2 - ORGANIZER
    # =========================

    organizer_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=True
    )

    # UPCOMING / ONGOING / COMPLETED / CANCELLED
    event_status = Column(
        String(20),
        nullable=False,
        default="UPCOMING"
    )

    # =========================
    # TICKET AVAILABILITY
    # =========================

    total_tickets = Column(
        Integer,
        nullable=False,
        default=100
    )

    available_tickets = Column(
        Integer,
        nullable=False,
        default=100
    )

    organizer = relationship(
        "User",
        back_populates="organized_events"
    )

    bookings = relationship(
        "Booking",
        back_populates="event"
    )

# =========================
# BOOKING MODEL
# =========================

class Booking(Base):
    __tablename__ = "bookings"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    event_id = Column(
        Integer,
        ForeignKey("events.id"),
        nullable=False
    )

    ticket_quantity = Column(
        Integer,
        nullable=False
    )

    # Original price before applying a coupon
    original_price = Column(
        Float,
        nullable=False,
        default=0
    )

    # Discount deducted from the original price
    discount_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    # Coupon applied to this booking; optional
    coupon_id = Column(
        Integer,
        ForeignKey("coupons.id"),
        nullable=True
    )

    # Final amount payable after discount
    total_price = Column(
        Float,
        nullable=False
    )

    # PENDING / CONFIRMED / CANCELLED
    booking_status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    created_at = Column(
        DateTime,
        default=current_time
    )

    user = relationship(
        "User",
        back_populates="bookings"
    )

    event = relationship(
        "Event",
        back_populates="bookings"
    )

    coupon = relationship(
        "Coupon"
    )

    ticket = relationship(
        "Ticket",
        back_populates="booking",
        uselist=False,
        cascade="all, delete"
    )

    # MODULE 12 - PAYMENT
    payment = relationship(
        "Payment",
        back_populates="booking",
        uselist=False,
        cascade="all, delete"
    )
    
    # =========================
    # MODULE 12 - PAYMENT
    # =========================

    payment = relationship(
        "Payment",
        back_populates="booking",
        uselist=False,
        cascade="all, delete"
    )


# =========================
# PAYMENT MODEL
# =========================

class Payment(Base):
    __tablename__ = "payments"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True
    )

    # SIMULATED / STRIPE
    payment_method = Column(
        String(30),
        nullable=False
    )

    # PENDING / SUCCESS / FAILED
    payment_status = Column(
        String(20),
        nullable=False,
        default="PENDING"
    )

    transaction_id = Column(
        String(150),
        unique=True,
        nullable=True,
        index=True
    )

    amount = Column(
        Float,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=current_time
    )

    booking = relationship(
        "Booking",
        back_populates="payment"
    )


# =========================
# MODULE 13 - COUPON MODEL
# =========================

class Coupon(Base):
    __tablename__ = "coupons"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    # Example: SAVE10, FLAT100
    code = Column(
        String(50),
        unique=True,
        nullable=False,
        index=True
    )

    # PERCENTAGE / FIXED
    discount_type = Column(
        String(20),
        nullable=False
    )

    # 10 = 10% OR 100 = ₹100
    discount_value = Column(
        Float,
        nullable=False
    )

    # Minimum booking amount required
    minimum_amount = Column(
        Float,
        nullable=False,
        default=0
    )

    # Maximum number of times the coupon can be used
    usage_limit = Column(
        Integer,
        nullable=True
    )

    # Number of times the coupon has already been used
    used_count = Column(
        Integer,
        nullable=False,
        default=0
    )

    # Coupon expiration
    expires_at = Column(
        DateTime,
        nullable=True
    )

    # ADMIN can deactivate a coupon
    is_active = Column(
        Boolean,
        nullable=False,
        default=True
    )

    created_at = Column(
        DateTime,
        default=current_time
    )


# =========================
# TICKET MODEL
# =========================

class Ticket(Base):
    __tablename__ = "tickets"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    booking_id = Column(
        Integer,
        ForeignKey("bookings.id"),
        nullable=False,
        unique=True
    )

    ticket_code = Column(
        String(100),
        unique=True,
        nullable=False,
        index=True
    )

    qr_code_url = Column(
        String(500),
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=current_time
    )

        # MODULE 14 - ATTENDANCE TRACKING
    verified_at = Column(
        DateTime,
        nullable=True,
        default=None
    )

    booking = relationship(
        "Booking",
        back_populates="ticket"
    )


# =========================
# NOTIFICATION MODEL
# =========================

class Notification(Base):
    __tablename__ = "notifications"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    title = Column(
        String(150),
        nullable=False
    )

    message = Column(
        Text,
        nullable=False
    )

    # EVENT / BOOKING / PAYMENT / SYSTEM
    type = Column(
        String(20),
        nullable=False
    )

    is_read = Column(
        Boolean,
        default=False,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=current_time
    )

    user = relationship(
        "User",
        back_populates="notifications"
    )

# =========================
# MODULE 14 - EVENT REVIEWS
# =========================

class Review(Base):
    __tablename__ = "reviews"

    id = Column(
        Integer,
        primary_key=True,
        index=True
    )

    user_id = Column(
        Integer,
        ForeignKey("users.id"),
        nullable=False
    )

    event_id = Column(
        Integer,
        ForeignKey("events.id"),
        nullable=False
    )

    # Rating must be between 1 and 5.
    # API validation will enforce this range.
    rating = Column(
        Integer,
        nullable=False
    )

    review_text = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime,
        default=current_time,
        nullable=False
    )

    # Relationships
    user = relationship("User")

    event = relationship("Event")

    # One review per user per event
    __table_args__ = (
        __import__("sqlalchemy").UniqueConstraint(
            "user_id",
            "event_id",
            name="uq_review_user_event"
        ),
    )    


# =========================================================
# MODULE 20 - WISHLIST MODEL
# =========================================================

class Wishlist(Base):
    __tablename__ = "wishlists"

    id = Column(Integer, primary_key=True, index=True)

    user_id = Column(
        Integer,
        ForeignKey("users.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    created_at = Column(
        DateTime(timezone=True),
        default=lambda: datetime.now(timezone.utc),
        nullable=False
    )

# =========================================================
# MODULE 21: EVENT UPDATES & ANNOUNCEMENTS
# =========================================================

class EventUpdate(Base):
    __tablename__ = "event_updates"

    id = Column(Integer, primary_key=True, index=True)

    event_id = Column(
        Integer,
        ForeignKey("events.id", ondelete="CASCADE"),
        nullable=False,
        index=True
    )

    message = Column(
        Text,
        nullable=False
    )

    created_at = Column(
        DateTime(timezone=True),
        default=current_time,
        nullable=False
    )