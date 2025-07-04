import type { AttMode, BaseAttestationParams,AttConditions, ComputeMode } from '../index.d'
import { getInstanceProperties } from '../utils'
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

  constructor(baseAttestationParams: BaseAttestationParams) {
    const { appId, attTemplateID, userAddress } = baseAttestationParams
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
  }
  setAdditionParams(additionParams: string) {
    this.additionParams = additionParams
  }
  setAttMode({algorithmType, resultType='plain'}: AttMode) {
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
  toJsonString() {
    return JSON.stringify(getInstanceProperties(this));
  }
}





