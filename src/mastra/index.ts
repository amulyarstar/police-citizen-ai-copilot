import { Mastra } from "@mastra/core";
import { supervisorAgent } from "./agents/supervisor";

// Registering this gives you `npx mastra dev` locally: a visual Studio at
// http://localhost:4111 to chat with the supervisor agent and inspect tool
// calls/traces directly — genuinely useful when explaining "how the agent
// decides what to do" to someone who wants to see it, not just read about it.
export const mastra = new Mastra({
  agents: { supervisorAgent },
});
