FROM node:22-alpine

ENV NODE_ENV=production
WORKDIR /app

# Install SHIVASHA API dependencies
COPY server/package*.json ./
RUN npm install --omit=dev && npm cache clean --force

# Copy SHIVASHA API source
COPY server/ ./

ENV PORT=5000
EXPOSE 5000

# SHIVASHA API health check
HEALTHCHECK --interval=30s --timeout=5s --start-period=20s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:' + (process.env.PORT || 5000) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

CMD ["node", "index.js"]
