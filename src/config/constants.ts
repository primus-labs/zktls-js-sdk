export const PADOEXTENSIONID = "oeiomhmbaapihbilkfkhmlajkeegnjhe";

export const ONESECOND = 1000;
export const ONEMINUTE = 60 * ONESECOND;
export const ATTESTATIONPOLLINGTIME = 1 * ONESECOND;
export const ATTESTATIONPOLLINGTIMEOUT = 2 * ONEMINUTE;
export const ATTESTATIONPOLLINGTIMEOUTMOBILE = 5 * ONEMINUTE;
export const INIT_ATTESTATION_TIMEOUT = 15 * ONESECOND;
export const EXTENSION_WEB_SESSION_TOTAL_MS = 5 * ONEMINUTE;

export const PADOADDRESSMAP = {
  development: '0xe02bd7a6c8aa401189aebb5bad755c2610940a73',
  production: '0xDB736B13E2f522dBE18B2015d0291E4b193D8eF6',
};

export const ENV = 'production';
export const BASEAPIMAP = {
  development: 'https://api-dev.padolabs.org',
  production: 'https://api.padolabs.org',
  // production: 'https://api.padolabs.org',
};
export const resolveRuntimeEnv = (env?: string): keyof typeof BASEAPIMAP =>
  env === 'production' ? 'production' : 'development';
export const getBaseApi = (env?: string): string => BASEAPIMAP[resolveRuntimeEnv(env)];
export const BASEAPI = getBaseApi(ENV);
