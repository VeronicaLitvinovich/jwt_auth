# 🔄 Демонстрация автоматического отката

## 📋 Подготовка

### Шаг 1: Создайте успешный baseline (точку восстановления)

```bash
# Зафиксируйте текущий рабочий код
git add tests/unit/authJwt.test.js
git commit -m "fix: remove test typo - baseline for rollback demo"
git push
```

Дождитесь успешного завершения CI/CD pipeline. Это создаст точку восстановления.

---

## 🎯 Вариант 1: Сломать Health Check (самый простой)

### Шаг 2: Добавьте намеренную ошибку в production

В файле `server.js` найдите функцию `/health` (строка ~125) и добавьте проверку:

```javascript
// Health endpoint
app.get("/health", async (req, res) => {
  // 🚨 DEMO: Симуляция поломки в production
  if (process.env.NODE_ENV === 'production') {
    return res.status(500).json({
      status: "ERROR",
      message: "Simulated production failure for rollback demo"
    });
  }

  const healthcheck = {
    status: "OK",
    // ... остальной код
```

### Шаг 3: Закоммитьте и запушьте

```bash
git add server.js
git commit -m "demo: simulate production health check failure"
git push
```

### Шаг 4: Наблюдайте процесс отката

Следите за GitHub Actions:

1. ✅ Unit tests пройдут (используют SQLite, NODE_ENV=test)
2. ✅ Integration tests пройдут (используют NODE_ENV=test)
3. ✅ Production deployment запустится
4. ❌ Health check провалится (NODE_ENV=production)
5. 🔄 **Автоматический откат активируется!**

### Ожидаемый вывод:

```
🚨 CRITICAL FAILURE DETECTED - Initiating automatic rollback!
⚠️ Failed step: health_check=failure
🛑 Stopping failed deployment...
🔄 Rolling back to previous commit: <предыдущий-хеш>
📦 Reinstalling dependencies from previous version...
🚀 Starting previous version...
✅ ROLLBACK SUCCESSFUL - Previous version restored
```

---

## 🎯 Вариант 2: Сломать API Endpoint

Добавьте ошибку в основной функционал:

```javascript
// В server.js, после инициализации роутов
app.use(
  "/api/auth",
  (req, res, next) => {
    if (process.env.NODE_ENV === "production") {
      throw new Error("Simulated production API failure");
    }
    next();
  },
  require("./app/routes/auth.routes")
);
```

---

## 🎯 Вариант 3: Сломать Database Connection

В `app/config/db.config.js`:

```javascript
module.exports = {
  // ... existing config

  // Добавьте в конец
  ...(process.env.NODE_ENV === "production" && {
    host: "nonexistent-database-host", // Намеренно неправильный хост
  }),
};
```

---

## 🧹 Очистка после демонстрации

После успешной демонстрации отката:

```bash
# Вернитесь к рабочей версии
git revert HEAD
git push

# Или откатитесь к baseline
git reset --hard HEAD~1
git push --force
```

---

## 📊 Что вы увидите

### В логах GitHub Actions:

1. **Deploy Production** шаг:

   - ✅ Создание backup
   - ✅ Старт production
   - ❌ Health check failure

2. **Automatic Rollback** шаг:

   - 🛑 Остановка проблемной версии
   - 📁 Checkout предыдущего коммита
   - 📦 Переустановка зависимостей
   - 🚀 Запуск предыдущей версии
   - ✅ Верификация отката

3. **Результат**:
   - Pipeline помечен как failed (красный ❌)
   - НО приложение работает на предыдущей версии
   - Production остался доступным

### На сервере:

```bash
# Проверьте текущий коммит
cd /private/tmp/_work/jwt_auth/jwt_auth
git log -1 --oneline
# Должен быть предыдущий коммит, не тот что пушили!

# Проверьте что приложение работает
curl http://127.0.0.1:3000/health
# Должен вернуть 200 OK
```

---

## ⚠️ Важные замечания

1. **Откат работает ТОЛЬКО на production deploy** - не на unit/integration тестах
2. **Требуется успешный предыдущий деплой** - файл `/tmp/last_successful_deploy.txt` должен существовать
3. **Откат происходит автоматически** - без ручного вмешательства
4. **Zero-downtime** - минимальное время простоя (5-10 секунд)

---

## 🎓 Образовательная ценность

Эта демонстрация показывает:

- ✅ Многоуровневую защиту (tests → deployment → rollback)
- ✅ Автоматическое восстановление при критических ошибках
- ✅ Git-based rollback стратегию
- ✅ Production resilience (устойчивость)
- ✅ CI/CD best practices
