import { processJobs } from "../../services/processDistributor";

export function handleProcessingReq(req, res) {
  const { toProcessUrls, uploadType, post_id } = req.body;

  if (!toProcessUrls || !Array.isArray(toProcessUrls) || !uploadType || !post_id) {
    return res.status(400).json({ error: "Invalid payload." });
  }

  const jobData = toProcessUrls.map(url => ({
    s3Key: new URL(url).pathname.substring(1),  // userPosts/...
    uploadType,
    userDetails: {  //these details are needed for saving the processed file back to s3
      user_id: req.user.id,
      post_id,
    }
  }));

  processJobs(jobData);
  
  res.status(202).json({ message: "Job accepted for processing." });
}