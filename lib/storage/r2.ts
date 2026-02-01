import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';

// Initialize R2 client
const r2Client = new S3Client({
  region: 'auto',
  endpoint: process.env.R2_ENDPOINT,
  credentials: {
    accessKeyId: process.env.R2_ACCESS_KEY_ID!,
    secretAccessKey: process.env.R2_SECRET_ACCESS_KEY!,
  },
});

export async function uploadResumeToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  userId: string
): Promise<{ fileKey: string; url: string }> {
  const fileKey = `resumes/${userId}/${Date.now()}-${fileName}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileKey,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);

  // Generate public URL
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;

  return {
    fileKey,
    url: publicUrl,
  };
}

export async function getSignedResumeUrl(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileKey,
  });

  // URL expires in 1 hour
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  return signedUrl;
}

export async function deleteResumeFromR2(fileKey: string): Promise<void> {
  // Note: We're not actually deleting files in this version
  // Just a placeholder for future implementation
  console.log(`Would delete file: ${fileKey}`);
}

/** Upload a company document (handbook, policies, etc.) for onboarding AI. Path: company-docs/ */
export async function uploadCompanyDocToR2(
  file: Buffer,
  fileName: string,
  contentType: string
): Promise<{ fileKey: string; url: string }> {
  const fileKey = `company-docs/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;

  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileKey,
    Body: file,
    ContentType: contentType,
  });

  await r2Client.send(command);
  const publicUrl = `${process.env.R2_PUBLIC_URL}/${fileKey}`;
  return { fileKey, url: publicUrl };
}

/** Upload onboarding task submission (candidate document). Path: onboarding-submissions/{flowId}/{taskId}/ */
export async function uploadOnboardingSubmissionToR2(
  file: Buffer,
  fileName: string,
  contentType: string,
  flowId: string,
  taskId: string
): Promise<{ fileKey: string }> {
  const fileKey = `onboarding-submissions/${flowId}/${taskId}/${Date.now()}-${fileName.replace(/[^a-zA-Z0-9._-]/g, '_')}`;
  const command = new PutObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileKey,
    Body: file,
    ContentType: contentType,
  });
  await r2Client.send(command);
  return { fileKey };
}

/** Get a signed URL to view/download an object by key (e.g. onboarding submission). Expires in 1 hour. */
export async function getSignedUrlForKey(fileKey: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: process.env.R2_BUCKET_NAME!,
    Key: fileKey,
  });
  const signedUrl = await getSignedUrl(r2Client, command, { expiresIn: 3600 });
  return signedUrl;
}
