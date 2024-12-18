export type AttestationErrorCode =
  "00001" | "00002" | '00003' | "00004" | '00005' | '00006' | "00009" | "00010" |
  "00101" | "00102" | "00103" | "00104" |
  "10001" | "10002" | "10003" | "10004" |
  "20001" | "20002" | "20003" | "20004" | "20005" |
  "30001" | "30002" | "30003" | "30004" |
  "40001" | "40002" |
  "50002" | "50003" | "50004"  | "50005" | "50006" | "50007" | "50008"  | "50009"  | "50010" | "50011" |
  "99999" |
  "-1200010"

export type OnChainErrorCode =
  "00007" | "00008"
  
export type ErrorCode = AttestationErrorCode | OnChainErrorCode;

export const ErrorCodeMAP = {
  '00001': 'The MPC-TLS algorithm has not been initialized. Please restart the process.',
  '00002':'The process did not respond within 5 minutes.',
  '00003':'A zkAttestation process is currently being generated. Please try again later.',
  '00004':'The user closes or cancels the attestation process.',
  '00005':'Wrong parameters!',
  '00006':'No Primus extension version 0.3.15 or above was detected as installed.',
  '00007':'Insufficient wallet balance.',
  '00008':'Failed to submit the proof on-chain. Or other errors in the Wallet operations.',
  '00009':'Your dApp is not registered. Please contact the Primus team.',
  '00010':'Verification failed. Please try again later.',
  '00011':'Launch failed: unstable connection.',
  '99999':'Undefined error. Contact the Primus team for further support',
  '00102':'Attestation requirements not met. Insufficient assets balance in Binance Spot Account.',
  '00104': 'Attestation requirements not met.',
  '10001':'The internet condition is not stable enough to complete the zkAttestation flow. Please try again later.',
  '10002':'The attestation process has been interrupted due to some unknown network error. Please try again later.',
  '10003':"Can't connect attestation server due to unstable internet condition. Please try again later.",
  '10004': "Can't connect data source server due to unstable internet condition. Please try again later.",
  '20005':"Can't complete the attestation due to some workflow error. Please try again later.",
  '30001': "Can't complete the attestation flow due to response error. Please try again later.",
  '30002': "Can't complete the attestation flow due to response error. Please try again later.",
  '30003': "Can't complete the attestation flow due to response error. Please try again later.",
  '30004': "Can't complete the attestation flow due to response error. Please try again later.",
  '50007':"Can't complete the attestation due to algorithm execution issues.",
  '50008':"Can't complete the attestation due to abnormal execution results.",
  '50009': 'The algorithm service did not respond within 5 minutes.',
  '50010': "Can't complete the attestation due to some compatibility issues.",
  '50011': "Can't complete the attestation due to algorithm version issues.",
  "00101":'Insufficient assets in your Trading Account. Please confirm and try again later.',
  "00103": 'This account may have already been bound to a wallet address, or your wallet address may already have a zkAttestation with another Binance account.',
  '20001':"Something went wrong. Please try again later.",
  '20002':"Something went wrong. Please try again later.",
  '20003':"Something went wrong. Please try again later.",
  '20004': "Something went wrong. Please try again later.",
  '40001':"Something went wrong. Please try again later.",
  '40002': "SSLCertificateError",
  '50001':"Something went wrong. Please try again later.",
  '50002': "Something went wrong. Please try again later.",
  '50003':"Something went wrong. Please try again later.",
  '50004': "Something went wrong. Please try again later.",
  '50005':"Something went wrong. Please try again later.",
  '50006': "Something went wrong. Please try again later.",
  '-1200010':"Invalid message."
}
export class ZkAttestationError {
  code: ErrorCode;
  message: string;
  constructor(code: ErrorCode, message?: string) {
    this.message = message || ErrorCodeMAP[code as keyof typeof ErrorCodeMAP];
    this.code = code;
  }
}

