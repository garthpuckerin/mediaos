import React from 'react';
import { Button } from '../../components/ui/Button';
import { CardContent, CardHeader, CardTitle } from '../../components/ui/Card';

export function WelcomeStep({ onNext }: { onNext: () => void }) {
  return (
    <>
      <CardHeader className="text-center pb-2">
        <div className="w-16 h-16 bg-indigo-500/20 text-indigo-500 rounded-2xl flex items-center justify-center mx-auto mb-4">
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
              d="M13 10V3L4 14h7v7l9-11h-7z"
            />
          </svg>
        </div>
        <CardTitle className="text-3xl">Welcome to MediaOS</CardTitle>
      </CardHeader>
      <CardContent className="space-y-6 text-center">
        <p className="text-gray-400 text-lg">
          The ultimate unified media management platform. Let's get your library
          set up in just a few steps.
        </p>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-left mt-8">
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-800">
            <div className="font-semibold text-white mb-1">Organize</div>
            <div className="text-sm text-gray-500">
              Auto-sort movies and series
            </div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-800">
            <div className="font-semibold text-white mb-1">Track</div>
            <div className="text-sm text-gray-500">
              Monitor downloads & quality
            </div>
          </div>
          <div className="p-4 rounded-lg bg-gray-800/50 border border-gray-800">
            <div className="font-semibold text-white mb-1">Discover</div>
            <div className="text-sm text-gray-500">Find new content easily</div>
          </div>
        </div>

        <div className="pt-6">
          <Button
            size="lg"
            onClick={onNext}
            className="w-full sm:w-auto min-w-[200px]"
          >
            Get Started
          </Button>
        </div>
      </CardContent>
    </>
  );
}
