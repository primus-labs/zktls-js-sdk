import { ethers } from 'ethers';
import { ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, PADOADDRESSMAP, EASINFOMAP } from "./config/constants";
import { ChainOption, Attestation, Env, SignedAttRequest } from './index.d'
import { ZkAttestationError } from './error'
import AttRequest from './classes/AttRequest'
import { encodeAttestation } from "./utils";

export default class PrimusZKTLS {
  private _env: Env;
  private _padoAddress: string;
  private _easInfo: any;
  private _attestLoading: boolean;

  private _verifyLoading: boolean;
  isInstalled?: boolean;
  isInitialized: boolean;
  supportedChainList: ChainOption[];
  padoExtensionVersion: string;

  appId: string;
  appSecret?: string;
  isAppServer: boolean;

  constructor() {
    this.isInitialized = false
    this.isInstalled = false
    this.supportedChainList = []

    this._easInfo = {}
    this._attestLoading = false
    this._verifyLoading = false
    this._env = 'production'
    this._padoAddress = (PADOADDRESSMAP as any)[this._env]
    this.padoExtensionVersion = ''
    // if (env && ['development', 'test'].includes(env)) {
    //   this._env = 'development'
    // } else {
    //   this._env = 'production'
    // }
    this._getSupportedChainList()

    this.appId = ''
    this.isAppServer = false
  }

  init(appId: string, appSecret?: string): Promise<string | boolean> {
    this.appId = appId
    this.appSecret = appSecret
    if (appSecret) {
      this.isAppServer = true
      this.isInitialized = true
      return Promise.resolve(true)
    } else {
      this.isInstalled = !!window.primus
      if (this.isInstalled) {
        window.postMessage({
          target: "padoExtension",
          origin: "padoZKAttestationJSSDK",
          name: "initAttestation",
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
  generateRequestParams(attTemplateID: string, userAddress: string): AttRequest {
    return new AttRequest({
      appId: this.appId,
      attTemplateID,
      userAddress
    })
  }
  sign(signParams: string): Promise<string> {
    if (this.isAppServer) {
      return Promise.resolve("");
    } else {
      throw new Error("Only call in App server environment.");
    }
  }

  async startAttestation(attestationParamsStr: string): Promise<Attestation> {
    if (!this.isInitialized) {
      const errorCode = '00001'
      return Promise.reject(new ZkAttestationError(errorCode))
    }
    if (this._attestLoading) {
      const errorCode = '00003'
      return Promise.reject(new ZkAttestationError(errorCode))
    }
    this._attestLoading = true

    try {
      const attestationParams = JSON.parse(attestationParamsStr) as SignedAttRequest;
      this._verifyAttestationParams(attestationParams);
      // const vaildResult = this._verifyAttestationParams(attestationParams)
      // console.log('sdk-startAttestation-vaildResult', vaildResult)
      // this._initEnvProperties(attestationParams.chainID)// TODO???
      let formatParams: any = { ...attestationParams }

      // if (formatParams['chainID']) {
      //   const chainMetaInfo = Object.values(this._easInfo).find((i: any) => formatParams['chainID'] === parseInt(i.chainId))
      //   formatParams['chainName'] = (chainMetaInfo as any).title
      // }
      // console.log('sdk-startAttestation-params',formatParams )
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
                    this._attestLoading = false
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
                this._attestLoading = false
                window?.removeEventListener('message', eventListener);
                const { code } = errorData
                reject(new ZkAttestationError(code))
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
                const formatParams2 = { ...data, chainName: formatParams.chainName }
                // formatParams={chianName:'',
                // attestationRequestId: activeRequestId,
                // eip712MessageRawDataWithSignature,}
                resolve(formatParams2)
              } else {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                window?.removeEventListener('message', eventListener);
                const { code, /*desc*/ } = errorData
                // if (attestationParams?.attestationTypeID === '101') {
                //   reject(new ZkAttestationError(code, desc))
                // } else {
                reject(new ZkAttestationError(code))


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
      this._attestLoading = false
      return Promise.reject(e)
    }
  }


  verifyAttestation(attestation: Attestation): boolean {
    if (this._verifyLoading) {
      alert("Verification in progress, please wait patiently")
      return false
    }
    this._verifyLoading = true
    console.time('verifyAttestationCost')
    const encodeData = encodeAttestation(attestation);
    const signature = attestation.signatures[0];
    console.log('333-sdk-Verification encodeData:', encodeData);
    console.log('333-sdk-Verification signature:', signature);
    const result = ethers.utils.recoverAddress(encodeData, signature);
    console.log('333-sdk-Verification result:', result);
    console.timeEnd('verifyAttestationCost')

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
    checkFn('userAddress', userAddress, 'string')
    checkFn('timestamp', timestamp, 'number')
    checkFn('appSignature', appSignature, 'string')
    return true
  }

  _getSupportedChainList() {
    const allEnvEASINFOMAP = Object.values((EASINFOMAP as any)).reduce(
      (prev: any, curr: any) => {
        Object.assign(prev, curr)
        return prev
      }, {})
    this.supportedChainList = Object.values(allEnvEASINFOMAP as any).map((i: any) =>
    ({
      text: i.officialName,
      value: parseInt(i.chainId)
    }));
    console.log('333-sdk-supportedChainList:', this.supportedChainList)
  }
  _initEnvProperties(chainID: number) {
    Object.keys((EASINFOMAP as any)).forEach((envKey: any) => {
      const envEasInfoMap = (EASINFOMAP as any)[envKey]
      const isCurEnv = Object.values(envEasInfoMap).find((info: any) => parseInt(info.chainId) === chainID)
      if (isCurEnv) {
        this._env = envKey
      }
    })
    this._easInfo = (EASINFOMAP as any)[this._env]
    this._padoAddress = (PADOADDRESSMAP as any)[this._env]
    console.log('sdk-env:', this._env, this._easInfo)
  }

}





