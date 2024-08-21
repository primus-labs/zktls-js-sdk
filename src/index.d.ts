export type AttestationParams = {
  chainName: string;
  walletAddress: string;
  attestationTypeId: string;
  tokenSymbol?: string;
  assetsBalance?: string;
  followersCount?: string;
}
export type ChainOption = {
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
export type StartAttestationReturnParams = Eip712Msg & {
  chainName: string;
  attestationRequestId: string;
}