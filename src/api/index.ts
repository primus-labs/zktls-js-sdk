import { request } from '../utils/httpRequest.js';
import { BASEAPI } from '../config/constants.js';
import type { ApiResponse, EventReportRawData, EventReportRequest } from './types.js';

export type { ApiResponse, EventDetail, ClientType, EventReportRawData, EventReportRequest } from './types.js';

export function getAppQuote(params: { appId: string }): Promise<ApiResponse> {
  return request<ApiResponse>({
    url: `${BASEAPI}/public/app/quote`,
    method: 'GET',
    params
  });
}

export function reportEvent(rawDataObj: EventReportRawData): Promise<ApiResponse<any[]>> {
  const data: EventReportRequest = {
    eventType: 'ATTESTATION_GENERATE',
    rawData: JSON.stringify(rawDataObj)
  };
  return request<ApiResponse<any[]>>({
    url: `${BASEAPI}/public/event/report`,
    method: 'POST',
    data
  });
}

