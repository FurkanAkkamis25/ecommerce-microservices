# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Proje Genel Bakış

Cloud-native, mikroservis tabanlı e-ticaret backend platformu. Her servis bağımsız Node.js + TypeScript uygulamasıdır, kendi PostgreSQL veritabanına sahiptir ve ayrı Docker container'ında çalışır.

## Servisler ve Portlar

| Servis | Port | Klasör |
|--------|------|--------|
| User Service | 3001 | `services/user-service/` |
| Product Service | 3002 | `services/product-service/` |
| Order Service | 3003 | `services/order-service/` |

## Komutlar

### Local Geliştirme

```bash
# Tüm servisleri docker-compose ile başlat
docker-compose up

# Tek servis başlat
docker-compose up user-service

# Belirli bir servisi geliştirme modunda çalıştır
cd services/user-service && npm run dev

# Tek servis için test
cd services/user-service && npm test

# Tüm servisler için test
npm run test --workspaces
```

### Docker

```bash
# Tek servis image'ı build et
docker build -t user-service ./services/user-service

# Tüm image'ları build et
docker-compose build
```

### Kubernetes & Helm

```bash
# Minikube başlat
minikube start

# Helm ile deploy et
helm install ecommerce ./helm/ecommerce --namespace ecommerce --create-namespace

# Güncelleme
helm upgrade ecommerce ./helm/ecommerce -n ecommerce

# Pod durumunu kontrol et
kubectl get pods -n ecommerce

# Servis loglarını izle
kubectl logs -f deployment/user-service -n ecommerce
```

## Mimari Kararlar

### Servisler Arası İletişim
Servisler birbirini doğrudan HTTP ile çağırır. Order Service, sipariş oluştururken Product Service'e stok düşmesi için istek atar. JWT doğrulama her servis tarafından bağımsız yapılır — ortak bir auth gateway yoktur.

### Veritabanı Stratejisi
Her servisin kendi PostgreSQL instance'ı vardır (Database per Service pattern). Servisler birbirinin veritabanına doğrudan erişmez.

### Kimlik Doğrulama
User Service JWT üretir. Diğer servisler gelen isteklerdeki JWT'yi `JWT_SECRET` environment variable'ı ile doğrular. Secret tüm servisler arasında paylaşılır.

### Monitoring
Her servis `/metrics` endpoint'i üzerinden Prometheus formatında metrik yayar (`prom-client` paketi). Prometheus bu endpoint'leri scrape eder, Grafana görselleştirir.

## Environment Variables

Her servis için `.env` dosyası gereklidir:

```
DATABASE_URL=postgresql://user:password@localhost:5432/dbname
JWT_SECRET=your-secret-key
PORT=3001
```

Kubernetes ortamında bu değerler `Secret` ve `ConfigMap` objelerinden gelir.

## CI/CD

`.github/workflows/ci-cd.yaml` — `main` branch'e push edilince:
1. Her servis için testler çalışır
2. Docker image'ları build edilip GitHub Container Registry'ye push edilir
3. Kubernetes'e Helm üzerinden deploy edilir
