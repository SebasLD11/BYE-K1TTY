// src/environments/environment.prod.ts
export const environment = {
  production: false,
  apiUrl: 'https://bye-k1itty-0585f0167cb4.herokuapp.com',                 // ← sin backend en prod por ahora
  useLocalProducts: false,     // ← activamos mock local
  checkoutEnabled: true      // ← desactiva botón Checkout
};
