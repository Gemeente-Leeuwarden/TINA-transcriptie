# TINA platform: Go API server + built React SPA in one image.
#
# The Go binary serves frontend/dist itself (see cmd/platform/main.go), so a
# single container replaces both `npm run build` and `go run ./cmd/platform`.

# --- Stage 1: build the frontend -------------------------------------------
FROM node:24-alpine AS frontend
WORKDIR /frontend

COPY frontend/package.json frontend/package-lock.json ./
RUN npm ci

COPY frontend/ ./
# VITE_* values are baked into the bundle at build time. The defaults match
# frontend/sample.env and work when the app container publishes :8080 on the
# same machine the browser runs on; override via build args for other hosts.
ARG VITE_API_URL=http://127.0.0.1:8080
ARG VITE_WS_URL=ws://127.0.0.1:8080/ws
ENV VITE_API_URL=$VITE_API_URL \
    VITE_WS_URL=$VITE_WS_URL
RUN npm run build

# --- Stage 2: build the Go binary -------------------------------------------
FROM golang:1.25-alpine AS backend
WORKDIR /src

COPY go.mod go.sum ./
RUN go mod download

COPY cmd/ ./cmd/
COPY internal/ ./internal/
COPY pkg/ ./pkg/
RUN CGO_ENABLED=0 go build -o /platform ./cmd/platform

# --- Stage 3: runtime --------------------------------------------------------
FROM alpine:3.21
# ca-certificates for outbound TLS, tzdata for DB_TIMEZONE (Europe/Amsterdam).
RUN apk add --no-cache ca-certificates tzdata \
    && adduser -D -u 10001 platform

WORKDIR /app
COPY --from=backend /platform ./platform
# The binary resolves "frontend/dist" relative to its working directory.
COPY --from=frontend /frontend/dist ./frontend/dist

USER platform
EXPOSE 8080
CMD ["./platform"]
