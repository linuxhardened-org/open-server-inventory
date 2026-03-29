import { useState } from "react";
import { Check, Copy } from 'lucide-react';
import TotpInput from './TotpInput';

interface QrSetupProps {
  qrCodeUrl: string;
  secret: string;
  onVerify: (token: string) => void;
  isLoading?: boolean;
}

const QrSetup: React.FC<QrSetupProps> = ({ qrCodeUrl, secret, onVerify, isLoading }) => {
  const [token, setToken] = useState('');
  const [copied, setCopied] = useState(false);

  const copyToClipboard = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="space-y-6">
      <div className="text-center">
        <p className="text-secondary mb-4">Scan the QR code below with your authenticator app (e.g. Google Authenticator, Authy)</p>
        <div className="inline-block p-4 bg-white rounded-2xl mb-4">
          <img src={qrCodeUrl} alt="2FA QR Code" className="w-48 h-48" />
        </div>
        
        <div className="flex items-center justify-center gap-2 mb-6">
          <code className="bg-surface px-3 py-1 rounded text-sm border border-border">{secret}</code>
          <button 
            onClick={copyToClipboard}
            className="p-1 hover:text-primary transition-colors"
          >
            {copied ? <Check className="w-4 h-4 text-green-500" /> : <Copy className="w-4 h-4" />}
          </button>
        </div>
      </div>

      <div className="space-y-4">
        <p className="text-center font-medium">Enter the 6-digit code to verify</p>
        <TotpInput 
          value={token} 
          onChange={setToken} 
          onComplete={onVerify} 
        />
        <button
          disabled={token.length !== 6 || isLoading}
          onClick={() => onVerify(token)}
          className="btn-primary w-full py-3"
        >
          {isLoading ? 'Verifying...' : 'Enable 2FA'}
        </button>
      </div>
    </div>
  );
};

export default QrSetup;
