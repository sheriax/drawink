/**
 * Project Service
 * Business logic for project (folder) operations
 */

import type { Project } from "@drawink/types";
import { db } from "../firebase";
import { Timestamp } from "firebase-admin/firestore";

const PROJECTS_COLLECTION = "projects";

/**
 * Get project by ID
 */
export const getProjectById = async (projectId: string): Promise<Project | null> => {
  const doc = await db.collection(PROJECTS_COLLECTION).doc(projectId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    description: data.description,
    color: data.color,
    icon: data.icon,
    organizationId: data.organizationId,
    ownerId: data.ownerId,
    parentProjectId: data.parentProjectId,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
    archivedAt: data.archivedAt,
  };
};

/**
 * Get projects for a user
 */
export const getUserProjects = async (userId: string): Promise<Project[]> => {
  const projectsSnapshot = await db
    .collection(PROJECTS_COLLECTION)
    .where("ownerId", "==", userId)
    .where("archivedAt", "==", null)
    .get();

  const projects: Project[] = [];

  for (const doc of projectsSnapshot.docs) {
    const data = doc.data();
    projects.push({
      id: doc.id,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      organizationId: data.organizationId,
      ownerId: data.ownerId,
      parentProjectId: data.parentProjectId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      archivedAt: data.archivedAt,
    });
  }

  return projects;
};

/**
 * Get projects for an organization
 */
export const getOrganizationProjects = async (organizationId: string): Promise<Project[]> => {
  const projectsSnapshot = await db
    .collection(PROJECTS_COLLECTION)
    .where("organizationId", "==", organizationId)
    .where("archivedAt", "==", null)
    .get();

  const projects: Project[] = [];

  for (const doc of projectsSnapshot.docs) {
    const data = doc.data();
    projects.push({
      id: doc.id,
      name: data.name,
      description: data.description,
      color: data.color,
      icon: data.icon,
      organizationId: data.organizationId,
      ownerId: data.ownerId,
      parentProjectId: data.parentProjectId,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      archivedAt: data.archivedAt,
    });
  }

  return projects;
};

/**
 * Create a new project
 */
export const createProject = async (
  userId: string,
  projectData: {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    organizationId?: string | null;
    parentProjectId?: string | null;
  },
): Promise<Project> => {
  const now = Timestamp.now();
  const projectRef = db.collection(PROJECTS_COLLECTION).doc();

  const project: Project = {
    id: projectRef.id,
    name: projectData.name,
    description: projectData.description,
    color: projectData.color,
    icon: projectData.icon,
    organizationId: projectData.organizationId || null,
    ownerId: userId,
    parentProjectId: projectData.parentProjectId || null,
    createdAt: now,
    updatedAt: now,
    archivedAt: undefined,
  };

  await projectRef.set(project);

  return project;
};

/**
 * Update a project
 */
export const updateProject = async (
  projectId: string,
  updates: {
    name?: string;
    description?: string;
    color?: string;
    icon?: string;
    parentProjectId?: string | null;
  },
): Promise<void> => {
  const now = Timestamp.now();

  await db
    .collection(PROJECTS_COLLECTION)
    .doc(projectId)
    .update({
      ...updates,
      updatedAt: now,
    });
};

/**
 * Archive a project (soft delete)
 */
export const archiveProject = async (projectId: string): Promise<void> => {
  const now = Timestamp.now();

  await db.collection(PROJECTS_COLLECTION).doc(projectId).update({
    archivedAt: now,
    updatedAt: now,
  });
};

/**
 * Delete a project permanently
 */
export const deleteProject = async (projectId: string): Promise<void> => {
  await db.collection(PROJECTS_COLLECTION).doc(projectId).delete();
};
