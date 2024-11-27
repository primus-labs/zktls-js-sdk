import AttRequest from './classes/AttRequest';
export type AttestationParams = {
  chainID: number;
  walletAddress: string;
  attestationTypeID: string;
  // tokenSymbol?: string;
  // assetsBalance?: string;
  // followersNO?: string;
  // spot30dTradeVol?: string;
  // signature?: string;
  // timestamp?: string;
  attestationParameters: any[];
  algorithmType?: string;
}
export type ChainOption = {
  text: string;
  value: number;
}
export type AttestationTypeOption = {
  text: string;
  value: string;
}

export type Eip712Msg = {
  types: {
    "Attest": [
      {
        "name": "schema",
        "type": "bytes32"
      },
      {
        "name": "recipient",
        "type": "address"
      },
      {
        "name": "expirationTime",
        "type": "uint64"
      },
      {
        "name": "revocable",
        "type": "bool"
      },
      {
        "name": "refUID",
        "type": "bytes32"
      },
      {
        "name": "data",
        "type": "bytes"
      },
      {
        "name": "deadline",
        "type": "uint64"
      }
    ]
  },
  primaryType: "Attest",
  message: {
    "schema": string,
    "recipient": string,
    "expirationTime": 0,
    "revocable": true,
    "data": string,
    "refUID": string,
    "deadline": 0
  },
  domain: {
    "name": string,
    "version": string,
    "chainId": string,
    "verifyingContract": string,
    "salt": null
  },
  uid: null,
  signature: {
    "v": number,
    "r": string,
    "s": string
  }
}

export type AttNetworkRequest = {
  url: string,
  header: string, // json string
  method: string,
  body: string
}
export type AttNetworkResponseResolve = {
  keyName: string,
  parseType: string, //json or html
  parsePath: string
}
export type Attestor = {
  attestorAddr: string,
  url: string
}
export type Attestation = {
  recipient: string,
  request: AttNetworkRequest,
  reponseResolve: AttNetworkResponseResolve[],
  data: string, // json string
  attConditions: string, // json string
  timestamp: number,
  additionParams: string,
  attestors: Attestor[],
  signatures: string[],
}
export type ErrorData = {
  code: string;
  title: string;
  desc: string;
}


export type StartAttestationReturn = {
  result: boolean;
  data?: Attestation;
  errorData?: ErrorData,
  reStartFlag?: boolean;
}

export type VerifyParamsReturn = {
  result: boolean;
  message: string;
}

export type InitAttestationReturn = {
  result: boolean;
  errorData?: ErrorData;
}

export type Env = 'development' | 'test' | 'production'

export type AttModeAlgorithmType = 'mpctls' | 'proxytls'
export type AttModeResultType = 'plain' | 'cipher'
export type AttMode = {
  algorithmType: AttModeAlgorithmType;
  resultType: AttModeResultType;
}
export type BaseAttestationParams = {
  appId: string;
  attTemplateID: string;
  userAddress: string;
}
export type FullAttestationParams = BaseAttestationParams & {
  timestamp: number;
  attMode?: AttMode;
  attConditions?: object;
  additionParams?: string;
}
export type SignedAttRequest = {
  attRequest: FullAttestationParams,
  appSignature: string
}

declare global {
  interface Window {
    primus?: any;
  }
}