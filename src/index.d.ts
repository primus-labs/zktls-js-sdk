export type AttestationParams = {
  chainID: number;
  walletAddress: string;
  attestationTypeID: string;
  tokenSymbol?: string;
  assetsBalance?: string;
  followersNO?: string;
  spot30dTradeVol?: string;
  signature?: string;
  timestamp?: string;
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
export type StartAttestationReturnParams = {
  chainName: string;
  attestationRequestId: string;
  eip712MessageRawDataWithSignature: Eip712Msg
}
export type ErrorData = {
  code: string;
  title: string;
  desc: string;
}


export type StartAttestationReturn = {
  result: boolean;
  data?: StartAttestationReturnParams;
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