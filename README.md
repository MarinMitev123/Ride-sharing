# Споделено пътуване (Carpool)

Дипломен проект – уеб приложение за споделени пътувания с бекенд на Java Spring Boot и фронтенд на React + TypeScript.

## Стек

- **Backend:** Java 17+, Spring Boot 3.3, Spring Security (JWT), MySQL, Flyway
- **Frontend:** React 18, Vite 4, TypeScript, Leaflet (карти)
- **База данни:** MySQL 8

## Изисквания

- JDK 17+
- Node.js 16+ (препоръчително 18+)
- MySQL на `localhost:3306` с база `carpool_db`, потребител `root`, парола `root`

## Стартиране

### 1. База данни

Създай базата и пусни миграциите:

```sql
CREATE DATABASE IF NOT EXISTS carpool_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

Flyway ще приложи миграциите при първото стартиране на бекенда.

### 2. Backend

```bash
cd backend
./mvnw spring-boot:run
```

Сървърът е на **http://localhost:8080**.

При първо стартиране се създава **тестов потребител**, с който можеш да влезнеш веднага:
- **Имейл:** `test@example.com`
- **Парола:** `password123`

(Ако вече има потребител с този имейл, тестовият не се създава отново.)

### 3. Frontend

```bash
cd frontend
npm install
npm run dev
```

Приложението е на **http://localhost:5173**.

За да сочи към друг API адрес:

```bash
# .env или .env.local
VITE_API_URL=http://localhost:8080
```

## Функционалности

- **Регистрация и вход** – JWT автентикация, rate limiting за login/register
- **Промяна на парола** – `POST /api/v1/auth/change-password`
- **Забравена парола** – forgot-password, reset-password по имейл линк
- **Пътувания** – търсене по град (от/до), дата, сортиране (дата/час, цена), пагинация
- **Карта** – Leaflet карта с полилиния маршрут и маркери за качване/слизане
- **Резервации** – одобрение/отказ от шофьор, отмяна от пътник, място за качване с геокодиране
- **Чат** – съобщения между шофьор и пътник по пътуване
- **Оценки** – след приключено пътуване, показване в профил
- **Админ** – списък потребители, блокиране/отблокиране, статистики (роля `ROLE_ADMIN`)
- **Профил** – редакция на име и телефон, смяна на парола, последни оценки
- **Глобална обработка на грешки** – тостове при API грешки, 401 → изход и пренасочване към вход

## API (пълен преглед)

- **Swagger UI:** след стартиране на backend отворете **http://localhost:8080/swagger-ui.html**

| Област | Метод | Път | Описание |
|--------|-------|-----|----------|
| Auth | POST | `/api/v1/auth/register` | Регистрация |
| Auth | POST | `/api/v1/auth/login` | Вход |
| Auth | POST | `/api/v1/auth/change-password` | Промяна на парола (JWT) |
| Auth | POST | `/api/v1/auth/forgot-password` | Забравена парола |
| Auth | POST | `/api/v1/auth/reset-password` | Нулиране на парола по токен |
| Users | GET | `/api/v1/users/me` | Текущ потребител |
| Users | PATCH | `/api/v1/users/me` | Редакция на профил (име, телефон) |
| Rides | GET | `/api/v1/rides?fromCity=&toCity=&date=&page=&size=&sortBy=&sortDir=` | Списък/търсене с пагинация |
| Rides | GET | `/api/v1/rides/{id}` | Детайли за пътуване |
| Rides | POST | `/api/v1/rides` | Създаване на пътуване (JWT) |
| Bookings | POST | `/api/v1/bookings` | Резервация |
| Bookings | GET | `/api/v1/rides/{rideId}/bookings` | Резервации за пътуване (шофьор) |
| Bookings | GET | `/api/v1/bookings/my` | Мои резервации |
| Bookings | PATCH | `/api/v1/bookings/{id}/pickup` | Място за качване |
| Bookings | PATCH | `/api/v1/bookings/{id}/approve` | Одобрение (шофьор) |
| Bookings | PATCH | `/api/v1/bookings/{id}/reject` | Отказ (шофьор) |
| Bookings | DELETE | `/api/v1/bookings/{id}` | Отмяна на резервация |
| Chat | GET | `/api/v1/chat/ride/{rideId}/with/{otherUserId}` | Разговор по пътуване |
| Chat | POST | `/api/v1/chat` | Изпращане на съобщение |
| Ratings | POST | `/api/v1/ratings` | Създаване на оценка |
| Ratings | GET | `/api/v1/ratings/user/{userId}` | Оценки за потребител |
| Admin | GET | `/api/v1/admin/users` | Всички потребители (ADMIN) |
| Admin | POST | `/api/v1/admin/users/{id}/block` | Блокиране (ADMIN) |
| Admin | POST | `/api/v1/admin/users/{id}/unblock` | Отблокиране (ADMIN) |
| Admin | GET | `/api/v1/admin/stats` | Статистики (ADMIN) |
| Health | GET | `/api/v1/health` | Здравен проверка |

Всички крайни точки освен `/api/v1/auth/**`, `/api/v1/geocode`, `/api/v1/health` и Swagger изискват заглавка `Authorization: Bearer <token>`.

## Конфигурация (env)

За production задайте променливи на средата (или `.env`):

- `SPRING_DATASOURCE_URL`, `SPRING_DATASOURCE_USERNAME`, `SPRING_DATASOURCE_PASSWORD` – MySQL
- `JWT_SECRET` – base64-кодиран секрет (мин. 256 бита)
- `JWT_EXPIRY_HOURS` – срок на токена в часове (по подразбиране 24)

Пример: вижте `.env.example`.

## Docker

Стартиране на цялото приложение (MySQL + backend + frontend) с Docker Compose:

```bash
docker-compose up --build
```

- **Frontend:** http://localhost (порт 80)
- **Backend API:** http://localhost:8080 (проксиран през nginx при достъп от браузър към /api)
- **MySQL:** порт 3306 (вътрешен за контейнерите)

За разработка продължавай да ползваш локално MySQL + `./mvnw spring-boot:run` и `npm run dev`.

**Тестове:** Backend – `mvn test`. Frontend – `npm run test` (изисква Node 18+ за Vitest).

## Forgot Password локален тест

1. Стартирайте backend и frontend.
2. Отворете login страницата.
3. Натиснете „Забравена парола?“
4. Въведете тестов email.
5. Ако email съществува, backend ще изпише reset link в конзолата.
6. Копирайте линка: `http://localhost:5173/reset-password?token=...`
7. Въведете нова парола.
8. Влезте с новата парола.

Важно:
- В реална production среда линкът се изпраща по email.
- В този дипломен проект за development/demo reset link-ът се показва в backend конзолата, защото се използват тестови/измислени email адреси.

## Структура на проекта

```
Diplomna/
├── backend/          # Spring Boot приложение
│   └── src/main/java/com/example/carpool/
│       ├── auth/      # Регистрация, вход, смяна на парола
│       ├── user/      # Потребители, роли, статус
│       ├── ride/      # Пътувания, търсене
│       ├── booking/   # Резервации, място за качване
│       ├── chat/      # Съобщения по пътуване
│       ├── rating/    # Оценки след пътуване
│       ├── config/    # Security, CORS
│       ├── security/  # JWT филтър и сервис
│       └── exception/ # GlobalExceptionHandler
├── frontend/         # React + Vite
│   └── src/
│       ├── api/       # API клиент (auth, rides)
│       ├── components/ # RideMap и др.
│       ├── contexts/  # AuthContext
│       ├── pages/     # Login, Register, RidesList, RideDetail
│       └── types/     # TypeScript типове
└── README.md
```

## Достъпност (a11y)

- Формите използват `<label>` свързани с полета; бутоните имат четлив текст или `aria-label` при нужда.
- Глобалните известия (тостове) имат `role="alert"` и `aria-live="polite"`.
- За пълна поддръжка препоръчително е да се добави проверка с axe-core или eslint-plugin-jsx-a11y.

## Лиценз

Дипломна работа – образователни цели.
