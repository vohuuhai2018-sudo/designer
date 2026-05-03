# Flow Worker — bundles Chrome, Xvfb, Node 20, and the worker app.
# Build:  docker build -t flow-worker .
# Run:    docker run -d --name flow-worker -p 3001:3001 \
#           -e WORKER_SECRET=$WORKER_SECRET \
#           -v /opt/flow-profile:/app/flow-profile \
#           flow-worker
FROM node:20-bookworm-slim

# Install Chrome dependencies + Xvfb for headed-style display
RUN apt-get update && apt-get install -y --no-install-recommends \
    wget gnupg ca-certificates fonts-liberation \
    libasound2 libatk-bridge2.0-0 libatk1.0-0 libatspi2.0-0 \
    libcairo2 libcups2 libdbus-1-3 libdrm2 libgbm1 libglib2.0-0 \
    libgtk-3-0 libnspr4 libnss3 libpango-1.0-0 libx11-6 \
    libxcb1 libxcomposite1 libxdamage1 libxext6 libxfixes3 \
    libxkbcommon0 libxrandr2 xdg-utils libu2f-udev libvulkan1 \
    xvfb procps \
  && rm -rf /var/lib/apt/lists/*

# Install Google Chrome stable
RUN wget -q -O /tmp/chrome.deb https://dl.google.com/linux/direct/google-chrome-stable_current_amd64.deb \
  && apt-get update && apt-get install -y --no-install-recommends /tmp/chrome.deb \
  && rm /tmp/chrome.deb && rm -rf /var/lib/apt/lists/*

WORKDIR /app

# Copy worker code
COPY package.json package-lock.json* ./
RUN npm ci --omit=dev || npm install --omit=dev

COPY server.js ./
COPY entrypoint.sh ./
RUN chmod +x entrypoint.sh

# The flowAutomation.js gets mounted at /app/flowAutomation.js — see entrypoint.
# Persistent profile mount: /app/flow-profile

ENV PORT=3001
ENV FLOW_CONCURRENCY=4
ENV FLOW_HEADLESS=0
ENV DISPLAY=:99
EXPOSE 3001

ENTRYPOINT ["/app/entrypoint.sh"]
