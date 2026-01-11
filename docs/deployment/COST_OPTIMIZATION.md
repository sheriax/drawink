# Cloud Run Cost Optimization Guide

This document provides a comprehensive guide to optimizing Google Cloud Run costs for the Drawink project, with the goal of staying within the free tier limits.

## Table of Contents

1. [Understanding Cloud Run Free Tier](#understanding-cloud-run-free-tier)
2. [Current Configuration Analysis](#current-configuration-analysis)
3. [Cost Optimization Strategies](#cost-optimization-strategies)
4. [Implementation Steps](#implementation-steps)
5. [Monitoring & Alerts](#monitoring--alerts)
6. [Troubleshooting](#troubleshooting)
7. [Alternative Architectures](#alternative-architectures)

---

## Understanding Cloud Run Free Tier

### Free Tier Limits (Monthly)

Google Cloud Run offers a **generous free tier** that includes:

| Resource | Free Tier Limit |
|----------|----------------|
| **Requests** | 2 million requests/month |
| **Memory** | 360,000 GB-seconds |
| **CPU** | 180,000 vCPU-seconds |
| **Outbound Data** | 1 GB from North America regions |

### How Free Tier is Calculated

- **GB-seconds**: Memory allocated × seconds running
  - Example: 512Mi (0.5 GB) running for 1 hour = 0.5 GB × 3600 seconds = 1,800 GB-seconds
  
- **vCPU-seconds**: CPU allocated × seconds running
  - Example: 1 CPU running for 1 hour = 1 × 3600 = 3,600 vCPU-seconds

- **Requests**: Each HTTP request counts toward the limit

### When You Get Charged

You're charged when you exceed:
- More than 2 million requests/month
- More than 360,000 GB-seconds of memory usage
- More than 180,000 vCPU-seconds of compute time
- More than 1 GB of outbound data transfer

**Note**: The free tier applies to the **entire Google Cloud billing account**, not per project.

---

## Current Configuration Analysis

### Previous Configuration (High Cost)

```bash
--cpu=1                    # CPU always allocated (not throttled)
--memory=512Mi             # 512 MB memory
--min-instances=0          # ✅ Good - scales to zero
--max-instances=10         # High max instances
# No CPU throttling        # ❌ CPU always on
# No timeout specified     # Default timeout (too high)
# No concurrency limit     # Default concurrency
```

### Issues Identified

1. **CPU Always Allocated**: Without `--cpu-throttling`, CPU is always running, even when idle
2. **High Memory**: 512Mi may be more than needed for a simple app
3. **Long WebSocket Timeouts**: 24-hour timeouts keep instances alive unnecessarily
4. **No Request Timeout**: Default timeout can be very high
5. **High Max Instances**: 10 instances can scale unnecessarily

### Cost Impact

With the previous configuration:
- **CPU**: Always running = ~2,592,000 vCPU-seconds/month (if always on)
- **Memory**: 512Mi × runtime = High GB-seconds
- **WebSocket connections**: Keep instances alive for 24 hours

**Result**: Easily exceeds free tier limits → **₹207.62/month** (as shown in billing)

---

## Cost Optimization Strategies

### Strategy 1: Enable CPU Throttling ⭐ **MOST IMPORTANT**

**What it does**: CPU is only allocated during request processing, not when idle.

**Impact**: Reduces CPU costs by ~90-95% for low-traffic apps.

```bash
--cpu-throttling
```

### Strategy 2: Reduce Memory Allocation

**What it does**: Lower memory = lower GB-seconds.

**Impact**: 50% reduction in memory costs (512Mi → 256Mi).

```bash
--memory=256Mi  # Instead of 512Mi
```

**Note**: Test your app with 256Mi first. If it crashes, try 384Mi.

### Strategy 3: Optimize WebSocket Timeouts

**What it does**: Shorter timeouts = instances shut down faster.

**Impact**: Prevents instances from staying alive for 24 hours.

**Change**: `docker/nginx.conf` - Reduce from 86400s (24h) to 3600s (1h)

### Strategy 4: Set Request Timeout

**What it does**: Limits how long a request can run.

**Impact**: Prevents runaway requests from consuming resources.

```bash
--timeout=300  # 5 minutes
```

### Strategy 5: Increase Concurrency

**What it does**: More requests per instance = fewer instances needed.

**Impact**: Reduces total instance count and costs.

```bash
--concurrency=80  # Default is 80, but ensure it's set
```

### Strategy 6: Reduce Max Instances

**What it does**: Limits scaling during traffic spikes.

**Impact**: Prevents unexpected scaling costs.

```bash
--max-instances=3  # Instead of 10
```

### Strategy 7: Ensure Min Instances = 0

**What it does**: Allows scaling to zero when no traffic.

**Impact**: No costs when idle.

```bash
--min-instances=0  # ✅ Already set correctly
```

---

## Implementation Steps

### Step 1: Update Deployment Configuration

Update the deployment command in `docs/deployment/DEPLOY.md`:

```bash
gcloud run deploy drawink \
  --image=asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest \
  --platform=managed \
  --region=asia-south1 \
  --port=3000 \
  --allow-unauthenticated \
  --cpu-throttling \
  --cpu=1 \
  --memory=256Mi \
  --min-instances=0 \
  --max-instances=3 \
  --concurrency=80 \
  --timeout=300 \
  --max-request-timeout=300 \
  --project=drawink-2026
```

### Step 2: Update Quick Deploy Command

For quick deployments, also include the optimized settings:

```bash
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

### Step 3: Optimize WebSocket Timeouts

Update `docker/nginx.conf`:

```nginx
# Change from 86400s to 3600s (1 hour)
proxy_read_timeout 3600s;
proxy_send_timeout 3600s;
```

**Why**: 1 hour is sufficient for most WebSocket use cases, and prevents instances from staying alive unnecessarily.

### Step 4: Apply Changes to Existing Service

If you have an existing service, update it immediately:

```bash
# Enable CPU throttling
gcloud run services update drawink \
  --cpu-throttling \
  --region=asia-south1 \
  --project=drawink-2026

# Reduce memory
gcloud run services update drawink \
  --memory=256Mi \
  --region=asia-south1 \
  --project=drawink-2026

# Reduce max instances
gcloud run services update drawink \
  --max-instances=3 \
  --region=asia-south1 \
  --project=drawink-2026

# Set timeout
gcloud run services update drawink \
  --timeout=300 \
  --region=asia-south1 \
  --project=drawink-2026

# Set concurrency (if not already set)
gcloud run services update drawink \
  --concurrency=80 \
  --region=asia-south1 \
  --project=drawink-2026
```

### Step 5: Rebuild and Redeploy

After updating `nginx.conf`, rebuild and redeploy:

```bash
# 1. Build the Docker image
docker build --platform linux/amd64 -t drawink:latest .

# 2. Tag for Artifact Registry
docker tag drawink:latest asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest

# 3. Push to Artifact Registry
docker push asia-south1-docker.pkg.dev/drawink-2026/drawink/drawink:latest

# 4. Deploy with optimized settings
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

---

## Monitoring & Alerts

### Check Current Service Configuration

```bash
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026 \
  --format=yaml
```

**Look for**:
- `cpuThrottling: true` (should be true)
- `cpu: "1"` (OK)
- `memory: "256Mi"` (should be 256Mi, not 512Mi)
- `minInstances: 0` (should be 0)
- `maxInstances: 3` (should be 3, not 10)
- `timeout: "300s"` (should be 300s)

### Monitor Usage in Console

1. Go to [Google Cloud Console - Billing](https://console.cloud.google.com/billing)
2. Select your billing account
3. Click "Reports" to see usage breakdown
4. Filter by "Cloud Run" service

### Set Up Budget Alerts

```bash
# Get your billing account ID
gcloud billing accounts list

# Create a budget (via console is easier)
# Go to: https://console.cloud.google.com/billing/budgets
```

**Recommended Budget Settings**:
- **Budget Amount**: ₹100/month (or your preferred limit)
- **Alert Thresholds**: 
  - 50% of budget
  - 90% of budget
  - 100% of budget
- **Notifications**: Email alerts

### Check Free Tier Usage

```bash
# View Cloud Run metrics
gcloud logging read "resource.type=cloud_run_revision" \
  --limit=50 \
  --project=drawink-2026 \
  --format=json
```

### Calculate Current Usage

**Memory Usage (GB-seconds)**:
```
Memory (GB) × Runtime (seconds) = GB-seconds
```

**CPU Usage (vCPU-seconds)**:
```
CPU count × Runtime (seconds) = vCPU-seconds
```

**Example Calculation**:
- 256Mi (0.25 GB) running for 1 hour = 0.25 × 3600 = 900 GB-seconds
- With CPU throttling: Only charged during request processing
- Free tier: 360,000 GB-seconds/month = ~100 hours of 256Mi instance

---

## Troubleshooting

### Issue: Service Crashes with 256Mi Memory

**Solution**: Increase memory gradually:

```bash
# Try 384Mi
gcloud run services update drawink \
  --memory=384Mi \
  --region=asia-south1 \
  --project=drawink-2026
```

### Issue: WebSocket Connections Drop After 1 Hour

**Solution**: This is expected behavior. Options:
1. Accept the 1-hour timeout (recommended for cost savings)
2. Implement client-side reconnection logic
3. Increase timeout to 2-4 hours if needed (balance cost vs UX)

### Issue: High Request Count

**Solution**: 
1. Check for bot traffic or crawlers
2. Implement rate limiting
3. Use Cloud CDN for static assets
4. Check for polling/health checks that are too frequent

### Issue: Still Getting Charged After Optimization

**Check**:
1. Verify CPU throttling is enabled: `gcloud run services describe drawink --format="value(spec.template.spec.containers[0].resources.cpuThrottling)"`
2. Verify min-instances is 0: `gcloud run services describe drawink --format="value(spec.template.spec.minInstances)"`
3. Check for other Cloud Run services in the same project
4. Review billing reports for other services (Networking, Firebase, etc.)

### Verify Configuration

```bash
# Complete service description
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

## Alternative Architectures

If costs remain high, consider these alternatives:

### Option 1: Firebase Hosting + Cloud Functions

- **Frontend**: Firebase Hosting (free tier: 10 GB storage, 360 MB/day transfer)
- **API**: Cloud Functions Gen 2 (free tier: 2 million invocations/month)
- **WebSocket**: Firebase Realtime Database or Firestore

**Cost**: Likely $0/month for low traffic

### Option 2: Vercel/Netlify + Serverless Functions

- **Frontend**: Vercel or Netlify (generous free tiers)
- **API**: Serverless functions on same platform
- **Database**: Firebase or Supabase (free tiers)

**Cost**: $0/month for low-medium traffic

### Option 3: Hybrid Approach

- **Static Assets**: Cloud Storage + CDN (very cheap)
- **API**: Cloud Run (optimized as above)
- **WebSocket**: Separate minimal Cloud Run service

**Cost**: Minimal, mostly within free tier

---

## Expected Cost Reduction

### Before Optimization

- **CPU**: Always allocated = High vCPU-seconds
- **Memory**: 512Mi = Higher GB-seconds
- **WebSocket**: 24h timeouts = Long-running instances
- **Result**: ₹207.62/month (~$2.50/month)

### After Optimization

- **CPU**: Throttled = Only during requests
- **Memory**: 256Mi = 50% reduction
- **WebSocket**: 1h timeout = Faster shutdown
- **Result**: **₹0-50/month** (likely within free tier)

### Savings: **~75-100% cost reduction**

---

## Best Practices Summary

✅ **DO**:
- Enable CPU throttling
- Set min-instances to 0
- Use appropriate memory (256Mi-384Mi)
- Set reasonable timeouts (300s for HTTP, 3600s for WebSocket)
- Monitor usage regularly
- Set up budget alerts

❌ **DON'T**:
- Use CPU always-on mode (unless absolutely necessary)
- Set min-instances > 0 (unless you need always-on)
- Use excessive memory (512Mi+ for simple apps)
- Set very long timeouts (24h+)
- Ignore billing alerts
- Deploy without checking configuration

---

## Quick Reference Commands

### Check Current Configuration
```bash
gcloud run services describe drawink \
  --region=asia-south1 \
  --project=drawink-2026
```

### Apply All Optimizations at Once
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

### View Billing Reports
```bash
# Open in browser
open "https://console.cloud.google.com/billing/reports?project=drawink-2026"
```

### Check Free Tier Usage
```bash
# View in console
open "https://console.cloud.google.com/billing?project=drawink-2026"
```

---

## Additional Resources

- [Cloud Run Pricing](https://cloud.google.com/run/pricing)
- [Cloud Run Free Tier](https://cloud.google.com/free/docs/free-cloud-features#cloud-run)
- [Cost Optimization Best Practices](https://cloud.google.com/run/docs/tips/general)
- [CPU Throttling Documentation](https://cloud.google.com/run/docs/configuring/cpu-allocation)

---

**Last Updated**: January 2026  
**Project**: drawink-2026  
**Region**: asia-south1
