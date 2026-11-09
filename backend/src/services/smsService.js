import twilio from 'twilio';

let cachedClient;
const getClient = () => {
  if (cachedClient) return cachedClient;
  const { TWILIO_SID, TWILIO_AUTH_TOKEN } = process.env;
  if (!TWILIO_SID || !TWILIO_AUTH_TOKEN || !process.env.TWILIO_PHONE) return null;
  cachedClient = twilio(TWILIO_SID, TWILIO_AUTH_TOKEN);
  return cachedClient;
};

export const sendSMS = async (to, message) => {
  const client = getClient();
  if (!client) {
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV SMS] To: ${to}, Message: ${message}`);
      return { success: true, sid: 'dev-mode', dev: true };
    }
    return { success: false, error: 'SMS provider is not configured' };
  }
  try {
    const phone = String(to).startsWith('+') ? String(to) : `+91${String(to).replace(/\D/g, '')}`;
    const result = await client.messages.create({ body: message, from: process.env.TWILIO_PHONE, to: phone });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS delivery failed:', error.message);
    return { success: false, error: 'SMS delivery failed' };
  }
};

export const sendOTP = async (phone, code, purpose) => {
  const labels = {
    document_download: 'document download',
    login: 'login',
    password_reset: 'password reset',
    phone_verify: 'phone verification',
  };
  const message = `Your OneQR OTP for ${labels[purpose] || 'verification'} is ${code}. Valid for 10 minutes. Do not share it with anyone.`;
  return sendSMS(phone, message);
};
