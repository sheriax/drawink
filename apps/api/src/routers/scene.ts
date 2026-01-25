/**
 * Scene router - tRPC endpoints for scene operations
 * Uses service layer for business logic
 */

import { z } from "zod";
import { getSceneById, storeScene } from "../services/scene.service";
import { publicProcedure, router } from "../trpc";

export const sceneRouter = router({
  // Get scene by ID
  getScene: publicProcedure
    .input(
      z.object({
        id: z.string(),
      }),
    )
    .query(async ({ input }) => {
      const { id } = input;

      const scene = await getSceneById(id);

      if (!scene) {
        throw new Error("Scene not found");
      }

      return scene;
    }),

  // Store new scene
  storeScene: publicProcedure
    .input(
      z.object({
        sceneData: z.string(), // base64-encoded binary data
      }),
    )
    .mutation(async ({ input }) => {
      const { sceneData } = input;

      const id = await storeScene(sceneData);

      return { id };
    }),
});
