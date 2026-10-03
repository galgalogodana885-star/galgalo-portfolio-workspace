from datetime import date, datetime
from typing import Any

from sqlalchemy import JSON, DateTime, ForeignKey, LargeBinary, String, Text, func
from sqlalchemy.orm import DeclarativeBase, Mapped, mapped_column, relationship


class Base(DeclarativeBase):
    pass


class User(Base):
    __tablename__ = "users"

    id: Mapped[int] = mapped_column(primary_key=True)
    name: Mapped[str]
    email: Mapped[str] = mapped_column(unique=True)
    password_hash: Mapped[str]
    profile_picture_data: Mapped[bytes | None] = mapped_column(
        LargeBinary, nullable=True
    )
    profile_picture_content_type: Mapped[str | None] = mapped_column(
        String(30), nullable=True
    )

    tasks: Mapped[list["Task"]] = relationship(back_populates="user")


class Task(Base):
    __tablename__ = "tasks"

    id: Mapped[int] = mapped_column(primary_key=True)
    title: Mapped[str]
    completed: Mapped[bool] = mapped_column(default=False)
    due_date: Mapped[date | None] = mapped_column(nullable=True)
    priority: Mapped[str] = mapped_column(String(6), default="medium")

    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"))

    user: Mapped["User"] = relationship(back_populates="tasks")


class WorkspaceEntry(Base):
    __tablename__ = "workspace_entries"

    id: Mapped[int] = mapped_column(primary_key=True)
    user_id: Mapped[int] = mapped_column(ForeignKey("users.id"), index=True)
    section: Mapped[str] = mapped_column(String(20), index=True)
    title: Mapped[str] = mapped_column(String(200))
    content: Mapped[str | None] = mapped_column(Text, nullable=True)
    fields: Mapped[dict[str, Any]] = mapped_column(JSON, default=dict)
    image_data: Mapped[bytes | None] = mapped_column(LargeBinary, nullable=True)
    image_content_type: Mapped[str | None] = mapped_column(String(30), nullable=True)
    created_at: Mapped[datetime] = mapped_column(
        DateTime(timezone=True), server_default=func.now()
    )
