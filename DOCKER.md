# Run the full SHIVASHA app with its own local database

This Compose setup starts three separate SHIVASHA services: frontend, API backend, and a private MongoDB container. It does not use Render or MongoDB Atlas. It is designed to avoid reusing similarly named KTL containers by always using the Compose project name `shivasha`.

## Requirements
- Docker Engine and Docker Compose v2 (or Docker Desktop)
- A computer that can stay powered on and connected to the internet if you want the app available continuously

## Start
1. From the SHIVASHA repository root, copy `.env.example` to `.env`.
2. Edit `.env` and set a long, private `JWT_SECRET`.
3. For the local MongoDB container, set `MONGODB_URI=mongodb://mongo:27017/shivasha` in `.env`. Do not use an Atlas URL if you want the local database.
4. Start only this project with:

   ```sh
   docker compose -p shivasha up --build -d
   ```

5. Open http://localhost:8080
6. Check API health at http://localhost:8080/api/health

## Logs and stop

```sh
docker compose -p shivasha logs -f
docker compose -p shivasha down
```

The frontend is served by Nginx and proxies `/api/` and `/socket.io/` to the SHIVASHA backend. MongoDB is not published to a public host port; only the backend can reach it over the private Compose network. The `shivasha_mongo_data` volume preserves database files when containers are restarted or stopped. Do not run `docker compose down -v`, because `-v` removes the database volume and can delete stored data.

## Important limits
- This is self-hosted on your own computer, not a cloud deployment. The computer, power, router and internet must remain on for remote users to access it.
- Docker software can be free, but uninterrupted internet/power and hardware are still required. Do not expose port 27017 to the internet.
- Keep `.env` private; never commit it or share your JWT secret.
