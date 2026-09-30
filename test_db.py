from database import SessionLocal
from models import Task, User


def main():
    db = SessionLocal()

    try:
        user = db.query(User).first()
        if user is None:
            raise SystemExit("Create a user before running this database check.")

        task = Task(
            title="Learn SQLAlchemy",
            completed=False,
            user_id=user.id
        )
        db.add(task)
        db.commit()
        print(task.id)
    finally:
        db.close()


if __name__ == "__main__":
    main()
