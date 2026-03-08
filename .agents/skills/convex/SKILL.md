---
name: convex
description: Convex backend router. Use when user asks about setting up Convex, creating schemas, writing queries/mutations/actions, authentication, migrations, components, or helpers. Automatically routes to the specific skill based on their task.
---

# Convex Skills Router

## By Task

**Starting a new Convex project** → Use `convex-quickstart`
- Installation and initialization
- Schema, auth, and CRUD setup
- React/Next.js/Expo integration

**Designing database schemas** → Use `convex-schema-builder`
- Creating `convex/schema.ts`
- Table definitions with validators
- Indexes and relationships
- Relational schema design

**Creating queries, mutations, actions** → Use `convex-function-creator`
- API endpoint implementation
- Argument and return validation
- Auth and authorization checks
- Internal functions

**Setting up authentication** → Use `convex-auth-setup`
- User management and identity mapping
- OAuth providers (WorkOS, Auth0, Clerk)
- Access control patterns (owner, team, role-based)
- Public vs private queries

**Running schema migrations** → Use `convex-migration-helper`
- Adding required fields to existing tables
- Changing field types
- Dual-write patterns
- Batch processing migrations

**Using Convex components** → Use `convex-components-guide`
- Feature encapsulation with sibling components
- Official components (auth, storage, payments, AI)
- Creating your own components
- Component communication patterns

**Using convex-helpers utilities** → Use `convex-helpers-guide`
- Relationship helpers
- Custom functions (data protection / RLS)
- Filter helper, sessions, Zod validation
- Triggers, aggregations, migrations

## Quick Navigation

If you know your task, you can directly access:
- `/convex-quickstart` - Project setup
- `/convex-schema-builder` - Schema design
- `/convex-function-creator` - Functions & API
- `/convex-auth-setup` - Authentication
- `/convex-migration-helper` - Migrations
- `/convex-components-guide` - Components
- `/convex-helpers-guide` - Utilities

Or describe what you need and I'll recommend the right one.
