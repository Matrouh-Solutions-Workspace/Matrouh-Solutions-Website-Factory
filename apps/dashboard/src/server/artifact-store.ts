import { resolve } from "node:path";
import { createPublicationArtifactStore } from "@factory/publishing";
import { dashboardConfig, workspaceRoot } from "./config";

export const dashboardArtifactStore = createPublicationArtifactStore({
  driver: dashboardConfig.FACTORY_ARTIFACT_DRIVER,
  localDirectory: resolve(workspaceRoot, dashboardConfig.FACTORY_ARTIFACT_DIRECTORY),
  s3Bucket: dashboardConfig.FACTORY_S3_BUCKET,
  s3Region: dashboardConfig.FACTORY_S3_REGION,
  s3Endpoint: dashboardConfig.FACTORY_S3_ENDPOINT,
  s3Prefix: dashboardConfig.FACTORY_S3_PREFIX,
  s3ForcePathStyle: dashboardConfig.FACTORY_S3_FORCE_PATH_STYLE === "true",
});
