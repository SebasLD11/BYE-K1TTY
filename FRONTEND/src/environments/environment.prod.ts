// src/environments/environment.prod.ts
export const environment = {
  production: true,
  apiUrl: '',                 // ← sin backend en prod por ahora
  useLocalProducts: false,     // ← activamos mock local
  checkoutEnabled: false      // ← desactiva botón Checkout
};
