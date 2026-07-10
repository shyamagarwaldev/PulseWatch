FROM golang:tip-alpine AS builder

WORKDIR /app
COPY go.mod go.sum ./
RUN go mod download
COPY ./internals/outbox ./internals/outbox
COPY  ./internals/shared ./internals/shared
COPY ./cmd/outbox ./cmd/outbox

RUN CGO_ENABLED=0 go build -o outbox ./cmd/outbox

FROM alpine:latest
RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/outbox ./

CMD ["./outbox"]