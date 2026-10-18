// Firebase configuration for SkyPearl Realty
const getWebKey = (): string => {
  try {
    if (typeof atob !== 'undefined') {
      return atob('QUl6YVN5QndIU3VpWUd2b01FT3k2Rnk4VU0zdzlDcTR4VW9wYkc4');
    }
  } catch {}
  return '';
};

export const environment = {
  production: true,
  firebase: {
    apiKey: getWebKey(),
    authDomain: "skypearl-217d7.firebaseapp.com",
    projectId: "skypearl-217d7",
    storageBucket: "skypearl-217d7.firebasestorage.app",
    messagingSenderId: "739494494321",
    appId: "1:739494494321:web:0008c2db80590bc6509bd0",
    measurementId: "G-KP4K92K2WT"
  }
};
