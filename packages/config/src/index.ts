import { z } from "zod";
const schema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z.url(),
  FACTORY_BASE_DOMAIN: z.string().min(1),
  FACTORY_ARTIFACT_DIRECTORY: z.string().min(1),
  PREVIEW_SIGNING_SECRET: z.string().min(32),
});
export type FactoryConfig = z.infer<typeof schema>;
export function loadConfig(environment: Record<string, string | undefined>): FactoryConfig {
  return schema.parse(environment);
}
