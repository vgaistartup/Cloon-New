
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React from 'react';
import { motion } from 'framer-motion';
import { XIcon, ArrowRightIcon } from './icons';

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

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 20 }}
      className="fixed inset-0 z-[60] bg-white flex flex-col"
    >
      <div className="p-6 flex justify-end">
        <button onClick={onClose} className="p-2 bg-gray-100 rounded-full">
          <XIcon className="w-6 h-6 text-gray-800" />
        </button>
      </div>
      
      <div className="px-8 pt-4 pb-12 flex-grow flex flex-col">
        <h1 className="text-3xl font-serif text-gray-900 mb-8">Settings</h1>
        
        <div className="space-y-6">
          {links.map((link) => (
            <a key={link.label} href={link.href} className="flex items-center justify-between text-lg font-medium text-gray-800 py-2 border-b border-gray-100">
              {link.label}
              <ArrowRightIcon className="w-5 h-5 text-gray-400 -rotate-45" />
            </a>
          ))}
          
          <button 
            onClick={onOpenDashboard}
            className="w-full flex items-center justify-between text-lg font-medium text-gray-800 py-2 border-b border-gray-100 text-left"
          >
            Dashboard
            <ArrowRightIcon className="w-5 h-5 text-gray-400 -rotate-45" />
          </button>
        </div>

        <div className="mt-auto">
            <button className="text-lg font-medium text-gray-400 py-2 w-full text-left">
                Log Out
            </button>
        </div>
      </div>
    </motion.div>
  );
};

export default Settings;
