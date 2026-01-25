import { sceneRouter } from "./routers/scene";
import { userRouter } from "./routers/user";
import { organizationRouter } from "./routers/organization";
import { projectRouter } from "./routers/project";
import { router } from "./trpc";

// Create main app router
export const appRouter = router({
  scene: sceneRouter,
  user: userRouter,
  organization: organizationRouter,
  project: projectRouter,
});

// Export type definition of API
export type AppRouter = typeof appRouter;
