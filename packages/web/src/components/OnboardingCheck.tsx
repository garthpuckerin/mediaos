import React, { useEffect, useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { apiClient } from '../api/client';

interface OnboardingCheckProps {
  children: React.ReactNode;
}

export function OnboardingCheck({ children }: OnboardingCheckProps) {
  const navigate = useNavigate();
  const location = useLocation();
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    const checkSetup = async () => {
      try {
        const response: { setupCompleted: boolean } = await apiClient.get(
          '/api/onboarding/check-setup'
        );

        // If not completed and not already on onboarding page, redirect
        if (!response.setupCompleted && location.pathname !== '/onboarding') {
          navigate('/onboarding', { replace: true });
        }
      } catch (err) {
        console.error('Failed to check setup status:', err);
        // On error, allow access (fail open)
      } finally {
        setChecking(false);
      }
    };

    void checkSetup();
  }, [navigate, location.pathname]);

  // Show loading while checking
  if (checking) {
    return (
      <div className="min-h-screen bg-gray-950 flex items-center justify-center">
        <div className="text-gray-400">Loading...</div>
      </div>
    );
  }

  return <>{children}</>;
}
