import os from 'os';
import path from 'path';
import { Worker } from "worker_threads";
import PQueue from "p-queue";

// This file manages the worker threads. It takes the list of files from the controller
// and distributes each file to an available worker
const NUM_CORES = os.cpus().length;
const workerScript = path.resolve("../workers/mediaWorker.js");

const queue = new PQueue({ concurrency: NUM_CORES });

export function processJobs(mediaList) {
  console.log(`Distributing ${mediaList.length} jobs across ${NUM_CORES} cores`);

  // Add each job to the queue instead of running them all at once
  mediaList.forEach(mediaItem => {
    queue.add(() => new Promise((resolve, reject) => {
      const worker = new Worker(workerScript, {workerData: mediaItem});
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", code => {
        if(code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    }))
  });
}