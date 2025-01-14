import type { AttMode, BaseAttestationParams,AttConditions } from '../index.d'
import { getInstanceProperties } from '../utils'

export class AttRequest {
  appId: string;
  attTemplateID: string;
  userAddress: string;
  timestamp: number;
  attMode?: AttMode;
  attConditions?: AttConditions;
  additionParams?: string;

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
  toJsonString() {
    return JSON.stringify(getInstanceProperties(this));
  }
}





