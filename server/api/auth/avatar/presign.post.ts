import { defineEventHandler, readBody, createError } from "nitro/h3";
import { randomUUID } from "node:crypto";
import { S3Client, PutObjectCommand } from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";
import { requireAuth } from "../../../utils/auth";

const EXT_BY_MIME: Record<string, string> = {
  "image/jpeg": "jpg",
  "image/png": "png",
  "image/webp": "webp",
  "image/gif": "gif",
  "image/svg+xml": "svg",
};

export default defineEventHandler(async (event) => {
  const { user } = await requireAuth(event);

  const body = (await readBody(event)) as
    | { contentType?: unknown; extension?: unknown }
    | undefined;
  const contentType = String(body?.contentType ?? "");

  if (!contentType.startsWith("image/")) {
    throw createError({ statusCode: 400, statusMessage: "Only images are allowed" });
  }

  const ext =
    String(body?.extension ?? "").replace(/^\./, "") ||
    EXT_BY_MIME[contentType] ||
    "bin";
  const key = `avatars/${user._id.toString()}/${randomUUID()}.${ext}`;

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

  return { uploadUrl, publicUrl };
});
