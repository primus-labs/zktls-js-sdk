import { reportEvent } from '../api/index.js';
import type { EventReportRawData } from '../api/index.js';

/**
 * Best-effort telemetry; failures are swallowed so attestation flow is never affected.
 */
export async function eventReport(rawDataObj: EventReportRawData): Promise<void> {
  try {
    await reportEvent(rawDataObj);
  } catch {
    /* optional analytics — ignore */
  }
}
