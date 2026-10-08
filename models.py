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

    ticket = relationship(
        "Ticket",
        back_populates="booking",
        uselist=False,
        cascade="all, delete"
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

    # EVENT / BOOKING / SYSTEM
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