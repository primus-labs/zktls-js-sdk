# Overview

The PADO MPC-TLS SDK provides developers with tools to directly implement **the zkAttestation solution** in dApps without the need for backend cryptography or attestation workflow development.

To attest a user’s web data, create proofs, and implement verification mechanisms, use this [SDK](/mpc-tls/mpc-tls-sdk/quickstart) along with a set of MPC-TLS APIs.

**Some application examples include:**
- Verifying the number of followers on a user’s X account to determine if they are a KOL or a newcomer.
- Enabling asset verification using the user’s off-chain exchange asset or token status.
- Verifying the ownership of a user’s social media account, such as TikTok or X, to provide basic PoH capability.
- And many more based on your needs...

In this initial version, the attestable data source, attestation content, and supported blockchains are pre-set. **A future developer platform will allow customization.**


## Workflows

The basic workflows are as follows:

![avatar](./../../pics/extensionSDK/mpctls-sdk.png)

**The PADO Extension is required to complete the MPC-TLS process on the data source page. When using the PADO MPC-TLS SDK, prompt users in your dApp to install the latest version (above 0.3.13) of the PADO Extension, as it is required.**

**1. User Onboarding:** The user onboards to your dApp, connects their Wallet, and follows your instructions to initiate the data attestation process.

**2. Configure zkAttestation Parameters:** Before starting the attestation process, ensure that all parameters required by the SDK for this attestation workflow are properly configured.

**3. Initiate zkAttestation Process:** Your dApp activates the PADO MPC-TLS SDK, requesting the data and attestation content configured in the SDK.

**4. Redirect to the Data Source Page:** Your dApp redirects the user to the data source page. After the user logs in to their account on that website, the PADO Extension pop-up window will appear in the right corner of the data source page.

**5. Initiate zkAttestation Process:** The user needs to click the start button on the PADO Extension pop-up window to generate a zkAttestation process. 

**6. Execute MPC-TLS Protocol:** Once the zkAttestation process begins, the MPC-TLS protocol runs between the data source page, the PADO extension, and the PADO server to complete a privacy-preserving attestation process.

**7.Return zkAttestation Result:** After the zkAttestation process is complete, whether successful or not, the PADO Extension retrieves the result and sends it to the MPC-TLS SDK. For the failed tasks, we provide several [error codes](mpc-tls/mpc-tls-sdk/quickstart#errorCodes) to help you better identify and troubleshoot issues. 

**8. Get and Verify the zkAttestation Result:** Your dApp will retrieve the zkAttestation result from the SDK and verify PADO's signature to confirm whether the result is trustworthy.

**9. Business Logic:** Your dApp will execute business logic based on the proof that users obtain from the SDK. Your dApp will determine how to use the proof, whether to submit it on-chain, and how to use it.


## zkAttestation Capabilities

In this initial version, the attestable data source, attestation content, and supported blockchains are pre-designated.

### 1. Attestable Details

| Data Sources | Attestation Content | Input Value | Attestation Result |
|------------------|-------------| -------------| -------------|
| https://www.binance.com  | Asset balance in trading account    | USD value, numeric, minimum value of 0.000001, restricted to a 6-decimal-place number  | if the "attestation content" is greater than "input value"   |
|            | Token holding in trading account      | Token name, alphabet  | if the "input value" is equivalent to more than USD 0.1   |
|            | KYC Status      | N/A  | if the "attestation content" passed basic KYC verification   |
|            | Account ownership      | N/A  | if the "attestation content" owns the associated account   |
| https://www.okx.com  | Total asset balance    | USD value, numeric, minimum value of 0.000001, restricted to a 6-decimal-place number | if the "attestation content" is greater than "input value"   |
|            | Token holding      | Token name, alphabet  | if the "input value" is equivalent to more than USD 0.1   |
|            | KYC Status      | N/A  | if the "attestation content" passed basic KYC verification   | 
| https://www.tiktok.com  | Account ownership    | N/A  | if the "attestation content" owns the associated account   |
| https://www.x.com  | Account ownership    | N/A  | if the "attestation content" owns the associated account   |
|            | Social connections      | Followers number, numeric, minimum value of 0  | if the "attestation content" is greater than "input value"   |


### 2.Supported Blockchains

For the attestation contract, we currently deployed EAS and Verax attestation schemas to the following blockchains:
- Linea
- BNB Chain
- opBNB
- Arbitrum
- Scroll

If you have further needs for other blockchains, please contact us through our [community](https://discord.com/invite/pdrNxRrApX) for support.

## Basic Tutorials

### Step 1. Install MPC-TLS SDK

You can install it via npm or yarn:

```shell
npm install --save @padolabs/mpctls-js-sdk
```

```shell
yarn add --save @padolabs/mpctls-js-sdk
```

:::note
_**For better tech support, please contact the PADO team through our [community](https://discord.com/invite/pdrNxRrApX) after installing the MPC-TLS SDK. We need to register your dApps' domain to maintain the whitelist and provide you with a testing environment and the associated testing version of the PADO Extension.**_
:::
### <a id="step2"></a>

### Step 2. Initialize MPC-TLS SDK

You must set up a **dAppSymbol (string)** of your dApp, this will be displayed on the PADO Extension - zkAttestation page as a mark of the proof that was completed by your dApp.

![avatar](./../../pics/extensionSDK/initialsdk.png)

**Example:**

```javascript
import MPCTLSJSSDK from "@padolabs/mpctls-js-sdk";
const sdkInstance = new MPCTLSJSSDK();
try {
  const initAttestaionResult = await sdkInstance.initAttestation(
    "yourdAppSymbol"
  );
  console.log(initAttestaionResult); //Output: true
} catch (e) {
  alert(`Initialize failed,code: ${e.code} ,message: ${e.message}`);
}
```

### Step 3. Set parameters to request zkAttestation

Before starting the zkAttestation process, a few parameters should be configured and transmitted to the MPC-TLS SDK. This configuration is required regardless of how you set up your users' operation steps in you dApp.

The parameters should be configured in the following order:

- chainID (must)
- walletAddress (must)
- attestationTypeID (must)
- assetBalance/ tokenSymbol/ followersNO (optional, depending on the attestationTypeID)

#### 1. chainID (number)

The ID of the blockchain to which you want users to submit their proof.

```javascript
console.log(sdkInstance.supportedChainList); // Output: [
// {text:'Linea' , value:59144 },
// {text:'BNB Chain' , value:56 },
// {text:'opBNB' , value:204 },
// {text:'Arbitrum' , value:42161 },
// {text:'Scroll' , value:534352 },
// ]
```

#### 2. walletAddress (string)

The wallet address of the user. This address will be used as an index for queries on the blockchain.

#### 3. attestationTypeID (string)

We have assigned different IDs to each attestation type, which can be transmitted to initialize the associated zkAttestation process.

```javascript
console.log(sdkInstance.supportedAttestationTypeList); // Output: [
// {
//   text: "binance kyc status",
//   value: "1",
// },
// {
//   text: "binance account ownership",
//   value: "2",
// },
// {
//   text: "x account ownership",
//   value: "3",
// },
// {
//   text: "okx kyc status",
//   value: "4",
// },
// {
//   text: "tiktok account ownership",
//   value: "6",
// },
// {
//   text: "binance assets balance",
//   value: "9",
// },
// {
//   text: "binance token holding",
//   value: "10",
// },
// {
//   text: "okx assets balance",
//   value: "11",
// },
// {
//   text: "okx token holding",
//   value: "12",
// },
// {
//   text: "X social connections",
//   value: "15",
// }]
```

:::note
For the attestation type ID 1, 2, 3, 4, and 6, you only need to transmit the above 3 parameters, like this:

`{
        chainID: 56,
        walletAddress: "0x",
        attestationTypeID: "11",
      }`
:::

#### 4. assetsBalance (string)

This parameter is optional: if the attestation type ID is 9 or 11, this field should be filled with a USD value (numeric), with a minimum value of 0.000001 and restricted to a 6-decimal-place.

If the assetBalance is set to 100, it will complete a zkAttestation process to verify if the user's asset balance is **greater than USD 100**.

Example parameter should look like this:

`{
        chainID: 56,
        walletAddress: "0x",
        attestationTypeID: "11",
        assetsBalance: "100",
      }`

#### 5. tokenSymbol (string)

This parameter is optional: if the attestation type ID is 10 or 12, this field should be filled with the token name (alphabet).

If the tokenSymbol is set to be USDT, it will complete a zkAttestation process to verify if the user holds **USDT equivalent to more than USD 0.1**.

Example parameter should look like this:

`{
        chainID: 56,
        walletAddress: "0x",
        attestationTypeID: "12",
        tokenSymbol: "USDT",
      }`

#### 6. followersNO (string)

This parameter is optional: if the attestation type ID is 15, this field should be filled with the user's X follower number (numeric), with a minimum value of 0.

If the followersNO is set to 10, it will complete a zkAttestation process to verify if the user has **more than 10 followers**.

Example parameter should look like this:

`{
        chainID: 56,
        walletAddress: "0x",
        attestationTypeID: "15",
        followersNO: "10",
      }`

### Step 4. Start MPC-TLS process

Note: You can call startAttestation only after the initAttestation method is called.

```javascript
import MPCTLSJSSDK from "@padolabs/mpctls-js-sdk";

const sdkInstance = new MPCTLSJSSDK();
try {
  sdkInstance.initAttestation("yourdAppSymbol");
  const startAttestaionResult = sdkInstance.startAttestation({
    chainID: 56,
    walletAddress: "0x",
    attestationTypeID: "9",
    assetsBalance: "100",
  });
  console.log(startAttestaionResult); // Output:
  // {
  //   eip712MessageRawDataWithSignature:
  //     {
  //       types: {
  //         Attest: [
  //           {
  //             name: "schema",
  //             type: "bytes32",
  //           },
  //           {
  //             name: "recipient",
  //             type: "address",
  //           },
  //           {
  //             name: "expirationTime",
  //             type: "uint64",
  //           },
  //           {
  //             name: "revocable",
  //             type: "bool",
  //           },
  //           {
  //             name: "refUID",
  //             type: "bytes32",
  //           },
  //           {
  //             name: "data",
  //             type: "bytes",
  //           },
  //           {
  //             name: "deadline",
  //             type: "uint64",
  //           },
  //         ],
  //       },
  //       primaryType: "Attest",
  //       message: {
  //         schema: "0x",
  //         recipient: "0x",
  //         expirationTime: 0,
  //         revocable: true,
  //         data: "0x",
  //         refUID:
  //           "0x0000000000000000000000000000000000000000000000000000000000000000",
  //         deadline: 0,
  //       },
  //       domain: {
  //         name: "xxx",
  //         version: "xxx",
  //         chainId: "xxx",
  //         verifyingContract: "0x",
  //         salt: null,
  //       },
  //       uid: null,
  //       signature: {
  //         v: 28,
  //         r: "0x",
  //         s: "0x",
  //       },
  //     }
  // };
  console.log("Attest successfully!");
} catch (e) {
  alert(`Attest failed,code: ${e.code} ,message: ${e.message}`);
}
```

### Step 5. Verify zkAttestation result

After receiving the zkAttestation result, you need to verify whether the result is trustworthy.

- **Parameters**
  - **startAttestationReturnParams:StartAttestationReturnParams** An object containing the properties of eip712MessageRawDataWithSignature, which is the return value of the startAttestation method.
- **Return:boolean** Whether the signature is successfully verified.

- **Example**

```javascript
import MPCTLSJSSDK from "@padolabs/mpctls-js-sdk";
const sdkInstance = new MPCTLSJSSDK();
const verifyAttestationResult = sdkInstance.verifyAttestation(
  startAttestaionResult
);
console.log(verifyAttestation); // Output: true
```

### Step 6. Submit the zkAttestation result (the proof) to the blockchain

You can only submit the proof to the associated blockchain, you configured in the [Step 2](./QuickStart#step2).

- **Parameters**
  - **startAttestationReturnParams:StartAttestationReturnParams** An object containing the properties of eip712MessageRawDataWithSignature, which is the return value of the startAttestation method.
  - **wallet:any** The wallet object
- **Return:string** Transaction details URL

- **Example**

```javascript
import MPCTLSJSSDK from "@padolabs/mpctls-js-sdk";

const sdkInstance = new MPCTLSJSSDK();
try {
  const startAttestaionResult = sdkInstance.sendToChain(
    startAttestaionResult,
    window.ethereum
  );
  console.log(startAttestaionResult); // Output: https://bascan.io/attestation/0x
  console.log("SendToChain successfully!");
} catch (e) {
  alert(`SendToChain failed,code: ${e.code} ,message: ${e.message}`);
}
```

## Examples of the MPC-TLS SDK operations

Here's a simple example demonstrating how to perform basic operations with the MPC-TLS SDK.

```javascript
import MPCTLSJSSDK from "@padolabs/mpctls-js-sdk";
const sdkInstance = new MPCTLSJSSDK();

try {
  const initAttestaionResult = await sdkInstance.initAttestation(
    "yourdAppSymbol"
  ); // Initialize the SDK
  console.log(initAttestaionResult); //Output: true
  console.log(myInstance.supportedChainList); // View supported chains
  console.log(myInstance.supportedAttestationTypeList); // View supported attestation types

  // Generate attestation process
  const startAttestaionResult = await myInstance.startAttestation({
    chainID: 56, // Select from the supported chain list
    walletAddress: "0x", // User's wallet address
    attestationTypeID: "9", // Select from the attestationTypeID list
    assetsBalance: "1", // Fill number in accordance to assetsBalance
  });

  // Verify attestation result
  const verifyAttestationResult = await myInstance.verifyAttestation(
    startAttestaionResult
  );

  // Upload Proof to Blockchain
  const sendToChainResult = await myInstance.sendToChain(
    startAttestaionResult,
    window.ethereum
  );

  console.log("Generated Proof:", startAttestaionResult);
  console.log("Proof on Chain:", sendToChainResult);
  console.log("Is Proof Valid:", verifyAttestationResult);
} catch (e) {
  alert(`Failed, code: ${e.code} , message: ${e.message}`);
}
```
### <a id="errorCodes"></a>

## Error Codes

We have defined some error codes in the SDK. When an error occurs during the zkAttestation process, you can refer to the following list for troubleshooting.

### 1. General errors

| Error Code | Situation                                                                     |
| ---------- | ----------------------------------------------------------------------------- |
| 00001      | The MPC-TLS algorithm has not been initialized. Please restart the process.  |
| 00002      | The process did not respond within 5 minutes.                                 |
| 00003      | A zkAttestation process is currently being generated. Please try again later. |
| 00004      | The user closes or cancels the attestation process.                             |
| 00005      | Wrong parameters!                                                             |
| 00006      | No PADO extension version 0.3.13 or above was detected as installed.          |
| 00007      | Insufficient wallet balance.                                                  |
| 00008      | Failed to submit the proof on-chain. Or other errors in the Wallet operations.             |
| 00009      | Your dApp is not registered. Please contact the PADO team.              |
| 99999      | Undefined error. Contact the PADO team for further support                    |

### 2. Data source related errors

| Error Code | Situation                                                         |
| ---------- | ----------------------------------------------------------------- |
| 00102      | Insufficient assets balance in your Binance Spot Account.         |
| 00104      | Your attestation request did not meet the necessary requirements. |

### 3. MPC-TLS related errors

| Error Code    | Situation                                                                                               |
| ------------- | ------------------------------------------------------------------------------------------------------- |
| 10001         | The internet condition is not stable enough to complete the zkAttestation flow. Please try again later. |
| 10002         | The attestation process has been interrupted due to some unknown network error. Please try again later.  |
| 10003         | Can't connect attestation server due to unstable internet condition. Please try again later.           |
| 10004         | Can't connect data source server due to unstable internet condition. Please try again later.            |
| 20005         | Can't complete the attestation due to some workflow error. Please try again later.                      |
| 30001 ~ 30004 | Can't complete the attestation flow due to response error. Please try again later.                      |
| 50007         | Can't complete the attestation due to algorithm execution issues.                                  |
| 50008         | Can't complete the attestation due to abnormal execution results.                                       |
| 50009         | The algorithm service did not respond within 5 minutes.                                                |
| 50010         | Can't complete the attestation due to some compatibility issues.                                        |
| 50011         | Can't complete the attestation due to algorithm version issues.                                    |

For any other error codes not mentioned here, please contact our [community](https://discord.com/invite/pdrNxRrApX) for further support.
