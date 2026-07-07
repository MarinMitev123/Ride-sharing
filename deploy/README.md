# Деплой на Carpool в Kubernetes

## Деплой с Docker (най-лесно, без Kubernetes)

**Виж:** [`DOCKER.md`](./DOCKER.md)

```powershell
.\deploy\scripts\docker-run.ps1
```

Отваря **http://localhost** – 3 контейнера: MySQL, backend, frontend.

---

## Публичен облачен деплой (Kubernetes)

**Виж пълното ръководство:** [`CLOUD-DEPLOY.md`](./CLOUD-DEPLOY.md)

Бърз старт с **Civo** + Docker Hub:

```powershell
$env:KUBECONFIG="C:\path\to\civo-kubeconfig.yaml"
.\deploy\scripts\deploy-cloud.ps1 -Registry "docker.io/ТВОЯТ_DOCKERHUB_USERNAME"
```

Скриптът build-ва images, push-ва ги в облака, създава namespace `carpool` и връща публичен URL.

---

## Препоръка за безплатна публична платформа

| Платформа | Плюсове | Минуси |
|-----------|---------|--------|
| **[Civo](https://www.civo.com/)** (препоръчано за дипломна) | Managed Kubernetes, $250 безплатен кредит, бърз старт | След изчерпване на кредита – платено |
| **[Oracle Cloud Free Tier](https://www.oracle.com/cloud/free/)** | Безсрочно безплатни ARM VM (до 4 OCPU) | По-сложна настройка – инсталираш **k3s** ръчно |
| **kind (локално)** | Безплатно, идеално за тест на Helm chart-а | Не е публично от интернет (освен с тунел) |

**Препоръка:** За дипломна защита – **Civo** (най-лесно). За дългосрочно безплатно – **Oracle VM + k3s**.

---

## Архитектура (namespace `carpool`)

```
Ingress (nginx)
  /      → frontend Pod (nginx + React)
  /api   → backend Pod (Spring Boot)
MySQL Pod (StatefulSet + PVC)  ← вътрешен Service, не е публичен
```

3 отделни workload-а: **frontend**, **backend**, **mysql**.

---

## Бърз старт (локално с kind – само за тест)

> За публичен деплой ползвай `deploy-cloud.ps1` – виж [`CLOUD-DEPLOY.md`](./CLOUD-DEPLOY.md).

### Предпоставки

- [Docker Desktop](https://www.docker.com/products/docker-desktop/)
- [kubectl](https://kubernetes.io/docs/tasks/tools/)
- [Helm](https://helm.sh/docs/intro/install/)
- [kind](https://kind.sigs.k8s.io/docs/user/quick-start/)

### Windows

```powershell
cd "C:\Users\Marin Mitev\Diplomna"
.\deploy\scripts\deploy.ps1 -CreateKindCluster
```

### Linux / macOS

```bash
chmod +x deploy/scripts/deploy.sh
./deploy/scripts/deploy.sh --create-kind
```

Скриптът:
1. Създава kind клъстер `carpool`
2. Инсталира nginx Ingress
3. Build-ва Docker images
4. Създава namespace `carpool`
5. Деплойва Helm chart

След deploy отвори URL-а от изхода (обикновено `http://localhost:3xxxx`).

---

## Публичен деплой (Civo пример)

1. Създай Kubernetes клъстер в [Civo](https://dashboard.civo.com/)
2. Свали kubeconfig и задай:
   ```powershell
   $env:KUBECONFIG="C:\path\to\civo-kubeconfig"
   ```
3. Push images към Docker Hub (безплатен акаунт):
   ```powershell
   docker login
   .\deploy\scripts\deploy.ps1 `
     -Registry "docker.io/ТВОЯТ_USERNAME" `
     -IngressHost "1.2.3.4.nip.io" `
     -PublicUrl "http://1.2.3.4.nip.io"
   ```
   Замени `1.2.3.4` с публичния IP на Load Balancer-а (виж `kubectl get svc -n ingress-nginx`).

4. Инсталирай nginx ingress в Civo (ако липсва):
   ```bash
   helm repo add ingress-nginx https://kubernetes.github.io/ingress-nginx
   helm upgrade --install ingress-nginx ingress-nginx/ingress-nginx -n ingress-nginx --create-namespace
   ```

---

## Oracle Cloud Free (k3s)

1. Създай **Ampere A1** VM (Ubuntu 22.04)
2. Отвори портове 80, 443, 6443 в Security List
3. Инсталирай k3s:
   ```bash
   curl -sfL https://get.k3s.io | sh -
   export KUBECONFIG=/etc/rancher/k3s/k3s.yaml
   ```
4. Build-вай images **на VM-то** или push към Docker Hub
5. Пусни `deploy.sh` с `--registry` и `--host`

---

## Helm chart

```
deploy/helm/carpool/
  Chart.yaml
  values.yaml
  templates/
    mysql-*.yaml
    backend-*.yaml
    frontend-*.yaml
    ingress.yaml
```

Промяна на стойности:

```bash
helm upgrade --install carpool deploy/helm/carpool -n carpool \
  --set mysql.rootPassword='strong-password' \
  --set backend.jwtSecret='your-base64-secret' \
  --set ingress.host='carpool.example.com' \
  --set publicBaseUrl='https://carpool.example.com'
```

---

## Environment variables (production)

| Променлива | Къде | Описание |
|------------|------|----------|
| `SPRING_DATASOURCE_URL` | backend | JDBC URL към MySQL Service |
| `JWT_SECRET` | backend | Задължително смени в production |
| `APP_FRONTEND_BASE_URL` | backend | Публичен URL (reset парола, Stripe) |
| `APP_CORS_EXTRA_ORIGIN_PATTERNS` | backend | HTTPS origin на фронтенда |
| `STRIPE_*` | backend | Ако ползваш плащания |
| `VITE_API_URL` | frontend build | Празно = same-origin `/api` през Ingress |

---

## Проверка

```bash
kubectl get pods -n carpool
kubectl logs -n carpool -l app.kubernetes.io/component=backend
curl http://<INGRESS>/api/v1/health
```

---

## Локални поправки (направени)

- `frontend/src/api/client.ts` – в production не ползва `localhost:8080` по подразбиране
- `frontend/Dockerfile` – `VITE_API_URL` празен; API през Ingress
- `GeocodeService` – Referer от `APP_FRONTEND_BASE_URL`, не hardcoded localhost
