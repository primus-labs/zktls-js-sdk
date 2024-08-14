import { ethers, utils } from 'ethers';
import { defaultAbiCoder } from 'ethers/lib/utils';
import { ZERO_BYTES32} from '@ethereum-attestation-service/eas-sdk';
import { PADOEXTENSIONID, ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT, PADOADDRESS,EASInfo } from "./config/constants";
import { lineaportalabi } from './config/lineaportalabi';
import { proxyabi } from './config/proxyabi';
type AttestationParams = {
  attestationTypeId: number;
  tokenSymbol?: string;
  assetsBalance?: string;
  followersCount?: string
}
export default class ZkAttestationJSSDK {
  available?: boolean;
  chainName: string;
  walletAddress: string;
  attestationParams: AttestationParams
  attestationId: string;
  eip712Msg: any
  constructor(attestationParams: AttestationParams, chainName: string, walletAddress: string) {
    this.attestationParams = attestationParams
    this.chainName = chainName;
    this.walletAddress = walletAddress;
    this.attestationId = ''
  }

  isAuthorized() { }
  async isAvailable() {
    try {
      const url = `chrome-extension://${PADOEXTENSIONID}/logo.png`;
      const { statusText } = await fetch(url);
      if (statusText === "OK") {
        this.available = true;
        return true;
      }
      return false;
    } catch (error) {
      return false;
    }
  }
  initAttestation() {
    window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "initAttest",
    });
    return new Promise((resolve,) => {
      window.addEventListener("message", (event) => {
        const { target, name } = event.data;
        if (target === "padoZKAttestationJSSDK") {
          if (name === "initAttestRes") {
            console.log('333 sdk receive initAttestRes', event.data)
            resolve(true);
          }
        }
      });
    });
  }
  startAttestation() {
    window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "startAttest",
      params: {
        attestationParams: this.attestationParams,
        chainName: this.chainName,
        walletAddress: this.walletAddress,
      },
    });
    return new Promise((resolve, reject) => {
      let pollingTimer: any
      let timeoueTimer: any
      window.addEventListener("message", async (event) => {
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
                  // reject(false)
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
              reject(false)
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
              this.attestationId = attestationRequestId
              this.eip712Msg = eip712MessageRawDataWithSignature
              resolve(Object.assign({attestationRequestId: this.attestationId}, this.eip712Msg))
            } else {
              if (reStartFlag) {
                this.initAttestation()
              }
              reject(false)
            }
          }
        }
      });
    });
  }
  verifyAttestation(eip712Msg: any) {
    const { domain,message,signature,types } = eip712Msg
    delete domain.salt;
    const result = utils.verifyTypedData(
      domain,
      types,
      message,
      signature
    );
    console.log('333-sdk-Verification successful:', result);
    const verifyResult = PADOADDRESS.toLowerCase() === result.toLowerCase();
    return verifyResult
  }
  async sendToChain(eip712Msg: any) {
    const {attestationRequestId} = eip712Msg
    const onChainRes = await this._attestByDelegationProxyFee(eip712Msg)
      window.postMessage({
      target: "padoExtension",
      origin: "padoZKAttestationJSSDK",
      name: "sendToChainRes",
      params: {
        attestationRequestId,
        chainName: this.chainName,
        onChainRes
      },
    });
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
      // chainName attestationRequestId onChainRes
      return true 
    } else {
      return false
      // sendToChainResult = true;
      // sendToChainMsg = 'Please try again later.';
      // eventInfo.rawData = Object.assign(eventInfo.rawData, {
      //   status: 'FAILED',
      //   reason: 'attestByDelegationProxyFee error',
      // });
      // eventReport(eventInfo);
    }
  }
  // verifyAttestation(attestationId: string) {
  //   window.postMessage({
  //     target: "padoExtension",
  //     origin: "padoZKAttestationJSSDK",
  //     name: "verifyAttestation",
  //     params: {
  //       attestationRequestId: attestationId,
  //       chainName: this.chainName
  //     },
  //   });
  //   return new Promise((resolve,reject) => {
  //     window.addEventListener("message", async (event) => {
  //       const { target, name, params } = event.data;
  //       if (target === "padoZKAttestationJSSDK") {
  //         if (name === "verifyAttestationRes") {
  //           console.log('333 sdk receive verifyAttestationRes', params)
  //           const { result } = params
  //           if (result) {
  //             resolve(true)
  //           } else {
  //             reject(false)
  //           }
  //         }
  //       }
  //     });
  //   });
  // }
  // sendToChain(attestationId: string, walletObj: { provider: any, address: string }) {
  //   window.postMessage({
  //     target: "padoExtension",
  //     origin: "padoZKAttestationJSSDK",
  //     name: "sendToChain",
  //     params: {
  //       attestationRequestId: attestationId,
  //       chainName: this.chainName,
  //       walletObj
  //     },
  //   });
  //   return new Promise((resolve, reject) => {
  //     window.addEventListener("message", async (event) => {
  //       const { target, name, params } = event.data;
  //       if (target === "padoZKAttestationJSSDK") {
  //         if (name === "sendToChainRes") {
  //           console.log('333 sdk receive sendToChainRes', params)
  //           const { result } = params
  //           if (result) {
  //             resolve(true)
  //           } else {
  //             reject(false)
  //           }
  //         }
  //       }
  //     });
  //   });
  // }

  async _getFee() {
    // @ts-ignore
    const contractAddress = EASInfo[this.chainName].easProxyFeeContract;
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
    const networkName = this.chainName
    const { message: { data, recipient, schema }, signature } = eip712Msg
    // @ts-ignore
    const easProxyFeeContractAddress = EASInfo[networkName].easProxyFeeContract;
    let provider = new ethers.providers.Web3Provider(metamaskprovider);
    await provider.send('eth_requestAccounts', []);
    let signer = provider.getSigner();
    let contract;
    if (networkName.startsWith('Linea') || networkName.indexOf('Scroll') > -1) {
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
    const fee = await this._getFee();
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
      if (networkName.startsWith('Linea') || networkName.indexOf('Scroll') > -1) {
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
          networkName.startsWith('Linea') ||
          networkName.indexOf('Scroll') > -1
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
      networkName.startsWith('Linea') ||
      networkName.indexOf('Scroll') > -1
    )
    {
      return txreceipt.transactionHash;
    } else if (networkName.indexOf('opBNB') > -1) {
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

// window.addEventListener("message", (event) => {
//   const { target } = event.data;
//   if (target === "padoZKAttestationJSSDK") {
//     console.log("444-listen-message", event.data);
//   }
// });




