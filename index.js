import 'dotenv/config';
import express from 'express';
import path from 'path';
import bodyParser from 'body-parser';
import cors from 'cors';
import { fileURLToPath } from 'url';
import { dirname } from 'path';

import { query, closePool } from "./utils/connectDB/pgConnect.js";
import { mediaProcessingRouter } from './api/routes/index.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

const app = express();
const PORT = process.env.PORT || 5000;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));
app.use(cors({origin:'*'}));
app.use(bodyParser.urlencoded({extended: true}));

app.use("/api/user", mediaProcessingRouter);

app.get("/", (req, res) => {});

app.listen(PORT, () => {
  console.log("Server started on port: " + PORT);
})

// Close the connection pool when the server shuts down
async function shutDownServer() {
  console.log("The server is shutting down");

  // close the database connection
  closePool();
  
  process.exit(0);
}

process.on('SIGINT', shutDownServer);
process.on('SIGTERM', shutDownServer);