/**
 * SDK-facing messages (aligned with `minwensdk.json` for codes present here; AlphaNet-only codes are omitted).
 */
export type AttestationErrorCode =
  | '00000'
  | '00001'
  | '00002'
  | '00003'
  | '00004'
  | '00005'
  | '00006'
  | '00009'
  | '00010'
  | '00012'
  | '00013'
  | '00014'
  | '00101'
  | '00102'
  | '00103'
  | '00104'
  | '01000'
  | '10001'
  | '10002'
  | '10003'
  | '10004'
  | '20001'
  | '20002'
  | '20003'
  | '20004'
  | '20005'
  | '30001'
  | '30001:301'
  | '30001:302'
  | '30001:401'
  | '30001:403'
  | '30001:404'
  | '30001:429'
  | '30002'
  | '30003'
  | '30004'
  | '30005'
  | '30006'
  | '40001'
  | '40002'
  | '50000'
  | '50000:501'
  | '50000:502'
  | '50000:505'
  | '50000:507'
  | '50000:508'
  | '50000:510'
  | '50002'
  | '50003'
  | '50004'
  | '50005'
  | '50006'
  | '50009'
  | '50011'
  | '99999'
  | '-1002001'
  | '-1002002'
  | '-1002003'
  | '-1002004'
  | '-1002005'
  | '-210001';

export type OnChainErrorCode = '00007' | '00008';

export type ErrorCode = AttestationErrorCode | OnChainErrorCode;

export const ErrorCodeMAP: Record<string, string> = {
  '00000': 'Too many requests. Please try again later.',
  '00001': 'Failed to start the algorithm. Please refresh the page, then try again.',
  '00002': 'The verification process timed out. Please try again later.',
  '00003': 'Verification is in progress. Please try again later.',
  '00004': 'Verification was cancelled by the user.',
  '00005': 'Invalid SDK parameters.',
  '00006':
    'Extension not detected. Please install and enable Primus Extension from the Chrome Web Store (https://chromewebstore.google.com/detail/primus/oeiomhmbaapihbilkfkhmlajkeegnjhe), then try again.',
  '00012': 'Invalid template ID.',
  '00104': 'Verification requirements not met.',
  '00013':
    'No verifiable data detected. Please confirm login status and account details.',
  '00014':
    'The verification process timed out due to a connection interruption. Please try again later.',
  '01000': 'Attestation timed out.',
  '10001': 'Unstable internet connection. Please try again later.',
  '10002': 'Network connection interrupted during attestation. Please try again later.',
  '10003':
    'Connection to the attestation server was interrupted during processing. Please try again later.',
  '10004':
    'Connection to the data source server was interrupted during processing. Please try again later.',
  '20001': 'Internal runtime error: LengthException. Contact Primus Team for assistance.',
  '20002': 'Internal runtime error: OutOfRangeException. Contact Primus Team for assistance.',
  '20003': 'Invalid algorithm parameters.',
  '20004': 'Internal runtime error: LogicError. Contact Primus Team for assistance.',
  '20005': 'Runtime error: NotDefined. Contact Primus Team for assistance.',
  '30001': 'Response error. Please try again later.',
  '30001:301': 'Request URL not detected. Contact Primus Team for assistance.',
  '30001:302': 'Response error. Please try again later.',
  '30001:401': 'Session expired. Please log in again.',
  '30001:403':
    "Access blocked due to the data source server's risk control. Please try again later.",
  '30001:404': 'Request URL not detected. Contact Primus Team for assistance.',
  '30001:429':
    'Rate limited by the data source server due to excessive requests from this user. Please try again later.',
  '30002': 'Response validation error. Please try again later.',
  '30003': 'Response parsing error. Please try again later.',
  '30004': 'JSON parsing error. Contact Primus Team for assistance.',
  '30005': 'HTML parsing error. Contact Primus Team for assistance.',
  '30006':
    'Preset path key not found in the response. Contact Primus Team for assistance.',
  '40001': 'Internal error: FileNotExistException. Contact Primus Team for assistance.',
  '40002': 'SSL certificate error. Contact Primus Team for assistance.',
  '50000:501': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50000:502': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50003': 'The client encountered an unexpected error. Please try again later.',
  '50004': 'The client did not start correctly. Please try again later.',
  '50000:505': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50006': 'Algorithm server not started. Please try again later.',
  '50000:507': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50000:508': 'Internal algorithm error. Contact Primus team for assistance.',
  '50009': 'Algorithm service timed out. Please try again later.',
  '50000:510': 'Internal algorithm error. Contact Primus Team for assistance.',
  '50011': 'Unsupported TLS version. Contact Primus Team for assistance.',
  '99999': 'Undefined error. Please try again later.',
  '-1002001': 'Invalid app ID.',
  '-1002002': 'Invalid app secret.',
  '-1002003': 'Trial quota exhausted.',
  '-1002004': 'Subscription expired.',
  '-1002005': 'Quota exhausted.',
  '-210001': 'Address has pending proof for identityPropertyId.',
};

const errorCodeLookup = ErrorCodeMAP as Record<string, string | undefined>;

function readSubCodeFromDetails(details: unknown): string | undefined {
  if (!details || typeof details !== 'object' || details === null) {
    return undefined;
  }
  const raw = (details as { subCode?: unknown }).subCode;
  if (raw == null || raw === '') {
    return undefined;
  }
  return String(raw);
}

function readDetailsSubCode(data: unknown): string | undefined {
  if (!data || typeof data !== 'object' || data === null) {
    return undefined;
  }
  const details = (data as { details?: unknown }).details;
  return readSubCodeFromDetails(details);
}

function resolveZkAttestationErrorMessage(
  code: ErrorCode,
  message: string | undefined,
  subCode: string | undefined
): string | undefined {
  if (message) {
    return message;
  }
  if (subCode) {
    const compositeKey = `${code}:${subCode}`;
    const fromComposite = errorCodeLookup[compositeKey];
    if (fromComposite !== undefined) {
      return fromComposite;
    }
  }
  return errorCodeLookup[code];
}

/** Wire-format `data` field: always a string; omit nested `details` (subCode is top-level). */
function dataForJsonExport(stored: unknown): string {
  if (stored === undefined || stored === null) {
    return '';
  }
  if (typeof stored === 'string') {
    return stored;
  }
  if (typeof stored === 'object' && !Array.isArray(stored)) {
    const o = { ...(stored as Record<string, unknown>) };
    delete o.details;
    if (Object.keys(o).length === 0) {
      return '';
    }
    return JSON.stringify(o);
  }
  return JSON.stringify(stored);
}

/**
 * Merge extension `errorData.data` with optional top-level `errorData.details`
 * so {@link ZkAttestationError} can resolve `code:subCode` messages.
 */
export function packZkAttestationErrorData(errorData: {
  data?: unknown;
  details?: unknown;
}): unknown {
  const { data, details } = errorData;
  if (details === undefined) {
    return data;
  }
  if (data !== undefined && typeof data === 'object' && data !== null && !Array.isArray(data)) {
    return { ...(data as Record<string, unknown>), details };
  }
  if (data !== undefined) {
    return { data, details };
  }
  return { details };
}

export class ZkAttestationError {
  code: ErrorCode;
  message: string;
  /** HTTP-style or domain sub-code from `details.subCode` when present. */
  subCode?: string;
  data?: any;
  /**
   * @param data - Raw `errorData.data` from the extension (or legacy merged payload).
   * @param details - Optional `errorData.details`; used for `subCode` / message map when `data` is not an object with nested `details`.
   */
  constructor(code: ErrorCode, message?: string, data?: any, details?: unknown) {
    const subCode = readSubCodeFromDetails(details) ?? readDetailsSubCode(data);
    this.subCode = subCode;
    this.message = resolveZkAttestationErrorMessage(code, message, subCode) || '';
    this.code = code;
    this.data = data;
  }

  /**
   * Shape for `JSON.stringify` / logging: `{ code, message, subCode?, data }` with `data` always a string.
   */
  toJSON(): { code: ErrorCode; message: string; data: string; subCode?: string } {
    const data = dataForJsonExport(this.data);
    if (this.subCode !== undefined && this.subCode !== '') {
      return {
        code: this.code,
        message: this.message,
        subCode: this.subCode,
        data,
      };
    }
    return {
      code: this.code,
      message: this.message,
      data,
    };
  }
}
