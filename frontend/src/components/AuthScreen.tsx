import { useState, useRef, useEffect } from 'react';

interface AuthScreenProps {
  onSendCode: (email: string) => Promise<void>;
  onVerifyCode: (email: string, code: string) => Promise<unknown>;
}

export function AuthScreen({ onSendCode, onVerifyCode }: AuthScreenProps) {
  const [step, setStep] = useState<'email' | 'code'>('email');
  const [email, setEmail] = useState('');
  const [code, setCode] = useState(['', '', '', '', '', '']);
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [resendCooldown, setResendCooldown] = useState(0);
  const codeRefs = useRef<(HTMLInputElement | null)[]>([]);

  // Resend cooldown timer
  useEffect(() => {
    if (resendCooldown <= 0) return;
    const timer = setTimeout(() => setResendCooldown(resendCooldown - 1), 1000);
    return () => clearTimeout(timer);
  }, [resendCooldown]);

  const handleSendCode = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSubmitting(true);

    try {
      await onSendCode(email);
      setStep('code');
      setResendCooldown(60);
      setTimeout(() => codeRefs.current[0]?.focus(), 100);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const handleResend = async () => {
    if (resendCooldown > 0) return;
    setError('');
    setSubmitting(true);
    try {
      await onSendCode(email);
      setResendCooldown(60);
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Something went wrong');
    } finally {
      setSubmitting(false);
    }
  };

  const submitCode = async (fullCode: string) => {
    setError('');
    setSubmitting(true);
    try {
      await onVerifyCode(email, fullCode);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Invalid code');
      setCode(['', '', '', '', '', '']);
      codeRefs.current[0]?.focus();
    } finally {
      setSubmitting(false);
    }
  };

  const handleCodeChange = (index: number, value: string) => {
    const digit = value.replace(/\D/g, '').slice(-1);
    const newCode = [...code];
    newCode[index] = digit;
    setCode(newCode);

    if (digit && index < 5) {
      codeRefs.current[index + 1]?.focus();
    }

    // Auto-submit when all 6 digits entered
    if (digit && index === 5) {
      const fullCode = newCode.join('');
      if (fullCode.length === 6) {
        submitCode(fullCode);
      }
    }
  };

  const handleCodeKeyDown = (index: number, e: React.KeyboardEvent) => {
    if (e.key === 'Backspace' && !code[index] && index > 0) {
      codeRefs.current[index - 1]?.focus();
    }
  };

  const handleCodePaste = (e: React.ClipboardEvent) => {
    e.preventDefault();
    const pasted = e.clipboardData.getData('text').replace(/\D/g, '').slice(0, 6);
    if (pasted.length === 0) return;

    const newCode = [...code];
    for (let i = 0; i < 6; i++) {
      newCode[i] = pasted[i] || '';
    }
    setCode(newCode);

    if (pasted.length === 6) {
      submitCode(pasted);
    } else {
      codeRefs.current[Math.min(pasted.length, 5)]?.focus();
    }
  };

  return (
    <div className="auth-screen">
      <div className="auth-container">
        <div className="auth-header">
          <div className="auth-logo">
            <svg width="48" height="48" viewBox="0 0 100 100" fill="none">
              <rect width="100" height="100" rx="22" fill="#007AFF" />
              <text x="50" y="68" fontFamily="Inter, system-ui" fontSize="50" fontWeight="700" fill="white" textAnchor="middle">W</text>
            </svg>
          </div>
          <h1 className="auth-title">Big Boss Weight Challenge</h1>
          <p className="auth-subtitle">
            {step === 'email'
              ? 'Enter your email to sign in'
              : `We sent a code to ${email}`}
          </p>
        </div>

        {step === 'email' ? (
          <form onSubmit={handleSendCode} className="auth-form">
            <div className="form-group">
              <label className="form-label">Email</label>
              <input
                type="email"
                className="form-input"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                required
                autoComplete="email"
                autoFocus
              />
            </div>

            {error && <div className="form-error">{error}</div>}

            <button type="submit" className="btn btn-primary btn-full" disabled={submitting}>
              {submitting ? <span className="btn-loading" /> : 'Continue'}
            </button>
          </form>
        ) : (
          <div className="auth-form">
            <div className="form-group">
              <label className="form-label">Verification code</label>
              <div className="code-inputs">
                {code.map((digit, i) => (
                  <input
                    key={i}
                    ref={(el) => { codeRefs.current[i] = el; }}
                    type="text"
                    inputMode="numeric"
                    className="code-input"
                    value={digit}
                    onChange={(e) => handleCodeChange(i, e.target.value)}
                    onKeyDown={(e) => handleCodeKeyDown(i, e)}
                    onPaste={i === 0 ? handleCodePaste : undefined}
                    maxLength={1}
                    autoComplete="one-time-code"
                    disabled={submitting}
                  />
                ))}
              </div>
            </div>

            {error && <div className="form-error">{error}</div>}

            {submitting && (
              <div style={{ display: 'flex', justifyContent: 'center', padding: '8px 0' }}>
                <span className="btn-loading" />
              </div>
            )}

            <div className="code-actions">
              <button
                type="button"
                className="btn-link"
                onClick={handleResend}
                disabled={resendCooldown > 0 || submitting}
              >
                {resendCooldown > 0 ? `Resend code in ${resendCooldown}s` : 'Resend code'}
              </button>
              <button
                type="button"
                className="btn-link"
                onClick={() => {
                  setStep('email');
                  setCode(['', '', '', '', '', '']);
                  setError('');
                }}
              >
                Use a different email
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
