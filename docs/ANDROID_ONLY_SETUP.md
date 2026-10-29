# SHIVASHA setup while using Android only

## Current status

- The SHIVASHA repository already has Docker Compose configuration for its frontend, Node.js API, and its own MongoDB database.
- The Compose project is explicitly named `shivasha` so it does not accidentally share a default Compose project name with KTL projects.
- MongoDB is not published to a host port; it stays on the private Docker network.
- This is configuration in GitHub, not a running server. A GitHub Actions green check means a build/validation job passed; it does not mean the app is online with its own database.

## Can Android run this server 24/7?

Not reliably using this repository's Docker Compose setup. Android can edit GitHub files and view Actions logs, but it does not provide a normal always-on Docker Engine host for this stack. Do not install random "free server" apps or publish database/admin ports to the internet.

## SHIVASHA's own database when a computer becomes available

The existing Compose file starts a MongoDB 8 container and stores data in the Docker named volume `shivasha_mongo_data` (Compose will prefix the volume with the `shivasha` project name). The backend connects privately using:

```text
mongodb://mongo:27017/shivasha
```

No MongoDB Atlas account is needed for this local/self-hosted database. The database only exists while the Docker host and its data volume are available; back it up to a separate drive.

## First-run checklist (on a Windows PC or Linux computer)

1. Install Docker Desktop (Windows) or Docker Engine + Compose (Linux).
2. Clone this repository and enter its directory.
3. Create a local `.env` file, not a GitHub file, with:
   ```dotenv
   JWT_SECRET=replace-with-a-long-unique-random-secret
   FRONTEND_URL=http://localhost:8080
   SHIVASHA_PORT=8080
   ```
4. Validate configuration:
   ```sh
   docker compose config
   ```
5. Build and start:
   ```sh
   docker compose up -d --build
   docker compose ps
   ```
6. Open `http://localhost:8080` on the host computer and test `http://localhost:8080/api/health`.
7. Check logs with `docker compose logs --tail=100`.

Never run `docker compose down -v` unless you intentionally want to delete the MongoDB volume. Do not expose MongoDB port 27017 publicly. Do not put real secrets in GitHub or frontend variables.

## Public access and costs

The local setup does not make the app publicly accessible by itself. Public HTTPS requires additional network/domain/tunnel configuration and secure review. Self-hosting can avoid a hosting subscription, but needs an always-on computer, electricity, internet, backups and maintenance. Third-party AI, SMS, or media APIs may still cost money.

## Current next step

Since the owner currently has only an Android phone, no server can be started from this repository yet. Keep this configuration ready in GitHub; when a computer is available, follow the steps above. Do not describe the server/database as live until the host commands and health checks have actually succeeded.
