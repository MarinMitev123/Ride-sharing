# Публичен деплой в облак – стъпка по стъпка

Деплой **само в облак**, без локален Kubernetes. Препоръчана платформа: **[Civo](https://www.civo.com/)**.

---

## Защо Civo?

- Managed Kubernetes (не инсталираш нищо ръчно)
- **$250 безплатен кредит** при регистрация (достатъчно за дипломна + демо)
- Клъстер за ~5–10 минути
- Публичен Load Balancer включен

Алтернатива за дългосрочно безплатно: **Oracle Cloud Free** + k3s (по-сложно) – виж края на файла.

---

## Стъпка 1: Регистрация в Civo

1. Отвори https://www.civo.com/ и създай акаунт
2. Потвърди имейла
3. Вземи безплатния кредит ($250)

---

## Стъпка 2: Създай Kubernetes клъстер

1. Влез в https://dashboard.civo.com/
2. **Kubernetes** → **Create cluster**
3. Настройки (подходящи за дипломна):
   - **Region:** Frankfurt (или най-близък)
   - **Size:** Small (2 nodes, 2GB RAM) – достатъчно
   - **Network:** Default
   - **Name:** `carpool`
4. Натисни **Create** – изчакай ~3–5 минути

---

## Стъпка 3: Свали kubeconfig

1. В Civo dashboard → твоят клъстер → **Download kubeconfig**
2. Запази файла, напр. `C:\Users\Marin Mitev\Downloads\civo-carpool.yaml`

---

## Стъпка 4: Инсталирай инструменти на Windows

| Инструмент | Линк |
|------------|------|
| Docker Desktop | https://www.docker.com/products/docker-desktop/ |
| kubectl | `winget install Kubernetes.kubectl` |
| Helm | `winget install Helm.Helm` |

Провери:
```powershell
docker --version
kubectl version --client
helm version
```

---

## Стъпка 5: Docker Hub (за images)

Облачният клъстер трябва да дръпне images от registry (не от твоя компютър).

1. Регистрация: https://hub.docker.com/
2. Създай repository-та (по избор – скриптът push-ва директно):
   - `carpool-backend`
   - `carpool-frontend`
3. Вход:
   ```powershell
   docker login
   ```

---

## Стъпка 6: Деплой (един скрипт)

```powershell
cd "C:\Users\Marin Mitev\Diplomna"

# Задай kubeconfig от Civo
$env:KUBECONFIG="C:\Users\Marin Mitev\Downloads\civo-carpool.yaml"

# Провери връзката
kubectl get nodes

# Деплой (смени USERNAME с твоя Docker Hub username)
.\deploy\scripts\deploy-cloud.ps1 -Registry "docker.io/USERNAME"
```

Скриптът автоматично:
1. Инсталира **nginx Ingress** с публичен Load Balancer
2. Build-ва и push-ва images в Docker Hub
3. Създава namespace **`carpool`**
4. Деплойва 3-те pod-а (mysql, backend, frontend)
5. Взима публичния IP и задава host `IP.nip.io`
6. Извежда публичния URL

**Примерен резултат:**
```
URL: http://74.220.123.45.nip.io
Health: http://74.220.123.45.nip.io/api/v1/health
```

Отвори URL-а в браузър – приложението е публично от интернет.

---

## Стъпка 7: Проверка

```powershell
kubectl get pods -n carpool
kubectl logs -n carpool -l app.kubernetes.io/component=backend --tail=50
```

Всички 3 pod-а трябва да са `Running`:
- `carpool-mysql-0`
- `carpool-carpool-backend-...`
- `carpool-carpool-frontend-...`

---

## Често срещани проблеми

### `ImagePullBackOff`
- Провери `docker login` и дали images са public в Docker Hub
- Или направи repository-тата Public в hub.docker.com

### Backend `CrashLoopBackOff`
```powershell
kubectl logs -n carpool -l app.kubernetes.io/component=backend
```
Обикновено MySQL още не е готов – изчакай 1–2 минути.

### Няма публичен IP
```powershell
kubectl get svc -n ingress-nginx
```
Ако `EXTERNAL-IP` е `<pending>`, изчакай 2–3 минути в Civo.

### Helm не е намерен
```powershell
winget install Helm.Helm
```
Рестартирай PowerShell.

---

## Разходи (Civo)

- Small клъстер: ~$0.02–0.05/час
- $250 кредит ≈ **няколко месеца** демо при спиране след ползване
- **Спри клъстера** от Civo dashboard когато не го ползваш!

---

## Алтернатива: Oracle Cloud Free (безсрочно)

1. Създай Ampere A1 VM (Ubuntu 22.04) – безплатно
2. Отвори портове 80, 443 в Security List
3. На VM-то:
   ```bash
   curl -sfL https://get.k3s.io | sh -
   sudo chmod 644 /etc/rancher/k3s/k3s.yaml
   ```
4. Копирай kubeconfig на Windows
5. Пусни `deploy-cloud.ps1` с Docker Hub registry

По-сложно от Civo, но безсрочно безплатно.

---

## Файлове

| Файл | Описание |
|------|----------|
| `deploy/scripts/deploy-cloud.ps1` | Cloud deploy за Windows |
| `deploy/scripts/deploy-cloud.sh` | Cloud deploy за Linux/macOS |
| `deploy/helm/carpool/` | Helm chart (3 pod-а) |
