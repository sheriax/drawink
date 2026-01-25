import { sceneRouter } from "./routers/scene";
import { router } from "./trpc";

// Create main app router
export const appRouter = router({
  scene: sceneRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
