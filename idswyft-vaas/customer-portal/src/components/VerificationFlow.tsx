// NEW VERIFICATION FLOW - CLEAN REBUILD
// Following algorithm: verification start → upload frontend → processing → upload back of id → processing → cross validation → if match → live capture → processing → verification result

import React from 'react';
import { VerificationSession } from '../types';
import { NewVerificationSystem } from './verification/NewVerificationSystem';

interface VerificationFlowProps {
  sessionToken: string;
}

const VerificationFlow: React.FC<VerificationFlowProps> = ({ sessionToken }) => {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="container mx-auto px-4 py-8">
        <NewVerificationSystem sessionToken={sessionToken} />
      </div>
    </div>
  );
};

export default VerificationFlow;