import React from 'react';
import { LayoutGridIcon, FileTextIcon } from 'lucide-react';
import { AiSettings } from '@/routes/settings';

const OnboardingModal: React.FunctionComponent = () => {
  return (
    <div className="flex flex-col gap-6">
      <h2 className="text-3xl font-medium">Welcome to Srcbook!</h2>
      <p>Srcbook is an AI-powered TypeScript app builder and interactive playground.</p>

      <div className="flex flex-col gap-3">
        <h4 className="font-medium">With Srcbook you can:</h4>
        <div className="flex flex-col md:flex-row gap-6">
          <div
            className="p-5 rounded-lg bg-[#FFD9E1]"
            style={{
              background:
                'linear-gradient(270deg, rgba(255,217,225,1) 0%, rgba(219,183,223,1) 100%)',
            }}
          >
            <div className="flex items-center mb-6">
              <LayoutGridIcon size={24} className="text-ai-btn" />
            </div>
            <h3 className="text-ai-btn font-medium mt-3">App builder</h3>
            <p className="text-ai-btn mt-2">Create Web Applications with the speed of thinking</p>
          </div>

          <div className="border p-5 rounded-lg">
            <div className="flex items-center mb-6">
              <FileTextIcon size={24} className="text-button-secondary" />
            </div>
            <h3 className="text-primary font-medium mt-3">Notebook</h3>
            <p className="text-primary mt-2">
              Experimenting without the hassle of setting up environments
            </p>
          </div>
        </div>
      </div>

      <div>
        <label htmlFor="aiProvider" className="block mb-3">
          To get started, select your AI provider and enter your API key:
        </label>

        <AiSettings saveButtonLabel="Continue" />
      </div>
    </div>
  );
};

export default OnboardingModal;
