
import { PADOEXTENSIONID,ATTESTATIONPOLLINGTIME ,ATTESTATIONPOLLINGTIMEOUT} from "./config/constants";
export default class ZkAttestationJSSDK {
  available?: boolean;
  attestationTypeId: number;
  chainName: string;
  walletAddress: string;
  constructor(attestationTypeId: number, chainName: string, walletAddress: string) {
    this.attestationTypeId= attestationTypeId;
    this.chainName= chainName;
    this.walletAddress=walletAddress;
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
        walletAddress: this.walletAddress
      },
    });
    return new Promise((resolve,reject) => {
      // @ts-ignore
      let pollingTimer = null
      let timeoueTimer = null
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
                  reject(false)
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
          if (name === "getAttestationResultRes") {
            console.log('333 sdk receive getAttestationResultRes', params)
            if (params) {
              const { retcode, content, retdesc, details } = JSON.parse(params);
            const { activeRequestAttestation } = await chrome.storage.local.get([
              'activeRequestAttestation',
            ]);

            const parsedActiveRequestAttestation = activeRequestAttestation
              ? JSON.parse(activeRequestAttestation)
              : {};
            const errorMsgTitle = 'Humanity Verification failed!';
              
              
              if (retcode === '0' || retcode === '2') {
                // @ts-ignore
                clearInterval(pollingTimer)
              }
              if (retcode === '0') {
                window.postMessage({
                  target: "padoExtension",
                  origin: "padoZKAttestationJSSDK",
                  name: "attestResult",
                  params: {
                    result: 'success',
                  },
                })
                resolve(true)
              } else if (retcode === '2') {
                reject({
                  result: false,
                  msg: '??',
                })
              }
            }
          }
        }
      });
    });
  }

  verifyAttestation() {}
  sendToChain() {}
}

window.addEventListener("message", (event) => {
  const { target } = event.data;
  if (target === "padoZKAttestationJSSDK") {
    console.log("444-listen-message", event.data);
  }
});
