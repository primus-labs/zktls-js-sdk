import { ethers } from 'ethers';
import {
  ATTESTATIONPOLLINGTIME,
  ATTESTATIONPOLLINGTIMEOUT,
  PADOADDRESSMAP,
  ATTESTATIONPOLLINGTIMEOUTMOBILE,
} from './config/constants.js';
import { PACKAGE_VERSION, PACKAGE_NAME } from './generated/packageMeta.js';
import type { Attestation, SignedAttRequest, InitOptions } from './types.js';
import { ZkAttestationError, packZkAttestationErrorData } from './error.js';
import { AttRequest } from './classes/AttRequest.js';
import { encodeAttestation, sendRequest, isSolanaAddress } from './utils.js';
import { getAppQuote } from './api/index.js';
import { eventReport } from './utils/eventReport.js';
import type { ClientType } from './api/index.js';

const PACKAGEJSONVERSION = PACKAGE_VERSION;
const PACKAGENAME = PACKAGE_NAME as ClientType;
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
  _allJsonResponse: any;
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
      this.isInstalled = !!window.primus
      if (this.isInstalled) {
        window.postMessage({
          target: "padoExtension",
          origin: "padoZKAttestationJSSDK",
          name: "initAttestation",
          params: {
            sdkVersion: PACKAGEJSONVERSION,
            clientType: PACKAGENAME,
          }
        });

      } else {
        const errorCode = '00006'
        return Promise.reject(new ZkAttestationError(
          errorCode
        ))
      }

      console.time('initAttestationCost')
      return new Promise((resolve, reject) => {
        const eventListener = (event: any) => {
          const { target, name, params } = event.data;
          if (target === "padoZKAttestationJSSDK") {
            if (name === "initAttestationRes") {
              console.log('sdk receive initAttestationRes', event.data)
              const { result, errorData, data } = params
              if (result) {
                this.isInitialized = params?.result

                if (data?.padoExtensionVersion) {
                  this.padoExtensionVersion = data.padoExtensionVersion
                }
                console.timeEnd('initAttestationCost')
                window?.removeEventListener('message', eventListener);
                resolve(this.padoExtensionVersion);
              } else {
                window?.removeEventListener('message', eventListener);
                // console.log('sdk-initAttestationRes-errorData:',errorData)
                if (errorData) {
                  const { code } = errorData
                  reject(new ZkAttestationError(code))
                }
              }
            }
          }
        }
        window.addEventListener("message", eventListener);
      });
    }
  }

  /**
   * @param attTemplateID - Attestation template ID
   * @param userAddress - Optional user address (defaults to zero address if omitted)
   * @param options - Optional: attestation polling timeout (ms), and/or close data source tab after successful proof on PC
   */
  generateRequestParams(
    attTemplateID: string,
    userAddress?: string,
    options?: { timeout?: number; closeDataSourceOnProofComplete?: boolean }
  ): AttRequest {
    const userAddr = userAddress || "0x0000000000000000000000000000000000000000"

    return new AttRequest({
      appId: this.appId,
      attTemplateID,
      userAddress: userAddr,
      ...(options?.timeout !== undefined && { timeout: options.timeout }),
      ...(options?.closeDataSourceOnProofComplete === true && {
        closeDataSourceOnProofComplete: true,
      }),
    })
  }

  /**
   * Ask the extension to close the attestation data source tab (PC). No-op if no tab or mobile.
   */
  closeDataSourceTab(): Promise<void> {
    if (typeof window === 'undefined') {
      return Promise.resolve();
    }
    window.postMessage(
      {
        target: 'padoExtension',
        origin: 'padoZKAttestationJSSDK',
        name: 'closeDataSourceTab',
        params: {},
      },
      '*'
    );
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

      const eventReportBaseParams = {
        source: '',
        clientType: PACKAGENAME as ClientType,
        appId: attestationParams.attRequest.appId,
        templateId: attestationParams.attRequest.attTemplateID || '',
        address: attestationParams.attRequest.userAddress,
        ext: {} as Record<string, any>
      };

      const pollingTimeout = attestationParams.attRequest?.timeout ?? ATTESTATIONPOLLINGTIMEOUT;
      let formatParams: any = { ...attestationParams, sdkVersion: PACKAGEJSONVERSION, clientType: PACKAGENAME}
      this.allJsonResponseFlag = attestationParams?.attRequest?.allJsonResponseFlag === 'true' ? 'true' : 'false'
      window.postMessage({
        target: "padoExtension",
        origin: "padoZKAttestationJSSDK",
        name: "startAttestation",
        params: formatParams,
      });
      console.time('startAttestCost')
      return new Promise((resolve, reject) => {
        let pollingTimer: any
        let timeoutTimer: any
        const eventListener = async (event: any) => {
          const { target, name, params } = event.data;
          if (target === "padoZKAttestationJSSDK") {
            if (name === "getAttestationRes") {
              console.log('sdk receive getAttestationRes', params)
              const { result, errorData } = params
              if (result) {
                timeoutTimer = setTimeout(async () => {
                  if (pollingTimer) {
                    clearInterval(pollingTimer)
                    this._attestLoading = false
                    window?.removeEventListener('message', eventListener);
                    window.postMessage({
                      target: "padoExtension",
                      origin: "padoZKAttestationJSSDK",
                      name: "getAttestationResultTimeout",
                      params: {}
                    });
                    void eventReport({
                      ...eventReportBaseParams,
                      status: 'FAILED',
                      detail: { code: '00002', desc: '' }
                    });
                    reject(new ZkAttestationError('00002', 'The SDK reported a timeout.', ''))
                  }
                }, pollingTimeout)
                pollingTimer = setInterval(() => {
                  window.postMessage({
                    target: "padoExtension",
                    origin: "padoZKAttestationJSSDK",
                    name: "getAttestationResult",
                    params: {}
                  });
                  console.log(new Date().toLocaleString(), 'zktls-js-sdk send msg getAttestationResult');
                }, ATTESTATIONPOLLINGTIME)
              } else {
                this._attestLoading = false
                window?.removeEventListener('message', eventListener);
                const { code, data, details } = errorData;
                void eventReport({
                  ...eventReportBaseParams,
                  status: 'FAILED',
                  detail: { code, desc: '' }
                });
                reject(
                  new ZkAttestationError(
                    code,
                    '',
                    packZkAttestationErrorData({ data, details })
                  )
                )
              }
            }
            if (name === "startAttestationRes") {
              const { result, data, errorData } = params
              console.log('sdk-receive getAttestationResultRes', params)
              this._attestLoading = false
              if (result) {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                window?.removeEventListener('message', eventListener);
                const { extendedData, allJsonResponse, privateData, ...formatParams2 } = data;
                let requestid = attestationParams.attRequest.requestid ? attestationParams.attRequest.requestid : '';
                this.extendedData[requestid] = extendedData;
  
                if (privateData) {
                  try{
                    this._allPrivateData[requestid] = JSON.parse(privateData);
                  } catch {

                  }
                }

                // feat: allJsonResponse
                let responseResolvesObj = formatParams2?.reponseResolve

                const responseIds = responseResolvesObj.map((i: any) =>
                  i?.keyName)
                // console.log('responseIds', responseIds, responseResolvesObj, formatParams2)

                if (this.allJsonResponseFlag === 'true') {
                  this._allJsonResponse[requestid] = allJsonResponse.map((i: any, k: number) => {
                    return {
                      id: responseIds[k],
                      content: i
                    }
                  })
                  formatParams2.requestid = requestid
                }

                void eventReport({
                  ...eventReportBaseParams,
                  status: 'SUCCESS'
                });
                resolve(formatParams2)
              } else {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                window?.removeEventListener('message', eventListener);
                const { code, data/*desc*/, details } = errorData;
                void eventReport({
                  ...eventReportBaseParams,
                  status: 'FAILED',
                  detail: { code, desc: '' }
                });
                reject(
                  new ZkAttestationError(
                    code,
                    '',
                    packZkAttestationErrorData({ data, details })
                  )
                )


                // if (params.reStartFlag) {
                //   await this.initAttestation(this._dappSymbol)
                //   console.log('333-reStartFlag')
                // }
              }
            }
          }
        }
        window.addEventListener("message", eventListener);
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
            void eventReport({
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
            void eventReport({
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
        void eventReport({
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
      const {rc, result} = await getAppQuote({ appId: this.appId });
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

  getAllJsonResponse(requestid: string): string | undefined {
    return this._allJsonResponse[requestid]
  }

}

export { PrimusZKTLS, AttRequest };
export { eventReport } from './utils/eventReport.js';
export { reportEvent } from './api/index.js';
export type { EventReportRawData, ClientType } from './api/index.js';
