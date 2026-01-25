/**
 * Project router - tRPC endpoints for project (folder) operations
 */

import { z } from "zod";
import {
  archiveProject,
  createProject,
  deleteProject,
  getOrganizationProjects,
  getProjectById,
  getUserProjects,
  updateProject,
} from "../services/project.service";
import { protectedProcedure, router } from "../trpc";
import { isOrganizationMember } from "../services/organization.service";

export const projectRouter = router({
  // Get project by ID (protected)
  getById: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);

      if (!project) {
        throw new Error("Project not found");
      }

      // Check authorization
      if (project.ownerId !== ctx.userId) {
        if (project.organizationId) {
          const isMember = await isOrganizationMember(project.organizationId, ctx.userId!);
          if (!isMember) {
            throw new Error("Not authorized to view this project");
          }
        } else {
          throw new Error("Not authorized to view this project");
        }
      }

      return project;
    }),

  // Get user's personal projects (protected)
  myProjects: protectedProcedure.query(async ({ ctx }) => {
    const projects = await getUserProjects(ctx.userId!);
    return projects;
  }),

  // Get organization's projects (protected)
  organizationProjects: protectedProcedure
    .input(
      z.object({
        organizationId: z.string(),
      }),
    )
    .query(async ({ input, ctx }) => {
      // Check if user is member of organization
      const isMember = await isOrganizationMember(input.organizationId, ctx.userId!);

      if (!isMember) {
        throw new Error("Not authorized to view organization projects");
      }

      const projects = await getOrganizationProjects(input.organizationId);
      return projects;
    }),

  // Create a new project (protected)
  create: protectedProcedure
    .input(
      z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        icon: z.string().max(50).optional(),
        organizationId: z.string().optional(),
        parentProjectId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      // If creating in organization, check membership
      if (input.organizationId) {
        const isMember = await isOrganizationMember(input.organizationId, ctx.userId!);
        if (!isMember) {
          throw new Error("Not authorized to create projects in this organization");
        }
      }

      const project = await createProject(ctx.userId!, {
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        organizationId: input.organizationId || null,
        parentProjectId: input.parentProjectId || null,
      });

      return project;
    }),

  // Update a project (protected)
  update: protectedProcedure
    .input(
      z.object({
        id: z.string(),
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional(),
        color: z.string().regex(/^#[0-9A-F]{6}$/i).optional(),
        icon: z.string().max(50).optional(),
        parentProjectId: z.string().optional(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);

      if (!project) {
        throw new Error("Project not found");
      }

      // Check authorization
      if (project.ownerId !== ctx.userId) {
        if (project.organizationId) {
          const isMember = await isOrganizationMember(project.organizationId, ctx.userId!);
          if (!isMember) {
            throw new Error("Not authorized to update this project");
          }
        } else {
          throw new Error("Not authorized to update this project");
        }
      }

      await updateProject(input.id, {
        name: input.name,
        description: input.description,
        color: input.color,
        icon: input.icon,
        parentProjectId: input.parentProjectId,
      });

      return { success: true };
    }),

  // Archive a project (soft delete) (protected)
  archive: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);

      if (!project) {
        throw new Error("Project not found");
      }

      // Only owner can archive
      if (project.ownerId !== ctx.userId) {
        throw new Error("Only the project owner can archive projects");
      }

      await archiveProject(input.id);

      return { success: true };
    }),

  // Delete a project permanently (protected)
  delete: protectedProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .mutation(async ({ input, ctx }) => {
      const project = await getProjectById(input.id);

      if (!project) {
        throw new Error("Project not found");
      }

      // Only owner can delete
      if (project.ownerId !== ctx.userId) {
        throw new Error("Only the project owner can delete projects");
      }

      await deleteProject(input.id);

      return { success: true };
    }),
});
