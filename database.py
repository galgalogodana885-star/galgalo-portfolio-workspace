from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import sessionmaker

from config import settings
from models import Base

DATABASE_URL = settings.database_url

engine = create_engine(DATABASE_URL)

SessionLocal = sessionmaker(bind=engine, autoflush=False, autocommit=False)

Base.metadata.create_all(bind=engine)


def migrate_task_metadata():
    task_columns = {column["name"] for column in inspect(engine).get_columns("tasks")}
    user_columns = {column["name"] for column in inspect(engine).get_columns("users")}

    with engine.begin() as connection:
        if "due_date" not in task_columns:
            connection.execute(text("ALTER TABLE tasks ADD COLUMN due_date DATE"))
        if "priority" not in task_columns:
            connection.execute(
                text(
                    "ALTER TABLE tasks ADD COLUMN priority "
                    "VARCHAR(6) NOT NULL DEFAULT 'medium'"
                )
            )
        if "profile_picture_data" not in user_columns:
            connection.execute(
                text("ALTER TABLE users ADD COLUMN profile_picture_data BYTEA")
            )
        if "profile_picture_content_type" not in user_columns:
            connection.execute(
                text(
                    "ALTER TABLE users ADD COLUMN "
                    "profile_picture_content_type VARCHAR(30)"
                )
            )


migrate_task_metadata()


def get_db():
    db = SessionLocal()

    try:
        yield db
    finally:
        db.close()
