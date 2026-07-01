/** Extension postMessage helpers shared by web init/startAttestation flows. */

import { ZkAttestationError } from '../error.js';
import type { ExtensionInboundMessage } from '../types/extensionMessages.js';
import { parseTrustedExtensionInboundMessage } from '../types/extensionMessages.js';

export type ExtensionOutboundEnvelope = {
  target: string;
  origin: string;
  name: string;
  params: unknown;
};

export const EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE =
  'The extension session exceeded the maximum time limit. Please refresh the page and try again.';

export function postExtensionOutboundMessage(payload: ExtensionOutboundEnvelope): void {
  window.postMessage(payload);
}

export function buildExtensionOutboundMessage(
  name: ExtensionOutboundEnvelope['name'],
  params: unknown
): ExtensionOutboundEnvelope {
  return {
    target: 'padoExtension',
    origin: 'padoZKAttestationJSSDK',
    name,
    params,
  };
}

export function createExtensionSession(overallBudgetMs: number) {
  const deadline = Date.now() + overallBudgetMs;
  return {
    phaseMs(capMs: number): number {
      const remaining = deadline - Date.now();
      return remaining <= 0 ? 0 : Math.min(capMs, remaining);
    },
    expired(): boolean {
      return Date.now() >= deadline;
    },
    throwIfBudgetExhausted(): void {
      if (this.expired()) {
        throw new ZkAttestationError('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE, '');
      }
    },
  };
}

export type ExtensionWaitOptions<M extends ExtensionInboundMessage = ExtensionInboundMessage> = {
  match: (message: ExtensionInboundMessage) => M | undefined | null | false;
  timeoutMs: number;
  timeoutError?: ZkAttestationError;
};

export function waitForExtensionInboundMessage<M extends ExtensionInboundMessage>(
  opts: ExtensionWaitOptions<M>
): Promise<M> {
  const { match, timeoutError } = opts;
  const ms = opts.timeoutMs;

  return new Promise((resolve, reject) => {
    if (ms <= 0) {
      reject(timeoutError ?? new ZkAttestationError('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE, ''));
      return;
    }

    const timer = window.setTimeout(() => {
      cleanup();
      reject(timeoutError ?? new ZkAttestationError('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE, ''));
    }, ms);

    const listener = (event: MessageEvent) => {
      const parsed = parseTrustedExtensionInboundMessage(event);
      if (!parsed) {
        return;
      }
      const hit = match(parsed);
      if (!hit) {
        return;
      }
      cleanup();
      resolve(hit);
    };

    const cleanup = () => {
      window.clearTimeout(timer);
      window.removeEventListener('message', listener);
    };

    window.addEventListener('message', listener);
  });
}
