# SHIVASHA setup while using Android only

## Current status

- The repository contains a self-hosted SHIVASHA database service, a Node.js SHIVASHA server, and the web frontend in Docker Compose.
- The Compose project is named `shivasha`; the database and API services are named `shivasha-database` and `shivasha-server`.
- Database port 27017 is private inside the Docker network and is not published publicly.
- This is configuration in GitHub, not a running server. A green GitHub Actions check validates/builds code; it does not mean the app is online.

## Database engine clarification

The existing SHIVASHA backend uses Mongoose models throughout its routes. To avoid breaking login, posts, messages, business, education and other existing modules, this deployment keeps the MongoDB database engine but runs it as SHIVASHA's own self-hosted database container. It does not connect to MongoDB Atlas.

PostgreSQL is a possible future database-engine migration, but it is not a safe one-line replacement: the application's Mongoose models and queries would need a planned migration and tests. Do not switch the database engine until that work is complete.

## Can Android run this server 24/7?

Not reliably using this repository's Docker Compose setup. Android can edit GitHub files and view Actions logs, but it does not provide a normal always-on Docker Engine host for this stack. Do not install random "free server" apps or publish database/admin ports to the internet.

## SHIVASHA's own database and server

The Compose file starts the database container and stores its data in the persistent Docker volume `shivasha_mongo_data). The backend connects privately using:

```text
mongodb://shivasha-database:27017/shivasha
```

No MongoDB Atlas account is needed for this self-hosted configuration. The data belongs to the Docker host's volume; keep separate backups.

## First-run checklist (on a Linux computer or supported Docker host)

1. Install Docker Engine and the Docker Compose plugin.
2. Clone this repository and enter its directory:
   `git clone https://github.com/devops-saurabhpandey/shivasha.git`
   `cd shivasha`
3. Create a private local `.env` file; do not upload it to GitHub:
   ```dotenv
   JWT_SECRET=replace-with-a-long-unique-random-secret
   FRONTEND_URL=https://YOUR-FRONTEND-DOMAIN
   SHIVASHA_PORT=8080
   ```
4. Validate and start:
   ```sh
   docker compose config
   docker compose up -d --build
   docker compose ps
   ```
5. Check `https://YOUR-DOMAIN/api/health` after configuring a secure HTTPS reverse proxy.
6. Check logs with `docker compose logs --tail=100`.

Never run `docker compose down -v` unless you intentionally want to delete the database volume. Do not expose database port 27017 publicly. Do not put real secrets in GitHub or frontend variables.

## Costs and availability

Self-hosting avoids a managed MongoDB/Render dependency, but it still needs a machine or cloud VM, electricity, internet, backups and maintenance. A free cloud VM is not guaranteed to remain free or available 24/7. Since the owner currently uses Android only, these services cannot be started from the phone alone. Do not describe the server/database as live until a host has actually started the containers and health checks pass.

Third-party AI, SMS, email, and media APIs may have separate costs.
