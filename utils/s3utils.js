import 'dotenv/config.js';
import { S3Client, GetObjectCommand, PutObjectCommand } from "@aws-sdk/client-s3";
import { Upload } from "@aws-sdk/lib-storage";
import { PassThrough } from "stream";

const s3 = new S3Client({
  region: process.env.AWS_REGION,
  credentials: {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
  },
});

export async function getS3ObjectBody(bucket = "reelzapp", key, retries=1) {
  const getCommand = new GetObjectCommand({ Bucket: bucket, Key: key });
  const response = await s3.send(getCommand);
  if (!response.Body) {
    if(retries > 0) {
      retries--;
      return getS3ObjectBody(bucket, key, retries);
    } else {
      throw new Error(`Failed to get S3 object body for ${key}`);
    }
  }
  return {body: response.Body, contentType: response.ContentType}; // response.Body is a ReadableStream in Node.js
}

/**
 * This function puts an object to S3
 * @param {string} bucketName The name of the bucket
 * @param {string} key The key of the object
 * @param {PassThrough} passThroughStream The stream of the object
 * @param {string} contentType The content type of the object
 * @returns {Promise<boolean>} True if the object was successfully uploaded, false otherwise
 */
export async function putObjectToS3(bucketName = "reelzapp", key, passThroughStream, contentType) {
  const putObjectParams = {
    Bucket: bucketName,
    Key: key,
    Body: passThroughStream,
    ContentType: contentType, // Ensure correct Content-Type for the output
  };

  try {
    await s3.send(new PutObjectCommand(putObjectParams));
    console.log(`Successfully uploaded ${key} to ${bucketName}`);
    return true;
  } catch (err) {
    console.error(`Failed to upload ${key} to ${bucketName}:`, err);
    return false;
  }
}

/**
 * Uploads a readable stream to the destination S3 bucket.
 * @param {ReadableStream} stream - The readable stream to upload.
 * @param {string} key - The destination S3 object key.
 * @param {string} contentType - The MIME type of the file.
 * @returns {Promise<any>}
 */
export async function uploadStream(bucketName = "reelzapp", stream, key, contentType) {
  const upload = new Upload({
    client: s3,
    params: {
      Bucket: bucketName,
      Key: key,
      Body: stream,
      ContentType: contentType,
    },
  });

  return upload.done();
}