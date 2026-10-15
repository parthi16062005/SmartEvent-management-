from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base

DATABASE_URL = "sqlite:///./smartevent.db"

engine = create_engine(
    DATABASE_URL,
    connect_args={"check_same_thread": False}
)

SessionLocal = sessionmaker(
    autocommit=False,
    autoflush=False,
    bind=engine
)

Base = declarative_base()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()


# =========================================================
# DATABASE MIGRATION
# PHASE 2 + MODULE 12 + MODULE 13 + MODULE 22
# =========================================================

def migrate_database():
    import models

    with engine.begin() as connection:

        # -------------------------------------------------
        # USERS TABLE
        # -------------------------------------------------

        user_columns = connection.execute(
            text("PRAGMA table_info(users)")
        ).fetchall()

        user_column_names = [
            column[1] for column in user_columns
        ]

        if user_columns and "role" not in user_column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN role VARCHAR(20) "
                    "NOT NULL DEFAULT 'USER'"
                )
            )
            print("Added role column to users table.")

        if user_columns and "profile_picture" not in user_column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN profile_picture VARCHAR(500)"
                )
            )
            print("Added profile_picture column to users table.")

        # -------------------------------------------------
        # EVENTS TABLE
        # -------------------------------------------------

        event_columns = connection.execute(
            text("PRAGMA table_info(events)")
        ).fetchall()

        event_column_names = [
            column[1] for column in event_columns
        ]

        if event_columns and "organizer_id" not in event_column_names:
            connection.execute(
                text(
                    "ALTER TABLE events "
                    "ADD COLUMN organizer_id INTEGER"
                )
            )
            print("Added organizer_id column to events table.")

        if event_columns and "event_status" not in event_column_names:
            connection.execute(
                text(
                    "ALTER TABLE events "
                    "ADD COLUMN event_status VARCHAR(20) "
                    "NOT NULL DEFAULT 'UPCOMING'"
                )
            )
            print("Added event_status column to events table.")

        # -------------------------------------------------
        # BOOKINGS TABLE
        # -------------------------------------------------

        booking_columns = connection.execute(
            text("PRAGMA table_info(bookings)")
        ).fetchall()

        booking_column_names = [
            column[1] for column in booking_columns
        ]

        if booking_columns and "original_price" not in booking_column_names:
            connection.execute(
                text(
                    "ALTER TABLE bookings "
                    "ADD COLUMN original_price FLOAT "
                    "NOT NULL DEFAULT 0"
                )
            )

            connection.execute(
                text(
                    "UPDATE bookings "
                    "SET original_price = total_price"
                )
            )

            print("Added original_price column to bookings table.")

        if booking_columns and "discount_amount" not in booking_column_names:
            connection.execute(
                text(
                    "ALTER TABLE bookings "
                    "ADD COLUMN discount_amount FLOAT "
                    "NOT NULL DEFAULT 0"
                )
            )
            print("Added discount_amount column to bookings table.")

        if booking_columns and "coupon_id" not in booking_column_names:
            connection.execute(
                text(
                    "ALTER TABLE bookings "
                    "ADD COLUMN coupon_id INTEGER"
                )
            )
            print("Added coupon_id column to bookings table.")

        # -------------------------------------------------
        # MODULE 14 - TICKET ATTENDANCE TRACKING
        # -------------------------------------------------

        ticket_columns = [
            column["name"]
            for column in connection.execute(
                text("PRAGMA table_info(tickets)")
            ).mappings().all()
        ]

        if ticket_columns and "verified_at" not in ticket_columns:
            connection.execute(
                text(
                    "ALTER TABLE tickets "
                    "ADD COLUMN verified_at DATETIME"
                )
            )
            print("Added verified_at column to tickets table.")

    # -----------------------------------------------------
    # CREATE MISSING TABLES
    # -----------------------------------------------------

    Base.metadata.create_all(bind=engine)

    print("Database migration completed successfully.")
    print("Existing data preserved.")
    print("Booking coupon columns checked.")
    print("Profile picture column checked.")
    print("Missing tables created if necessary.")