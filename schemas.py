from datetime import date, datetime
from typing import Literal

from pydantic import BaseModel, ConfigDict, EmailStr, Field, field_validator


TaskPriority = Literal["low", "medium", "high"]
WorkspaceSection = Literal[
    "work",
    "education",
    "family",
    "contacts",
    "journal",
    "activities",
    "hobbies",
    "development",
    "gallery"
]


class TaskCreate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200
    )
    completed: bool = False
    due_date: date | None = None
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError("Title cannot be blank")

        return value


class TaskUpdate(BaseModel):
    title: str = Field(
        min_length=1,
        max_length=200
    )
    completed: bool
    due_date: date | None = None
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError("Title cannot be blank")

        return value


class TaskPatch(BaseModel):
    title: str | None = Field(
        default=None,
        min_length=1,
        max_length=200
    )
    completed: bool | None = None
    due_date: date | None = None
    priority: TaskPriority = "medium"

    @field_validator("title")
    @classmethod
    def clean_title(cls, value: str | None):
        if value is None:
            return value

        value = value.strip()

        if not value:
            raise ValueError("Title cannot be blank")

        return value


class TaskResponse(BaseModel):
    id: int
    title: str
    completed: bool
    due_date: date | None
    priority: TaskPriority

    model_config = ConfigDict(
        from_attributes=True
    )


class WorkspaceEntryCreate(BaseModel):
    section: WorkspaceSection
    title: str = Field(min_length=1, max_length=200)
    content: str | None = Field(default=None, max_length=20000)
    fields: dict[str, object] = Field(default_factory=dict)

    @field_validator("title")
    @classmethod
    def clean_workspace_title(cls, value: str):
        value = value.strip()
        if not value:
            raise ValueError("Title cannot be blank")
        return value


class WorkspaceEntryResponse(BaseModel):
    id: int
    section: WorkspaceSection
    title: str
    content: str | None
    fields: dict[str, object]
    has_image: bool
    created_at: datetime


class UserCreate(BaseModel):
    name: str = Field(
        min_length=1,
        max_length=100
    )

    email: EmailStr

    password: str = Field(
        min_length=8,
        max_length=128
    )

    @field_validator("name")
    @classmethod
    def clean_name(cls, value: str):
        value = value.strip()

        if not value:
            raise ValueError("Name cannot be blank")

        return value

    @field_validator("password")
    @classmethod
    def validate_password(cls, value: str):
        if not any(char.isalpha() for char in value):
            raise ValueError(
                "Password must contain at least one letter"
            )

        if not any(char.isdigit() for char in value):
            raise ValueError(
                "Password must contain at least one number"
            )

        return value


class UserResponse(BaseModel):
    id: int
    name: str
    email: EmailStr
    has_profile_picture: bool = False
    tasks: list[TaskResponse] = Field(
        default_factory=list
    )

    model_config = ConfigDict(
        from_attributes=True
    )


class Token(BaseModel):
    access_token: str
    token_type: str
