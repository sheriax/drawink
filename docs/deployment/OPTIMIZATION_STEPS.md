# Step-by-Step Cost Optimization Implementation

This guide walks you through applying all cost optimizations to your Cloud Run service.

## Prerequisites

1. **Authenticate with gcloud** (if not already done):
   ```bash
   gcloud auth login
   gcloud config set project drawink-2026
   ```

2. **Verify Docker is running**:
   ```bash
   docker --version
   ```

---

## Option 1: Automated Script (Recommended)

Run the automated script that does everything:

```bash
./apply-cost-optimizations.sh
```

This script will:
1. ✅ Update service configuration (CPU throttling, memory, instances, timeout)
2. ✅ Build Docker image with optimized nginx.conf
3. ✅ Tag and push to Artifact Registry
4. ✅ Deploy with all optimizations
5. ✅ Verify the configuration

---

## Option 2: Manual Step-by-Step

### Step 1: Update Service Configuration (No Rebuild Needed)

This can be done immediately and doesn't require rebuilding the Docker image:

```bash
# Apply all configuration optimizations at once
gcloud run services update drawink \
  --cpu-throttling \
  --memory=256Mi \
  --max-instances=3 \
  --timeout=300 \
  --concurrency=80 \
  --region=asia-south1 \
  --project=drawink-2026
```

**This step alone will immediately reduce costs!** The CPU throttling and memory reduction take effect right away.

### Step 2: Verify Configuration Update

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

**Expected output:**
- Memory: `256Mi` (not 512Mi)
- CPU Throttling: `true` (not false)
- Max Instances: `3` (not 10)
- Timeout: `300` (not higher)
- Concurrency: `80`

### Step 3: Build Docker Image with Optimized nginx.conf

The `nginx.conf` has already been updated with 1-hour WebSocket timeouts. Now rebuild:

```bash
cd /Users/youhanasheriff/Desktop/Sheriax/projects/drawink

# Build the Docker image
docker build --platform linux/amd64 -t drawink:latest .
```

This may take 5-10 minutes depending on your internet speed and Docker cache.

### Step 4: Tag Image for Artifact Registry

```bash
docker tag drawink:latest asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest
```

### Step 5: Configure Docker Authentication

```bash
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

### Step 6: Push to Artifact Registry

```bash
docker push asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest
```

This may take a few minutes depending on image size and upload speed.

### Step 7: Deploy with Optimized Settings

```bash
gcloud run deploy drawink \
  --image=asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest \
  --region=asia-south1 \
  --port=3000 \
  --cpu-throttling \
  --memory=256Mi \
  --max-instances=3 \
  --timeout=300 \
  --concurrency=80 \
  --project=drawink-2026
```

### Step 8: Final Verification

```bash
# Check service is running
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  --format="value(status.url)"

# View recent logs
gcloud run services logs read drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  --limit=20
```

---

## What Each Optimization Does

### ✅ CPU Throttling
- **Before**: CPU always allocated, even when idle
- **After**: CPU only allocated during request processing
- **Savings**: ~90-95% reduction in CPU costs

### ✅ Memory: 512Mi → 256Mi
- **Before**: 512 MB memory allocated
- **After**: 256 MB memory allocated
- **Savings**: 50% reduction in memory costs

### ✅ Max Instances: 10 → 3
- **Before**: Can scale up to 10 instances
- **After**: Limited to 3 instances max
- **Savings**: Prevents unexpected scaling costs

### ✅ Timeout: Default → 300s
- **Before**: Default timeout (can be very high)
- **After**: 5-minute timeout
- **Savings**: Prevents runaway requests

### ✅ WebSocket Timeout: 24h → 1h
- **Before**: WebSocket connections keep instances alive for 24 hours
- **After**: WebSocket timeout of 1 hour
- **Savings**: Instances shut down faster when idle

### ✅ Concurrency: 80
- **Before**: Default concurrency
- **After**: 80 concurrent requests per instance
- **Savings**: More efficient resource usage

---

## Expected Results

### Immediate (After Step 1)
- ✅ CPU throttling enabled → ~90% CPU cost reduction
- ✅ Memory reduced → ~50% memory cost reduction
- ✅ Max instances reduced → Prevents scaling spikes

### After Full Deployment (After Step 7)
- ✅ WebSocket timeout optimized → Faster instance shutdown
- ✅ All optimizations active → Maximum cost savings

### Expected Monthly Cost
- **Before**: ₹207.62/month (~$2.50/month)
- **After**: ₹0-50/month (likely within free tier)
- **Savings**: 75-100% reduction

---

## Troubleshooting

### Error: "gcloud not authenticated"
```bash
gcloud auth login
gcloud config set project drawink-2026
```

### Error: "Docker build fails"
- Make sure Docker Desktop is running
- Check disk space: `df -h`
- Try: `docker system prune` to free space

### Error: "Image push fails"
```bash
# Re-authenticate Docker
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet
```

### Service crashes after memory reduction
```bash
# Increase memory to 384Mi if 256Mi is too low
gcloud run services update drawink \
  --memory=384Mi \
  --region=asia-south1 \
  --project=drawink-2026
```

### Check if optimizations are applied
```bash
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  --format=yaml | grep -A 5 "resources:"
```

---

## Monitoring After Optimization

### Check Costs
1. Go to: https://console.cloud.google.com/billing/reports?project=drawink-2026
2. Filter by "Cloud Run" service
3. Compare before/after costs

### Monitor Service
1. Go to: https://console.cloud.google.com/run?project=drawink-2026
2. Click on "drawink" service
3. Check metrics, logs, and configuration

### Set Budget Alerts
1. Go to: https://console.cloud.google.com/billing/budgets
2. Create a budget with alerts at 50%, 90%, 100%

---

## Quick Reference

**Update configuration only** (fastest, immediate effect):
```bash
gcloud run services update drawink \
  --cpu-throttling \
  --memory=256Mi \
  --max-instances=3 \
  --timeout=300 \
  --concurrency=80 \
  --region=asia-south1 \
  --project=drawink-2026
```

**Full deployment** (includes WebSocket timeout optimization):
```bash
./apply-cost-optimizations.sh
```

**Verify everything**:
```bash
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026
```

---

**Last Updated**: January 2026
