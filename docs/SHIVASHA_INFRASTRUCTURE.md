# SHIVASHA Server and SHIVASHA Database

## Ownership model

The project runs its API as the `shivasha-server` Docker service and its database as the `shivasha-database` Docker service. Both are part of the `shivasha` Compose project and communicate over its private Docker network. The database port is not published to the public internet.

## Current database engine

The existing API uses Mongoose models and queries throughout its modules. For compatibility, the self-hosted SHIVASHA database currently uses the MongoDB open-source server engine inside our own container. It does not use MongoDB Atlas. A future PostgreSQL migration must convert and test the data models and queries before replacing this engine; simply changing the container image or connection string would break the application.

## Persistent data

The database stores its files in the Docker named volume `shivasha_mongo_data`. Do not run `docker compose down -v` unless deleting all database data is intended. Keep encrypted backups outside the server.

## Start on a supported Docker host

1. Create a private `.env` file with a strong unique `JWT_SECRET`, the public `FRONTEND_URL`, and optional `SHIVASHA_PORT`.
2. Run `docker compose config`.
3. Run `docker compose up -d --build`.
4. Confirm both `shivasha-server` and `shivasha-database` are healthy/running with `docker compose ps`.
5. Test `/api/health` and `/api/ready` through a secured HTTPS reverse proxy.

Do not publish database port 27017. Do not commit `.env` or credentials.

## Hosting reality

GitHub stores source code and runs temporary validation jobs; it is not the persistent production server. A cloud VM or an always-on computer is still required to run these containers. Free cloud compute is subject to provider limits and can be withdrawn or suspended; no perpetual free 24/7 service is promised. The current Android-only setup cannot run this Docker Compose stack reliably by itself.
