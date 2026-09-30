# Galgalo Godana Portfolio and Workspace

The public portfolio is served at `/`. The authenticated personal workspace is served under `/workspace/...` and uses the API in `main.py`.

## Local development

1. Copy `.env.example` to `.env` and set `SECRET_KEY` and `DATABASE_URL` for a PostgreSQL database.
2. Install dependencies with `python -m pip install -r requirements-dev.txt`.
3. Start the app with `python -m uvicorn main:app --reload`.
4. Run tests with `python -m pytest -q`.

Never commit `.env`, credentials, or production database URLs.

## Deploying to Vercel

Vercel detects the FastAPI application from `main.py` and installs the packages in `requirements.txt`. Import this repository in Vercel and leave the build command on its detected default.

Add these Production environment variables in Vercel Project Settings before deploying:

- `SECRET_KEY`: a unique, randomly generated secret used to sign access tokens.
- `DATABASE_URL`: a reachable hosted PostgreSQL connection string. The current local `.env` database is not reachable from Vercel.

Redeploy after changing environment variables. Workspace records and uploaded profile/gallery images are stored in PostgreSQL, so use a managed database with backups and SSL enabled.
