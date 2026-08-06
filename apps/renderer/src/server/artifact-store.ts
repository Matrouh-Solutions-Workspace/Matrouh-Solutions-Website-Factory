import { resolve } from "node:path";
import { createPublicationArtifactStore } from "@factory/publishing";
import { rendererConfig, workspaceRoot } from "./config";

export const rendererArtifactStore = createPublicationArtifactStore({
  driver: rendererConfig.FACTORY_ARTIFACT_DRIVER,
  localDirectory: resolve(workspaceRoot, rendererConfig.FACTORY_ARTIFACT_DIRECTORY),
  s3Bucket: rendererConfig.FACTORY_S3_BUCKET,
  s3Region: rendererConfig.FACTORY_S3_REGION,
  s3Endpoint: rendererConfig.FACTORY_S3_ENDPOINT,
  s3Prefix: rendererConfig.FACTORY_S3_PREFIX,
  s3ForcePathStyle: rendererConfig.FACTORY_S3_FORCE_PATH_STYLE === "true",
});
