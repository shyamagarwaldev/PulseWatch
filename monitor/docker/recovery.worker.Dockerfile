FROM golang:tip-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY ./internals/worker ./internals/worker
COPY  ./internals/shared ./internals/shared
COPY ./cmd/recovery-worker ./cmd/recovery-worker

RUN CGO_ENABLED=0 go build -o recovery-worker ./cmd/recovery-worker

FROM alpine:latest 


RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/recovery-worker ./


CMD ["./recovery-worker"]