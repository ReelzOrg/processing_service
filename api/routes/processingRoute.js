import express from "express";

// Utils
import authenticateToken from "../../utils/authenticateToken.js";
import checkUserAuthorization from "../../utils/checkUserAuthorization.js";

// Controllers
import { processMedia } from "../controllers/mediaProcessing.js";

const router = express.Router();

// api/user/
router.post("/:id/process-media", authenticateToken, checkUserAuthorization, processMedia);

export default router