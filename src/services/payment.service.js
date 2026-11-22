import { config } from '../config/index.js';

// Stands in for a real payment provider: approves a charge with probability config.mockPaymentSuccessRate.
// random is injectable (defaults to Math.random) so the outcome can be forced.
export function createPaymentService({ random = Math.random } = {}) {
  // Returns true when the charge is approved.
  function charge() {
    return random() < config.mockPaymentSuccessRate;
  }

  return { charge };
}
