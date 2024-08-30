export type AttestationErrorCode =
  "00001" | "00002" | '00003' | "00004" | '00005' | '00006' | "00009" |
  "00101" | "00102" | "00103" | "00104" |
  "10001" | "10002" | "10003" | "10004" |
  "20001" | "20002" | "20003" | "20004" | "20005" |
  "30001" | "30002" | "30003" | "30004" |
  "40001" | "40002" |
  "50002" | "50003" | "50004"  | "50005" | "50006" | "50007" | "50008"  | "50009"  | "50010" | "50011" |
  "99999"

export type OnChainErrorCode =
  "00007" | "00008"
  
export type ErrorCode = AttestationErrorCode | OnChainErrorCode;

export class ZkAttestationError {
  code: ErrorCode;
  message: string;
  constructor(code: ErrorCode, message: string) {
    this.message = message;
    this.code = code;
  }
}