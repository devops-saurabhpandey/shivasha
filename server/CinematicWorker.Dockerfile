FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

RUN apk add --no-cache ffmpeg
COPY package*.json ./
RUN npm install --omit=dev && npm cache clean --force

COPY scripts/pollCinematicRenderQueue.js ./scripts/pollCinematicRenderQueue.js

CMD ["npm", "run", "cinematic:worker"]
