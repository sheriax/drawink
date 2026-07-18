import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

const crons = cronJobs();

crons.interval(
  "remove expired realtime relay data",
  { minutes: 1 },
  internal.realtime.cleanupExpired,
);

crons.interval(
  "remove expired rooms and public shares",
  { hours: 1 },
  internal.cleanup.deleteExpiredContent,
);

export default crons;
