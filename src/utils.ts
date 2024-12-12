import { Attestation, AttNetworkRequest, AttNetworkResponseResolve } from './index.d'
const { ethers } = require("ethers");

export function isValidNumericString(value: string) {  
    const regex = /^[0-9]*$/; 
    return typeof value === 'string' && regex.test(value);  
}  
export function isValidLetterString(value: string) {  
  const regex = /^[A-Za-z]+$/;
  return typeof value === 'string' && regex.test(value);  
}  

export function isValidNumberString(value: string) {  
  const regex = /^(0\.(0*[1-9]\d{0,5})|[1-9]\d*(\.\d{1,6})?)$/;   
  return typeof value === 'string' && regex.test(value);  
}  
    
export function isValidTimestampString(value:string) {  
    // Check if the value is of string type  
    if (typeof value !== 'string') {  
        return false;  
    }  
  
    // Attempt to parse the string into a number  
    const timestamp = Number(value);  
  
    // Check if the parsed number is finite (not NaN or Infinity)  
    if (!Number.isFinite(timestamp)) {  
        return false;  
    }  
  
    // Check if the number is within a reasonable timestamp range (optional but recommended)  
    // JavaScript timestamps are typically milliseconds since 1970-01-01T00:00:00.000Z  
    // Minimum value is -62135596800000 (milliseconds since 1601-01-01T00:00:00.000Z, but many environments do not support such early times)  
    // Maximum value is Number.MAX_SAFE_INTEGER (2^53 - 1, approximately 9007199254740991 milliseconds, corresponding to the year 275760)  
    // Note: JavaScript Date objects can handle timestamps beyond this range, but may lose precision  
    const MIN_TIMESTAMP = -62135596800000; // Can be adjusted as needed  
    const MAX_TIMESTAMP = Number.MAX_SAFE_INTEGER;  
  
    return timestamp >= MIN_TIMESTAMP && timestamp <= MAX_TIMESTAMP;  
}  

export function getInstanceProperties(instance:any) {
    const properties:any = {};
    Object.keys(instance).forEach(key => {
        // Only copy the attributes, not the methods
        if (typeof instance[key] !== 'function') {
            properties[key] = instance[key];
        }
    });
    return properties;
}

export function encodeAttestation(att: Attestation) {
    const encodedData = ethers.utils.solidityPack(
        ["address", "bytes32", "bytes32", "string", "string", "uint64", "string"],
        [att.recipient, encodeRequest(att.request), encodeResponse(att.reponseResolve), 
        att.data, att.attConditions, att.timestamp, att.additionParams]
    );
    return ethers.utils.keccak256(encodedData);
}
export function encodeRequest(request: AttNetworkRequest) {
    const encodedData = ethers.utils.solidityPack(
        ["string", "string", "string", "string"],
        [request.url, request.header, request.method, request.body]
    );
    return ethers.utils.keccak256(encodedData);
}
export function encodeResponse(reponse: AttNetworkResponseResolve[]) {
    let encodeData="0x";
    for (let i = 0; i < reponse.length; i++) {
        encodeData = ethers.utils.solidityPack(
          ["bytes", "string", "string", "string"],
          [encodeData, reponse[i].keyName, reponse[i].parseType, reponse[i].parsePath]
        );
    }
	return ethers.utils.keccak256(encodeData);
}