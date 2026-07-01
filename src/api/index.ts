import { request } from '../utils/httpRequest.js';
import { BASEAPI } from '../config/constants.js';
import type { ApiResponse, EventReportRawData, EventReportRequest } from './types.js';

export type { ApiResponse, EventDetail, ClientType, EventReportRawData, EventReportRequest } from './types.js';

type ApiRequestOptions = {
  baseApi?: string;
};

export function getAppQuote(params: { appId: string }, options?: ApiRequestOptions): Promise<ApiResponse> {
  return request<ApiResponse>({
    url: `${options?.baseApi ?? BASEAPI}/public/app/quote`,
    method: 'GET',
    params
  });
}

export function reportEvent(rawDataObj: EventReportRawData, options?: ApiRequestOptions): Promise<ApiResponse<any[]>> {
  const data: EventReportRequest = {
    eventType: 'ATTESTATION_GENERATE',
    rawData: JSON.stringify(rawDataObj)
  };
  return request<ApiResponse<any[]>>({
    url: `${options?.baseApi ?? BASEAPI}/public/event/report`,
    method: 'POST',
    data
  });
}

