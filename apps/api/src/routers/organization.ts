/**
 * Organization router - tRPC endpoints for organization operations
 * Organizations are synced from Clerk via webhooks
 */

import { z } from "zod";
import {
  getOrganizationById,
  getOrganizationMembers,
  getOrganizationMemberRole,
  getUserOrganizations,
  isOrganizationMember,
} from "../services/organization.service";
import { protectedProcedure, publicProcedure, router } from "../trpc";

export const organizationRouter = router({
  // Get organization by ID (public - will be filtered by Firestore rules)
  getById: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const organization = await getOrganizationById(input.id);

      if (!organization) {
        throw new Error("Organization not found");
      }

      return organization;
    }),

  // Get user's organizations (protected)
  myOrganizations: protectedProcedure.query(async ({ ctx }) => {
    const organizations = await getUserOrganizations(ctx.userId!);
    return organizations;
  }),

  // Get organization members (protected)
  getMembers: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Check if user is member of organization
      const isMember = await isOrganizationMember(input.organizationId, ctx.userId!);

      if (!isMember) {
        throw new Error("Not authorized to view organization members");
      }

      const members = await getOrganizationMembers(input.organizationId);
      return members;
    }),

  // Get user's role in organization (protected)
  getMyRole: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const role = await getOrganizationMemberRole(input.organizationId, ctx.userId!);

      if (!role) {
        throw new Error("Not a member of this organization");
      }

      return { role };
    }),

  // Check if user is member (protected)
  isMember: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const isMember = await isOrganizationMember(input.organizationId, ctx.userId!);
      return { isMember };
    }),
});
