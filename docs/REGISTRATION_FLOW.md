# Поток на регистрация (свързване фронтенд ↔ бекенд)

## Проверка: двете части са свързани коректно

### 1. Фронтенд (React)

| Стъпка | Файл | Действие |
|--------|------|----------|
| 1 | `Register.tsx` | Потребителят попълва форма (email, парола, име, телефон по избор) и натиска „Регистрация“. |
| 2 | `AuthContext.tsx` | Извиква `authApi.register({ email, password, name, phone? })`. |
| 3 | `api/auth.ts` | Извиква `apiRequest('/auth/register', { method: 'POST', body: JSON.stringify(body) })`. |
| 4 | `api/client.ts` | Изпраща `POST` към `{VITE_API_URL}/api/v1/auth/register` с тяло `Content-Type: application/json`. |

**Изпращано тяло (JSON):** `{ "email": "...", "password": "...", "name": "...", "phone": "..." }` или без `phone`, ако е празно.

### 2. Бекенд (Spring Boot)

| Стъпка | Компонент | Действие |
|--------|-----------|----------|
| 1 | `SecurityConfig` | `/api/v1/auth/**` е `permitAll()` – няма нужда от JWT за регистрация. |
| 2 | `AuthController` | `POST /api/v1/auth/register` приема `@Valid @RequestBody RegisterRequest`. |
| 3 | `RegisterRequest` | Полета: `email`, `password` (min 6), `name`, `phone` (по избор), `role` (по избор; по подразбиране ROLE_PASSENGER). |
| 4 | `AuthService.register()` | Проверява дали имейлът съществува; хешира паролата; записва потребител в БД; генерира JWT; връща `AuthResponse(token, user)`. |

### 3. Обратно към фронтенда

| Стъпка | Действие |
|--------|----------|
| 1 | `api/client.ts` получава `200 OK` и парсва JSON като `AuthResponse`. |
| 2 | `AuthContext` записва `token` и `user` в `localStorage` и в state. |
| 3 | `Register.tsx` пренасочва към `/rides`. |

### 4. Съвместимост на полетата

| Поле | Фронтенд → бекенд | Бекенд отговор |
|------|-------------------|----------------|
| email | Изпраща се | Задължителен, валиден имейл |
| password | Изпраща се, min 6 символа | Задължителен, min 6 |
| name | Изпраща се | Задължителен |
| phone | По избор (или се пропуска) | По избор, може null |
| role | Не се изпраща | По подразбиране ROLE_PASSENGER |

---

**Заключение:** Създаването на потребител е свързано между двете части. За да работи, бекендът трябва да е пуснат и достъпен на адреса, зададен във фронтенда (по подразбиране `http://localhost:8080`). Проверка: отвори в браузър `http://localhost:8080/api/v1/health` – трябва да видиш `{"status":"UP"}`.
