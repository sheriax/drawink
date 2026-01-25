/**
 * Organization Service
 * Business logic for organization operations
 */

import type { Organization, OrganizationMembership } from "@drawink/types";
import { db } from "../firebase";

const ORGANIZATIONS_COLLECTION = "organizations";

/**
 * Get organization by ID
 */
export const getOrganizationById = async (orgId: string): Promise<Organization | null> => {
  const doc = await db.collection(ORGANIZATIONS_COLLECTION).doc(orgId).get();

  if (!doc.exists) {
    return null;
  }

  const data = doc.data()!;
  return {
    id: doc.id,
    name: data.name,
    ownerId: data.ownerId,
    createdAt: data.createdAt.toDate(),
    updatedAt: data.updatedAt.toDate(),
    deletedAt: data.deletedAt?.toDate(),
    subscription: data.subscription,
  };
};

/**
 * Get organizations for a user
 */
export const getUserOrganizations = async (userId: string): Promise<Organization[]> => {
  const orgsSnapshot = await db
    .collection(ORGANIZATIONS_COLLECTION)
    .where("ownerId", "==", userId)
    .get();

  const organizations: Organization[] = [];

  for (const doc of orgsSnapshot.docs) {
    const data = doc.data();
    organizations.push({
      id: doc.id,
      name: data.name,
      ownerId: data.ownerId,
      createdAt: data.createdAt.toDate(),
      updatedAt: data.updatedAt.toDate(),
      deletedAt: data.deletedAt?.toDate(),
      subscription: data.subscription,
    });
  }

  return organizations;
};

/**
 * Get organization members
 */
export const getOrganizationMembers = async (orgId: string): Promise<OrganizationMembership[]> => {
  const membersSnapshot = await db
    .collection(ORGANIZATIONS_COLLECTION)
    .doc(orgId)
    .collection("members")
    .get();

  const members: OrganizationMembership[] = [];

  for (const doc of membersSnapshot.docs) {
    const data = doc.data();
    members.push({
      id: doc.id,
      organizationId: orgId,
      userId: data.userId || doc.id,
      role: data.role,
      joinedAt: data.joinedAt.toISOString(),
    });
  }

  return members;
};

/**
 * Check if user is member of organization
 */
export const isOrganizationMember = async (
  orgId: string,
  userId: string,
): Promise<boolean> => {
  const memberDoc = await db
    .collection(ORGANIZATIONS_COLLECTION)
    .doc(orgId)
    .collection("members")
    .doc(userId)
    .get();

  return memberDoc.exists;
};

/**
 * Get user's role in organization
 */
export const getOrganizationMemberRole = async (
  orgId: string,
  userId: string,
): Promise<"owner" | "admin" | "member" | null> => {
  const memberDoc = await db
    .collection(ORGANIZATIONS_COLLECTION)
    .doc(orgId)
    .collection("members")
    .doc(userId)
    .get();

  if (!memberDoc.exists) {
    // Check if user is owner
    const orgDoc = await db.collection(ORGANIZATIONS_COLLECTION).doc(orgId).get();
    if (orgDoc.exists && orgDoc.data()!.ownerId === userId) {
      return "owner";
    }
    return null;
  }

  return memberDoc.data()!.role;
};
