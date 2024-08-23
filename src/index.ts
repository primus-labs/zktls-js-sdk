import { ethers, utils } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ZERO_BYTES32 } from '@ethereum-attestation-service/eas-sdk';
import { ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, PADOADDRESS, EASInfo, CHAINNAMELIST, ATTESTATIONTYPEIDLIST } from "./config/constants";
import { lineaportalabi } from './config/lineaportalabi';
import { proxyabi } from './config/proxyabi';
import { isValidNumericString, isValidLetterString, isValidNumberString } from './utils'
import { AttestationParams, ChainOption, StartAttestationReturnParams} from './index.d'
import { ZkAttestationError } from './error'
export default class ZkAttestationJSSDK {
  isInstalled?: boolean;
  isInitialized: boolean;
  supportedChainNameList: ChainOption[]
  supportedAttestationTypeList: ChainOption[]

  constructor() {
    this.isInitialized = false
    this.isInstalled = false
    this.supportedChainNameList = CHAINNAMELIST
    this.supportedAttestationTypeList = ATTESTATIONTYPEIDLIST
    // this._bindUnloadEvent()
  }
  initAttestation(): Promise<void> {
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
          reject(new ZkAttestationError(
                '00006',
                'Please install PADO extension version 0.3.12 and above first!',
              ))
        }
      }, 500)
      const eventListener = (event: any) => {
        const { target, name } = event.data;
        if (target === "padoZKAttestationJSSDK") {
          if (name === "checkIsInstalledRes") {
            console.timeEnd('checkIsInstalledCost')
            tickerTimer && clearTimeout(tickerTimer)
            console.log('333 sdk receive checkIsInstalledRes')
            this.isInstalled = true
            window.postMessage({
              target: "padoExtension",
              origin: "padoZKAttestationJSSDK",
              name: "initAttestation",
            });
          }
          if (name === "initAttestationRes") {
            console.log('333 sdk receive initAttestationRes', event.data)
            this.isInitialized = true
            console.timeEnd('initAttestationCost')
            window?.removeEventListener('message', eventListener);
            resolve();
          }
        }
      }
      window.addEventListener("message", eventListener);
    });
  }

  async startAttestation(attestationParams: AttestationParams): Promise<StartAttestationReturnParams> {
    if (!this.isInitialized) {
      return Promise.reject(new ZkAttestationError('00001','The algorithm has not been initialized.Please try again later.'))
    }

    try {
      this._verifyAttestationParams(attestationParams);
      const vaildResult = this._verifyAttestationParams(attestationParams)
      console.log('333-sdk-startAttestation-vaildResult', vaildResult)
      await this.initAttestation()
      const formatParams = { ...attestationParams }
      if (formatParams['tokenSymbol']) {
        formatParams['tokenSymbol'] = formatParams['tokenSymbol'].toUpperCase()
      }
      
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
              const { result,errorData } = params
              if (result) {
                timeoutTimer = setTimeout(() => {
                  if (pollingTimer) {
                    clearInterval(pollingTimer)
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
                window?.removeEventListener('message', eventListener);
                const { desc, code } = errorData
                reject(new ZkAttestationError(code,desc))
              }
            }
            if (name === "startAttestationRes") {
              const { result, data, errorData, reStartFlag} = params
              console.log('333-sdk-receive getAttestationResultRes', params)
              if (result) {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                window?.removeEventListener('message', eventListener);
                const formatParams = { ...data, chainName: attestationParams.chainName }
                // formatParams={chianName:'',
                // attestationRequestId: activeRequestId,
                // eip712MessageRawDataWithSignature,}
                resolve(formatParams)
              } else {
                clearInterval(pollingTimer)
                clearTimeout(timeoutTimer)
                console.timeEnd('startAttestCost')
                if (reStartFlag) {
                  console.log('333-reStartFlag')
                  await this.initAttestation()
                }
                window?.removeEventListener('message', eventListener);
                const { desc, code } = errorData
                reject(new ZkAttestationError(code,desc))
              }
            }
          }
        }
        window.addEventListener("message", eventListener);
      });
     
    } catch (e: any) {
      return Promise.reject(e)
    }
  }
  
  async sendToChain(startAttestationReturnParams: StartAttestationReturnParams, wallet: any): Promise<boolean> {
    // if (!this.isInstalled) {
    //   alert('Please install the Pado extension first!')
    //   return
    // }
    try {
      const { chainName } = startAttestationReturnParams
      const chainObj = (EASInfo as { [key: string]: any })[chainName]
      console.log('333-sdk-chainObj',startAttestationReturnParams,chainName, EASInfo, chainObj)
      await this._switchChain(chainObj, wallet)
      console.time('sendToChainCost')
      const onChainRes = await this._attestByDelegationProxyFee(startAttestationReturnParams, chainObj, wallet)
      console.timeEnd('sendToChainCost')
      // const {attestationRequestId, chainName} = startAttestationReturnParams
      // window.postMessage({
      //   target: "padoExtension",
      //   origin: "padoZKAttestationJSSDK",
      //   name: "sendToChainRes",
      //   params: {
      //     attestationRequestId,
      //     chainName,
      //     onChainRes
      //   },
      // });
      if (onChainRes) {
        if (onChainRes.error) {
          if (onChainRes.error === 1) {
            Promise.reject(new ZkAttestationError('00007', 'Your balance is insufficient'))
             
          } else if (onChainRes.error === 2) {
            Promise.reject(new ZkAttestationError('00008', 'Please try again later.'))
          }
          return false;
        }
        return true
      } else {
        return false
      }
    } catch (e:any) {
      return Promise.reject(e)
    }
    
  }
  verifyAttestation(startAttestationReturnParams: StartAttestationReturnParams): boolean {
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

    const verifyResult = PADOADDRESS.toLowerCase() === result.toLowerCase();
    return verifyResult
  }
  async _getFee(chainName: string, wallet: any): Promise<any> {
    const contractAddress = (EASInfo  as { [key: string]: any })[chainName].easProxyFeeContract;
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
      attester: PADOADDRESS,
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
      } else if (er.ACTION_REJECTED === 'ACTION_REJECTED') {
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
        throw new Error(err.code);
      }
      return true;
    }
  };

  _verifyAttestationParams(attestationParams: AttestationParams): boolean {
    const { chainName, walletAddress, attestationTypeId, tokenSymbol, assetsBalance, followersCount } = attestationParams
    const activeChainOption = this.supportedChainNameList.find(i => i.value === chainName)
    if (!activeChainOption) {
      throw new ZkAttestationError('00005','Unsupported chainName!')
    }

    const isAddressVaild = utils.isAddress(walletAddress)
    if (!isAddressVaild) {
      throw new ZkAttestationError('00005','The wallet address is incorrect!')
    }

    const activeAttestationTypeOption = this.supportedAttestationTypeList.find(i => i.value === attestationTypeId)
    if (!activeAttestationTypeOption) {
      throw new ZkAttestationError('00005','Unsupported attestationTypeId!')
    }

    if (['9', '11'].includes(attestationTypeId)) {
      if (!assetsBalance) {
        throw new ZkAttestationError('00005','Missing assetsBalance parameter!')
      } else {
        const valid = isValidNumberString(assetsBalance)
        if (!valid) {
          throw new ZkAttestationError('00005','The parameter "assetsBalance" is incorrect, Supports numbers with up to 6 decimal places.')
        }
      }
    }

    // binance Token Holding ,okx Token Holding
    if (['10', '12'].includes(attestationTypeId)) {
      if (!tokenSymbol) {
        throw new ZkAttestationError('00005','Missing tokenSymbol parameter!')
      } else {
        const valid = isValidLetterString(tokenSymbol)
        if (!valid) {
          throw new ZkAttestationError('00005','The parameter "tokenSymbol" is incorrect, Support both uppercase and lowercase letters in English.')
        }
      }
    }

    // X Followers
    if (['15'].includes(attestationTypeId)) {
      if (!followersCount) {
        throw new ZkAttestationError('00005','Missing followersCount parameter!')
      } else {
        const valid = isValidNumericString(followersCount)
        if (!valid) {
          throw new ZkAttestationError('00005','The parameter "followersCount" is incorrect. Supports numbers only.')
        }
      }
    }

    return true
  }

  // _bindUnloadEvent() {
  //   const beforeunloadFn = async () => {
  //     window.postMessage({
  //       target: "padoExtension",
  //       origin: "padoZKAttestationJSSDK",
  //       name: "stopOffscreen",
  //     });
  //   };
  //   window.addEventListener('beforeunload', beforeunloadFn);
  // }
}





