# zkAttestation-js-sdk
pado extension zkAttestation js sdk

## 1. Overview

This is PADO Extension SDK of PADO Network for dapps developer. PADO Extension is:

- [PADO Extension](https://github.com/pado-labs/pado-extension.git)

## 2. Installation

You can install it via npm or yarn:

### Using npm

```shell
npm install --save @padolabs/zkattestation-js-sdk
```

### Or using yarn

```shell
yarn add --save @padolabs/zkattestation-js-sdk
```

## 3. Quick Start

```typescript
import { ZkAttestationJSSDK } from "@padolabs/zkattestation-js-sdk";

const myInstance = new ZkAttestationJSSDK();
console.log(myInstance.supportedChainNameList); // Outputs the list of supported chain names
```

## 4. Classes and Interfaces

### 4.1 ZkAttestationJSSDK

ZkAttestationJSSDK is the core class in the @padolabs/zkattestation-js-sdk package that provides support for specific functionalities.

**Properties**

- `isInitialized: boolean` Indicates whether the class has been initialized.
- `isInstalled: boolean` Indicates whether pado extension has been installed.
- `supportedChainNameList: string[]` List of supported chain names.

**Constructor**
constructor(): Initializes the class properties.
**Example**

```typescript
import { ZkAttestationJSSDK } from "@padolabs/zkattestation-js-sdk";

const myInstance = new ZkAttestationJSSDK();

// Initialization status
console.log(myInstance.isInitialized); // Output: false

// Pado installation status
console.log(myInstance.isInstalled); // Output: false

// Supported chain name list
console.log(myInstance.supportedChainNameList); // Output: ['Linea Mainnet', "BSC", "opBNB", "Arbitrum", "Scroll Mainnet"]
```

## 5. Methods

### 5.1 startAttestation

The startAttestation method initiates the attestation process.

**Parameters**

- `attestationParams: AttestationParams` Information required to initiate the attestation.

**Return Value**

- `Promise<boolean>` Returns a Promise boolean that resolves when the attestation is completed.
  **Example**

```typescript
import { ZkAttestationJSSDK } from "@padolabs/zkattestation-js-sdk";

const myInstance = new ZkAttestationJSSDK();

myInstance
  .startAttestation({
    chainName: "BSC",
    walletAddress: "0x8F0D4188307496926d785fB00E08Ed772f3be890",
    attestationTypeId: "9",
    assetsBalance: "0.1",
    //     tokenSymbol: "USDT",
    //     followersCount: "1",
  })
  .then(() => {
    console.log("Attestation successful");
  })
  .catch((error) => {
    console.error("Attestation failed:", error);
  });
```

### 5.2 verifyAttestation

The verifyAttestation method verifies the attestation results.

**Parameters**

- `eip712MSg:any` Attestation data.
  **Return Value**
- `isValid:boolean` Returns whether the verification successful.
  **Example**

```typescript
  import { ZkAttestationJSSDK } from '@padolabs/zkattestation-js-sdk';

  const myInstance = new ZkAttestationJSSDK();

  const attestationData = {/_ ...attestation data _/};

  myInstance.verifyAttestation(attestationData).then((result) => {
  console.log('Verification result:', result);
  }).catch((error) => {
  console.error('Verification failed:', error);
  });
```

### 5.3 sendToChain

The sendToChain method sends data to the specified blockchain.
**Parameters**

- `eip712MSg:any` Attestation data.
  **Return Value**
- `isValid:boolean` Returns whether the data has been successfully sent to the specified blockchain.

**Example**

```typescript
import { ZkAttestationJSSDK } from "@padolabs/zkattestation-js-sdk";

const myInstance = new ZkAttestationJSSDK();

myInstance
  .sendToChain({
    chainName: "chain1",
    data: { key: "value" },
  })
  .then(() => {
    console.log("Data sent successfully");
  })
  .catch((error) => {
    console.error("Data sending failed:", error);
  });
```

This documentation covers the startAttestation, verifyAttestation, and sendToChain methods in detail. These methods enable you to implement attestation and data transmission in your applications. If you need further customization or have other specific requirements, please let me know.
