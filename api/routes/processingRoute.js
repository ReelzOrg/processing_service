import express from "express";

import { handleProcessingReq } from "../controllers/mediaProcessing.js";

// api/user/
const router = express.Router();

// we dont need authentication and authorization since they are handled by the main server
router.post("/:id/process-media", handleProcessingReq);

export default router