import { ethers, utils } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ZERO_BYTES32} from '@ethereum-attestation-service/eas-sdk';
import { ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, PADOADDRESS,EASInfo } from "./config/constants";
import { lineaportalabi } from './config/lineaportalabi';
import { proxyabi } from './config/proxyabi';
type AttestationParams = {
  attestationTypeId: number;
  tokenSymbol?: string;
  assetsBalance?: string;
  followersCount?: string
}
export default class ZkAttestationJSSDK {
  isInstalled?: boolean;
  isInitialized: boolean;

  constructor() {
    this.isInitialized = false
    this.isInstalled = false
    // this.fetchIsInstalled()
  }

  // isAuthorized() { }
  // async fetchIsAvailable() {
  //   try {
  //     const url = `chrome-extension://${PADOEXTENSIONID}/logo.png`;
  //     console.log('333-isAvailable1', url)
  //     const res = await fetch(url);
  //     const { statusText} = res
  //     console.log('333-isAvailable2', res)
  //     if (statusText === "OK") {
  //       this.isInstalled = true;
  //       return true;
  //     }
  //     return false;
  //   } catch (error) {
  //     console.log('333-isAvailable3', error)
  //     return false;
  //   }
  // }
  // fetchIsInstalled() {
  //   window.postMessage({
  //     target: "padoExtension",
  //     origin: "padoZKAttestationJSSDK",
  //     name: "checkIsInstalled",
  //   });
  //   console.time('myTimer')
  //   return new Promise((resolve) => {
  //     const tickerTimer = setTimeout(() => {
  //       this.isInstalled = false
  //       console.log('Please install the Pado extension first!')
  //       resolve(false)
  //     },500)
  //     window.addEventListener("message", async (event) => {
  //       const { target, name } = event.data;
  //       if (target === "padoZKAttestationJSSDK") {
  //         if (name === "checkIsInstalledRes") {
  //           console.timeEnd('myTimer')
  //           tickerTimer && clearTimeout(tickerTimer)
  //           console.log('333 sdk receive checkIsInstalledRes')
  //           this.isInstalled = true
  //           resolve(true)
  //         }
  //       }
  //     });
  //   });
  // }
  initAttestation() {
    window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "checkIsInstalled",
    });
    console.time('checkIsInstalledCost')
    console.time('initAttestCost')
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
              name: "initAttest",
            });
          }
          if (name === "initAttestRes") {
            console.log('333 sdk receive initAttestRes', event.data)
            this.isInitialized = true
            console.timeEnd('initAttestCost')
            window?.removeEventListener('message', eventListener);
            resolve(true);
          }
        }
      }
      window.addEventListener("message", eventListener);
    });
  }
  // initAttestation2() {
  //   // if (!this.isInstalled) {
  //   //   alert('Please install the Pado extension first!')
  //   //   return
  //   // }
  //   window.postMessage({
  //     target: "padoExtension",
  //     origin: "padoZKAttestationJSSDK",
  //     name: "initAttest",
  //   });
  //   return new Promise((resolve,) => {
  //     window.addEventListener("message", (event) => {
  //       const { target, name } = event.data;
  //       if (target === "padoZKAttestationJSSDK") {
  //         if (name === "initAttestRes") {
  //           console.log('333 sdk receive initAttestRes', event.data)
  //           this.isInitialized = true
  //           resolve(true);
  //         }
  //       }
  //     });
  //   });
  // }
  startAttestation(attestationParams: AttestationParams, chainName: string, walletAddress: string) {
    if (!this.isInitialized) {
      alert('Please wait for the algorithm to initialize and try again！')
      return
    }
    window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "startAttest",
      params: {
        attestationParams,
        chainName,
        walletAddress,
      },
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
            // const { retcode } = JSON.parse(params);
            // if (retcode === '0') {
            //   timeoueTimer = setTimeout(() => {
            //     if (pollingTimer) {
            //       clearInterval(pollingTimer)
            //       reject(false)
            //     }
            //   },ATTESTATIONPOLLINGTIMEOUT)
            //   pollingTimer = setInterval(() => {
            //     window.postMessage({
            //       target: "padoExtension",
            //       origin: "padoZKAttestationJSSDK",
            //       name: "getAttestationResult",
            //       params:{}
            //     });
            //   }, ATTESTATIONPOLLINGTIME)
            // } else if (retcode === '2') {
            //   // TODO-sdk
            //   const errorMsgTitle = `Humanity Verification failed!`
            //   const msgObj = {
            //     type: 'error',
            //     title: errorMsgTitle,
            //     desc: 'The algorithm has not been initialized.Please try again later.',
            //     sourcePageTip: errorMsgTitle,
            //   };
            //   window.postMessage({
            //       target: "padoExtension",
            //       origin: "padoZKAttestationJSSDK",
            //       name: "attestResult",
            //       params: {
            //         result: 'warn',
            //           failReason: {
            //             ...msgObj,
            //           },
            //         }
            //   });

            //   reject({
            //     result: false,
            //     msg: 'The algorithm has not been initialized.Please try again later.',
            //   })
            //   // algorithm is not initialized
            // }
          }
          // if (name === "getAttestationResultRes") {
          if (name === "startAttestationRes") {
            const { result, reStartFlag, attestationRequestId, eip712MessageRawDataWithSignature } = params

            console.log('333-sdk-receive getAttestationResultRes', params)
            if (result) {
              clearInterval(pollingTimer)
              clearTimeout(timeoueTimer)
              console.timeEnd('startAttestCost')
              window?.removeEventListener('message', eventListener);
              resolve(Object.assign({attestationRequestId: attestationRequestId, chainName}, eip712MessageRawDataWithSignature))
            } else {
              if (reStartFlag) {
                this.initAttestation()
              }
              window?.removeEventListener('message', eventListener);
              resolve(false)
            }
          }
        }
      }
      window.addEventListener("message",eventListener );
    });
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
    console.time('sendToChainCost')
    const onChainRes = await this._attestByDelegationProxyFee(eip712Msg)
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
    // @ts-ignore
    let provider = new ethers.providers.Web3Provider(window.ethereum);
    const contract = new ethers.Contract(contractAddress, abi, provider);
    console.log('get contract=', contract);
    const fee = await contract.fee();
    console.log('get fee=', fee);
    return fee;
  }
  async _attestByDelegationProxyFee(eip712Msg: any) {
    // @ts-ignore
    const metamaskprovider = window.ethereum
    const {chainName} = eip712Msg
    const { message: { data, recipient, schema }, signature } = eip712Msg
    // @ts-ignore
    const easProxyFeeContractAddress = EASInfo[chainName].easProxyFeeContract;
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
}





