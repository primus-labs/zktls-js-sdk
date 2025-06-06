import { AttRequest } from './classes/AttRequest';
export type AttestationParams = {
  chainID: number;
  walletAddress: string;
  attestationTypeID: string;
  attestationParameters: any[];
  algorithmType?: string;
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
  attConditions?: AttConditions;
  additionParams?: string;
  requestid?: string;
  backUrl?: string;
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
export type ComparisonOp = '>' | '>=' | '=' | '!=' | '<' | '<=';
export type OpType = ComparisonOp | 'SHA256' | 'REVEAL_STRING';
export type AttSubCondition = {
  field: string,
  op: OpType,
  value?: string,
}
export type AttCondition = AttSubCondition[]
export type AttConditions =  AttCondition[]

export type InitOptions = {
  platform?: string,
  env?: Env,
}

export type ComputeMode = 'nonecomplete' | 'nonepartial' | 'normal';
