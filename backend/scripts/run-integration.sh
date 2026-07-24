docker-compose up -d
echo '🟡 - Waiting for database to be ready...'
./scripts/wait-for-it.sh "postgresql://postgres:mysecretpassword@localhost:5432/db" -- echo '🟢 - Database is ready!'
bunx prisma generate
bunx prisma db push
bun test tests
docker-compose down