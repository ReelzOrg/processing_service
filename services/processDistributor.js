import os from 'os';
import path from 'path';
import { Worker } from "worker_threads";

// This file manages the worker threads. It takes the list of files from the controller
// and distributes each file to an available worker
const NUM_CORES = os.cpus().length;
const workerScript = path.resolve("../workers/mediaWorker.js");

export function processJobs(mediaList) {
  console.log(`Distributing ${mediaList.length} jobs across ${NUM_CORES} cores`);

  const promises = mediaList.map(mediaItem => {
    return new Promise((resolve, reject) => {
      const worker = new Worker(workerScript, {workerData: mediaItem});
      worker.on("message", resolve);
      worker.on("error", reject);
      worker.on("exit", code => {
        if(code !== 0) reject(new Error(`Worker stopped with exit code ${code}`));
      });
    })
  });

  // return Promise.all(promises);

  // Not waiting for all jobs to finish here, just log the results as they complete.
  Promise.allSettled(promises).then(results => {
    console.log("All jobs have been processed.");
    results.forEach(result => {
      if (result.status === "fulfilled") {
        console.log("Job finished:", result.value);
      } else {
        console.error("Job failed:", result.reason);
      }
    });
  });
}