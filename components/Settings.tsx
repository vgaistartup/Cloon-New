
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { XIcon, ArrowRightIcon } from './icons';
import { supabase } from '../lib/supabaseClient';

interface SettingsProps {
  onClose: () => void;
  onOpenDashboard: () => void;
}

const Settings: React.FC<SettingsProps> = ({ onClose, onOpenDashboard }) => {
  const links = [
    { label: 'Review Cloon', href: '#' },
    { label: 'Contact Us', href: '#' },
    { label: 'Privacy Policy', href: '#' },
    { label: 'Terms & Conditions', href: '#' },
  ];

  const handleLogout = async () => {
    await supabase.auth.signOut();
    onClose();
    // App.tsx listener will handle redirect to auth screen
  };

  return (
    <div className="h-full w-full bg-white flex flex-col">
      <div className="p-6 flex justify-end shrink-0">
        <button onClick={onClose} className="p-2 bg-surface-subtle rounded-full hover:bg-gray-200 transition-colors">
          <XIcon className="w-6 h-6 text-text-primary" />
        </button>
      </div>
      
      <div className="px-8 pt-4 pb-12 flex-grow flex flex-col overflow-y-auto">
        <h1 className="text-3xl font-bold text-text-primary mb-10">Settings</h1>
        
        <div className="space-y-2">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="flex items-center justify-between text-lg font-medium text-text-primary py-4 border-b border-border hover:pl-2 transition-all">
              {link.label}
              <ArrowRightIcon className="w-5 h-5 text-text-secondary -rotate-45" />
            </a>
          ))}
          
          <button 
            onClick={onOpenDashboard}
            className="w-full flex items-center justify-between text-lg font-medium text-text-primary py-4 border-b border-border hover:pl-2 transition-all text-left"
          >
            Dashboard
            <ArrowRightIcon className="w-5 h-5 text-text-secondary -rotate-45" />
          </button>
        </div>

        <div className="mt-auto pt-8">
            <button 
                onClick={handleLogout}
                className="text-lg font-medium text-red-500 py-4 w-full text-left hover:text-red-600 transition-colors"
            >
                Log Out
            </button>
        </div>
      </div>
    </div>
  );
};

export default Settings;
