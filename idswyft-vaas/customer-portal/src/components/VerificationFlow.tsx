// VERIFICATION FLOW - Using ModernVerificationSystem with glass morphism design
// Following algorithm: verification start → upload frontend → processing → upload back of id → processing → cross validation → if match → live capture → processing → verification result

import React from 'react';
import { VerificationSession } from '../types';
import { ModernVerificationSystem } from './verification/ModernVerificationSystem';

interface VerificationFlowProps {
  sessionToken: string;
}

const VerificationFlow: React.FC<VerificationFlowProps> = ({ sessionToken }) => {
  return (
    <ModernVerificationSystem sessionToken={sessionToken} />
  );
};

export default VerificationFlow;