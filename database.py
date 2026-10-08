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


# =========================
# PHASE 2 DATABASE MIGRATION
# =========================

def migrate_database():
    with engine.connect() as connection:

        # -------------------------
        # USERS TABLE
        # -------------------------

        user_columns = connection.execute(
            text("PRAGMA table_info(users)")
        ).fetchall()

        user_column_names = [
            column[1]
            for column in user_columns
        ]

        if "role" not in user_column_names:
            connection.execute(
                text(
                    "ALTER TABLE users "
                    "ADD COLUMN role VARCHAR(20) "
                    "NOT NULL DEFAULT 'USER'"
                )
            )

        # -------------------------
        # EVENTS TABLE
        # -------------------------

        event_columns = connection.execute(
            text("PRAGMA table_info(events)")
        ).fetchall()

        event_column_names = [
            column[1]
            for column in event_columns
        ]

        if "organizer_id" not in event_column_names:
            connection.execute(
                text(
                    "ALTER TABLE events "
                    "ADD COLUMN organizer_id INTEGER"
                )
            )

        if "event_status" not in event_column_names:
            connection.execute(
                text(
                    "ALTER TABLE events "
                    "ADD COLUMN event_status VARCHAR(20) "
                    "NOT NULL DEFAULT 'UPCOMING'"
                )
            )

        connection.commit()