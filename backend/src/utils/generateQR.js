import QRCode from 'qrcode';

export const generateQRCode = async (data) => {
  try {
    return await QRCode.toDataURL(data, {
      width: 800,
      margin: 2,
      color: {
        dark: '#1a1a2e',
        light: '#ffffff',
      },
    });
  } catch (error) {
    throw new Error('Failed to generate QR code');
  }
};
