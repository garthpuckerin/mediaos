import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '../../components/ui/Button';
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '../../components/ui/Card';
import { clsx } from 'clsx';

// Steps
import { WelcomeStep } from './WelcomeStep';
import { FolderSelectionStep } from './FolderSelectionStep';
import { ScanProgressStep } from './ScanProgressStep';

type Step = 'welcome' | 'folders' | 'scan' | 'complete';

export function OnboardingPage() {
  const navigate = useNavigate();
  const [step, setStep] = useState<Step>('welcome');
  const [folders, setFolders] = useState<
    { path: string; type: 'movies' | 'series' }[]
  >([]);

  const handleNext = () => {
    if (step === 'welcome') setStep('folders');
    else if (step === 'folders') setStep('scan');
    else if (step === 'scan') setStep('complete');
    else if (step === 'complete') navigate('/');
  };

  const handleBack = () => {
    if (step === 'folders') setStep('welcome');
    else if (step === 'scan') setStep('folders');
  };

  return (
    <div className="min-h-screen bg-gray-950 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl space-y-8">
        {/* Progress Steps */}
        <div className="flex justify-center gap-4 mb-8">
          {['welcome', 'folders', 'scan', 'complete'].map((s, i) => (
            <div key={s} className="flex items-center gap-2">
              <div
                className={clsx(
                  'w-3 h-3 rounded-full transition-colors',
                  s === step ||
                    i < ['welcome', 'folders', 'scan', 'complete'].indexOf(step)
                    ? 'bg-indigo-500'
                    : 'bg-gray-800'
                )}
              />
            </div>
          ))}
        </div>

        <Card className="border-gray-800 bg-gray-900/50 backdrop-blur">
          {step === 'welcome' && <WelcomeStep onNext={handleNext} />}
          {step === 'folders' && (
            <FolderSelectionStep
              folders={folders}
              setFolders={setFolders}
              onNext={handleNext}
              onBack={handleBack}
            />
          )}
          {step === 'scan' && (
            <ScanProgressStep
              folders={folders}
              onComplete={() => setStep('complete')}
            />
          )}
          {step === 'complete' && (
            <div className="p-6 text-center space-y-6">
              <div className="w-16 h-16 bg-green-500/20 text-green-500 rounded-full flex items-center justify-center mx-auto">
                <svg
                  className="w-8 h-8"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth={2}
                    d="M5 13l4 4L19 7"
                  />
                </svg>
              </div>
              <div className="space-y-2">
                <h2 className="text-2xl font-bold text-white">All Set!</h2>
                <p className="text-gray-400">
                  Your library has been scanned and organized.
                </p>
              </div>
              <Button
                onClick={() => navigate('/')}
                className="w-full sm:w-auto"
              >
                Go to Dashboard
              </Button>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
