import { ethers, utils } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ZERO_BYTES32} from '@ethereum-attestation-service/eas-sdk';
import { ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, PADOADDRESS,EASInfo,CHAINNAMELIST,ATTESTATIONTYPEIDLIST } from "./config/constants";
import { lineaportalabi } from './config/lineaportalabi';
import { proxyabi } from './config/proxyabi';
import { isValidNumericString,isValidLetterString ,isValidNumberString} from './utils'

type AttestationParams = {
  chainName: string;
  walletAddress: string;
  attestationTypeId: string;
  tokenSymbol?: string;
  assetsBalance?: string;
  followersCount?: string;
}
type chainOption = {
  text: string;
  value: string;
}
export default class ZkAttestationJSSDK {
  isInstalled?: boolean;
  isInitialized: boolean;
  supportedChainNameList: chainOption[]
  supportedAttestationTypeList: chainOption[]

  constructor() {
    this.isInitialized = false
    this.isInstalled = false
    this.supportedChainNameList = CHAINNAMELIST
    this.supportedAttestationTypeList = ATTESTATIONTYPEIDLIST
  }
  bindUnloadEvent() {
    const beforeunloadFn = async () => {
      window.postMessage({
        target: "padoExtension",
        origin: "padoZKAttestationJSSDK",
        name: "stopOffscreen",
      });
    };
    window.addEventListener('beforeunload', beforeunloadFn);
  }
  initAttestation() {
    window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "checkIsInstalled",
    });
    console.time('checkIsInstalledCost')
    console.time('initAttestationCost')
    return new Promise((resolve) => {
      const tickerTimer = setTimeout(() => {
        if (!this.isInstalled) {
          console.log('Please install the Pado extension first!')
          window?.removeEventListener('message', eventListener);
          resolve(false)
        }
      }, 500)
      const eventListener = (event:any) => {
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
            resolve(true);
          }
        }
      }
      window.addEventListener("message", eventListener);
    });
  }
  
  async startAttestation(attestationParams: AttestationParams) {
    if (!this._verifyAttestationParams(attestationParams)) {
      return
    }
    if (!this.isInitialized) {
      alert('Please wait for the algorithm to initialize and try again！')
      return
    }
    const initRes = await this.initAttestation()
    const formatParams = { ...attestationParams }
    if (formatParams['tokenSymbol']) {
      formatParams['tokenSymbol'] = formatParams['tokenSymbol'].toUpperCase()
    }
    if (initRes) {
      window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "startAttestation",
      params: formatParams,
       
    });
    console.time('startAttestCost')
    return new Promise((resolve) => {
      let pollingTimer: any
      let timeoueTimer: any
      const eventListener = async (event:any) => {
        const { target, name, params } = event.data;
        if (target === "padoZKAttestationJSSDK") {
          if (name === "getAttestationRes") {
            console.log('333 sdk receive getAttestationRes', params)
            const { result } = params
            if (result) {
              timeoueTimer = setTimeout(() => {
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
              resolve(false)
            }
          }
          if (name === "startAttestationRes") {
            const { result, reStartFlag, attestationRequestId, eip712MessageRawDataWithSignature } = params

            console.log('333-sdk-receive getAttestationResultRes', params)
            if (result) {
              clearInterval(pollingTimer)
              clearTimeout(timeoueTimer)
              console.timeEnd('startAttestCost')
              window?.removeEventListener('message', eventListener);
              resolve(Object.assign({attestationRequestId: attestationRequestId, chainName: attestationParams.chainName}, eip712MessageRawDataWithSignature))
            } else {
              if (reStartFlag) {
                console.log('333-reStartFlag')
                await this.initAttestation()
              }
              const { msgObj } = params
              if (msgObj.desc) {
                alert(msgObj.desc)
              }
              window?.removeEventListener('message', eventListener);
              resolve(false)
            }
          }
        }
      }
      window.addEventListener("message",eventListener );
    });
    } else {
      return false
    }
  }
  verifyAttestation(eip712Msg: any) {
    console.time('verifyAttestationCost')
    const { domain,message,signature,types } = eip712Msg
    delete domain.salt;
    const result = utils.verifyTypedData(
      domain,
      types,
      message,
      signature
    );
    console.log('333-sdk-Verification successful:', result);
    console.timeEnd('verifyAttestationCost')

    const verifyResult = PADOADDRESS.toLowerCase() === result.toLowerCase();
    return verifyResult
  }
  async sendToChain(eip712Msg: any) {
    // if (!this.isInstalled) {
    //   alert('Please install the Pado extension first!')
    //   return
    // }
    const chainObj = (EASInfo as {[key: string]: any})[eip712Msg.chainName]
    await this._switchChain(chainObj)
    console.time('sendToChainCost')
    const onChainRes = await this._attestByDelegationProxyFee(eip712Msg, chainObj)
    console.timeEnd('sendToChainCost')
    // const {attestationRequestId, chainName} = eip712Msg
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
          alert('Your balance is insufficient')
          return false
        } else if (onChainRes.error === 2) {
          alert('Please try again later.');
          return false
        }
        return;
      }
      return true 
    } else {
      return false
    }
  }
  async _getFee(chainName: string) {
    // @ts-ignore
    const contractAddress = EASInfo[chainName].easProxyFeeContract;
    const abi = ['function fee() public view returns(uint256)'];
    let provider = new ethers.providers.Web3Provider((window as any).ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    console.log('get contract=', contract);
    const fee = await contract.fee();
    console.log('get fee=', fee);
    return fee;
  }
  async _attestByDelegationProxyFee(eip712Msg: any, chainObj: any) {
    const metamaskprovider = (window as any).ethereum
    const {chainName} = eip712Msg
    const { message: { data, recipient, schema }, signature } = eip712Msg
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
    const fee = await this._getFee(chainName);
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
      // throw new Error(er);
      return;
    }
    console.log('eas attestByDelegationProxyFee tx=', tx);
    const txreceipt = await tx.wait();
    console.log('eas attestByDelegationProxyFee txreceipt=', txreceipt);
    if (
      chainName.startsWith('Linea') ||
      chainName.indexOf('Scroll') > -1
    )
    {
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
  
  async _switchChain(chainObj: any) {
    const { chainId, chainName: formatChainName, rpcUrls, blockExplorerUrls, nativeCurrency } = chainObj
    const provider = (window as any).ethereum
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
    } catch (err:any) {
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

  _verifyAttestationParams(attestationParams: AttestationParams) {
    console.log('333-sdk-_verifyAttestationParams', attestationParams)
    const { chainName, walletAddress, attestationTypeId, tokenSymbol, assetsBalance, followersCount } = attestationParams

    const activeChainOption = this.supportedChainNameList.find(i => i.value === chainName)
    if (!activeChainOption) {
      alert('Unsupported chainName!')
      return false;
    }
    
    const isAddressVaild = utils.isAddress(walletAddress)
    if (!isAddressVaild) {
      alert('The wallet address is incorrect!')
      return false;
    }

    const activeAttestationTypeOption = this.supportedAttestationTypeList.find(i => i.value === attestationTypeId)
    if (!activeAttestationTypeOption) {
      alert('Unsupported attestationTypeId!')
      return false;
    }

    if (['9', '11'].includes(attestationTypeId)) {
      if (!assetsBalance) {
        alert('Missing assetsBalance parameter!')
        return false;
      } else {
        const valid = isValidNumberString(assetsBalance)
        alert('The parameter "assetsBalance" is incorrect.')
        if (!valid) {
          return false
        }
      }
    }

    // binance Token Holding ,okx Token Holding
    if (['10', '12'].includes(attestationTypeId)) {
      if (!tokenSymbol) {
        alert('Missing tokenSymbol parameter!')
      return false;
      } else {
        const valid = isValidLetterString(tokenSymbol)
        alert('The parameter "tokenSymbol" is incorrect.')
        if (!valid) {
          return false
        }
      }
    }

    // X Followers
    if (['15'].includes(attestationTypeId)) {
       if (!followersCount) {
        alert('Missing followersCount parameter!')
        return false;
      } else {
        const valid = isValidNumericString(followersCount)
        alert('The parameter "followersCount" is incorrect.')
        if (!valid) {
          return false
        }
      }
    }
    
    return true
  }
}





