const MAPBOX_BLOB_WORKER_STACK = /at <unknown> \(blob:http:\/\/localhost:\d+\/[0-9a-f-]+:1:\d+\)/i;

export function isKnownMapboxWorkerError(error: Error) {
  return error.message === "Error" && MAPBOX_BLOB_WORKER_STACK.test(error.stack ?? "");
}
