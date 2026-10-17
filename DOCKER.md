# Run the full SHIVASHA app with Docker

## Requirements
- Docker Engine with Docker Compose v2 (or Docker Desktop)
- A MongoDB Atlas connection string, or another reachable MongoDB URI

## Start
1. Copy `.env.example` to `.env`.
2. Edit `.env` and set a strong, private `JWT_SECRET` and your real `MONGODB_URI`.
3. From the repository root, run:

   ```sh
   docker compose up --build -d
   ```

4. Open http://localhost:8080
5. Check API health at http://localhost:8080/api/health

## Logs and stop

```sh
docker compose logs -f
docker compose down
```

The frontend is served by Nginx. It proxies `/api/` and `/socket.io/` to the backend container, so the browser uses the same origin for API and realtime connections. MongoDB is external; this setup uses the MongoDB URI in `.env` and does not start a database container.

Do not commit `.env` or share your MongoDB URI/JWT secret.
