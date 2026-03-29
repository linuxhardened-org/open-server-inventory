import { useState } from "react";
import { motion, AnimatePresence } from 'framer-motion';
import { X, Server, Shield, Key, ChevronRight, ChevronLeft, Check } from 'lucide-react';

interface AddServerModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const steps = [
  { id: 1, title: 'Basic Info', icon: Server },
  { id: 2, title: 'Authentication', icon: Key },
  { id: 3, title: 'Security', icon: Shield },
];

export const AddServerModal = ({ isOpen, onClose }: AddServerModalProps) => {
  const [currentStep, setCurrentStep] = useState(1);

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="fixed inset-0 bg-black/80 backdrop-blur-md"
      />
      <motion.div
        initial={{ scale: 0.95, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        exit={{ scale: 0.95, opacity: 0 }}
        className="bg-surface border border-border w-full max-w-2xl rounded-2xl shadow-2xl relative z-[70] overflow-hidden"
      >
        <div className="flex border-b border-border">
          {steps.map((step) => (
            <div 
              key={step.id}
              className={`flex-1 flex items-center justify-center gap-3 py-4 border-b-2 transition-colors ${
                currentStep === step.id ? 'border-primary bg-primary/5' : 'border-transparent text-secondary'
              }`}
            >
              <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold ${
                currentStep >= step.id ? 'bg-primary text-white' : 'bg-white/5 text-secondary border border-border'
              }`}>
                {currentStep > step.id ? <Check className="w-4 h-4" /> : step.id}
              </div>
              <span className={`text-sm font-medium ${currentStep === step.id ? 'text-white' : 'text-secondary'}`}>
                {step.title}
              </span>
            </div>
          ))}
          <button 
            onClick={onClose}
            className="px-6 border-l border-border hover:bg-white/5 text-secondary hover:text-white transition-colors"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="p-8 min-h-[400px]">
          <AnimatePresence mode="wait">
            {currentStep === 1 && (
              <motion.div
                key="step1"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-1">Server Details</h3>
                  <p className="text-secondary text-sm">Provide the primary connection information for the node.</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">Hostname</label>
                    <input type="text" className="input" placeholder="srv-prod-01" />
                  </div>
                  <div className="space-y-2">
                    <label className="text-sm font-medium text-secondary">IP Address</label>
                    <input type="text" className="input" placeholder="10.0.0.1" />
                  </div>
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-secondary">Operating System</label>
                  <select className="input appearance-none bg-surface-lighter">
                    <option>Ubuntu 22.04 LTS</option>
                    <option>Debian 11</option>
                    <option>CentOS Stream 9</option>
                    <option>FreeBSD 13</option>
                  </select>
                </div>
              </motion.div>
            )}

            {currentStep === 2 && (
              <motion.div
                key="step2"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-1">SSH Authentication</h3>
                  <p className="text-secondary text-sm">Select the method used to access this server.</p>
                </div>
                <div className="space-y-4">
                  <div className="p-4 rounded-xl border border-primary bg-primary/5 flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4">
                      <Key className="w-6 h-6 text-primary" />
                      <div>
                        <p className="font-bold">SSH Key Pair</p>
                        <p className="text-xs text-secondary">Recommended for maximum security</p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-primary flex items-center justify-center">
                      <div className="w-2.5 h-2.5 rounded-full bg-primary" />
                    </div>
                  </div>
                  <div className="p-4 rounded-xl border border-border hover:border-white/20 transition-colors flex items-center justify-between cursor-pointer">
                    <div className="flex items-center gap-4">
                      <Shield className="w-6 h-6 text-secondary" />
                      <div>
                        <p className="font-bold">Password Auth</p>
                        <p className="text-xs text-secondary">Basic authentication method</p>
                      </div>
                    </div>
                    <div className="w-5 h-5 rounded-full border-2 border-border" />
                  </div>
                </div>
              </motion.div>
            )}

            {currentStep === 3 && (
              <motion.div
                key="step3"
                initial={{ x: 20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: -20, opacity: 0 }}
                className="space-y-6"
              >
                <div>
                  <h3 className="text-xl font-bold mb-1">Security Hardening</h3>
                  <p className="text-secondary text-sm">Choose initial security scripts to run on deployment.</p>
                </div>
                <div className="space-y-3">
                  {[
                    'Disable Root SSH Login',
                    'Setup Uncomplicated Firewall (UFW)',
                    'Install Fail2Ban',
                    'Automatic Security Updates'
                  ].map(policy => (
                    <label key={policy} className="flex items-center gap-3 p-3 bg-white/5 border border-border rounded-lg cursor-pointer hover:bg-white/10 transition-colors">
                      <input type="checkbox" className="w-4 h-4 rounded border-border text-primary bg-surface-lighter focus:ring-primary" defaultChecked />
                      <span className="text-sm">{policy}</span>
                    </label>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        <div className="p-6 border-t border-border bg-white/[0.01] flex items-center justify-between">
          <button 
            disabled={currentStep === 1}
            onClick={() => setCurrentStep(prev => prev - 1)}
            className="btn-ghost gap-2 disabled:opacity-0"
          >
            <ChevronLeft className="w-4 h-4" /> Previous
          </button>
          <div className="flex gap-3">
             {currentStep < 3 ? (
               <button 
                onClick={() => setCurrentStep(prev => prev + 1)}
                className="btn-primary gap-2"
              >
                Continue <ChevronRight className="w-4 h-4" />
              </button>
             ) : (
               <button 
                onClick={onClose}
                className="btn-primary gap-2"
              >
                Deploy Server <Check className="w-4 h-4" />
              </button>
             )}
          </div>
        </div>
      </motion.div>
    </div>
  );
};
