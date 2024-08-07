
import { PADOEXTENSIONID } from "./config/constants";
export default class ZkAttestationJSSDK {
  available?: boolean;
  constructor() {}
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
      params: {},
    });
    return new Promise((resolve,reject) => {
      // @ts-ignore
      let timer = null
      window.addEventListener("message", async (event) => {
        const { target, name, params } = event.data;
        
        if (target === "padoZKAttestationJSSDK") {
          if (name === "getAttestationRes") {
            console.log('333 sdk receive getAttestationRes', params)
            // resolve(event.data.params);
            timer = setInterval(() => {
              window.postMessage({
                target: "padoExtension",
                origin: "padoZKAttestationJSSDK",
                name: "getAttestationResult",
                params: {},
              });
            }, 500)
          }
          if (name === "getAttestationResultRes") {
            console.log('333 sdk receive getAttestationResultRes', params)
            const { retcode,} = JSON.parse(params);
            if (retcode === '0' || retcode === '2') {
              // @ts-ignore
              clearInterval(timer)
              
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
              reject(false)
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
