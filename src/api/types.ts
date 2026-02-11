export type ApiResponse<T = any> = {
  rc: number;
  mc: string;
  msg: string;
  result: T;
};

/**
 * Event detail interface
 */
export interface EventDetail {
  code: string;
  desc: string;
}

/**
 * Client type enum
 */
export type ClientType =
  | '@primuslabs/extension'
  | '@primuslabs/zktls-js-sdk'
  | '@primuslabs/zktls-core-sdk'
  | '@primuslabs/network-js-sdk'
  | '@primuslabs/network-core-sdk';

/**
 * Event report raw data interface
 */
export interface EventReportRawData {
  source?: string;
  clientType: ClientType;
  appId?: string;
  templateId?: string;
  address?: string;
  status: 'SUCCESS' | 'FAILED';
  detail?: EventDetail;
  ext?: Record<string, any>;
}

/**
 * Event report request data interface
 */
export interface EventReportRequest {
  eventType: string;
  rawData: string;
}
