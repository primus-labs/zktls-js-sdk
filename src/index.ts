
import { PADOEXTENSIONID, ATTESTATIONPOLLINGTIME, ATTESTATIONPOLLINGTIMEOUT } from "./config/constants";

export default class ZkAttestationJSSDK {
  available?: boolean;
  attestationTypeId: number;
  chainName: string;
  walletAddress: string;
  assetsParams: { tokenSymbol?: string; assetsBalance?: string;  followersCount?:string}
  constructor(attestationTypeId: number, chainName: string, walletAddress: string, assetsParams = {}) {
    this.attestationTypeId= attestationTypeId;
    this.chainName= chainName;
    this.walletAddress = walletAddress;
    this.assetsParams = assetsParams
  }

  isAuthorized() {}
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
        attestationTypeId: this.attestationTypeId,
        walletAddress: this.walletAddress,
        params: {
          tokenSymbol: this.assetsParams.tokenSymbol,
          assetsBalance: this.assetsParams.assetsBalance,
          followersCount: this.assetsParams.followersCount,
        }
      },
    });
    return new Promise((resolve,reject) => {
      
      let pollingTimer:any
      
      let timeoueTimer:any
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
                    params:{}
                  });
                  // reject(false)
                }
              },ATTESTATIONPOLLINGTIMEOUT)
              pollingTimer = setInterval(() => {
                window.postMessage({
                  target: "padoExtension",
                  origin: "padoZKAttestationJSSDK",
                  name: "getAttestationResult",
                  params:{}
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
            const { result ,reStartFlag} = params
            console.log('333-sdk-receive getAttestationResultRes', params)
            if (result) {
              clearInterval(pollingTimer)
              clearTimeout(timeoueTimer)
              resolve(true)
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

  verifyAttestation() {
    
  }
  sendToChain() {}
}

window.addEventListener("message", (event) => {
  const { target } = event.data;
  if (target === "padoZKAttestationJSSDK") {
    console.log("444-listen-message", event.data);
  }
});
