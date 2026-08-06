import { resolve } from "node:path";
import { createPublicationArtifactStore } from "@factory/publishing";
import { workerConfig, workspaceRoot } from "./config";

export const workerArtifactStore = createPublicationArtifactStore({
  driver: workerConfig.FACTORY_ARTIFACT_DRIVER,
  localDirectory: resolve(workspaceRoot, workerConfig.FACTORY_ARTIFACT_DIRECTORY),
  s3Bucket: workerConfig.FACTORY_S3_BUCKET,
  s3Region: workerConfig.FACTORY_S3_REGION,
  s3Endpoint: workerConfig.FACTORY_S3_ENDPOINT,
  s3Prefix: workerConfig.FACTORY_S3_PREFIX,
  s3ForcePathStyle: workerConfig.FACTORY_S3_FORCE_PATH_STYLE === "true",
});
