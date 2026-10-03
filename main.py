from fastapi import (
    Depends,
    FastAPI,
    File,
    HTTPException,
    Query,
    Response,
    UploadFile,
    status,
)
from fastapi.responses import FileResponse
from fastapi.security import OAuth2PasswordBearer, OAuth2PasswordRequestForm
from fastapi.staticfiles import StaticFiles
from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from auth import create_access_token, decode_access_token
from database import get_db
from models import User, WorkspaceEntry
from schemas import (
    TaskCreate,
    TaskPatch,
    TaskResponse,
    TaskUpdate,
    Token,
    UserCreate,
    UserResponse,
    WorkspaceEntryCreate,
    WorkspaceEntryResponse,
    WorkspaceSection,
)
from services import (
    authenticate_user,
    create_task,
    create_user,
    create_workspace_entry,
    delete_user_task,
    delete_user_workspace_entry,
    get_user,
    get_user_task,
    get_user_tasks,
    get_user_workspace_entries,
    get_user_workspace_entry,
    patch_user_task,
    update_user_task,
    update_user_workspace_entry,
)

app = FastAPI()

app.mount("/static", StaticFiles(directory="frontend"), name="static")


@app.get("/", include_in_schema=False)
def home():
    return FileResponse("frontend/portfolio.html")


WORKSPACE_PAGES = {
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
}


@app.get("/workspace/{page}", include_in_schema=False)
def workspace_page(page: str):
    if page not in WORKSPACE_PAGES:
        raise HTTPException(status_code=404, detail="Workspace page not found")
    return FileResponse("frontend/index.html")


@app.post("/users", response_model=UserResponse, status_code=status.HTTP_201_CREATED)
def create_new_user(user: UserCreate, db: Session = Depends(get_db)):
    try:
        new_user = create_user(db, user)

    except IntegrityError:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    if new_user is None:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT, detail="Email already registered"
        )

    return new_user


@app.post("/login", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(), db: Session = Depends(get_db)
):
    user = authenticate_user(db, form_data.username, form_data.password)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid email or password"
        )

    access_token = create_access_token(user.id)

    return {"access_token": access_token, "token_type": "bearer"}


oauth2_scheme = OAuth2PasswordBearer(tokenUrl="login")


def get_current_user(
    token: str = Depends(oauth2_scheme), db: Session = Depends(get_db)
) -> User:

    user_id = decode_access_token(token)

    if user_id is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = get_user(db, user_id)

    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found",
            headers={"WWW-Authenticate": "Bearer"},
        )

    return user


@app.get("/users/me", response_model=UserResponse)
def get_current_user_info(current_user: User = Depends(get_current_user)):
    return {
        "id": current_user.id,
        "name": current_user.name,
        "email": current_user.email,
        "tasks": current_user.tasks,
        "has_profile_picture": current_user.profile_picture_data is not None,
    }


def serialize_workspace_entry(entry: WorkspaceEntry):
    return {
        "id": entry.id,
        "section": entry.section,
        "title": entry.title,
        "content": entry.content,
        "fields": entry.fields or {},
        "has_image": entry.image_data is not None,
        "created_at": entry.created_at,
    }


@app.post(
    "/users/me/workspace/entries",
    response_model=WorkspaceEntryResponse,
    status_code=status.HTTP_201_CREATED,
)
def create_my_workspace_entry(
    entry: WorkspaceEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    created_entry = create_workspace_entry(db, entry, current_user.id)
    return serialize_workspace_entry(created_entry)


@app.get("/users/me/workspace/entries", response_model=list[WorkspaceEntryResponse])
def list_my_workspace_entries(
    section: WorkspaceSection | None = Query(default=None),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entries = get_user_workspace_entries(db, current_user.id, section)
    return [serialize_workspace_entry(entry) for entry in entries]


@app.get(
    "/users/me/workspace/entries/{entry_id}", response_model=WorkspaceEntryResponse
)
def get_my_workspace_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = get_user_workspace_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Workspace entry not found")
    return serialize_workspace_entry(entry)


@app.put(
    "/users/me/workspace/entries/{entry_id}", response_model=WorkspaceEntryResponse
)
def update_my_workspace_entry(
    entry_id: int,
    entry: WorkspaceEntryCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    existing_entry = get_user_workspace_entry(db, current_user.id, entry_id)
    if existing_entry is None:
        raise HTTPException(status_code=404, detail="Workspace entry not found")
    updated_entry = update_user_workspace_entry(db, existing_entry, entry)
    return serialize_workspace_entry(updated_entry)


@app.delete("/users/me/workspace/entries/{entry_id}")
def delete_my_workspace_entry(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = get_user_workspace_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Workspace entry not found")
    delete_user_workspace_entry(db, entry)
    return {"message": "Workspace entry deleted"}


def image_signature_matches(content_type: str, image_data: bytes) -> bool:
    signatures = {
        "image/jpeg": image_data.startswith(b"\xff\xd8\xff"),
        "image/png": image_data.startswith(b"\x89PNG\r\n\x1a\n"),
        "image/gif": image_data.startswith((b"GIF87a", b"GIF89a")),
        "image/webp": image_data.startswith(b"RIFF") and image_data[8:12] == b"WEBP",
    }
    return signatures.get(content_type, False)


@app.put("/users/me/profile-picture")
async def update_profile_picture(
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    image_data = await image.read(5 * 1024 * 1024 + 1)
    if len(image_data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Images must be 5 MB or smaller")
    if not image_signature_matches(image.content_type or "", image_data):
        raise HTTPException(
            status_code=415, detail="Upload a valid JPEG, PNG, GIF, or WebP image"
        )

    current_user.profile_picture_data = image_data
    current_user.profile_picture_content_type = image.content_type
    db.commit()
    return {"has_profile_picture": True}


@app.get("/users/me/profile-picture")
def get_profile_picture(current_user: User = Depends(get_current_user)):
    if current_user.profile_picture_data is None:
        raise HTTPException(status_code=404, detail="Profile picture not found")
    return Response(
        content=current_user.profile_picture_data,
        media_type=current_user.profile_picture_content_type,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@app.delete("/users/me/profile-picture")
def delete_profile_picture(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    current_user.profile_picture_data = None
    current_user.profile_picture_content_type = None
    db.commit()
    return {"has_profile_picture": False}


@app.post("/users/me/workspace/entries/{entry_id}/image")
async def upload_workspace_image(
    entry_id: int,
    image: UploadFile = File(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = get_user_workspace_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Workspace entry not found")
    if entry.section != "gallery":
        raise HTTPException(
            status_code=400, detail="Images can only be added to gallery entries"
        )

    image_data = await image.read(5 * 1024 * 1024 + 1)
    if len(image_data) > 5 * 1024 * 1024:
        raise HTTPException(status_code=413, detail="Images must be 5 MB or smaller")
    if not image_signature_matches(image.content_type or "", image_data):
        raise HTTPException(
            status_code=415, detail="Upload a valid JPEG, PNG, GIF, or WebP image"
        )

    entry.image_data = image_data
    entry.image_content_type = image.content_type
    db.commit()
    return serialize_workspace_entry(entry)


@app.get("/users/me/workspace/entries/{entry_id}/image")
def get_workspace_image(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = get_user_workspace_entry(db, current_user.id, entry_id)
    if entry is None or entry.image_data is None:
        raise HTTPException(status_code=404, detail="Gallery image not found")
    return Response(
        content=entry.image_data,
        media_type=entry.image_content_type,
        headers={"X-Content-Type-Options": "nosniff"},
    )


@app.delete("/users/me/workspace/entries/{entry_id}/image")
def delete_workspace_image(
    entry_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    entry = get_user_workspace_entry(db, current_user.id, entry_id)
    if entry is None:
        raise HTTPException(status_code=404, detail="Workspace entry not found")
    entry.image_data = None
    entry.image_content_type = None
    db.commit()
    return {"message": "Gallery image deleted"}


@app.post(
    "/users/me/tasks", response_model=TaskResponse, status_code=status.HTTP_201_CREATED
)
def create_my_task(
    task: TaskCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    new_task = create_task(db, task, current_user.id)

    return new_task


@app.get("/users/me/tasks", response_model=list[TaskResponse])
def get_my_tasks(
    current_user: User = Depends(get_current_user), db: Session = Depends(get_db)
):
    return get_user_tasks(db, current_user.id)


@app.get("/users/me/tasks/{task_id}", response_model=TaskResponse)
def get_my_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    task = get_user_task(db, current_user.id, task_id)

    if task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    return task


@app.put("/users/me/tasks/{task_id}", response_model=TaskResponse)
def update_my_task(
    task_id: int,
    task: TaskUpdate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    updated_task = update_user_task(db, current_user.id, task_id, task)

    if updated_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    return updated_task


@app.patch("/users/me/tasks/{task_id}", response_model=TaskResponse)
def patch_my_task(
    task_id: int,
    task: TaskPatch,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    try:
        updated_task = patch_user_task(db, current_user.id, task_id, task)

    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e))

    if updated_task is None:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    return updated_task


@app.delete("/users/me/tasks/{task_id}")
def delete_my_task(
    task_id: int,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db),
):
    deleted = delete_user_task(db, current_user.id, task_id)

    if not deleted:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND, detail="Task not found"
        )

    return {"message": "Task deleted"}
