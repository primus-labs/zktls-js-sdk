/**
 * HTTP Request Utility - A wrapper based on fetch API
 */

export interface RequestConfig {
  url: string;
  method?: 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH' | 'HEAD' | 'OPTIONS';
  headers?: Record<string, string>;
  params?: Record<string, any>;
  data?: any;
  timeout?: number;
  responseType?: 'json' | 'text' | 'blob' | 'arrayBuffer';
}

export async function request<T = any>(config: RequestConfig): Promise<T> {
  const {
    url,
    method = 'GET',
    headers = {},
    params,
    data,
    timeout = 50000,
    responseType = 'json'
  } = config;

  const hasBody = ['POST', 'PUT', 'PATCH'].includes(method.toUpperCase());
  
  let fullUrl = url;
  if (!hasBody && params && Object.keys(params).length > 0) {
    const urlObj = new URL(url);
    Object.entries(params).forEach(([key, value]) => {
      if (value !== undefined && value !== null) {
        urlObj.searchParams.append(key, String(value));
      }
    });
    fullUrl = urlObj.toString();
  }

  let body: string | undefined;
  if (hasBody) {
    const bodyData = data !== undefined ? data : params;
    if (bodyData !== undefined && bodyData !== null) {
      if (!headers['Content-Type'] && !headers['content-type']) {
        headers['Content-Type'] = 'application/json';
      }
      
      const contentType = headers['Content-Type'] || headers['content-type'] || '';
      if (contentType.includes('application/json')) {
        body = JSON.stringify(bodyData);
      } else if (contentType.includes('application/x-www-form-urlencoded')) {
        body = new URLSearchParams(bodyData as Record<string, string>).toString();
      } else {
        body = String(bodyData);
      }
    }
  }

  const controller = new AbortController();
  const timeoutId = timeout > 0 ? setTimeout(() => controller.abort(), timeout) : null;

  try {
    const response = await fetch(fullUrl, {
      method,
      headers,
      body,
      signal: controller.signal
    });

    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    let responseData: any;
    try {
      switch (responseType) {
        case 'json':
          responseData = await response.json();
          break;
        case 'text':
          responseData = await response.text();
          break;
        case 'blob':
          responseData = await response.blob();
          break;
        case 'arrayBuffer':
          responseData = await response.arrayBuffer();
          break;
        default:
          responseData = await response.json();
      }
    } catch (parseError) {
      responseData = await response.text();
    }

    if (!response.ok) {
      const error = new Error(`HTTP ${response.status}: ${response.statusText}`) as any;
      error.status = response.status;
      error.statusText = response.statusText;
      error.data = responseData;
      throw error;
    }

    return responseData;
  } catch (error: any) {
    if (timeoutId) {
      clearTimeout(timeoutId);
    }

    if (error.name === 'AbortError') {
      const timeoutError = new Error(`Request timeout after ${timeout}ms`) as any;
      timeoutError.code = 'TIMEOUT';
      throw timeoutError;
    }

    if (error instanceof TypeError && error.message.includes('fetch')) {
      const networkError = new Error(`Network error: ${error.message}`) as any;
      networkError.code = 'NETWORK_ERROR';
      throw networkError;
    }

    throw error;
  }
}
