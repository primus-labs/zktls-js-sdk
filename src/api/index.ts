import { request } from '../utils/httpRequest';
import { BASEAPI } from '../config/constants';

export function getAppQuote(params: {appId: string}): Promise<{ rc: number; mc: string; msg: string; result: any }> {
  return request<{ rc: number; mc: string; msg: string; result: any }>({
    url: `${BASEAPI}/public/app/quote`,
    method: 'GET',
    params
  });
}



