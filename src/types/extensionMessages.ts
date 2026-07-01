/** Extension <-> SDK postMessage payload shapes for browser attestation flow. */

export type ExtensionErrorData = {
  code?: string;
  data?: unknown;
  details?: { subCode?: unknown };
  title?: string;
  desc?: string;
};

export type InitAttestationResParams = {
  result?: boolean;
  data?: {
    padoExtensionVersion?: string;
    domain?: string;
  };
  errorData?: ExtensionErrorData;
};

export type GetAttestationResParams = {
  result?: boolean;
  errorData?: ExtensionErrorData;
};

export type StartAttestationSuccessData = {
  extendedData?: unknown;
  allJsonResponse?: unknown[];
  privateData?: string;
  reponseResolve?: unknown[];
  requestid?: string;
  [key: string]: unknown;
};

export type StartAttestationResParams = {
  result?: boolean;
  data?: StartAttestationSuccessData;
  errorData?: ExtensionErrorData;
};

export type ExtensionMessageName = 'initAttestationRes' | 'getAttestationRes' | 'startAttestationRes';

export type ExtensionInboundMessage = {
  target: 'padoZKAttestationJSSDK';
  name: ExtensionMessageName;
  params: InitAttestationResParams | GetAttestationResParams | StartAttestationResParams;
};

export function parseExtensionInboundMessage(data: unknown): ExtensionInboundMessage | null {
  if (!data || typeof data !== 'object') {
    return null;
  }
  const record = data as Record<string, unknown>;
  if (record.target !== 'padoZKAttestationJSSDK' || typeof record.name !== 'string') {
    return null;
  }
  if (
    record.name !== 'initAttestationRes' &&
    record.name !== 'getAttestationRes' &&
    record.name !== 'startAttestationRes'
  ) {
    return null;
  }
  if (!record.params || typeof record.params !== 'object') {
    return null;
  }
  return {
    target: 'padoZKAttestationJSSDK',
    name: record.name,
    params: record.params as ExtensionInboundMessage['params'],
  };
}

function resolvePageOrigin(): string | null {
  if (typeof window === 'undefined' || typeof window.location?.origin !== 'string') {
    return null;
  }
  return window.location.origin;
}

export function isTrustedPrimusExtensionPostMessageOrigin(origin: string): boolean {
  const pageOrigin = resolvePageOrigin();
  return typeof origin === 'string' && pageOrigin !== null && origin === pageOrigin;
}

export function parseTrustedExtensionInboundMessage(event: MessageEvent): ExtensionInboundMessage | null {
  if (!isTrustedPrimusExtensionPostMessageOrigin(event.origin)) {
    return null;
  }
  return parseExtensionInboundMessage(event.data);
}

export function isInitAttestationResMessage(
  message: ExtensionInboundMessage
): message is ExtensionInboundMessage & { name: 'initAttestationRes'; params: InitAttestationResParams } {
  return message.name === 'initAttestationRes';
}

export function isGetAttestationResMessage(
  message: ExtensionInboundMessage
): message is ExtensionInboundMessage & { name: 'getAttestationRes'; params: GetAttestationResParams } {
  return message.name === 'getAttestationRes';
}

export function isStartAttestationResMessage(
  message: ExtensionInboundMessage
): message is ExtensionInboundMessage & { name: 'startAttestationRes'; params: StartAttestationResParams } {
  return message.name === 'startAttestationRes';
}
