# Self-Hosting Idswyft

This guide covers running the full Idswyft stack (core API + VaaS layer + admin dashboards) on your own server using Docker Compose.

---

## Prerequisites

- Docker Engine 24+ and Docker Compose v2
- A domain with DNS access (three subdomains required)
- TLS certificates (Let's Encrypt / Certbot recommended)
- Two Supabase projects: one for core, one for VaaS (or a single project with separate schemas)

---

## Quick Start

### 1. Clone the repository

```bash
git clone https://github.com/your-org/idswyft.git
cd idswyft
```

### 2. Configure environment

```bash
cp .env.example .env
```

Open `.env` and fill in every required value. Generate secrets with:

```bash
node -e "console.log(require('crypto').randomBytes(64).toString('hex'))"
```

Key values to set:
- `SUPABASE_URL` / `SUPABASE_SERVICE_ROLE_KEY` / `SUPABASE_ANON_KEY`
- `JWT_SECRET` (min 32 chars)
- `API_KEY_SECRET` (min 32 chars)
- `ENCRYPTION_KEY` (exactly 32 chars)
- `SERVICE_TOKEN` (min 64 hex chars — shared between backend and vaas-backend)
- All `VAAS_*` variables for the VaaS tenant layer

### 3. Add TLS certificates

Place your certificates in `nginx/ssl/`:

```bash
mkdir -p nginx/ssl
cp /path/to/cert.pem nginx/ssl/cert.pem
cp /path/to/key.pem  nginx/ssl/key.pem
```

With Certbot:

```bash
certbot certonly --standalone -d api.yourdomain.com -d vaas.yourdomain.com -d portal.yourdomain.com
cp /etc/letsencrypt/live/api.yourdomain.com/fullchain.pem nginx/ssl/cert.pem
cp /etc/letsencrypt/live/api.yourdomain.com/privkey.pem   nginx/ssl/key.pem
```

### 4. Update domain names in nginx.conf

Edit `nginx/nginx.conf` and replace the three `yourdomain.com` placeholders:

```nginx
server_name api.yourdomain.com;    # → your actual domain
server_name vaas.yourdomain.com;   # → your VaaS subdomain
server_name portal.yourdomain.com; # → your customer portal subdomain
```

### 5. Run database migrations

Apply the SQL migrations in order to your Supabase project:

```bash
# Via Supabase CLI
supabase db push

# Or manually via Supabase SQL editor — run files in supabase/migrations/ in order
```

### 6. Start the stack

```bash
docker compose up -d
```

Check that all services are healthy:

```bash
docker compose ps
```

All services should show `(healthy)` or `Up` status.

---

## Architecture

```
                  ┌─────────────────────────────────────┐
Internet ──HTTPS──▶         nginx (ports 80/443)         │
                  └────┬──────────────┬─────────────────┘
                       │              │
          api.yourdomain.com    vaas.yourdomain.com
          portal.yourdomain.com
                       │              │
               ┌───────▼──┐   ┌──────▼────────┐
               │  backend  │   │ vaas-backend  │
               │  :3001    │   │   :3002       │
               └───────────┘   └───────────────┘
               ┌───────────────────────────────┐
               │    frontend / vaas-admin /    │
               │    customer-portal (static)   │
               └───────────────────────────────┘
```

Services communicate over Docker's internal network. Only nginx is exposed externally.

---

## Development Mode

For local development with hot-reload, skip nginx and use direct ports:

```bash
docker compose -f docker-compose.yml -f docker-compose.dev.yml up
```

The backend is available at `http://localhost:3001` and VaaS backend at `http://localhost:3002`.

---

## Environment Variables Reference

| Variable | Required | Description |
|----------|----------|-------------|
| `SUPABASE_URL` | Yes | Supabase project URL |
| `SUPABASE_SERVICE_ROLE_KEY` | Yes | Service role key (bypasses RLS) |
| `SUPABASE_ANON_KEY` | Yes | Anonymous key (client-facing) |
| `JWT_SECRET` | Yes | JWT signing secret (min 32 chars) |
| `API_KEY_SECRET` | Yes | API key hashing secret |
| `ENCRYPTION_KEY` | Yes | File encryption key (exactly 32 chars) |
| `SERVICE_TOKEN` | Yes | Internal service-to-service token |
| `CORS_ORIGINS` | Yes | Comma-separated allowed origins |
| `VAAS_SUPABASE_URL` | Yes | VaaS Supabase project URL |
| `VAAS_JWT_SECRET` | Yes | VaaS JWT signing secret |
| `VAAS_SUPER_ADMIN_EMAILS` | Yes | Comma-separated super-admin emails |
| `STORAGE_PROVIDER` | No | `supabase` (default), `local`, or `s3` |
| `OPENAI_API_KEY` | No | Enables GPT-4 Vision OCR fallback |
| `MAILGUN_API_KEY` | No | Enables email invitations |
| `SANDBOX_MODE` | No | Set `true` for development/testing |

---

## Updating

```bash
git pull
docker compose build --no-cache
docker compose up -d
```

Run any new migrations before restarting services.

---

## Troubleshooting

**Service won't start (unhealthy):**
```bash
docker compose logs backend
docker compose logs vaas-backend
```

**Nginx 502 Bad Gateway:**
Check that the backend containers are healthy before nginx starts:
```bash
docker compose ps
docker compose restart nginx
```

**Permission denied on uploads:**
The `backend_uploads` volume is owned by the container's node user. If you're mounting a host directory instead, ensure it's writable by UID 1000.

**Certificate errors:**
Verify your cert.pem and key.pem are present in `nginx/ssl/` and not expired:
```bash
openssl x509 -in nginx/ssl/cert.pem -text -noout | grep -E "Not (Before|After)"
```
