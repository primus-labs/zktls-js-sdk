import { ethers, utils } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ZERO_BYTES32 } from '@ethereum-attestation-service/eas-sdk';
import { ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, ATTESTATIONTYPEIDLIST, PADOADDRESSMAP, EASINFOMAP } from "./config/constants";
import { lineaportalabi } from './config/lineaportalabi';
import { proxyabi } from './config/proxyabi';
import { isValidNumericString, isValidLetterString, isValidNumberString } from './utils'
import { AttestationParams, ChainOption, StartAttestationReturnParams,AttestationTypeOption,Env} from './index.d'
import { ZkAttestationError } from './error'
export default class ZkAttestationJSSDK {
  private _env: Env;
  private _dappSymbol: string;
  private _padoAddress: string;
  private _easInfo: any;
  private _attestLoading: boolean;
  private _sendToChainLoading: boolean;
  private _verifyLoading: boolean;
  isInstalled?: boolean;
  isInitialized: boolean;
  supportedChainList: ChainOption[]
  supportedAttestationTypeList: AttestationTypeOption[]

  constructor( env?: '' | '') {
    this._dappSymbol = ''
    this.isInitialized = false
    this.isInstalled = false
    this.supportedAttestationTypeList = ATTESTATIONTYPEIDLIST
    this.supportedChainList = []
    this._padoAddress = ''
    this._easInfo = {}
    this._attestLoading = false
    this._sendToChainLoading = false
    this._verifyLoading = false
    if (env && ['development', 'test'].includes(env)) {
      this._env = 'development'
    } else {
      this._env = 'production'
    }
    this._initEnvProperties()
  }
  
  initAttestation(dappSymbol: string): Promise<boolean> {
    this._dappSymbol = dappSymbol
    window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "checkIsInstalled",
    });
    console.time('checkIsInstalledCost')
    console.time('initAttestationCost')
    return new Promise((resolve,reject) => {
      const tickerTimer = setTimeout(() => {
        if (!this.isInstalled) {
          window?.removeEventListener('message', eventListener);
          const errorCode = '00006'
          reject(new ZkAttestationError(
                errorCode
              ))
        }
      }, 500)
      const eventListener = (event: any) => {
        const { target, name, params } = event.data;
        if (target === "padoZKAttestationJSSDK") {
          if (name === "checkIsInstalledRes") {
            console.timeEnd('checkIsInstalledCost')
            tickerTimer && clearTimeout(tickerTimer)
            this.isInstalled = true
            window.postMessage({
              target: "padoExtension",
              origin: "padoZKAttestationJSSDK",
              name: "initAttestation",
            });
          }
          if (name === "initAttestationRes") {
            console.log('333 sdk receive initAttestationRes', event.data)
            const { result, errorData } = params
            if (result) {
              this.isInitialized = params?.result
              console.timeEnd('initAttestationCost')
              window?.removeEventListener('message', eventListener);
              resolve(true);
            } else {
              window?.removeEventListener('message', eventListener);
              // console.log('333-sdk-initAttestationRes-errorData:',errorData)
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

  async startAttestation(attestationParams: AttestationParams): Promise<StartAttestationReturnParams> {
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
      this._verifyAttestationParams(attestationParams);
      const vaildResult = this._verifyAttestationParams(attestationParams)
      console.log('333-sdk-startAttestation-vaildResult', vaildResult)
      await this.initAttestation(this._dappSymbol)
      let formatParams:any = { ...attestationParams, dappSymbol:this._dappSymbol }
      if (formatParams['tokenSymbol']) {
        formatParams['tokenSymbol'] = formatParams['tokenSymbol'].toUpperCase()
      }
      if (formatParams['chainID']) {
        const chainMetaInfo = Object.values(this._easInfo).find((i:any) => formatParams['chainID'] === parseInt(i.chainId))
        formatParams['chainName'] = (chainMetaInfo as any).title
      }
      // console.log('333-sdk-startAttestation-params',formatParams )
      window.postMessage({
        target: "padoExtension",
        origin: "padoZKAttestationJSSDK",
        name: "startAttestation",
        params: formatParams,
      });
      console.time('startAttestCost')
      return new Promise((resolve,reject) => {
        let pollingTimer: any
        let timeoutTimer: any
        const eventListener = async (event: any) => {
          const { target, name, params } = event.data;
          if (target === "padoZKAttestationJSSDK") {
            if (name === "getAttestationRes") {
              console.log('333 sdk receive getAttestationRes', params)
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
              const { result, data, errorData} = params
              console.log('333-sdk-receive getAttestationResultRes', params)
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
                const { code } = errorData
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
  
  async sendToChain(startAttestationReturnParams: StartAttestationReturnParams, wallet: any): Promise<string> {
    // if (!this.isInstalled) {
    //   alert('Please install the Pado extension first!')
    //   return
    // }
    if (this._sendToChainLoading) {
      const errorCode = '00008'
      return Promise.reject(new ZkAttestationError(errorCode, 'Submitting to the chain, please wait patiently'))
    }
    if (!startAttestationReturnParams || !wallet) {
      const errorCode = '00005'
      return Promise.reject(new ZkAttestationError(errorCode))
    }
    this._sendToChainLoading = true
    try {
      const { chainName } = startAttestationReturnParams
      const chainObj = (this._easInfo as { [key: string]: any })[chainName]
      // console.log('333-sdk-chainObj',startAttestationReturnParams,chainName, this._easInfo, chainObj)
      await this._switchChain(chainObj, wallet)
      console.time('sendToChainCost')
      const onChainRes = await this._attestByDelegationProxyFee(startAttestationReturnParams, chainObj, wallet)
      console.timeEnd('sendToChainCost')
      const {attestationRequestId} = startAttestationReturnParams
      window.postMessage({
        target: "padoExtension",
        origin: "padoZKAttestationJSSDK",
        name: "sendToChainRes",
        params: {
          attestationRequestId,
          chainName,
          onChainRes
        },
      });
      console.log('333-sdk-sendToChainRes-onChainRes', onChainRes)
      this._sendToChainLoading = false
      if (onChainRes) {
        if (onChainRes.error) {
          if (onChainRes.error === 1) {
            const errorCode ='00007'
            return Promise.reject(new ZkAttestationError(errorCode))
             
          } else if (onChainRes.error === 2) {
            const errorCode ='00008'
            return Promise.reject(new ZkAttestationError(errorCode ,onChainRes.message))
          }
          const errorCode ='00008'
            return Promise.reject(new ZkAttestationError(errorCode))
        }
        const chainInfo = this._easInfo[chainName] as any;
        if (chainName === 'opBNB') {
          return `${chainInfo.bucketDetailUrl}${onChainRes}`;
        } else {
          return `${chainInfo?.transactionDetailUrl}/${onChainRes}`;
        }
      } else {
        this._sendToChainLoading = false
        const errorCode ='00008'
          return Promise.reject(new ZkAttestationError(errorCode))
      }
    } catch (e: any) {
      console.log('333-sdk-sendToChain error', e)
      console.dir(e)
      console.log(e.code, e.message)
      this._sendToChainLoading = false
      return Promise.reject(new ZkAttestationError('00008', e.message))
    }
    
  }
  verifyAttestation(startAttestationReturnParams: StartAttestationReturnParams): boolean {
    if (this._verifyLoading) {
      alert("Verification in progress, please wait patiently")
      return false
    }
    this._verifyLoading = true
    console.time('verifyAttestationCost')
    const { domain, message, signature, types } = startAttestationReturnParams.eip712MessageRawDataWithSignature
    let formatDomain:any = {...domain}
    delete formatDomain.salt;
    const result = utils.verifyTypedData(
      formatDomain,
      types,
      message,
      signature
    );
    console.log('333-sdk-Verification result:', result);
    console.timeEnd('verifyAttestationCost')
  
    const verifyResult = this._padoAddress.toLowerCase() === result.toLowerCase();
    return verifyResult
  }
  async _getFee(chainName: string, wallet: any): Promise<any> {
    const contractAddress = (this._easInfo  as { [key: string]: any })[chainName].easProxyFeeContract;
    const abi = ['function fee() public view returns(uint256)'];
    let provider = new ethers.providers.Web3Provider(wallet);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    console.log('get contract=', contract);
    const fee = await contract.fee();
    console.log('get fee=', fee);
    return fee;
  }
  async _attestByDelegationProxyFee(startAttestationReturnParams: StartAttestationReturnParams, chainObj: any, wallet: any): Promise<any> {
    const metamaskprovider = wallet
    const { chainName,eip712MessageRawDataWithSignature } = startAttestationReturnParams
    const { message: { data, recipient, schema }, signature } = eip712MessageRawDataWithSignature
    const easProxyFeeContractAddress = chainObj.easProxyFeeContract;
    let provider = new ethers.providers.Web3Provider(metamaskprovider);
    await provider.send('eth_requestAccounts', []);
    let signer = provider.getSigner();
    let contract;
    if (chainName.startsWith('Linea') || chainName.indexOf('Scroll') > -1) {
      contract = new ethers.Contract(
        easProxyFeeContractAddress,
        lineaportalabi,
        signer
      );
    } else {
      contract = new ethers.Contract(
        easProxyFeeContractAddress,
        proxyabi,
        signer
      );
    }
    let tx;
    console.log(
      'attestByDelegationProxyFee schemauid=',
      schema,
      easProxyFeeContractAddress
    );
    const fee = await this._getFee(chainName, wallet);
    const paramsobj = {
      schema,
      data: {
        recipient,
        expirationTime: 0,
        revocable: true,
        refUID: ZERO_BYTES32,
        data: data,
        value: 0,
      },
      signature,
      attester: this._padoAddress,
      deadline: 0,
    };
    try {
      if (chainName.startsWith('Linea') || chainName.indexOf('Scroll') > -1) {
        tx = await contract.attest(paramsobj, { value: fee });
      } else {
        tx = await contract.attestByDelegation(
          paramsobj,
          { value: fee }
          // { gasPrice: BN.from('20000000000'), gasLimit: BN.from('1000000') }
        );
      }
    } catch (er: any) {
      console.log('222222eas attestByDelegationProxyFee attest failed', er);
      console.dir(er);
      try {
        if (
          chainName.startsWith('Linea') ||
          chainName.indexOf('Scroll') > -1
        ) {
          tx = await contract.callStatic.attest(paramsobj, { value: fee });
        } else {
          tx = await contract.callStatic.attestByDelegation(paramsobj, {
            value: fee,
          });
        }
      } catch (error) {
        console.log('eas attestByDelegationProxyFee caught error:\n', error);
      }
      if (
        (er.data && er.data.message.indexOf('insufficient funds') > -1) ||
        er.message.indexOf('insufficient funds') > -1
      ) {
        return {
          error: 1,
          message: 'insufficient funds',
        };
      } else if (er.ACTION_REJECTED === 'ACTION_REJECTED' || er.code === 'ACTION_REJECTED') {
        return {
          error: 2,
          message: 'user rejected transaction',
        };
      }
      return;
    }
    console.log('eas attestByDelegationProxyFee tx=', tx);
    const txreceipt = await tx.wait();
    console.log('eas attestByDelegationProxyFee txreceipt=', txreceipt);
    if (
      chainName.startsWith('Linea') ||
      chainName.indexOf('Scroll') > -1
    ) {
      return txreceipt.transactionHash;
    } else if (chainName.indexOf('opBNB') > -1) {
      const data = txreceipt.logs[1].data;
      const res = defaultAbiCoder.decode(['uint64', 'string'], data);
      console.log(res[0]._hex);
      return res[0]._hex;
    } else {
      const newAttestationUID = txreceipt.logs[txreceipt.logs.length - 1].data;
      return newAttestationUID;
    }
  }

  async _switchChain(chainObj: any, wallet:any) {
    const { chainId, chainName: formatChainName, rpcUrls, blockExplorerUrls, nativeCurrency } = chainObj
    const provider = wallet
    const connectedChainId = await provider.request({ method: 'eth_chainId' });
    const obj = {
      chainId,
      chainName: formatChainName,
      rpcUrls,
      blockExplorerUrls,
      nativeCurrency,
    };

    if (parseInt(connectedChainId) === parseInt(chainId)) {
      console.log(`The current chain is already:${obj.chainName}`);
      return;
    } else {
      console.log(`Switching chain to:${obj.chainName}`);
    }
    try {
      // switch network
      await provider.request({
        method: 'wallet_switchEthereumChain',
        params: [{ chainId }],
      });
      return true;
    } catch (err: any) {
      if (err.code === 4902) {
        try {
          // add network
          await provider.request({
            method: 'wallet_addEthereumChain',
            params: [obj],
          });
        } catch (addError) {
          console.error(addError);
        }
      } else if (err.code === 4001) {
        // console.log('333-sdk-switchChain error:', err)
        // console.log( err.code, err.message)
        throw err;
      }
      return true;
    }
  };

  _verifyAttestationParams(attestationParams: AttestationParams): boolean {
    const { chainID, walletAddress, attestationTypeID, tokenSymbol, assetsBalance, followersNO } = attestationParams
    const activeChainOption = this.supportedChainList.find((i:any) => i.value === chainID)
    if (!activeChainOption) {
      throw new ZkAttestationError('00005','Unsupported chainID!')
    }

    const isAddressVaild = utils.isAddress(walletAddress)
    if (!isAddressVaild) {
      throw new ZkAttestationError('00005','The wallet address is incorrect!')
    }

    const activeAttestationTypeOption = this.supportedAttestationTypeList.find(i => i.value === attestationTypeID)
    if (!activeAttestationTypeOption) {
      throw new ZkAttestationError('00005','Wrong attestationTypeID!')
    }

    if (['9', '11'].includes(attestationTypeID)) {
      if (!assetsBalance) {
        throw new ZkAttestationError('00005','Missing assetsBalance parameter!')
      } else {
        const valid = isValidNumberString(assetsBalance)
        if (!valid) {
          throw new ZkAttestationError('00005','The input value of  "assetsBalance" is incorrect, should be restricted to a 6-decimal-place number and the minimum value is 0.000001')
        }
      }
    }

    // binance Token Holding ,okx Token Holding
    if (['10', '12'].includes(attestationTypeID)) {
      if (!tokenSymbol) {
        throw new ZkAttestationError('00005','Missing tokenSymbol parameter!')
      } else {
        const valid = isValidLetterString(tokenSymbol)
        if (!valid) {
          throw new ZkAttestationError('00005','The input value of "tokenSymbol" is incorrect, should only be alphabet .')
        }
      }
    }

    // X Followers
    if (['15'].includes(attestationTypeID)) {
      if (!followersNO) {
        throw new ZkAttestationError('00005','Missing followersNO parameter!')
      } else {
        const valid = isValidNumericString(followersNO)
        if (!valid) {
          throw new ZkAttestationError('00005','The input value of "followersNO" is incorrect. should only be numeric and the minimum value is 0.')
        }
      }
    }

    return true
  }

  _initEnvProperties() {
    this.supportedChainList = Object.values((EASINFOMAP as any)[this._env]).map((i:any) => ({
      text: i.officialName,
      value: parseInt(i.chainId)
    }));
    this._padoAddress = (PADOADDRESSMAP as any)[this._env]
    this._easInfo = (EASINFOMAP as any)[this._env]
    console.log('333-sdk-env:',this._env, this.supportedChainList, this._easInfo )
  }
}





