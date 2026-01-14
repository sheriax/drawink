# Drawink Deployment Guide

This guide covers deploying Drawink to Google Cloud Run with a custom domain.

## Quick Start

**For existing deployments, simply run:**

```bash
bun deploy
```

Or for quick deploy (skips confirmation prompts):

```bash
bun deploy:quick
```

The deployment script will:
1. Build the Docker image
2. Tag and push to Artifact Registry
3. Deploy to Cloud Run with optimized settings

**For first-time setup, see [First-Time Setup](#first-time-setup) below.**

---

## Prerequisites

### 1. Google Cloud SDK (gcloud)

**macOS (using Homebrew):**
```bash
brew install --cask google-cloud-sdk
```

**Or download directly:**
```bash
curl https://sdk.cloud.google.com | bash
gcloud init
```

**After installation, authenticate:**
```bash
gcloud auth login
gcloud config set project drawink-2026
```

### 2. Docker

**macOS:**
```bash
brew install --cask docker
```

After installation, open Docker Desktop and wait for it to start.

### 3. Verify Installation

```bash
docker --version
gcloud --version
```

---

## Project Configuration

| Setting | Value |
|---------|-------|
| **Project ID** | `drawink-2026` |
| **Project Number** | `731425062456` |
| **Region** | `asia-south1` |
| **Custom Domain** | `drawink.app` |
| **Static IP** | `35.241.3.91` |

---

## First-Time Setup

### Step 1: Enable Required APIs

```bash
gcloud services enable \
  artifactregistry.googleapis.com \
  run.googleapis.com \
  compute.googleapis.com \
  --project=drawink-2026
```

### Step 2: Create Artifact Registry Repository

```bash
gcloud artifacts repositories create drawink \
  --repository-format=docker \
  --location=asia-south1 \
  --description="Drawink Docker images" \
  --project=drawink-2026
```

### Step 3: Configure Docker Authentication

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

### Step 4: Deploy

```bash
bun deploy
```

### Step 5: Make Service Publicly Accessible

Create `iam-policy.yaml`:

```yaml
bindings:
- members:
  - allUsers
  role: roles/run.invoker
```

Apply the policy:

```bash
gcloud run services set-iam-policy drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  iam-policy.yaml
```

---

## Custom Domain Setup (Load Balancer)

Since `asia-south1` doesn't support Cloud Run domain mappings, we use a Global Load Balancer.

### Step 1: Create Serverless Network Endpoint Group (NEG)

```bash
gcloud compute network-endpoint-groups create drawink-neg \
  --region=asia-south1 \
  --network-endpoint-type=serverless \
  --cloud-run-service=drawink \
  --project=drawink-2026
```

### Step 2: Create Backend Service

```bash
gcloud compute backend-services create drawink-backend \
  --global \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --project=drawink-2026

gcloud compute backend-services add-backend drawink-backend \
  --global \
  --network-endpoint-group=drawink-neg \
  --network-endpoint-group-region=asia-south1 \
  --project=drawink-2026
```

### Step 3: Create URL Map

```bash
gcloud compute url-maps create drawink-urlmap \
  --default-service=drawink-backend \
  --global \
  --project=drawink-2026
```

### Step 4: Create SSL Certificate

```bash
gcloud compute ssl-certificates create drawink-ssl-cert \
  --domains=drawink.app \
  --global \
  --project=drawink-2026
```

### Step 5: Create HTTPS Proxy

```bash
gcloud compute target-https-proxies create drawink-https-proxy \
  --ssl-certificates=drawink-ssl-cert \
  --url-map=drawink-urlmap \
  --global \
  --project=drawink-2026
```

### Step 6: Reserve Static IP

```bash
gcloud compute addresses create drawink-ip \
  --global \
  --ip-version=IPV4 \
  --project=drawink-2026

# Get the IP address
gcloud compute addresses describe drawink-ip \
  --global \
  --project=drawink-2026 \
  --format="value(address)"
```

### Step 7: Create HTTPS Forwarding Rule

```bash
gcloud compute forwarding-rules create drawink-https-rule \
  --global \
  --address=drawink-ip \
  --target-https-proxy=drawink-https-proxy \
  --ports=443 \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --project=drawink-2026
```

### Step 8: Setup HTTP to HTTPS Redirect

```bash
# Create HTTP redirect URL map
gcloud compute url-maps import drawink-http-redirect \
  --global \
  --project=drawink-2026 \
  --source=- << 'EOF'
name: drawink-http-redirect
defaultUrlRedirect:
  httpsRedirect: true
  redirectResponseCode: MOVED_PERMANENTLY_DEFAULT
EOF

# Create HTTP proxy
gcloud compute target-http-proxies create drawink-http-proxy \
  --url-map=drawink-http-redirect \
  --global \
  --project=drawink-2026

# Create HTTP forwarding rule
gcloud compute forwarding-rules create drawink-http-rule \
  --global \
  --address=drawink-ip \
  --target-http-proxy=drawink-http-proxy \
  --ports=80 \
  --load-balancing-scheme=EXTERNAL_MANAGED \
  --project=drawink-2026
```

### Step 9: Configure DNS

Add an A record in your domain's DNS settings:

| Name | Type | Value |
|------|------|-------|
| `drawink` | A | `35.241.3.91` |

### Step 10: Verify SSL Certificate

```bash
gcloud compute ssl-certificates describe drawink-ssl-cert \
  --global \
  --project=drawink-2026 \
  --format="yaml(managed)"
```

Wait for `status: ACTIVE` (can take 5-30 minutes after DNS is configured).

---

## Cost Optimization

The deployment is configured with cost optimizations to stay within Google Cloud's free tier:

### Optimized Settings

- **CPU Throttling**: Enabled - CPU only allocated during request processing
- **Memory**: 256Mi (reduced from 512Mi)
- **Max Instances**: 3 (reduced from 10)
- **Min Instances**: 0 (scales to zero when idle)
- **Timeout**: 300 seconds (5 minutes)
- **Concurrency**: 80 requests per instance
- **WebSocket Timeout**: 1 hour (reduced from 24 hours)

### Free Tier Limits

| Resource | Free Tier Limit |
|----------|----------------|
| **Requests** | 2 million requests/month |
| **Memory** | 360,000 GB-seconds |
| **CPU** | 180,000 vCPU-seconds |
| **Outbound Data** | 1 GB from North America regions |

### Expected Costs

With these optimizations, the deployment should stay **within the free tier** for low to medium traffic. Typical costs: **₹0-50/month** (vs ₹207/month without optimizations).

---

## Monitoring & Troubleshooting

### View Cloud Run Logs

```bash
gcloud run services logs read drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  --limit=50
```

### Check Service Status

```bash
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026
```

### Check SSL Certificate Status

```bash
gcloud compute ssl-certificates describe drawink-ssl-cert \
  --global \
  --project=drawink-2026 \
  --format="yaml(managed)"
```

### Verify DNS

```bash
dig drawink.app A +short
dig @8.8.8.8 drawink.app A +short
```

### Test Endpoints

```bash
curl https://drawink.app/health
curl -I https://drawink.app/
```

### Verify Configuration

```bash
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  --format="table(
    spec.template.spec.containers[0].resources.limits.memory,
    spec.template.spec.containers[0].resources.limits.cpu,
    spec.template.spec.containers[0].resources.cpuThrottling,
    spec.template.spec.minInstances,
    spec.template.spec.maxInstances,
    spec.template.spec.timeoutSeconds,
    spec.template.spec.containerConcurrency
  )"
```

---

## Console Links

| Resource | URL |
|----------|-----|
| Cloud Run Services | [console.cloud.google.com/run?project=drawink-2026](https://console.cloud.google.com/run?project=drawink-2026) |
| Artifact Registry | [console.cloud.google.com/artifacts?project=drawink-2026](https://console.cloud.google.com/artifacts?project=drawink-2026) |
| Load Balancing | [console.cloud.google.com/net-services/loadbalancing/list/loadBalancers?project=drawink-2026](https://console.cloud.google.com/net-services/loadbalancing/list/loadBalancers?project=drawink-2026) |
| SSL Certificates | [console.cloud.google.com/net-services/loadbalancing/advanced/sslCertificates/list?project=drawink-2026](https://console.cloud.google.com/net-services/loadbalancing/advanced/sslCertificates/list?project=drawink-2026) |
| Billing Reports | [console.cloud.google.com/billing/reports?project=drawink-2026](https://console.cloud.google.com/billing/reports?project=drawink-2026) |

---

## Architecture Overview

```
                                    ┌─────────────────────────────────────┐
                                    │        Google Cloud Project         │
                                    │           drawink-2026              │
                                    └─────────────────────────────────────┘
                                                     │
    ┌────────────────────────────────────────────────┼────────────────────────────────────────────────┐
    │                                                │                                                │
    ▼                                                ▼                                                ▼
┌───────────────┐                        ┌───────────────────┐                          ┌────────────────────┐
│   DNS Record  │                        │   Static IP       │                          │  Artifact Registry │
│               │                        │   35.241.3.91     │                          │                    │
│ drawink.app   │                        └─────────┬─────────┘                          │ asia-south1-docker │
│               │────────────────────────────────▶ │                                    │ .pkg.dev/drawink-  │
│               │                                  │                                    │ 2026/drawink       │
└───────────────┘                                  │                                    └────────────────────┘
                                                   │                                              │
                                                   ▼                                              │
                                    ┌──────────────────────────────┐                             │
                                    │    Global Load Balancer       │                             │
                                    │                               │                             │
                                    │  ┌─────────────────────────┐  │                             │
                                    │  │ HTTPS Proxy             │  │                             │
                                    │  │ (SSL Termination)         │  │                             │
                                    │  └───────────┬─────────────┘  │                             │
                                    │              │                 │                             │
                                    │  ┌───────────▼─────────────┐  │                             │
                                    │  │ URL Map                 │  │                             │
                                    │  │ drawink-urlmap          │  │                             │
                                    │  └───────────┬─────────────┘  │                             │
                                    │              │                 │                             │
                                    │  ┌───────────▼─────────────┐  │                             │
                                    │  │ Backend Service         │  │                             │
                                    │  │ drawink-backend         │  │                             │
                                    │  └───────────┬─────────────┘  │                             │
                                    └──────────────┼───────────────┘                             │
                                                   │                                              │
                                                   ▼                                              │
                                    ┌──────────────────────────────┐                             │
                                    │    Serverless NEG            │                             │
                                    │    drawink-neg               │                             │
                                    │    (asia-south1)             │                             │
                                    └──────────────┬───────────────┘                             │
                                                   │                                              │
                                                   ▼                                              │
                                    ┌──────────────────────────────┐                             │
                                    │    Cloud Run Service         │◀────────────────────────────┘
                                    │    drawink                   │         (pulls image)
                                    │    (asia-south1)             │
                                    │                              │
                                    │  ┌────────────────────────┐  │
                                    │  │ Container              │  │
                                    │  │                        │  │
                                    │  │  ┌──────────────────┐  │  │
                                    │  │  │ Nginx (Port 80) │  │  │
                                    │  │  │ Frontend App    │  │  │
                                    │  │  └────────┬────────┘  │  │
                                    │  │           │            │  │
                                    │  │  ┌────────▼─────────┐  │  │
                                    │  │  │ JSON Backend    │  │  │
                                    │  │  │ (Port 3001)     │  │  │
                                    │  │  └──────────────────┘  │  │
                                    │  │                        │  │
                                    │  │  ┌──────────────────┐  │  │
                                    │  │  │ WebSocket Server │  │  │
                                    │  │  │ (Port 3003)     │  │  │
                                    │  │  └──────────────────┘  │  │
                                    │  │                        │  │
                                    │  │  Managed by Supervisor │  │
                                    │  └────────────────────────┘  │
                                    └──────────────────────────────┘
```

---

## URLs

| Environment | URL |
|-------------|-----|
| **Production (Custom Domain)** | https://drawink.app |
| **Production (Cloud Run)** | https://drawink-731425062456.asia-south1.run.app |

---

## Notes

- The Docker image is built for `linux/amd64` platform (required by Cloud Run)
- The container runs **nginx** (port 80) for the frontend, **json-server** (port 3001) for the API, and **websocket-server** (port 3003) for real-time collaboration
- All services are managed by **supervisord** inside the container
- SSL certificate provisioning can take 5-30 minutes after DNS configuration
- The Load Balancer automatically handles HTTP to HTTPS redirects
- CPU throttling ensures you only pay for CPU time during request processing
- The service scales to zero when idle, reducing costs to near zero

---

## Manual Deployment (Alternative)

If you prefer to deploy manually instead of using the script:

```bash
# 1. Build the Docker image
docker build --platform linux/amd64 -t drawink:latest .

# 2. Tag for Artifact Registry
docker tag drawink:latest asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest

# 3. Push to Artifact Registry
docker push asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest

# 4. Deploy to Cloud Run (with cost optimizations)
gcloud run deploy drawink \
  --image=asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest \
  --region=asia-south1 \
  --port=3000 \
  --cpu-throttling \
  --memory=256Mi \
  --max-instances=3 \
  --timeout=300 \
  --project=drawink-2026
```
