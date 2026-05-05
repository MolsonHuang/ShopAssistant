const DEFAULT_PORT = '3000';

function getApiBaseUrl() {
  // #ifdef H5
  const { protocol, hostname } = window.location;
  const apiHost = hostname || 'localhost';
  return `${protocol}//${apiHost}:${DEFAULT_PORT}/api`;
  // #endif

  // APP and mini-program builds cannot reach a computer through localhost.
  // Replace this with your computer/server LAN IP before packaging, for example:
  // return 'http://192.168.1.20:3000/api';
  return 'http://127.0.0.1:3000/api';
}

export const API_BASE_URL = getApiBaseUrl();

export function request(options) {
  return new Promise((resolve, reject) => {
    uni.request({
      timeout: 10000,
      ...options,
      url: `${API_BASE_URL}${options.url}`,
      success: (res) => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          resolve(res.data);
          return;
        }
        reject(res.data || { error: `HTTP ${res.statusCode}` });
      },
      fail: reject
    });
  });
}
