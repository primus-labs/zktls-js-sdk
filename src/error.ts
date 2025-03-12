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
  '00000':'Operation too frequent. Please try again later.',
  '00001':'Algorithm startup exception.',
  '00002':'The verification process timed out.',
  '00003':'A verification process is in progress. Please try again later.',
  '00004':'The user closes or cancels the verification process.',
  '00005':'Wrong SDK parameters.',
  // '00006':'No Primus extension version 0.3.15 or above was detected as installed.',
  // '00007':'Insufficient wallet balance.',
  // '00008':'Failed to submit the proof on-chain. Or other errors in the Wallet operations.',
  // '00009':'Your dApp is not registered. Please contact the Primus team.',
  // '00010':'Verification failed. Please try again later.',
  // '00011':'Launch failed: unstable connection.',
  '00012':'Invalid Template ID.',
  '00013': 'Target data missing. Please check whether the data json path in the request URL’s response aligns with your template.',
  '00014':'The verification process timed out.',
  // "00101":'Insufficient assets in your Trading Account. Please confirm and try again later.',

  // '00102':'Attestation requirements not met. Insufficient assets balance in Binance Spot Account.',
  //  "00103": 'This account may have already been bound to a wallet address, or your wallet address may already have a zkAttestation with another Binance account.',
  '00104': 'Not met the verification requirements.',

  '10001':'Unstable internet connection. Please try again.',
  '10002':'Unstable internet connection. Please try again.',
  '10003':"Unstable internet connection. Please try again.",
  '10004': "Unstable internet connection. Please try again.",
  '20001':"An internal error occurred.",
  // '20002':"Something went wrong. Please try again later.",
  '20003':"Invalid algorithm parameters.",
  // '20004': "Something went wrong. Please try again later.",
  '20005':"Can't complete the attestation due to some workflow error. Please try again later.",
  '30001': "Response error. Please try again.",
  '30002': "Response check error.",
  // '30003': "Can't complete the attestation flow due to response error. Please try again later.",
  '30004': "Response parse error.",
  // '40001':"Something went wrong. Please try again later.",
  '40002': "SSLCertificateError",
  '50001':"An internal error occurred.",
  // '50002': "Something went wrong. Please try again later.",
  '50003':"The client encountered an unexpected error.",
  '50004': "The client not started. Please try again.",
  // '50005':"Something went wrong. Please try again later.",
  '50006': "The algorithm server not started. Please try again.",
  '50007':"Algorithm execution issues.",
  '50008':"Abnormal execution results.",
  '50009': 'Algorithm service timed out.',
  '50010': "Compatibility issues during algorithm execution.",
  '50011': "Unsupported TLS version.",
  '99999':'Undefined error.',
  '-1200010':"Invalid message.",
  '-1002001':"Invalid App ID.",
  '-1002002':"Invalid App Secret.",
}
export class ZkAttestationError {
  code: ErrorCode;
  message: string;
  data?: any;
  constructor(code: ErrorCode, message?: string, data?: any) {
    this.message = message || ErrorCodeMAP[code as keyof typeof ErrorCodeMAP];
    this.code = code;
    this.data = data;
  }
}

