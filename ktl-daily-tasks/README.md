# KTL Daily Tasks

A mobile-friendly customer vehicle task tracker for KTL. Records customer name, phone, chassis number, vehicle number, number plate received status, and RC received by customer status.

## Deploy to Render

1. Push this repository to GitHub.
2. In Render, create a **New Web Service** and connect `devops-saurabhpandey/shivasha`.
3. Set **Root Directory** to `ktl-daily-tasks`, **Build Command** to `npm install`, and **Start Command** to `npm start`.
4. Add environment variables:
   - `MONGODB_URI`: MongoDB Atlas connection string
   - `MONGODB_DB`: `ktl_daily_tasks`
   - `ADMIN_PASSWORD`: a unique strong password of at least 12 characters
   - `SESSION_SECRET`: a separate random secret
   - `NODE_ENV`: `production`
5. Deploy and test `/api/health`.

## Notes

- App requires MongoDB; entries are stored in the configured database.
- Login is protected by the configured admin password and an HTTP-only session cookie.
- Do not put credentials in GitHub. Use Render environment variables.
- Use HTTPS, restrict database network access where possible, and back up records regularly.
