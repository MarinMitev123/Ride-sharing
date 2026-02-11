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

- **Регистрация и вход** – JWT автентикация
- **Промяна на парола** – `POST /api/v1/auth/change-password`
- **Пътувания** – търсене по град (от/до) и дата, преглед на детайли
- **Карта** – Leaflet карта с маршрут и точки за качване (областни градове в България)
- **Резервации** – шофьорът вижда резервациите за свое пътуване: `GET /api/v1/rides/{id}/bookings`
- **Админ** – списък потребители, блокиране/отблокиране, статистики (роля `ROLE_ADMIN`)
- **Глобална обработка на грешки** – единен JSON формат за грешки

## API (кратко)

| Метод | Път | Описание |
|-------|-----|----------|
| POST | `/api/v1/auth/register` | Регистрация |
| POST | `/api/v1/auth/login` | Вход |
| POST | `/api/v1/auth/change-password` | Промяна на парола (JWT) |
| GET | `/api/v1/rides?fromCity=&toCity=&date=` | Списък/търсене пътувания |
| GET | `/api/v1/rides/{id}` | Детайли за пътуване |
| GET | `/api/v1/rides/{id}/bookings` | Резервации за пътуване (само шофьор) |
| POST | `/api/v1/rides` | Създаване на пътуване (JWT) |

Всички крайни точки освен `/api/v1/auth/**` изискват заглавка `Authorization: Bearer <token>`.

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

## Лиценз

Дипломна работа – образователни цели.
