FROM golang:tip-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY ./internals/scheduler ./internals/scheduler
COPY  ./internals/shared ./internals/shared
COPY ./cmd/scheduler ./cmd/scheduler

RUN CGO_ENABLED=0 go build -o scheduler ./cmd/scheduler

FROM alpine:latest 

WORKDIR /app
COPY --from=builder /app/scheduler ./


CMD ["./scheduler"]


