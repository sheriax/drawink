import { sceneRouter } from "./routers/scene";
import { userRouter } from "./routers/user";
import { router } from "./trpc";

// Create main app router
export const appRouter = router({
  scene: sceneRouter,
  user: userRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
