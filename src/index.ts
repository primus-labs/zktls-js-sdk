import { ethers } from 'ethers';
import { ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, PADOADDRESSMAP } from "./config/constants";
import { Attestation, Env, SignedAttRequest, InitOptions } from './index.d'
import { ZkAttestationError } from './error'
import { AttRequest } from './classes/AttRequest'
import { encodeAttestation, sendRequest } from "./utils";
const packageJson = require('../package.json');
class PrimusZKTLS {
  private _env: Env;
  private _padoAddress: string;
  // private _attestLoading: boolean;

  isInstalled?: boolean;
  isInitialized: boolean;
  padoExtensionVersion: string;

  appId: string;
  appSecret?: string;
  options?: InitOptions;

  constructor() {
    this.isInitialized = false
    this.isInstalled = false

    // this._attestLoading = false
    this._env = 'production'
    this._padoAddress = (PADOADDRESSMAP as any)[this._env]
    this.padoExtensionVersion = ''
    // if (env && ['development', 'test'].includes(env)) {
    //   this._env = 'development'
    // } else {
    //   this._env = 'production'
    // }

    this.appId = ''
    this.options = {platform: "pc"};
  }

  init(appId: string, appSecret?: string, options?: InitOptions): Promise<string | boolean> {
    this.appId = appId;
    this.appSecret = appSecret;
    this.options = options;
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
            sdkVersion: packageJson.version
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

  generateRequestParams(attTemplateID: string, userAddress?: string): AttRequest {
    const userAddr = userAddress || "0x0000000000000000000000000000000000000000"
    return new AttRequest({
      appId: this.appId,
      attTemplateID,
      userAddress: userAddr
    })
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
    // if (this._attestLoading) {
    //   const errorCode = '00003'
    //   return Promise.reject(new ZkAttestationError(errorCode))
    // }
    // this._attestLoading = true

    try {
      const attestationParams = JSON.parse(attestationParamsStr) as SignedAttRequest;
      this._verifyAttestationParams(attestationParams);

      if (this.options?.platform === "android" || this.options?.platform === "ios") {
        return this.startAttestationMobile(attestationParamsStr);
      }

      let formatParams: any = { ...attestationParams,sdkVersion: packageJson.version }

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
                timeoutTimer = setTimeout(() => {
                  if (pollingTimer) {
                    clearInterval(pollingTimer)
                    // this._attestLoading = false
                    window.postMessage({
                      target: "padoExtension",
                      origin: "padoZKAttestationJSSDK",
                      name: "getAttestationResultTimeout",
                      params: {}
                    });
                  }
                }, ATTESTATIONPOLLINGTIMEOUT)
                pollingTimer = setInterval(() => {
                  window.postMessage({
                    target: "padoExtension",
                    origin: "padoZKAttestationJSSDK",
                    name: "getAttestationResult",
                    params: {}
                  });
                }, ATTESTATIONPOLLINGTIME)
              } else {
                // this._attestLoading = false
                window?.removeEventListener('message', eventListener);
                const { code,data } = errorData
                reject(new ZkAttestationError(code, '', data))
              }
            }
            if (name === "startAttestationRes") {
              const { result, data, errorData } = params
              console.log('sdk-receive getAttestationResultRes', params)
              // this._attestLoading = false
              if (result) {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                window?.removeEventListener('message', eventListener);
                const formatParams2 = { ...data }
                resolve(formatParams2)
              } else {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                window?.removeEventListener('message', eventListener);
                const { code, data/*desc*/ } = errorData
                // if (attestationParams?.attestationTypeID === '101') {
                //   reject(new ZkAttestationError(code, desc))
                // } else {
                reject(new ZkAttestationError(code, '', data))


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
      // this._attestLoading = false
      return Promise.reject(e)
    }
  }

  async startAttestationMobile(attestationParamsStr: string): Promise<Attestation> {
    const url = this.GetAttestationMobileUrl(attestationParamsStr);
    window.open(url, "_self");
    const attestationParams = JSON.parse(attestationParamsStr) as SignedAttRequest;
    const requestid = attestationParams.attRequest.requestid;
    const recipient = attestationParams.attRequest.userAddress;
    const queryurl = `https://api.padolabs.org/attestation/result?requestId=${requestid}&recipient=${recipient}`;
    return new Promise((resolve, reject) => {
      const timer = setInterval(async () => {
        try {
            const response = await sendRequest(queryurl);
            console.log("query response=", response);
            console.log("query response.result.status=", response.result.status);
            if (response.rc === 0 && response.result.status === "SUCCESS") {
                clearInterval(timer);
                clearTimeout(timeoutTimer);
                resolve(response.result.result);
            } else if (response.rc === 0 && response.result.status === "FAILED") {
                const errorCode = response.result.result.errorCode;
                const errorMsg = response.result.result.errorMessage;
                console.log(`reject error code=${errorCode}, errorMsg=${errorMsg}`);
                clearInterval(timer);
                clearTimeout(timeoutTimer);
                reject(new ZkAttestationError(errorCode, '', errorMsg));
            }
        } catch (error) {
          console.log("query moblie attestaion result error.");
        }
      }, ATTESTATIONPOLLINGTIME);

      const timeoutTimer = setTimeout(() => {
          console.log("reject timeout");
          clearInterval(timer);
          reject(new ZkAttestationError('01000', '', ''));
      }, ATTESTATIONPOLLINGTIMEOUT);
    });
  }

  GetAttestationMobileUrl(attestationParamsStr: string): string {
    const encodeParams = encodeURIComponent(attestationParamsStr);
    if (this.options?.platform === "android") {
      const url = `https://primuslabs.xyz/attestation-processor?signedRequest=${encodeParams}`;
      return url;
    } else if (this.options?.platform === "ios") {
      const url = `primus://attestation?signedRequest=${encodeParams}`;
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
    const illgelAddr = ethers.utils.isAddress(userAddress)
    if (!illgelAddr) {
      throw new ZkAttestationError('00005', `Wrong userAddress!`)
    }
    return true
  }

}

export { PrimusZKTLS, AttRequest };
