import {
  S3Client,
  PutObjectCommand,
  DeleteObjectCommand,
} from "@aws-sdk/client-s3";
import { getSignedUrl } from "@aws-sdk/s3-request-presigner";

function getClient(): S3Client {
  const region = process.env.B3_S3_AWS_REGION ?? "ap-southeast-1";
  return new S3Client({
    region,
    credentials: {
      accessKeyId: process.env.B3_S3_AWS_ACCESS_KEY ?? "",
      secretAccessKey: process.env.B3_S3_AWS_ACCESS_SECRET ?? "",
    },
  });
}

export function getS3Bucket(): string {
  const bucket = process.env.B3_S3_AWS_BUCKET_NAME;
  if (!bucket) throw new Error("S3 bucket not configured");
  return bucket;
}

/** Build the public CDN/bucket URL for an S3 key. */
export function s3PublicUrl(key: string): string {
  const region = process.env.B3_S3_AWS_REGION ?? "ap-southeast-1";
  const bucket = getS3Bucket();
  const cdn =
    process.env.CDN_DISTRIBUTION ??
    `https://${bucket}.s3.${region}.amazonaws.com`;
  return `${cdn.replace(/\/$/, "")}/${key}`;
}

/** Presign an S3 PUT for the given key + content type. */
export async function presignUpload(
  key: string,
  contentType: string,
): Promise<string> {
  return getSignedUrl(
    getClient(),
    new PutObjectCommand({
      Bucket: getS3Bucket(),
      Key: key,
      ContentType: contentType,
    }),
    { expiresIn: 300 },
  );
}

/** Delete an S3 object (best-effort; no error if it doesn't exist). */
export async function removeS3Object(key: string): Promise<void> {
  await getClient().send(
    new DeleteObjectCommand({ Bucket: getS3Bucket(), Key: key }),
  );
}
