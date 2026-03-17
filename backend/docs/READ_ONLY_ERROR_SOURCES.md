# Откъде идва грешката "Connection is read-only" при INSERT в ride_stops

Грешката се появява когато приложението опитва да запише ред в таблицата `ride_stops`, но текущата транзакция/връзка е в **read-only** режим.

## Места в кода, където се прави INSERT в ride_stops

### 1. RideService.ensureRouteAndStops() (редове ~70–75)

- **Какво прави:** записва **START** и **END** спирки за едно пътуване.
- **Кой го вика:**
  - **RideService.createRide()** – при създаване на ново пътуване (POST `/api/v1/rides`). Транзакцията е `@Transactional(readOnly = false)`.
  - **RideService.ensureRouteAndStopsForRide()** – викан само от **RideRouteEnhancerService.ensureRouteAndStopsFromGeocode()**. Този enhancer **вече не се вика** от `getRouteWithStops()` (GET маршрут е само четене), така че при отваряне на картата не би трябвало да има запис оттук.

### 2. RideService.bookRide() (редове ~411–412)

- **Какво прави:** записва **PICKUP** и **DROPOFF** спирки при резервация.
- **Кой го вика:** **RideController.bookRide()** при POST `/api/v1/rides/{id}/book` (бутон „Резервирай място“).
- **Транзакция:** `@Transactional(propagation = REQUIRES_NEW, readOnly = false)` – винаги нова транзакция за запис.

## Възможни причини за read-only

1. **Стар код / нерестартиран бекенд** – ако все още се вика `RideRouteEnhancerService` от GET `/route`, записът ще е в read-only контекст. Рестартирайте бекенда след последните промени (GET маршрут вече не записва в БД).
2. **MySQL / потребител** – ако потребителят за БД или връзката е с права само за четене, всички INSERT ще падат. Проверете потребителя в `application.yml` и правата в MySQL.
3. **DataSource с read-only** – ако в конфигурацията има зададено read-only за DataSource или за някоя от връзките, транзакциите ще са read-only.

## Какво е направено в кода

- **GET `/rides/{id}/route`** – вече **не** записва в БД; при липса на координати маршрутът се изчислява в паметта и се връща само в отговора.
- **bookRide()** – използва `REQUIRES_NEW` и `readOnly = false`, за да работи винаги в отделна транзакция за запис.
- **createRide()** – е маркиран с `readOnly = false`.

Ако след рестарт на бекенда грешката продължава, проверете логовете за точния endpoint (GET route vs POST book) и конфигурацията на базата данни.
