# --- Stage 1: build the React/Vite frontend -----------------------------
FROM node:20-alpine AS build
WORKDIR /app
COPY package.json package-lock.json ./
RUN npm ci
COPY . .
RUN npm run build

# --- Stage 2: production runtime -----------------------------------------
FROM node:20-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production

# Only install production dependencies for the runtime image.
COPY package.json package-lock.json ./
RUN npm ci --omit=dev

COPY server ./server
COPY --from=build /app/dist ./dist

# Serve the built frontend as static files from the same Express server that
# handles /api/*, so the whole app is a single container/process.
RUN printf '%s\n' \
  "import path from 'path';" \
  "import express from 'express';" \
  "import { fileURLToPath } from 'url';" \
  "import app from './index.js';" \
  "const __dirname = path.dirname(fileURLToPath(import.meta.url));" \
  "const distDir = path.resolve(__dirname, '../dist');" \
  "app.use(express.static(distDir));" \
  "app.get('*', (req, res) => res.sendFile(path.join(distDir, 'index.html')));" \
  "const port = Number(process.env.PORT || 8787);" \
  "app.listen(port, () => console.log(\`CSV analyst (built) listening on http://localhost:\${port}\`));" \
  > server/serve-static.js

EXPOSE 8787
CMD ["node", "server/serve-static.js"]
