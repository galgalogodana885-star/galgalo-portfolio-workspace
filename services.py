from sqlalchemy.exc import IntegrityError
from sqlalchemy.orm import Session

from models import Task as TaskModel
from models import User as UserModel
from models import WorkspaceEntry
from schemas import TaskCreate, TaskPatch, TaskUpdate, UserCreate, WorkspaceEntryCreate
from security import hash_password, verify_password


def create_task(db: Session, task: TaskCreate, user_id: int):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if user is None:
        return None

    new_task = TaskModel(
        title=task.title,
        completed=task.completed,
        due_date=task.due_date,
        priority=task.priority,
        user_id=user_id,
    )

    db.add(new_task)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(new_task)

    return new_task


def create_user(db: Session, user: UserCreate):
    existing_user = db.query(UserModel).filter(UserModel.email == user.email).first()

    if existing_user is not None:
        return None

    hashed_password = hash_password(user.password)

    new_user = UserModel(
        name=user.name, email=user.email, password_hash=hashed_password
    )

    db.add(new_user)

    try:
        db.commit()
    except IntegrityError:
        db.rollback()
        raise

    db.refresh(new_user)

    return new_user


def get_user(db: Session, user_id: int):
    return db.query(UserModel).filter(UserModel.id == user_id).first()


def get_user_tasks(db: Session, user_id: int):
    user = db.query(UserModel).filter(UserModel.id == user_id).first()

    if user is None:
        return None

    return user.tasks


def get_user_task(db: Session, user_id: int, task_id: int):
    return (
        db.query(TaskModel)
        .filter(TaskModel.id == task_id, TaskModel.user_id == user_id)
        .first()
    )


def update_user_task(db: Session, user_id: int, task_id: int, task: TaskUpdate):
    existing_task = (
        db.query(TaskModel)
        .filter(TaskModel.id == task_id, TaskModel.user_id == user_id)
        .first()
    )

    if existing_task is None:
        return None

    update_data = task.model_dump(exclude_unset=True)
    for field, value in update_data.items():
        setattr(existing_task, field, value)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(existing_task)

    return existing_task


def patch_user_task(db: Session, user_id: int, task_id: int, task: TaskPatch):
    existing_task = (
        db.query(TaskModel)
        .filter(TaskModel.id == task_id, TaskModel.user_id == user_id)
        .first()
    )

    if existing_task is None:
        return None

    update_data = task.model_dump(exclude_unset=True)

    if not update_data:
        raise ValueError("At least one field must be provided")

    if "title" in update_data and update_data["title"] is None:
        raise ValueError("title cannot be null")

    for field, value in update_data.items():
        setattr(existing_task, field, value)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    db.refresh(existing_task)

    return existing_task


def delete_user_task(db: Session, user_id: int, task_id: int):
    existing_task = (
        db.query(TaskModel)
        .filter(TaskModel.id == task_id, TaskModel.user_id == user_id)
        .first()
    )

    if existing_task is None:
        return False

    db.delete(existing_task)

    try:
        db.commit()
    except Exception:
        db.rollback()
        raise

    return True


def authenticate_user(db: Session, email: str, password: str):
    user = db.query(UserModel).filter(UserModel.email == email).first()

    if user is None:
        return None

    if not verify_password(password, user.password_hash):
        return None

    return user


def create_workspace_entry(db: Session, entry: WorkspaceEntryCreate, user_id: int):
    new_entry = WorkspaceEntry(
        user_id=user_id,
        section=entry.section,
        title=entry.title,
        content=entry.content,
        fields=entry.fields,
    )
    db.add(new_entry)
    db.commit()
    db.refresh(new_entry)
    return new_entry


def get_user_workspace_entries(db: Session, user_id: int, section: str | None = None):
    query = db.query(WorkspaceEntry).filter(WorkspaceEntry.user_id == user_id)
    if section is not None:
        query = query.filter(WorkspaceEntry.section == section)
    return query.order_by(WorkspaceEntry.created_at.desc()).all()


def get_user_workspace_entry(db: Session, user_id: int, entry_id: int):
    return (
        db.query(WorkspaceEntry)
        .filter(WorkspaceEntry.id == entry_id, WorkspaceEntry.user_id == user_id)
        .first()
    )


def update_user_workspace_entry(
    db: Session, existing_entry: WorkspaceEntry, entry: WorkspaceEntryCreate
):
    existing_entry.section = entry.section
    existing_entry.title = entry.title
    existing_entry.content = entry.content
    existing_entry.fields = entry.fields
    db.commit()
    db.refresh(existing_entry)
    return existing_entry


def delete_user_workspace_entry(db: Session, db_entry: WorkspaceEntry):
    db.delete(db_entry)
    db.commit()
