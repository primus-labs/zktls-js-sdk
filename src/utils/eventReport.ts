import { reportEvent } from '../api/index.js';
import type { EventReportRawData } from '../api/index.js';

/**
 * Best-effort telemetry; failures are swallowed so attestation flow is never affected.
 */
export function eventReport(rawDataObj: EventReportRawData): Promise<void> {
  return Promise.resolve()
    .then(() => reportEvent(rawDataObj))
    .then(() => undefined)
    .catch(() => undefined);
}
