# Деплой с Docker (без Kubernetes)

Най-простият начин да пуснеш приложението – 3 контейнера: **MySQL**, **backend**, **frontend**.

## Локално (Windows)

```powershell
cd "C:\Users\Marin Mitev\Diplomna"
.\deploy\scripts\docker-run.ps1
```

Отвори: **http://localhost**

## Публичен облак (VM с Docker)

Подходящи безплатни платформи:
- **Oracle Cloud Free** – Ampere VM + Docker
- **Google Cloud** – e2-micro free tier
- **AWS EC2** – free tier 12 месеца

### На VM-то (Ubuntu)

```bash
# Инсталирай Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# излез и влез отново в SSH

git clone https://github.com/MarinMitev123/Ride-sharing.git
cd Ride-sharing
chmod +x deploy/scripts/docker-run.sh

# Смени 1.2.3.4 с публичния IP на VM-то
./deploy/scripts/docker-run.sh --public-url http://1.2.3.4
```

Отвори порт **80** в firewall/security group на облака.

## Команди

| Действие | Windows | Linux |
|----------|---------|-------|
| Старт | `.\deploy\scripts\docker-run.ps1` | `./deploy/scripts/docker-run.sh` |
| Спиране | `.\deploy\scripts\docker-run.ps1 -Down` | `./deploy/scripts/docker-run.sh --down` |
| Логове | `.\deploy\scripts\docker-run.ps1 -Logs` | `./deploy/scripts/docker-run.sh --logs` |
| Статус | `.\deploy\scripts\docker-run.ps1 -Action status` | `./deploy/scripts/docker-run.sh --status` |

## Конфигурация

Копирай `.env.docker.example` → `.env.docker`:

```env
PUBLIC_URL=http://localhost
JWT_SECRET=твой-секретен-ключ
MYSQL_ROOT_PASSWORD=root
```

## Архитектура

```
Браузър → :80 frontend (nginx)
              └─ /api/* → backend:8080
                    └─ mysql:3306
```

## Проверка

```bash
curl http://localhost/api/v1/health
# {"status":"UP"}
```

## Спиране и изтриване на данни

```powershell
.\deploy\scripts\docker-run.ps1 -Down
docker compose down -v   # изтрива и MySQL данните
```
