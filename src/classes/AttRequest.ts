import type { AttMode, BaseAttestationParams } from '../index.d'
import { getInstanceProperties } from '../utils'

export default class AttRequest {
  appId: string;
  attTemplateID: string;
  userAddress: string;
  timestamp: number;
  attMode?: AttMode;
  attConditions?: object;
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
  setAttMode(attMode: AttMode) {
    this.attMode = attMode
  }
  setAttConditions(attConditions: Object) {
    this.attConditions = attConditions
  }
  toJsonString() {
    return JSON.stringify(getInstanceProperties(this));
  }
}





