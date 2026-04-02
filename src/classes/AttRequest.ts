import type { AttMode, BaseAttestationParams, AttConditions, ComputeMode } from '../types.js';
import { getInstanceProperties } from '../utils.js';
import { v4 as uuidv4 } from 'uuid';

export class AttRequest {
  appId: string;
  attTemplateID: string;
  userAddress: string;
  timestamp: number;
  attMode?: AttMode;
  attConditions?: AttConditions;
  additionParams?: string;
  requestid?: string;
  backUrl?: string;
  computeMode?: ComputeMode;
  noProxy?: boolean;
  allJsonResponseFlag?: 'true' | 'false';
  /** Attestation polling timeout in milliseconds. */
  timeout?: number;
  /** When true, extension closes the data source tab after successful proof (PC). */
  closeDataSourceOnProofComplete?: boolean;

  constructor(baseAttestationParams: BaseAttestationParams) {
    const { appId, attTemplateID, userAddress, timeout, closeDataSourceOnProofComplete } = baseAttestationParams
    this.appId = appId
    this.attTemplateID = attTemplateID
    this.userAddress = userAddress
    this.timestamp = + new Date()
    this.attMode = {
      algorithmType: 'proxytls',
      resultType: 'plain'
    } // TODO
    this.requestid = uuidv4();
    this.backUrl = "";
    this.computeMode = "normal";
    this.noProxy = true;
    this.allJsonResponseFlag = 'false';
    if (timeout !== undefined) {
      this.timeout = timeout;
    }
    if (closeDataSourceOnProofComplete === true) {
      this.closeDataSourceOnProofComplete = true;
    }
  }
  setCloseDataSourceOnProofComplete(value: boolean) {
    if (value === true) {
      this.closeDataSourceOnProofComplete = true;
    } else {
      delete this.closeDataSourceOnProofComplete;
    }
  }
  setAdditionParams(additionParams: string) {
    this.additionParams = additionParams
  }
  setAttMode({ algorithmType, resultType = 'plain' }: AttMode) {
    this.attMode = {
      algorithmType,
      resultType
    };
  }
  setAttConditions(attConditions: AttConditions) {
    this.attConditions = attConditions
  }
  setBackUrl(url: string) {
    this.backUrl = url;
  }
  setComputeMode(computeMode: ComputeMode) {
    this.computeMode = computeMode;
  }
  setNoProxy(noProxy: boolean) {
    this.noProxy = noProxy
  }
  setAllJsonResponseFlag(allJsonResponseFlag: string) {
    this.allJsonResponseFlag = allJsonResponseFlag === 'true' ? 'true' : 'false'
  }
  toJsonString() {
    return JSON.stringify(getInstanceProperties(this));
  }
}





