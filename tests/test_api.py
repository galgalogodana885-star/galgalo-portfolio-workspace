import uuid

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker

from config import settings
from database import get_db
from main import app
from models import Base, Task, User, WorkspaceEntry

# Test database
TEST_DATABASE_URL = settings.database_url.replace("/taskdb", "/taskdb_test")

test_engine = create_engine(TEST_DATABASE_URL)

TestingSessionLocal = sessionmaker(bind=test_engine, autoflush=False, autocommit=False)


# Create tables in the test database
Base.metadata.create_all(bind=test_engine)


# Make FastAPI use the test database
def override_get_db():
    db = TestingSessionLocal()

    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[get_db] = override_get_db

client = TestClient(app)


# Start every test run with a clean test database
@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    Base.metadata.drop_all(bind=test_engine)
    Base.metadata.create_all(bind=test_engine)

    yield


# Create a temporary user for tests
@pytest.fixture
def user():
    email = f"test_{uuid.uuid4().hex}@example.com"

    response = client.post(
        "/users", json={"name": "Test User", "email": email, "password": "password123"}
    )

    assert response.status_code == 201

    user_data = response.json()

    yield user_data

    db = TestingSessionLocal()

    db.query(Task).filter(Task.user_id == user_data["id"]).delete()
    db.query(WorkspaceEntry).filter(WorkspaceEntry.user_id == user_data["id"]).delete()

    db.query(User).filter(User.id == user_data["id"]).delete()

    db.commit()
    db.close()


# Get an access token
def get_token(email, password="password123"):
    response = client.post("/login", data={"username": email, "password": password})

    assert response.status_code == 200

    return response.json()["access_token"]


# --------------------------------------------------
# USER TESTS
# --------------------------------------------------


def test_public_home_serves_portfolio():
    response = client.get("/")

    assert response.status_code == 200
    assert "Galgalo Godana Dureti | Full-stack Web Developer" in response.text
    assert "FastAPI" in response.text
    assert "React" in response.text
    assert "MongoDB" in response.text
    assert 'id="contactForm"' in response.text


def test_workspace_route_keeps_private_app_shell():
    response = client.get("/workspace/overview")

    assert response.status_code == 200
    assert 'id="appView"' in response.text
    assert 'id="loginForm"' in response.text


@pytest.mark.parametrize(
    "page",
    [
        "overview",
        "tasks",
        "work",
        "education",
        "family",
        "contacts",
        "journal",
        "activities",
        "hobbies",
        "development",
        "gallery",
    ],
)
def test_workspace_pages_load_directly(page):
    response = client.get(f"/workspace/{page}")

    assert response.status_code == 200
    assert 'id="appView"' in response.text


def test_unknown_workspace_page_returns_404():
    response = client.get("/workspace/not-a-section")

    assert response.status_code == 404


def test_create_user():
    email = f"user_{uuid.uuid4().hex}@example.com"

    response = client.post(
        "/users", json={"name": "John Doe", "email": email, "password": "password123"}
    )

    assert response.status_code == 201

    data = response.json()

    assert data["name"] == "John Doe"
    assert data["email"] == email
    assert "id" in data
    assert "password" not in data
    assert "password_hash" not in data


def test_duplicate_email():
    email = f"duplicate_{uuid.uuid4().hex}@example.com"

    first_response = client.post(
        "/users", json={"name": "First User", "email": email, "password": "password123"}
    )

    assert first_response.status_code == 201

    second_response = client.post(
        "/users",
        json={"name": "Second User", "email": email, "password": "password123"},
    )

    assert second_response.status_code == 409


def test_invalid_email():
    response = client.post(
        "/users",
        json={"name": "Test User", "email": "not-an-email", "password": "password123"},
    )

    assert response.status_code == 422


def test_short_password():
    response = client.post(
        "/users",
        json={
            "name": "Test User",
            "email": f"short_{uuid.uuid4().hex}@example.com",
            "password": "abc123",
        },
    )

    assert response.status_code == 422


def test_password_without_number():
    response = client.post(
        "/users",
        json={
            "name": "Test User",
            "email": f"nonumber_{uuid.uuid4().hex}@example.com",
            "password": "passwordonly",
        },
    )

    assert response.status_code == 422


# --------------------------------------------------
# LOGIN TESTS
# --------------------------------------------------


def test_login(user):
    token = get_token(user["email"])

    assert token is not None
    assert len(token) > 0


def test_wrong_password(user):
    response = client.post(
        "/login", data={"username": user["email"], "password": "wrongpassword123"}
    )

    assert response.status_code == 401


def test_wrong_email():
    response = client.post(
        "/login",
        data={"username": "doesnotexist@example.com", "password": "password123"},
    )

    assert response.status_code == 401


# --------------------------------------------------
# AUTHENTICATION TESTS
# --------------------------------------------------


def test_get_current_user(user):
    token = get_token(user["email"])

    response = client.get("/users/me", headers={"Authorization": f"Bearer {token}"})

    assert response.status_code == 200

    data = response.json()

    assert data["id"] == user["id"]
    assert data["email"] == user["email"]
    assert data["name"] == user["name"]
    assert data["has_profile_picture"] is False


def test_profile_picture_upload_and_delete(user):
    token = get_token(user["email"])
    headers = {"Authorization": f"Bearer {token}"}
    image_bytes = b"\x89PNG\r\n\x1a\n" + b"profile-test-image"

    upload_response = client.put(
        "/users/me/profile-picture",
        headers=headers,
        files={"image": ("profile.png", image_bytes, "image/png")},
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["has_profile_picture"] is True

    current_user = client.get("/users/me", headers=headers).json()
    assert current_user["has_profile_picture"] is True
    picture_response = client.get("/users/me/profile-picture", headers=headers)
    assert picture_response.status_code == 200
    assert picture_response.content == image_bytes

    delete_response = client.delete("/users/me/profile-picture", headers=headers)
    assert delete_response.status_code == 200
    assert delete_response.json()["has_profile_picture"] is False
    assert client.get("/users/me/profile-picture", headers=headers).status_code == 404


def test_profile_picture_rejects_non_image(user):
    token = get_token(user["email"])
    response = client.put(
        "/users/me/profile-picture",
        headers={"Authorization": f"Bearer {token}"},
        files={"image": ("profile.svg", b"<svg></svg>", "image/svg+xml")},
    )

    assert response.status_code == 415


def test_no_token():
    response = client.get("/users/me")

    assert response.status_code == 401


def test_invalid_token():
    response = client.get(
        "/users/me", headers={"Authorization": "Bearer invalid-token"}
    )

    assert response.status_code == 401


def test_workspace_entry_crud(user):
    token = get_token(user["email"])
    headers = {"Authorization": f"Bearer {token}"}
    create_response = client.post(
        "/users/me/workspace/entries",
        headers=headers,
        json={
            "section": "education",
            "title": "Northside College",
            "content": "Completed a design diploma.",
            "fields": {"qualification": "Diploma", "end_date": "2024"},
        },
    )

    assert create_response.status_code == 201
    created_entry = create_response.json()
    entry_id = created_entry["id"]
    assert created_entry["has_image"] is False

    list_response = client.get(
        "/users/me/workspace/entries?section=education", headers=headers
    )
    assert list_response.status_code == 200
    assert [entry["id"] for entry in list_response.json()] == [entry_id]

    update_response = client.put(
        f"/users/me/workspace/entries/{entry_id}",
        headers=headers,
        json={
            "section": "education",
            "title": "Northside College",
            "content": "Updated education notes.",
            "fields": {"qualification": "Advanced Diploma"},
        },
    )
    assert update_response.status_code == 200
    assert update_response.json()["fields"]["qualification"] == "Advanced Diploma"

    delete_response = client.delete(
        f"/users/me/workspace/entries/{entry_id}", headers=headers
    )
    assert delete_response.status_code == 200
    assert (
        client.get(
            f"/users/me/workspace/entries/{entry_id}", headers=headers
        ).status_code
        == 404
    )


def test_workspace_entry_is_private_to_owner(user):
    owner_token = get_token(user["email"])
    create_response = client.post(
        "/users/me/workspace/entries",
        headers={"Authorization": f"Bearer {owner_token}"},
        json={"section": "contacts", "title": "Emergency contact"},
    )
    entry_id = create_response.json()["id"]

    second_email = f"workspace_{uuid.uuid4().hex}@example.com"
    second_user = client.post(
        "/users",
        json={"name": "Other User", "email": second_email, "password": "password123"},
    ).json()
    other_token = get_token(second_email)
    other_headers = {"Authorization": f"Bearer {other_token}"}

    assert (
        client.get(
            f"/users/me/workspace/entries/{entry_id}", headers=other_headers
        ).status_code
        == 404
    )
    assert client.get("/users/me/workspace/entries", headers=other_headers).json() == []

    db = TestingSessionLocal()
    db.query(WorkspaceEntry).filter(
        WorkspaceEntry.user_id == second_user["id"]
    ).delete()
    db.query(User).filter(User.id == second_user["id"]).delete()
    db.commit()
    db.close()


def test_gallery_image_requires_owner_and_gallery_section(user):
    token = get_token(user["email"])
    headers = {"Authorization": f"Bearer {token}"}
    entry = client.post(
        "/users/me/workspace/entries",
        headers=headers,
        json={"section": "gallery", "title": "Family picnic"},
    ).json()
    entry_id = entry["id"]
    image_bytes = b"\x89PNG\r\n\x1a\n" + b"test-image-data"

    upload_response = client.post(
        f"/users/me/workspace/entries/{entry_id}/image",
        headers=headers,
        files={"image": ("picnic.png", image_bytes, "image/png")},
    )
    assert upload_response.status_code == 200
    assert upload_response.json()["has_image"] is True

    image_response = client.get(
        f"/users/me/workspace/entries/{entry_id}/image", headers=headers
    )
    assert image_response.status_code == 200
    assert image_response.content == image_bytes
    assert image_response.headers["x-content-type-options"] == "nosniff"

    non_gallery = client.post(
        "/users/me/workspace/entries",
        headers=headers,
        json={"section": "family", "title": "Family member"},
    ).json()
    rejected_upload = client.post(
        f"/users/me/workspace/entries/{non_gallery['id']}/image",
        headers=headers,
        files={"image": ("picnic.png", image_bytes, "image/png")},
    )
    assert rejected_upload.status_code == 400

    delete_response = client.delete(
        f"/users/me/workspace/entries/{entry_id}/image", headers=headers
    )
    assert delete_response.status_code == 200
    assert (
        client.get(
            f"/users/me/workspace/entries/{entry_id}/image", headers=headers
        ).status_code
        == 404
    )


# --------------------------------------------------
# TASK CREATE TESTS
# --------------------------------------------------


def test_create_task(user):
    token = get_token(user["email"])

    response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Learn FastAPI",
            "completed": False,
            "due_date": "2026-10-01",
            "priority": "high",
        },
    )

    assert response.status_code == 201

    data = response.json()

    assert data["title"] == "Learn FastAPI"
    assert data["completed"] is False
    assert data["due_date"] == "2026-10-01"
    assert data["priority"] == "high"
    assert "id" in data


def test_create_task_default_completed(user):
    token = get_token(user["email"])

    response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Learn SQLAlchemy"},
    )

    assert response.status_code == 201

    assert response.json()["completed"] is False
    assert response.json()["due_date"] is None
    assert response.json()["priority"] == "medium"


def test_create_task_rejects_invalid_priority(user):
    token = get_token(user["email"])

    response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Invalid priority", "priority": "urgent"},
    )

    assert response.status_code == 422


def test_blank_task_title(user):
    token = get_token(user["email"])

    response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "   "},
    )

    assert response.status_code == 422


# --------------------------------------------------
# TASK GET TESTS
# --------------------------------------------------


def test_get_tasks(user):
    token = get_token(user["email"])

    client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Task 1"},
    )

    response = client.get(
        "/users/me/tasks", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200

    data = response.json()

    assert len(data) == 1
    assert data[0]["title"] == "Task 1"


def test_get_single_task(user):
    token = get_token(user["email"])

    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "My Task"},
    )

    task_id = create_response.json()["id"]

    response = client.get(
        f"/users/me/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["title"] == "My Task"


def test_get_nonexistent_task(user):
    token = get_token(user["email"])

    response = client.get(
        "/users/me/tasks/999999", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 404


# --------------------------------------------------
# TASK UPDATE TESTS
# --------------------------------------------------


def test_update_task(user):
    token = get_token(user["email"])

    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={
            "title": "Old Title",
            "completed": False,
            "due_date": "2026-10-01",
            "priority": "high",
        },
    )

    task_id = create_response.json()["id"]

    response = client.put(
        f"/users/me/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "New Title", "completed": True},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["title"] == "New Title"
    assert data["completed"] is True
    assert data["due_date"] == "2026-10-01"
    assert data["priority"] == "high"


def test_patch_task(user):
    token = get_token(user["email"])

    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Original Title", "completed": False},
    )

    task_id = create_response.json()["id"]

    response = client.patch(
        f"/users/me/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"completed": True, "due_date": "2026-10-02", "priority": "low"},
    )

    assert response.status_code == 200

    data = response.json()

    assert data["title"] == "Original Title"
    assert data["completed"] is True
    assert data["due_date"] == "2026-10-02"
    assert data["priority"] == "low"


def test_patch_task_can_clear_due_date(user):
    token = get_token(user["email"])
    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Scheduled", "due_date": "2026-10-01"},
    )
    task_id = create_response.json()["id"]

    response = client.patch(
        f"/users/me/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={"due_date": None},
    )

    assert response.status_code == 200
    assert response.json()["due_date"] is None


def test_patch_empty_body(user):
    token = get_token(user["email"])

    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "My Task"},
    )

    task_id = create_response.json()["id"]

    response = client.patch(
        f"/users/me/tasks/{task_id}",
        headers={"Authorization": f"Bearer {token}"},
        json={},
    )

    assert response.status_code == 400


# --------------------------------------------------
# TASK DELETE TEST
# --------------------------------------------------


def test_delete_task(user):
    token = get_token(user["email"])

    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {token}"},
        json={"title": "Delete Me"},
    )

    task_id = create_response.json()["id"]

    response = client.delete(
        f"/users/me/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert response.status_code == 200
    assert response.json()["message"] == "Task deleted"

    get_response = client.get(
        f"/users/me/tasks/{task_id}", headers={"Authorization": f"Bearer {token}"}
    )

    assert get_response.status_code == 404


# --------------------------------------------------
# USER OWNERSHIP TEST
# --------------------------------------------------


def test_user_cannot_access_another_users_task(user):
    first_token = get_token(user["email"])

    create_response = client.post(
        "/users/me/tasks",
        headers={"Authorization": f"Bearer {first_token}"},
        json={"title": "Private Task"},
    )

    task_id = create_response.json()["id"]

    second_email = f"second_{uuid.uuid4().hex}@example.com"

    second_user_response = client.post(
        "/users",
        json={"name": "Second User", "email": second_email, "password": "password123"},
    )

    assert second_user_response.status_code == 201

    second_token = get_token(second_email)

    response = client.get(
        f"/users/me/tasks/{task_id}",
        headers={"Authorization": f"Bearer {second_token}"},
    )

    assert response.status_code == 404

    db = TestingSessionLocal()

    second_user = db.query(User).filter(User.email == second_email).first()

    if second_user:
        db.query(Task).filter(Task.user_id == second_user.id).delete()

        db.delete(second_user)
        db.commit()

    db.close()
