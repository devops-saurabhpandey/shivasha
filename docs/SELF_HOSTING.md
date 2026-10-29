# SHIVASHA self-hosting (your own computer)

This setup runs the SHIVASHA web frontend, Node.js API, Socket.IO and MongoDB on one computer using Docker Compose. MongoDB data is kept in a named Docker volume and its port is not exposed to the network.

## What you need

- A desktop/laptop or mini-PC that you control.
- A supported 64-bit OS (Ubuntu Linux is recommended for an always-on server; Windows can use Docker Desktop).
- Docker Engine + Docker Compose plugin, or Docker Desktop.
- Reliable power and internet. A computer that is switched off or loses internet cannot serve the app.
- For access from outside your home/office, a domain/HTTPS reverse proxy and a network that permits inbound connections. Some ISPs use CGNAT, which prevents ordinary port forwarding.

## First run on your own computer

1. Install Docker.
2. Clone this repository and open its folder:
   `git clone https://github.com/devops-saurabhpandey/shivasha.git`
   `cd shivasha`
3. Create a private `.env` file in the repository root. Do not upload it to GitHub:
   `JWT_SECRET=put-a-long-random-secret-here`
   `FRONTEND_URL=http://localhost:8080`
   `SHIVASHA_PORT=8080`
4. Start the services:
   `docker compose up -d --build`
5. Open `http://localhost:8080` on that computer. On another device on the same Wi-Fi, use `http://SERVER-LAN-IP:8080`.
6. Check health:
   `http://localhost:8080/api/health`

The compose file defaults to the private Docker network database URI `mongodb://mongo:27017/shivasha`; you do not need MongoDB Atlas for this local setup.

## Stop, restart and backup

- Stop services without deleting data: `docker compose down`
- Start again: `docker compose up -d`
- View logs: `docker compose logs --tail=100`
- Back up the database before upgrades or hardware changes. One basic dump command is:
  `docker compose exec -T mongo mongodump --db shivasha --archive > shivasha-backup.archive`

Never run `docker compose down -v` unless you intentionally want to delete the database volume.

## Important limitations

- This prepares the project for self-hosting; it does not install Docker or turn on a physical computer remotely. The computer must be available and running.
- LAN access is suitable for initial testing. Do not expose port 8080 directly to the public internet or publish MongoDB port 27017.
- Before storing real users' data or opening the app publicly, configure HTTPS, firewall and OS updates, secure backups, monitoring, rate limits, and review authorization/privacy controls.
- AI, SMS, and image/video features still require their respective provider credentials/services (for example, OpenAI, MSG91, or Cloudinary) and may have separate costs. Self-hosting does not make those third-party services free.
- GitHub Pages is not required for this Docker setup; the frontend is served by the local Nginx container and proxies API/Socket.IO traffic to the backend.
