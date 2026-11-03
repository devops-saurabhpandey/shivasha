# SHIVASHA self-hosting (your own computer)

This setup runs the SHIVASHA frontend, Node.js API, MongoDB and a self-hosted AI inference runtime on a computer you control using Docker Compose. MongoDB and AI model data use persistent Docker volumes; neither database nor model ports are published publicly.

## What you need

- A 64-bit desktop/laptop or mini-PC. Ubuntu Linux is recommended for an always-on server; Windows can use Docker Desktop.
- Docker Engine + Docker Compose plugin, or Docker Desktop.
- Reliable power and internet. If the computer is off or disconnected, SHIVASHA is unavailable.
- **AI hardware:** the default `qwen2.5:3b` model needs several GB of available RAM and storage; CPU inference works but can be slow. Larger models need more memory. A GPU is optional, not assumed.
- For outside access: HTTPS reverse proxy/domain and a network that permits inbound connections. CGNAT may prevent ordinary port forwarding.

## First run

1. Install Docker.
2. Clone the repository:
   `git clone https://github.com/devops-saurabhpandey/shivasha.git`
   `cd shivasha`
3. Create a private root `.env` file. Never commit it:
   ```env
   JWT_SECRET=replace-with-a-long-random-secret
   FRONTEND_URL=http://localhost:8080
   SHIVASHA_PORT=8080
   AI_MODEL=qwen2.5:3b
   # Optional: override the default internal Ollama endpoint
   # AI_BASE_URL=http://shivasha-ai:11434/v1
   ```
4. Start all services:
   `docker compose up -d --build`
   First startup downloads the model; this may take time and substantial bandwidth.
5. Check progress:
   `docker compose ps`
   `docker compose logs --tail=100 shivasha-ai-model-init shivasha-server`
6. Open `http://localhost:8080`. From another device on the same Wi-Fi, use `http://SERVER-LAN-IP:8080`.
7. Check API health at `http://localhost:8080/api/health`, then sign in and test SHIVASHA AI and UI/UX Designer.

The local Compose database defaults to `mongodb://shivasha-database:27017/shivasha`; MongoDB Atlas is not required for this setup.

## Model configuration

- `AI_BASE_URL`: OpenAI-compatible API base URL. Compose defaults to the private Ollama service.
- `AI_MODEL`: Ollama model tag. Default: `qwen2.5:3b`.
- `AI_API_KEY`: optional; leave empty for the local Ollama service.
- For a different OpenAI-compatible hosted provider, set its endpoint/model/key privately. That provider may charge separately.

## Stop, restart and backup

- Stop without deleting data: `docker compose down`
- Start again: `docker compose up -d`
- Logs: `docker compose logs --tail=100`
- MongoDB backup: `docker compose exec -T shivasha-database mongodump --db shivasha --archive > shivasha-backup.archive`

Never run `docker compose down -v` unless you intentionally want to delete database and AI model volumes.

## Important limitations and security

- This config prepares self-hosting; it cannot power on a physical computer remotely. The machine must remain running for always-on access.
- Test on your LAN first. Do not expose port 8080 directly to the public internet or publish MongoDB/Ollama ports.
- Before public launch, configure HTTPS, firewall, OS updates, secure backups, monitoring, rate limits, and review authorization/privacy controls.
- Local inference avoids per-request hosted AI API charges, but hardware, electricity, internet, and any public hosting/domain costs may remain.
