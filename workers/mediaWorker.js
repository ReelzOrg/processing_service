import sharp from "sharp";
import Ffmpeg from "fluent-ffmpeg";
import { workerData, parentPort } from "worker_threads";
import { getS3ObjectBody, putObjectToS3, uploadStream } from "../utils/s3utils";

const IMAGE_RESOLUTIONS = {
  full_portrait: { width: 1080, height: 1920 },
  portrait: { width: 1080, height: 1350 }
};
const VIDEO_RESOLUTIONS = {
  full_portrait: "1080x1920",
  portrait: "1080x1350"
};
const PROCESSED_FILES_PREFIX = "processed/";

/**
 * This function handles processing of 1 media file (image/video)
 * @param {string} s3Key The url of the media file in s3
 * @param {string} uploadType The type of upload (post, reel, story, profilePhoto)
 * @param {Object} userDetails This object contains the user & post ids
 */
export async function processMedia({ s3Key, uploadType, userDetails }) {
  // const [s3Keys, fileExts, fileNames] = req.body.toProcessUrls.reduce(([s3Keys, fileExts, fileNames], url, index) => {
  //   s3Keys.push(url);
  //   fileExts.push(url.split(".").pop().toLowerCase());
  //   fileNames.push(url.split("/").pop());
  //   return [s3Keys, fileExts, fileNames];
  // }, [[], [], []]);

  const fileExtension = s3Key.split('.').pop().toLowerCase();
  const fileName = s3Key.split('/').pop().split('.')[0];
  const isImage = ['jpg', 'jpeg', 'png', 'webp'].includes(fileExtension);

  parentPort.postMessage(`Starting processing for ${s3Key}`);

  try {
    const sourceStream = await getS3ObjectBody("reelzapp", s3Key);
    if(isImage) processImage(sourceStream, fileName, fileExtension, uploadType, userDetails)
    else processVideo(sourceStream, fileName, uploadType, userDetails)

    return { success: true, originalKey: s3Key };
  } catch (error) {
    parentPort.postMessage(`Error processing media: ${error}`);
    return { success: false, originalKey: s3Key, error: error.message };
  }
}

/**
 * This function handles processing of 1 image file
 * @param {PassThrough} sourceStream The stream of the image file
 * @param {string} fileName The name of the image file
 * @param {string} fileExtension The extension of the image file
 * @param {string} uploadType The type of upload (post, reel, story, profilePhoto)
 * @param {Object} userDetails This object contains the user & post ids
 */
export async function processImage(sourceStream, fileName, fileExtension, uploadType, userDetails) {
  const sharpInstance = sharp();
  sourceStream.pipe(sharpInstance);

  const pathPrefix = uploadType == "post" ? `userPosts/${userDetails.user_id}/${userDetails.post_id}/` : "";
  const uploadPromises = Object.entries(IMAGE_RESOLUTIONS).map(([quality, dims]) => {
    const newKey = `${pathPrefix}${PROCESSED_FILES_PREFIX}${fileName}_${quality}.webp`;

    const transform = sharpInstance.clone().resize({
      width: dims.width,
      height: dims.height,
      fit: "contain",
      background: { r: 0, g: 0, b: 0, alpha: 1 }
    }).webp({ quality: 80 });
    // return putObjectToS3("reelzapp", newKey, transform, "image/webp");
    return uploadStream("reelzapp", transform, newKey, "image/webp");
  })

  await Promise.all(uploadPromises);
}

export async function processVideo(sourceStream, fileName, uploadType, userDetails) {
  const pathPrefix = uploadType == "post" ? `userPosts/${userDetails.user_id}/${userDetails.post_id}/` : "";

  const uploadPromises = Object.entries(VIDEO_RESOLUTIONS).map(([quality, size]) => {
    const [targetWidth, targetHeight] = size.split('x').map(Number);
    return new Promise((resolve, reject) => {
      const pass = new PassThrough();
      const newKey = `${pathPrefix}${PROCESSED_FILES_PREFIX}${fileName}_${quality}.mp4`;

      uploadStream("reelzapp", pass, newKey, "video/mp4").then(resolve).catch(reject);

      Ffmpeg(sourceStream)
        .videoCodec("libx264")
        .audioCodec("aac")
        .videoFilter(
          `scale=${targetWidth}:${targetHeight}:force_original_aspect_ratio=decrease`,
          `pad=${targetWidth}:${targetHeight}:(ow-iw)/2:(oh-ih)/2:black`
        )
        .size(size)
        .toFormat("mp4")
        .on("end", resolve)
        .on("error", reject)
        .pipe(pass, { end: true });
    });
  });

  await Promise.all(uploadPromises);
}

processMedia(workerData).then(result => {
  parentPort.postMessage(result);
});