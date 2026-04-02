import { reportEvent } from '../api/index.js';
import type { EventReportRawData } from '../api/index.js';

async function eventReport(rawDataObj: EventReportRawData) {
  try {
    await reportEvent(rawDataObj);
  } catch (error: any) {
    console.error('event report failed:', error);
  }
}

export { eventReport };
