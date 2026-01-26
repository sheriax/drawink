# Documentation

This directory contains all project documentation organized by topic.

## 📁 Directory Structure

```
docs/
├── README.md (this file)
└── deployment/
    ├── DEPLOY.md                    # Complete deployment guide
    ├── COST_OPTIMIZATION.md         # Comprehensive cost optimization guide
    ├── OPTIMIZATION_STEPS.md        # Step-by-step optimization instructions
    └── OPTIMIZATION_STATUS.md       # Optimization status and quick reference
```

## 📚 Documentation Index

### Deployment & Infrastructure

- **[DEPLOY.md](./deployment/DEPLOY.md)** - Complete guide for deploying Drawink to Google Cloud Run
  - Prerequisites and setup
  - First-time deployment
  - Custom domain configuration
  - Monitoring and troubleshooting

- **[COST_OPTIMIZATION.md](./deployment/COST_OPTIMIZATION.md)** - Comprehensive cost optimization guide
  - Understanding Cloud Run free tier
  - Cost optimization strategies
  - Implementation steps
  - Monitoring and alerts
  - Troubleshooting

- **[OPTIMIZATION_STEPS.md](./deployment/OPTIMIZATION_STEPS.md)** - Step-by-step optimization instructions
  - Automated script usage
  - Manual step-by-step guide
  - Verification commands
  - Troubleshooting tips

- **[OPTIMIZATION_STATUS.md](./deployment/OPTIMIZATION_STATUS.md)** - Quick reference and status
  - What's been completed
  - Next steps
  - Expected results
  - Quick commands

## 🚀 Quick Links

### For Deployment
- [Quick Deploy Guide](./deployment/DEPLOY.md#quick-deploy-existing-setup)
- [First-Time Setup](./deployment/DEPLOY.md#first-time-setup-complete-guide)
- [Custom Domain Setup](./deployment/DEPLOY.md#custom-domain-setup-load-balancer)

### For Cost Optimization
- [Apply Optimizations Script](../apply-cost-optimizations.sh)
- [Cost Optimization Guide](./deployment/COST_OPTIMIZATION.md)
- [Quick Update Commands](./deployment/OPTIMIZATION_STATUS.md#next-steps-action-required)

## 📖 Other Documentation

- **Root README.md** - Project overview and getting started
- **CONTRIBUTING.md** - Contribution guidelines
- **apps/docs/** - Development documentation (Docusaurus site)
- **apps/api/README.md** - API server documentation (tRPC + Hono)
- **apps/ws/README.md** - WebSocket server documentation

## 🔍 Finding Documentation

- **Deployment questions?** → See `docs/deployment/`
- **Cost optimization?** → See `docs/deployment/COST_OPTIMIZATION.md`
- **Development docs?** → See `apps/docs/`
- **API documentation?** → See `apps/api/README.md` and `apps/ws/README.md`

---

**Last Updated**: January 2026
