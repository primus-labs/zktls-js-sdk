import { ethers } from 'ethers';
import {
  ATTESTATIONPOLLINGTIME,
  ATTESTATIONPOLLINGTIMEOUT,
  PADOADDRESSMAP,
  ATTESTATIONPOLLINGTIMEOUTMOBILE,
  EXTENSION_WEB_SESSION_TOTAL_MS,
  INIT_ATTESTATION_TIMEOUT,
  getBaseApi,
} from './config/constants.js';
import { PACKAGE_VERSION, PACKAGE_NAME } from './generated/packageMeta.js';
import type {
  AllJsonResponseItem,
  Attestation,
  SignedAttRequest,
  InitOptions,
  GenerateRequestParamsOptions
} from './types.js';
import { ErrorCodeMAP, ZkAttestationError } from './error.js';
import type { ErrorCode } from './error.js';
import { AttRequest } from './classes/AttRequest.js';
import { encodeAttestation, sendRequest, isSolanaAddress } from './utils.js';
import { getAppQuote } from './api/index.js';
import { eventReport } from './utils/eventReport.js';
import type { ClientType, EventReportRawData } from './api/index.js';
import {
  buildExtensionOutboundMessage,
  createExtensionSession,
  EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE,
  postExtensionOutboundMessage,
  waitForExtensionInboundMessage,
} from './classes/extensionMessageBridge.js';
import type {
  ExtensionErrorData,
  GetAttestationResParams,
  StartAttestationResParams
} from './types/extensionMessages.js';
import {
  isGetAttestationResMessage,
  isInitAttestationResMessage,
  isStartAttestationResMessage,
  parseTrustedExtensionInboundMessage,
} from './types/extensionMessages.js';

const PACKAGEJSONVERSION = PACKAGE_VERSION;
const PACKAGENAME = PACKAGE_NAME as ClientType;
const EXTENSION_GET_ATTESTATION_RES_NO_RESPONSE_MESSAGE =
  'No response message received from the extension (getAttestationRes).';

function buildEventReportCode(code: string, subCode: unknown): string {
  if (subCode === undefined || subCode === null || subCode === '') {
    return code;
  }
  return `${code}:${String(subCode)}`;
}

const EVENT_REPORT_SKIP_FAILED_CODES = new Set(['00003', '00004', '00005', '00006', '00014']);

function coerceAttestationErrorCode(code: string | undefined, fallbackCode: ErrorCode): ErrorCode {
  if (code && Object.prototype.hasOwnProperty.call(ErrorCodeMAP, code)) {
    return code as ErrorCode;
  }
  return fallbackCode;
}

function readErrorPayload(errorData: ExtensionErrorData | undefined, fallbackCode: ErrorCode = '00005') {
  return {
    code: coerceAttestationErrorCode(errorData?.code, fallbackCode),
    data: errorData?.data,
    details: errorData?.details,
  };
}

class PrimusZKTLS {
  private _padoAddress: string;
  private _attestLoading: boolean;

  isInstalled?: boolean;
  isInitialized: boolean;
  padoExtensionVersion: string;

  appId: string;
  appSecret?: string;
  options: InitOptions;
  extendedData: Record<string, any>;
  latestRunningMobileRequest?: string;
  allJsonResponseFlag?: 'true' | 'false';
  _allJsonResponse: Record<string, AllJsonResponseItem[]>;
  private _allPrivateData: Record<string, any>;

  constructor() {
    this.isInitialized = false
    this.isInstalled = false

    this.padoExtensionVersion = ''

    this.appId = ''
    this.options = { platform: "pc", env: "production", openAndroidApp: false };
    this._padoAddress = (PADOADDRESSMAP as any)["production"]
    this.extendedData = {};
    this.allJsonResponseFlag = 'false'
    this._allJsonResponse = {};
    this._allPrivateData = {};
    this._attestLoading = false;
  }

  private reportEventIfNeeded(rawDataObj: EventReportRawData): void {
    if (rawDataObj.status === 'FAILED') {
      const reportCode = rawDataObj.detail?.code;
      const baseCode = reportCode ? reportCode.split(':')[0] : undefined;
      if (baseCode && EVENT_REPORT_SKIP_FAILED_CODES.has(baseCode)) {
        return;
      }
    }
    void eventReport(rawDataObj, { baseApi: this.getRuntimeBaseApi() });
  }

  private getRuntimeBaseApi(): string {
    return getBaseApi(this.options.env);
  }

  init(appId: string, appSecret?: string, options?: InitOptions): Promise<string | boolean> {
    this.appId = appId;
    this.appSecret = appSecret;
    if (options?.platform) {
      this.options.platform = options.platform;
    }
    if (options?.env) {
      this.options.env = options?.env;
    }
    if (options?.openAndroidApp) {
      this.options.openAndroidApp = options?.openAndroidApp;
    }
    if (this.options?.env !== "production") {
      this._padoAddress = (PADOADDRESSMAP as any)["development"];
    }
    const isNodeEnv = typeof process !== 'undefined' && process.versions && process.versions.node;
    if (options?.platform === "android" || options?.platform === "ios") {
      this.isInitialized = true;
      return Promise.resolve(true)
    } else if (appSecret && isNodeEnv) {
      this.isInitialized = true;
      return Promise.resolve(true)
    } else {
      if (typeof window === 'undefined') {
        return Promise.reject(new ZkAttestationError('00006'));
      }
      this.isInstalled = !!window.primus
      if (this.isInstalled) {
      } else {
        const errorCode = '00006'
        return Promise.reject(new ZkAttestationError(
          errorCode
        ))
      }

      const initResultPromise = this.waitForInitAttestationResult();
      postExtensionOutboundMessage(
        buildExtensionOutboundMessage('initAttestation', {
          sdkVersion: PACKAGEJSONVERSION,
          clientType: PACKAGENAME,
        })
      );
      return initResultPromise;
    }
  }

  private async waitForInitAttestationResult(): Promise<string | boolean> {
    const session = createExtensionSession(EXTENSION_WEB_SESSION_TOTAL_MS);
    const phaseBudgetMs = session.phaseMs(INIT_ATTESTATION_TIMEOUT);
    console.time('initAttestationCost')

    try {
      if (phaseBudgetMs <= 0) {
        session.throwIfBudgetExhausted();
      }

      const message = await waitForExtensionInboundMessage({
        match: (m) => (isInitAttestationResMessage(m) ? m : undefined),
        timeoutMs: phaseBudgetMs,
        timeoutError: new ZkAttestationError('00017'),
      });

      const params = message.params;
      console.log('sdk receive initAttestationRes', params)
      if (params?.result) {
        this.isInitialized = params.result
        if (params.data?.padoExtensionVersion) {
          this.padoExtensionVersion = params.data.padoExtensionVersion
        }
        return this.padoExtensionVersion;
      }
      const { code } = readErrorPayload(params?.errorData, '00017');
      throw new ZkAttestationError(code);
    } finally {
      console.timeEnd('initAttestationCost')
    }
  }

  /**
   * @param attTemplateID - Attestation template ID
   * @param userAddress - Optional user address (defaults to zero address if omitted)
   * @param options - Optional attestation request settings applied before signing
   */
  generateRequestParams(
    attTemplateID: string,
    userAddress?: string,
    options?: GenerateRequestParamsOptions
  ): AttRequest {
    const userAddr = userAddress || "0x0000000000000000000000000000000000000000"

    return new AttRequest({
      appId: this.appId,
      attTemplateID,
      userAddress: userAddr,
      ...options,
    })
  }

  /**
   * Ask the extension to close the attestation data source tab (PC). No-op if no tab or mobile.
   */
  closeDataSourceTab(): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    postExtensionOutboundMessage(buildExtensionOutboundMessage('closeDataSourceTab', {}));
    return Promise.resolve();
  }

  async sign(signParams: string): Promise<string> {
    if (this.appSecret) {
      const wallet = new ethers.Wallet(this.appSecret);
      const messageHash = ethers.utils.keccak256(new TextEncoder().encode(signParams));
      const sig = await wallet.signMessage(messageHash);
      const result: SignedAttRequest = {
        attRequest: JSON.parse(signParams),
        appSignature: sig
      };
      return JSON.stringify(result);
    } else {
      throw new Error("Only call in App server environment.");
    }
  }

  async startAttestation(attestationParamsStr: string): Promise<Attestation> {
    if (!this.isInitialized) {
      const errorCode = '00001'
      return Promise.reject(new ZkAttestationError(errorCode))
    }
    const isMobilePlatform =
      this.options?.platform === 'android' || this.options?.platform === 'ios'
    if (!isMobilePlatform) {
      if (this._attestLoading) {
        const errorCode = '00003'
        return Promise.reject(new ZkAttestationError(errorCode))
      }
      this._attestLoading = true
    }

    try {
      const attestationParams = JSON.parse(attestationParamsStr) as SignedAttRequest;
      this._verifyAttestationParams(attestationParams);

      // Check app quote before starting attestation
      await this._checkAppQuote();

      if (isMobilePlatform) {
        return this.startAttestationMobile(attestationParamsStr);
      }
      if (typeof window === 'undefined') {
        throw new ZkAttestationError('00006');
      }

      const eventReportBaseParams = {
        source: '',
        clientType: PACKAGENAME as ClientType,
        appId: attestationParams.attRequest.appId,
        templateId: attestationParams.attRequest.attTemplateID || '',
        address: attestationParams.attRequest.userAddress,
        ext: {} as Record<string, any>
      };

      const pollingTimeout = attestationParams.attRequest?.timeout ?? ATTESTATIONPOLLINGTIMEOUT;
      const formatParams: any = { ...attestationParams, sdkVersion: PACKAGEJSONVERSION, clientType: PACKAGENAME}
      this.allJsonResponseFlag = attestationParams?.attRequest?.allJsonResponseFlag === 'true' ? 'true' : 'false'
      console.time('startAttestCost')
      return new Promise((resolve, reject) => {
        const session = createExtensionSession(EXTENSION_WEB_SESSION_TOTAL_MS);
        let settled = false;
        let timerEnded = false;
        let pollingTimer: ReturnType<typeof setInterval> | undefined;
        let timeoutTimer: ReturnType<typeof setTimeout> | undefined;
        let ackTimer: ReturnType<typeof setTimeout> | undefined;
        const stopGetAttestationResultPolling = () => {
          if (pollingTimer != null) {
            clearInterval(pollingTimer)
            pollingTimer = undefined
          }
          if (timeoutTimer != null) {
            clearTimeout(timeoutTimer)
            timeoutTimer = undefined
          }
          if (ackTimer != null) {
            clearTimeout(ackTimer)
            ackTimer = undefined
          }
        }
        const endTimer = () => {
          if (!timerEnded) {
            timerEnded = true;
            console.timeEnd('startAttestCost')
          }
        }
        const cleanup = () => {
          stopGetAttestationResultPolling()
          endTimer()
          this._attestLoading = false
          window?.removeEventListener('message', eventListener);
        }
        const settleReject = (error: ZkAttestationError) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          reject(error);
        }
        const settleResolve = (attestation: Attestation) => {
          if (settled) {
            return;
          }
          settled = true;
          cleanup();
          resolve(attestation);
        }
        const reportFailure = (code: string, desc = '', ext?: Record<string, any>) => {
          this.reportEventIfNeeded({
            ...eventReportBaseParams,
            status: 'FAILED',
            detail: { code, desc },
            ...(ext && { ext })
          });
        }
        const handleGetAttestationRes = (params: GetAttestationResParams) => {
          console.log('sdk receive getAttestationRes', params)
          const { result, errorData } = params || {};
          if (result) {
            if (pollingTimer) {
              return;
            }
            if (ackTimer != null) {
              clearTimeout(ackTimer)
              ackTimer = undefined
            }
            const pollingPhaseMs = session.phaseMs(pollingTimeout);
            if (pollingPhaseMs <= 0) {
              reportFailure('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE);
              settleReject(new ZkAttestationError('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE, ''));
              return;
            }
            timeoutTimer = setTimeout(() => {
              if (!pollingTimer) {
                return;
              }
              postExtensionOutboundMessage(buildExtensionOutboundMessage("getAttestationResultTimeout", {}));
              reportFailure('00002');
              settleReject(new ZkAttestationError('00002', 'The SDK reported a timeout.', ''))
            }, pollingPhaseMs)
            pollingTimer = setInterval(() => {
              postExtensionOutboundMessage(buildExtensionOutboundMessage("getAttestationResult", {}));
              console.log(new Date().toLocaleString(), 'zktls-js-sdk send msg getAttestationResult');
            }, ATTESTATIONPOLLINGTIME)
            return;
          }
          const { code, data, details } = readErrorPayload(errorData);
          const reportCode = buildEventReportCode(code, details?.subCode);
          reportFailure(reportCode, '', { getAttestationRes: JSON.stringify(errorData?.data) });
          settleReject(new ZkAttestationError(code, '', data, details))
        }
        const handleStartAttestationRes = (params: StartAttestationResParams) => {
          const { result, data, errorData } = params || {};
          console.log('sdk-receive getAttestationResultRes', params)
          if (result) {
            const { extendedData, allJsonResponse, privateData, ...formatParams2 } = data || {};
            const requestid = attestationParams.attRequest.requestid
              ? attestationParams.attRequest.requestid
              : '';
            this.extendedData[requestid] = extendedData;

            if (privateData) {
              try{
                this._allPrivateData[requestid] = JSON.parse(privateData);
              } catch {

              }
            }

            if (this.allJsonResponseFlag === 'true') {
              const responseResolvesObj = formatParams2?.reponseResolve;
              if (!Array.isArray(responseResolvesObj) || !Array.isArray(allJsonResponse)) {
                reportFailure('00005', 'Invalid allJsonResponse payload');
                settleReject(new ZkAttestationError('00005', 'Invalid allJsonResponse payload'));
                return;
              }
              const responseIds = responseResolvesObj.map((i: any) =>
                typeof i?.keyName === 'string' ? i.keyName : '')
              this._allJsonResponse[requestid] = allJsonResponse.map((i: any, k: number) => {
                return {
                  id: responseIds[k] || '',
                  content: i
                }
              })
              formatParams2.requestid = requestid
            }

            this.reportEventIfNeeded({
              ...eventReportBaseParams,
              status: 'SUCCESS'
            });
            settleResolve(formatParams2 as Attestation)
            return;
          }
          const { code, data: errorPayload, details } = readErrorPayload(errorData);
          const reportCode = buildEventReportCode(code, details?.subCode);
          reportFailure(reportCode, '', { getAttestationResultRes: JSON.stringify(errorData?.data) });
          settleReject(new ZkAttestationError(code, '', errorPayload, details))
        }
        const eventListener = (event: MessageEvent) => {
          const message = parseTrustedExtensionInboundMessage(event);
          if (!message) {
            return;
          }
          try {
            if (isGetAttestationResMessage(message)) {
              handleGetAttestationRes(message.params);
            }
            if (isStartAttestationResMessage(message)) {
              handleStartAttestationRes(message.params);
            }
          } catch (error: any) {
            reportFailure('00005', error?.message || 'Invalid extension response');
            settleReject(error instanceof ZkAttestationError ? error : new ZkAttestationError('00005', error?.message || 'Invalid extension response'));
          }
        }
        const ackPhaseMs = session.phaseMs(INIT_ATTESTATION_TIMEOUT);
        if (ackPhaseMs <= 0) {
          reportFailure('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE);
          settleReject(new ZkAttestationError('00002', EXTENSION_WEB_SESSION_HARD_CAP_MESSAGE, ''));
          return;
        }
        ackTimer = setTimeout(() => {
          reportFailure('00017', EXTENSION_GET_ATTESTATION_RES_NO_RESPONSE_MESSAGE);
          settleReject(new ZkAttestationError('00017', EXTENSION_GET_ATTESTATION_RES_NO_RESPONSE_MESSAGE));
        }, ackPhaseMs);
        window.addEventListener("message", eventListener);
        postExtensionOutboundMessage(buildExtensionOutboundMessage("startAttestation", formatParams));
      });

    } catch (e: any) {
      if (!isMobilePlatform) {
        this._attestLoading = false
      }
      return Promise.reject(e)
    }
  }

  async startAttestationMobile(attestationParamsStr: string): Promise<Attestation> {
    if (this.latestRunningMobileRequest) {
      attestationParamsStr = this.latestRunningMobileRequest;
    } else {
      this.latestRunningMobileRequest = attestationParamsStr;
    }
    const url = this.GetAttestationMobileUrl(attestationParamsStr);
    const newWin = window.open(url, "_self");
    console.log("startAttestationMobile newWin=", newWin);
    const attestationParams = JSON.parse(attestationParamsStr) as SignedAttRequest;
    const eventReportBaseParams = {
      source: '',
      clientType: PACKAGENAME as ClientType,
      appId: attestationParams.attRequest.appId,
      templateId: attestationParams.attRequest.attTemplateID || '',
      address: attestationParams.attRequest.userAddress,
      ext: {} as Record<string, any>
    };
    const requestid = attestationParams.attRequest.requestid;
    const recipient = attestationParams.attRequest.userAddress;
    const pollingTimeoutMobile = attestationParams.attRequest?.timeout ?? ATTESTATIONPOLLINGTIMEOUTMOBILE;
    let queryurl = `https://api.padolabs.org/attestation/result?requestId=${requestid}&recipient=${recipient}`;
    if (this.options?.env !== "production") {
      queryurl = `https://api-dev.padolabs.org/attestation/result?requestId=${requestid}&recipient=${recipient}`;
    }
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
          const response = await sendRequest(queryurl);
          console.log("query response=", response);
          console.log("query response.result.status=", response.result.status);
          if (response.rc === 0 && response.result.status === "SUCCESS") {
            clearInterval(timer);
            clearTimeout(timeoutTimer);
            this.latestRunningMobileRequest = undefined;
            this.reportEventIfNeeded({
              ...eventReportBaseParams,
              status: 'SUCCESS'
            });
            resolve(response.result.result);
          } else if (response.rc === 0 && response.result.status === "FAILED") {
            const errorCode = response.result.result.errorCode;
            const errorMsg = response.result.result.errorMessage;
            console.log(`reject error code=${errorCode}, errorMsg=${errorMsg}`);
            clearInterval(timer);
            clearTimeout(timeoutTimer);
            this.latestRunningMobileRequest = undefined;
            this.reportEventIfNeeded({
              ...eventReportBaseParams,
              status: 'FAILED',
              detail: { code: errorCode, desc: errorMsg || '' }
            });
            reject(new ZkAttestationError(errorCode, '', errorMsg));
          }
        } catch (error) {
          console.log("query moblie attestaion result error.");
        }
      }, ATTESTATIONPOLLINGTIME);

      const timeoutTimer = setTimeout(async () => {
        console.log("reject timeout");
        clearInterval(timer);
        this.latestRunningMobileRequest = undefined;
        this.reportEventIfNeeded({
          ...eventReportBaseParams,
          status: 'FAILED',
          detail: { code: '01000', desc: '' }
        });
        reject(new ZkAttestationError('01000', '', ''));
      }, pollingTimeoutMobile);
    });
  }

  GetAttestationMobileUrl(attestationParamsStr: string): string {
    const encodeParams = encodeURIComponent(attestationParamsStr);
    if (this.options?.platform === "android") {
      let url;
      if (this.options.openAndroidApp) {
        url = `primuslabs://primuslabs.xyz/attestation-processor?signedRequest=${encodeParams}`;
      } else {
        url = `https://primuslabs.xyz/attestation-processor?signedRequest=${encodeParams}`;
      }
      return url;
    } else if (this.options?.platform === "ios") {
      const url = `https://appclip.apple.com/id?p=PrimusLabs.Primus.AppClip&signedRequest=${encodeParams}`;
      return url;
    }
    return "";
  }

  verifyAttestation(attestation: Attestation): boolean {
    const encodeData = encodeAttestation(attestation);
    const signature = attestation.signatures[0];
    const result = ethers.utils.recoverAddress(encodeData, signature);
    console.log("sdk verifyAttestation recover address is ", result);
    const verifyResult = this._padoAddress.toLowerCase() === result.toLowerCase();
    return verifyResult
  }

  getExtendedData(requestid: string): any {
    return this.extendedData[requestid];
  }

  getPrivateData(requestid: string, keyName?: string): object | undefined {
    const privateData = this._allPrivateData[requestid];
    if (!privateData) {
      return undefined;
    }
    if (keyName === undefined) {
      return privateData;
    }
    const plainDataKey = `${keyName}_plain`;
    return  {
      [keyName]: privateData[keyName],
      [plainDataKey]: privateData[plainDataKey]
    };
  }

  /**
   * Check app quote and perform business logic based on the result
   * @private
   * @throws {ZkAttestationError} Only throws business logic errors, network errors are caught and ignored
   */
  private async _checkAppQuote(): Promise<void> {
    try {
      const {rc, result} = await getAppQuote({ appId: this.appId }, { baseApi: this.getRuntimeBaseApi() });
      // console.log('_checkAppQuote', result)
      // Business logic based on quote result
      if (rc !== 0) {
        // Handle error case - you can customize this based on your requirements
        console.warn('App quote check failed:', result?.msg);
        // Optionally throw error or handle differently based on business requirements
        // throw new ZkAttestationError('00005', result?.msg || 'App quote check failed');
      }
      if (!result ) { 
        throw new ZkAttestationError('-1002001');
      }
      if (!result.expiryTime && (!result.remainingQuota  || result.remainingQuota <= 0 ) ) {
        throw new ZkAttestationError('-1002003');
      }
      if (result.expiryTime ) {
        if (result.expiryTime < Date.now()) {
          throw new ZkAttestationError('-1002004');
        }
        if (!result.remainingQuota || result.remainingQuota <= 0) {
          throw new ZkAttestationError('-1002005');
        }
      }
      
      // Add other business logic based on quoteResult.result if needed
      // For example:
      // if (quoteResult.result?.quotaExceeded) {
      //   throw new ZkAttestationError('00005', 'Quota exceeded');
      // }
    } catch (error: any) {
      // If it's a business logic error (ZkAttestationError), rethrow it
      if (error instanceof ZkAttestationError) {
        throw error;
      }
      // For network errors or other exceptions, catch and log but don't throw
      // This allows the execution to continue even if the quote check fails
      console.error('Failed to check app quote (network error or other exception):', error);
      // Don't throw - allow execution to continue
    }
  }

  _verifyAttestationParams(attestationParams: SignedAttRequest): boolean {
    const { attRequest: { appId,
      attTemplateID,
      userAddress, timestamp }, appSignature } = attestationParams
    const checkFn = (label: string, value: any, valueType: string) => {
      if (!value) {
        throw new ZkAttestationError('00005', `Missing ${label}!`)
      } else {
        if (typeof value !== valueType) {
          throw new ZkAttestationError('00005', `Wrong ${label}!`)
        }
      }
    }
    checkFn('appId', appId, 'string')
    checkFn('attTemplateID', attTemplateID, 'string')
    // checkFn('userAddress', userAddress, 'string')
    checkFn('timestamp', timestamp, 'number')
    checkFn('appSignature', appSignature, 'string')
    const illgelAddr = ethers.utils.isAddress(userAddress) || isSolanaAddress(userAddress)
    if (!illgelAddr) {
      throw new ZkAttestationError('00005', `Wrong userAddress!`)
    }
    return true
  }

  getAllJsonResponse(requestid: string): AllJsonResponseItem[] | undefined {
    return this._allJsonResponse[requestid]
  }

}

export { PrimusZKTLS, AttRequest };
export type { GenerateRequestParamsOptions } from './types.js';
export { eventReport } from './utils/eventReport.js';
export { reportEvent } from './api/index.js';
export type { EventReportRawData, ClientType } from './api/index.js';
