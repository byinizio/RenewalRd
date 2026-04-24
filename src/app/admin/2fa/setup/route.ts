import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import QRCode from 'qrcode';

export async function POST() {
  const secret = speakeasy.generateSecret({ name: 'RenewalRadar Admin', length: 32 });
  const qrCode = await QRCode.toDataURL(secret.otpauth_url!);
  return NextResponse.json({ secret: secret.base32, qrCode });
}