import { encodeRequest, encodeResponse, encodeAttestation } from "../src/utils"
import { Attestation, AttNetworkRequest, AttNetworkResponseResolve } from "../src/index.d"
import PrimusZKTLS from '../src/index';
import { ethers } from "ethers";

describe('listData function', () => {
  jest.setTimeout(50000);

  let bodyStr = '{"metadata":{"timestamp": "2024-11-26T12:34:56Z","requestId": "123e4567-e89b-12d3-a456-426614174000","tags": ["large_request","test_data","example_usage"]},"data":{"items": [{"id": 1,"name": "Item One","description": "This is a detailed description of item one.","attributes": {"color": "red","size": "large","weight": 1.234}},{"id": 2,"name": "Item Two","description": "This is a detailed description of item two.","attributes": {"color": "blue","size": "medium","weight": 2.345}}],"extraData": {"subField1": "Lorem ipsum dolor sit amet, consectetur adipiscing elit.","subField2": ["Value1","Value2","Value3","Value4"],"nestedField": {"innerField1": "Deeply nested value","innerField2": [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]}}}}';
  
  it('encodeRequest', async () => {
    const attReq = createNetworkRequest();
    const encodeData = encodeRequest(attReq);
    console.log("encodeRequest encodeData=", encodeData);
    expect(encodeData).toBe('0x337e14098e0e506f44eb6fe3d46e1c0310cfdf5576f715034674a43b6b954693');
  });

  it('encodeResponse', async () => {
    let response: AttNetworkResponseResolve[] = createNetworkResponseResolve();
    const encodeData = encodeResponse(response);
    console.log("encodeRequest encodeData=", encodeData);
    expect(encodeData).toBe('0xf7525104ad0472d18297fd784fa894a4e491ca2e5d4363a64adc6f4adba095e1');
  });

  it('encodeAttestation', async () => {
    const att = createAttestation();
    const encodeData = encodeAttestation(att);
    console.log("encodeAttestation encodeData=", encodeData);
    expect(encodeData).toBe('0xebb87a4b82fe5980d8e8f43fe98acda9cc44fe98541947004c648a99ff629a3f');
  });

  it('verifyAttestation', async () => {
    const att = createAttestation();
    const encodeData = encodeAttestation(att);
    const wallet = new ethers.Wallet("0xA11CE00000000000000000000000000000000000000000000000000000000000");
    console.log("verifyAttestation encodeData=", encodeData);
    console.log("verifyAttestation address=", wallet.address);
    const sig = await wallet._signingKey().signDigest(encodeData);
    att.signatures[0] = ethers.utils.joinSignature(sig);
    const zkTLS = new PrimusZKTLS();
    zkTLS.verifyAttestation(att);
  });

  function createNetworkRequest() {
    const attReq: AttNetworkRequest = {
      url: "https://example.com/apiwdewd/121s1qs1qs?DDDSADWDDAWDWAWWAWW",
      header: '{"Authorization":"Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJzdWIiOiIxMjM0NTY3ODkwIiwi.M0NTY3ODM0NTY3ODM0NTY3ODM0NTY3ODM0NTY3OD..","X-Custom-Header-1":""Very-Long-Custom-Header-Value-That-Exceeds-Normal-Limits-Here-1234567890l-Limits-Here-1234567l-Limits-Here-1234567l-Limits-Here-1234567l-Limits-Here-1234567l-Limits-Here-1234567...","X-Custom-Header-2":"Another-Custom-Value-1234567890abcdefghijklmnopqrstuvwxyzghijklmnopqrstuvwxyghijklmnopqrstuvwxyghijklmnopqrstuvwxyghijklmnopqrstuvwxy", "Content-Type": "application/json","Accept": "application/json","User-Agent": "MyCustomClient/1.0","Cache-Control": "no-cache"}',
      method: "POST",
      body: bodyStr
    };
    return attReq;
  }

  function createNetworkResponseResolve() {
    let response: AttNetworkResponseResolve[] = new Array<AttNetworkResponseResolve>(3);
    for (let i = 0; i < 3; i++) {
      response[i] = {
        keyName: "dASCZCSQFEQSDCKMASODCNPOND[OJDL;AKNC;KA;LCZMOQNOQWNPWNEO2NEPIOWNEO2EQWDNLKJQBDIQNWIUNINOIEDN2ONEDOI2NEDO2ISDKSMD]ND LWHBLQBEDKJEBDIUWSILSBCLQVSCUYDUH@3344OIIOQWEJ02J0J3ajdhpohodh92njabdpuhcqnwejkbiuhc0[qwncjqnsdonqowfoqwno;9 ujdwkfpokwedm1jf[oi]wc9hce98cbuie9gd71gd87d817g219ge97129g19g2812912]",
        parseType: "JSON121231uqwhdp9uh2i1ubdbjabdiwd1biu212",
        parsePath: "$.data.key1kn;ni[onwendiohed2ij20djasdj09wndoiqweoqheqhefpqhf9p92hf238dhdohwuhpbfoqufp92hfo2iefinoiedn2o9302]"
      };
    }
    return response;
  }

  function createAttestation() {
    const att: Attestation = {
      recipient: "0x7ab44DE0156925fe0c24482a2cDe48C465e47573",
      request: createNetworkRequest(),
      reponseResolve: createNetworkResponseResolve(),
      data: bodyStr,
      attConditions: '{"param":"value"}',
      timestamp: 1,
      additionParams: "",
      attestors: [],
      signatures: []
    };
    return att;
  }

});