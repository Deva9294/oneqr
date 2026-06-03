import twilio from 'twilio';

const client = twilio(process.env.TWILIO_SID, process.env.TWILIO_AUTH_TOKEN);

export const sendSMS = async (to, message) => {
  try {
    const result = await client.messages.create({
      body: message,
      from: process.env.TWILIO_PHONE,
      to: `+91${to}`,
    });
    return { success: true, sid: result.sid };
  } catch (error) {
    console.error('SMS Error:', error.message);
    // Fallback: In development, just log the OTP
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[DEV SMS] To: ${to}, Message: ${message}`);
      return { success: true, sid: 'dev-mode', dev: true };
    }
    return { success: false, error: error.message };
  }
};

export const sendOTP = async (phone, code, purpose) => {
  const purposeText = {
    document_download: 'document download',
    login: 'login',
    password_reset: 'password reset',
    phone_verify: 'phone verification',
  };

  const message = `Your OneQR OTP for ${purposeText[purpose] || 'verification'} is ${code}. Valid for 10 minutes. Do not share it with anyone.`;
  return await sendSMS(phone, message);
};
