import type { AttMode, BaseAttestationParams } from '../index.d'

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
      algorithmType: 'mpctls',
      resultType: 'plain'
    }
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
}





