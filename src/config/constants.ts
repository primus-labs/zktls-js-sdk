export const PADOEXTENSIONID = "oeiomhmbaapihbilkfkhmlajkeegnjhe";

export const ONESECOND = 1000;
export const ONEMINUTE = 60 * ONESECOND;
export const ATTESTATIONPOLLINGTIME = 1 * ONESECOND;
export const ATTESTATIONPOLLINGTIMEOUT = 2 * ONEMINUTE;
export const ATTESTATIONPOLLINGTIMEOUTMOBILE = 5 * ONEMINUTE;

export const PADOADDRESSMAP = {
  development: '0xe02bd7a6c8aa401189aebb5bad755c2610940a73',
  production: '0x5Ed3176045F68617B0958a61ac1868875C98C14d',
};

export const ENV = 'production';
export const BASEAPIMAP = {
  development: 'https://api-dev.padolabs.org',
  production: 'https://api.padolabs.org',
  // production: 'https://api.padolabs.org',
};
export const BASEAPI = BASEAPIMAP[ENV]
