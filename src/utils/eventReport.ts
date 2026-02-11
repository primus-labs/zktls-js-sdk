import { reportEvent } from '../api';
import type { EventReportRawData } from '../api';

async function eventReport(rawDataObj: EventReportRawData) {
  try {
    await reportEvent(rawDataObj);
  } catch (error: any) {
    console.error('event report failed:', error);
  }
}

export { eventReport };
