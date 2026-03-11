// Simple token-based auth using base64-encoded JSON

export interface TokenPayload {
  userId: string;
  email: string;
  name: string;
}

export function createToken(payload: TokenPayload): string {
  const data = JSON.stringify({ ...payload, exp: Date.now() + 30 * 24 * 60 * 60 * 1000 });
  return btoa(data);
}

export function verifyToken(token: string): TokenPayload | null {
  try {
    const data = JSON.parse(atob(token));
    if (data.exp && data.exp < Date.now()) return null;
    return { userId: data.userId, email: data.email, name: data.name };
  } catch {
    return null;
  }
}

// Generate a 6-digit verification code
export function generateCode(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  return String(array[0] % 1000000).padStart(6, '0');
}

// Send verification code via Resend
export async function sendVerificationEmail(
  apiKey: string,
  fromEmail: string,
  toEmail: string,
  code: string
): Promise<void> {
  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      'Authorization': `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from: fromEmail,
      to: [toEmail],
      subject: `${code} is your Big Boss Weight Challenge code`,
      html: `
        <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 400px; margin: 0 auto; padding: 40px 20px;">
          <h2 style="color: #1c1c1e; margin-bottom: 8px;">Your verification code</h2>
          <p style="color: #8e8e93; margin-bottom: 24px;">Enter this code to sign in to Big Boss Weight Challenge.</p>
          <div style="background: #f2f2f7; border-radius: 12px; padding: 20px; text-align: center; margin-bottom: 24px;">
            <span style="font-size: 32px; font-weight: 700; letter-spacing: 8px; color: #007AFF;">${code}</span>
          </div>
          <p style="color: #8e8e93; font-size: 14px;">This code expires in 10 minutes. If you didn't request this, you can ignore this email.</p>
        </div>
      `,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email: ${body}`);
  }
}
