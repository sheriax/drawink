#!/bin/bash

# Apply Cost Optimizations to Cloud Run Service
# This script applies all optimizations from docs/deployment/COST_OPTIMIZATION.md

set -e  # Exit on error

PROJECT_ID="drawink-2026"
REGION="asia-south1"
SERVICE_NAME="drawink"
IMAGE_NAME="asia-south1-docker.pkg.dev/${PROJECT_ID}/drawink/drawink:latest"

echo "🚀 Applying Cost Optimizations to Cloud Run Service"
echo "=================================================="
echo ""

# Check if gcloud is authenticated
echo "📋 Checking gcloud authentication..."
if ! gcloud auth list --filter=status:ACTIVE --format="value(account)" | grep -q .; then
    echo "❌ Error: gcloud not authenticated"
    echo "Please run: gcloud auth login"
    exit 1
fi

# Set the project
echo "📋 Setting project to ${PROJECT_ID}..."
gcloud config set project ${PROJECT_ID}

# Step 1: Update service configuration (apply all optimizations at once)
echo ""
echo "⚙️  Step 1: Updating Cloud Run service configuration..."
echo "   - Enabling CPU throttling"
echo "   - Reducing memory to 256Mi"
echo "   - Reducing max instances to 3"
echo "   - Setting timeout to 300 seconds"
echo "   - Setting concurrency to 80"
echo ""

gcloud run services update ${SERVICE_NAME} \
  --cpu-throttling \
  --memory=256Mi \
  --max-instances=3 \
  --timeout=300 \
  --concurrency=80 \
  --region=${REGION} \
  --project=${PROJECT_ID}

echo "✅ Service configuration updated!"
echo ""

# Step 2: Build Docker image
echo "🐳 Step 2: Building Docker image..."
docker build --platform linux/amd64 -t drawink:latest .

echo "✅ Docker image built!"
echo ""

# Step 3: Tag for Artifact Registry
echo "🏷️  Step 3: Tagging image for Artifact Registry..."
docker tag drawink:latest ${IMAGE_NAME}

echo "✅ Image tagged!"
echo ""

# Step 4: Configure Docker authentication
echo "🔐 Step 4: Configuring Docker authentication..."
gcloud auth configure-docker asia-south1-docker.pkg.dev --quiet

echo "✅ Docker authentication configured!"
echo ""

# Step 5: Push to Artifact Registry
echo "📤 Step 5: Pushing image to Artifact Registry..."
docker push ${IMAGE_NAME}

echo "✅ Image pushed!"
echo ""

# Step 6: Deploy with optimized settings
echo "🚀 Step 6: Deploying to Cloud Run with optimized settings..."
gcloud run deploy ${SERVICE_NAME} \
  --image=${IMAGE_NAME} \
  --region=${REGION} \
  --port=3000 \
  --cpu-throttling \
  --memory=256Mi \
  --max-instances=3 \
  --timeout=300 \
  --concurrency=80 \
  --project=${PROJECT_ID}

echo ""
echo "✅ Deployment complete!"
echo ""

# Step 7: Verify configuration
echo "🔍 Step 7: Verifying configuration..."
echo ""
gcloud run services describe ${SERVICE_NAME} \
  --region=${REGION} \
  --project=${PROJECT_ID} \
  --format="table(
    spec.template.spec.containers[0].resources.limits.memory,
    spec.template.spec.containers[0].resources.limits.cpu,
    spec.template.spec.containers[0].resources.cpuThrottling,
    spec.template.spec.minInstances,
    spec.template.spec.maxInstances,
    spec.template.spec.timeoutSeconds,
    spec.template.spec.containerConcurrency
  )"

echo ""
echo "🎉 All optimizations applied successfully!"
echo ""
echo "📊 Next steps:"
echo "   1. Monitor costs at: https://console.cloud.google.com/billing/reports?project=${PROJECT_ID}"
echo "   2. Check service logs: gcloud run services logs read ${SERVICE_NAME} --region=${REGION} --project=${PROJECT_ID}"
echo "   3. View service details: https://console.cloud.google.com/run?project=${PROJECT_ID}"
echo ""
