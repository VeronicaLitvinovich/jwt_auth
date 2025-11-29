#!/bin/bash

echo "🔍 Checking production environment..."

# Проверяем запущены ли контейнеры
echo "📊 Container status:"
docker-compose -f docker-compose.prod.yml ps

# Проверяем логи базы данных
echo "📋 Database logs (last 10 lines):"
docker-compose -f docker-compose.prod.yml logs db --tail=10

# Проверяем логи приложения
echo "📋 Application logs (last 10 lines):"
docker-compose -f docker-compose.prod.yml logs app --tail=10

# Проверяем health endpoint
echo "🏥 Health check:"
curl -s http://localhost:3000/health || echo "Health check failed"

# Проверяем роли в базе данных
echo "👥 Database roles:"
docker-compose -f docker-compose.prod.yml exec -T db psql -U test_admin -d test_lab4_1 -c "SELECT id, name FROM roles;" || echo "Cannot check roles"