// Government integrations must only be enabled after an authorized provider
// contract, credentials, consent flow and production API implementation exist.
// Never return fabricated identity data or a false "verified" status.

const unavailable = (provider) => ({
  success: false,
  unavailable: true,
  provider,
  message: `${provider} integration is not configured. Upload your own document or connect an authorized provider.`,
});

export const fetchAadhaarFromUIDAI = async () => unavailable('UIDAI/Aadhaar');
export const fetchPANFromNSDL = async () => unavailable('PAN verification');
export const fetchDLFromParivahan = async () => unavailable('Parivahan/DL');
export const fetchFromDigiLocker = async () => unavailable('DigiLocker');
