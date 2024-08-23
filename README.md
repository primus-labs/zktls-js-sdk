# zkAttestation-js-sdk
Pado extension zkAttestation js sdk is a JavaScript SDK designed to work with the Pado Extension Chrome plugin. This SDK provides functionalities for handling zero-knowledge proofs, including generating proofs, uploading them to a blockchain, and verifying proofs.

## Installation

You can install it via npm or yarn:

### Using npm

```shell
npm install --save @padolabs/zkattestation-js-sdk
```

### Or using yarn

```shell
yarn add --save @padolabs/zkattestation-js-sdk
```

## Quick Start
### 1.Import the SDK Import the @padolabs/zkattestation-js-sdk into your project.

```javascript
import { ZkAttestationJSSDK } from "@padolabs/zkattestation-js-sdk";

const myInstance = new ZkAttestationJSSDK();
console.log(myInstance.supportedChainNameList); // Outputs the list of supported chain names
```
### 2.Initialize the SDK with Pado Extension already installed.
```javascript
  const initAttestationResult = myInstance.initAttestation()
  console.log(initAttestationResult)// Output: true
```
### 3.View supported chains
```javascript
  console.log(myInstance.supportedChainNameList)// Output: [
  // {text:'Linea Mainnet' , value:'Linea Mainnet' },
  // {text:'BSC' , value:'BSC' },
  // {text:'opBNB' , value:'opBNB' },
  // {text:'Arbitrum' , value:'Arbitrum' },
  // {text:'Scroll Mainnet' , value:'Scroll Mainnet' },
  // ]
```
### 4.View supported attestation type
```javascript
  console.log(myInstance.supportedAttestationTypeList)// Output: [
  // {
  //   text: "binance kyc",
  //   value: "1",
  // },
  // {
  //   text: "binance account",
  //   value: "2",
  // },
  // {
  //   text: "x account",
  //   value: "3",
  // },
  // {
  //   text: "okx kyc",
  //   value: "4",
  // },
  // {
  //   text: "tiktok account",
  //   value: "6",
  // },
  // {
  //   text: "binance Assets Proof",
  //   value: "9",
  // },
  // {
  //   text: "binance Token Holding",
  //   value: "10",
  // },
  // {
  //   text: "okx Assets Proof",
  //   value: "11",
  // },
  // {
  //   text: "okx Token Holding",
  //   value: "12",
  // },
  // {
  //   text: "X Followers",
  //   value: "15",
  // }]
```
### 5.Generate a Proof Use the generateProof method to generate a zero-knowledge proof.


**Parameters**

- `attestationParams: AttestationParams` Information required to initiate the attestation.
  - it is worth noting that startAttestation can only be called after successful initialization
  - All proof types require passing in three parameters: chainName, walletAddress, and attestationTypeId. Your parameter should look like this `{
        chainName: "BSC",
        walletAddress: "0x",
        attestationTypeId: "1",
      }`
  - When you your proof type is Binance Assets Proof or OKX Assets Proof, remember to pass in the assetsBalance parameter, which is in yuan and supports a minimum of 0.000001. Your parameter should look like this `{
        chainName: "BSC",
        walletAddress: "0x",
        attestationTypeId: "11",
        assetsBalance: "0.1",
      }`
  - When your proof type is Binance Token Holding or OKX Token Holding, remember to pass in the tokenSymbol parameter. Your parameter should look like this `{
        chainName: "BSC",
        walletAddress: "0x",
        attestationTypeId: "12",
        tokenSymbol: "USDT",
      }`
  - When your proof type is X Followers, remember to pass in the followersCount parameter. Your parameter should look like this `{
        chainName: "BSC",
        walletAddress: "0x",
        attestationTypeId: "15",
        followersCount: "1",
      }`
**Return Value**

- `Promise<StartAttestationReturnParams>` Returns a Promise StartAttestationReturnParams resolves when the attestation is successful or Returns false when the attestation is failed.

```javascript
  async  function generateProof(proof) {
    // Generate a proof of binance account assets balance >1 USD
    const startAttestationReturnValue = await myInstance.startAttestation({
      chainName: "BSC",
      walletAddress: "0x",
      attestationTypeId: "9",
      assetsBalance: "1",
    })
  }
```
### 6.Upload Proof to Blockchain Use the uploadProof method to upload the generated proof to the blockchain.
```javascript
  async  function uploadProof(startAttestationReturnValue) {
    // upload the generated proof to the blockchain specified by the chainName you provided when calling startAttestation..
    const startAttestationResult = await myInstance.sendToChain(startAttestationReturnValue)
  }
```

### 7.Verify Proof Use the verifyProof method to validate an existing proof.
```javascript
  async  function verifyProof(startAttestationReturnValue) {
    // upload the generated proof to the blockchain specified by the chainName you provided when calling startAttestation..
    const verifyAttestationResult = await myInstance.verifyAttestation(startAttestationReturnValue)
  }
```
## Example
Here's a simple example demonstrating how to perform basic operations with the @padolabs/zkattestation-js-sdk
```javascript
  import ZkaSdk from '@padolabs/zkattestation-js-sdk';

  const myInstance = new ZkAttestationJSSDK();
  const initAttestationResult = myInstance.initAttestation()
  console.log(initAttestationResult)
  async function runExample() {
    if (initAttestationResult) {
      console.log(myInstance.supportedChainNameList)
      console.log(myInstance.supportedAttestationTypeList)
    }

    // Generate Proof
    const startAttestationReturnValue = await myInstance.startAttestation({
      chainName: "BSC", //  Select from the supportedChainNameList
      walletAddress: "0x",
      attestationTypeId: "9", //  //  Select from the supportedAttestationTypeList
      assetsBalance: "1", // The unit is in US dollars
    })
    

    // Upload Proof to Blockchain
    const sendToChainResult = await myInstance.sendToChain(startAttestationReturnValue);

    // Verify Proof
    const isValid = await myInstance.verifyAttestation(sendToChainResult);

    console.log('Generated Proof:', sendToChainResult);
    console.log('Proof on Chain:', sendToChainResult);
    console.log('Is Proof Valid:', isValid);
  }

  runExample().catch(console.error);
```