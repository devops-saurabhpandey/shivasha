# SHIVASHA

**Shivasha is a Software Company.** Its flagship product, **Shivasha Global Technology Super App**, is planned around 12 Jyotish-inspired Houses, 15 product modules and 7 delivery phases. The current application remains the foundation; the 12-House Explorer is a navigation and product-mapping milestone, not a claim that all planned modules are already live.

**Product plan:** [Global Super App Master Plan](./docs/SHIVASHA_GLOBAL_SUPER_APP_PLAN.md)

The existing React-based social community app, Node.js/Express API and MongoDB data store are the starting point for this wider ecosystem.

## Links

- **Live frontend:** https://devops-saurabhpandey.github.io/shivasha/
- **Repository:** https://github.com/devops-saurabhpandey/shivasha
- **Frontend documentation:** [FRONTEND.md](./FRONTEND.md)
- **Backend source:** [server/](./server/)
- **GitHub Actions deployments:** https://github.com/devops-saurabhpandey/shivasha/actions

## Technology Stack

- Frontend: React 19, Vite 7, CSS
- API: Node.js, Express
- Database: MongoDB/Mongoose
- Authentication: JSON Web Tokens (JWT)
- Real-time features: Socket.IO
- Frontend hosting: GitHub Pages

## Features in the current codebase

- Login and registration UI
- Social feed, post creation, likes, comments, replies and reposts
- User profiles, discovery, search and follow actions
- Saved posts, hashtags and notifications
- Direct messaging and real-time presence/typing integration
- User report/moderation UI

Features that use data or authentication require the backend service and database to be configured and running.

## Frontend Quick Start

Requirements: Node.js and npm.

```bash
git clone https://github.com/devops-saurabhpandey/shivasha.git
cd shivasha
npm install
npm run dev
```

Create a production build:

```bash
npm run build
```

The generated static site is placed in `dist/`.

## Backend Quick Start

```bash
cd server
npm install
npm start
```

Configure the backend environment variables before starting it:

- `MONGODB_URI` — MongoDB Atlas connection string
- `JWT_SECRET` — long, random private secret
- `FRONTEND_URL` — `https://devops-saurabhpandey.github.io/shivasha`

See [server/.env.example](./server/.env.example) for the variable names. Create a private local `.env` file; do not commit secrets.

## Deployment Notes

GitHub Pages serves the frontend from the `/shivasha/` path. The frontend build uses the `VITE_API_URL` GitHub Actions repository variable to choose the deployed backend URL. Set it to the public HTTPS URL of the backend service, without a trailing slash, and rerun the deployment workflow.

A successful frontend build/deployment does not by itself verify backend availability, MongoDB connectivity, login, uploads, or messaging. Test those separately after backend deployment.

## Security

- Never commit database credentials, JWT secrets, or other private keys.
- Do not put private secrets in frontend environment variables; frontend variables are included in the browser build.
- Validate permissions and user input on the backend for all privileged actions.
