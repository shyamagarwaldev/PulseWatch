FROM golang:tip-alpine AS builder

WORKDIR /app

COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o normal-worker ./cmd/normal-worker

FROM alpine:latest 


RUN apk add --no-cache ca-certificates
WORKDIR /app
COPY --from=builder /app/normal-worker ./

CMD ["./normal-worker"]