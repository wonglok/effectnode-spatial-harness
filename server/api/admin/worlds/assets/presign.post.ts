import { defineEventHandler, readBody, createError } from "nitro/h3";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireRole } from "../../../../utils/auth";

const ALLOWED_EXT = new Set(["glb", "gltf"]);

const CONTENT_TYPE_BY_EXT: Record<string, string> = {
  glb: "model/gltf-binary",
  gltf: "model/gltf+json",
};

/**
 * Presign an S3 PUT for a 3D model upload (`.glb` / `.gltf`). Mirrors the avatar
 * presign flow but scoped to world assets and restricted to admins.
 */
export default defineEventHandler(async (event) => {
  await requireRole(event, "admin");

  const body = (await readBody(event)) as
    | { filename?: unknown }
    | undefined;

  const filename = String(body?.filename ?? "");
  const ext = (filename.split(".").pop() ?? "").toLowerCase();

  if (!ALLOWED_EXT.has(ext)) {
    throw createError({
      statusCode: 400,
      statusMessage: "Only .glb and .gltf models are allowed",
    });
  }

  const contentType = CONTENT_TYPE_BY_EXT[ext];
  const key = `world-assets/${randomUUID()}.${ext}`;

  const region = process.env.B3_S3_AWS_REGION ?? "ap-southeast-1";
  const bucket = process.env.B3_S3_AWS_BUCKET_NAME;
  if (!bucket) {
    throw createError({ statusCode: 500, statusMessage: "S3 bucket not configured" });
  }

  const client = new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.B3_S3_AWS_ACCESS_KEY ?? "",
      secretAccessKey: process.env.B3_S3_AWS_ACCESS_SECRET ?? "",
    },
  });

  const uploadUrl = await getSignedUrl(
    client,
    new PutObjectCommand({ Bucket: bucket, Key: key, ContentType: contentType }),
    { expiresIn: 300 },
  );

  const cdn =
    process.env.CDN_DISTRIBUTION ??
    `https://${bucket}.s3.${region}.amazonaws.com`;
  const publicUrl = `${cdn.replace(/\/$/, "")}/${key}`;

  return { uploadUrl, publicUrl, key, contentType };
});
