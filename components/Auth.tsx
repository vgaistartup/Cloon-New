
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/
import React, { useState } from 'react';
import { supabase } from '../lib/supabaseClient';
import { motion, AnimatePresence } from 'framer-motion';
import Spinner from './Spinner';

const Auth: React.FC = () => {
  const [mode, setMode] = useState<'login' | 'signup'>('login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      if (mode === 'signup') {
        const { error } = await supabase.auth.signUp({
          email,
          password,
        });
        if (error) throw error;
        // Auto login happens on many configs, but sometimes requires email verification
        // For this demo we assume immediate session or message
        alert("Account created! Please check your email for verification if required, or log in.");
        setMode('login');
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });
        if (error) throw error;
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center bg-white p-6">
      <motion.div 
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-sm"
      >
        <div className="flex flex-col items-center mb-8 text-center">
           {/* Logo */}
           <svg viewBox="0 0 1100 290" className="h-8 w-auto text-black fill-current mb-6">
                <path d="M50 144.945C50 122.736 55.1168 102.813 65.3505 85.1762C75.8018 67.5395 89.8458 53.822 107.483 44.0239C125.337 34.008 144.824 29 165.945 29C190.114 29 211.561 34.9878 230.286 46.9633C249.229 58.7211 262.947 75.4869 271.438 97.2605H226.693C220.815 85.285 212.649 76.3578 202.198 70.4789C191.747 64.6 179.662 61.6606 165.945 61.6606C150.921 61.6606 137.53 65.0355 125.772 71.7853C114.015 78.5352 104.761 88.2245 98.011 100.853C91.4789 113.482 88.2128 128.179 88.2128 144.945C88.2128 161.711 91.4789 176.408 98.011 189.037C104.761 201.665 114.015 211.464 125.772 218.431C137.53 225.181 150.921 228.556 165.945 228.556C179.662 228.556 191.747 225.616 202.198 219.738C212.649 213.859 220.815 204.931 226.693 192.956H271.438C262.947 214.73 249.229 231.495 230.286 243.253C211.561 255.011 190.114 260.89 165.945 260.89C144.607 260.89 125.119 255.991 107.483 246.193C89.8458 236.177 75.8018 222.35 65.3505 204.714C55.1168 187.077 50 167.154 50 144.945Z" fill="currentColor"/>
                <path d="M352.253 228.883H429.005V258.93H315.02V31.9395H352.253V228.883Z" fill="currentColor"/>
                <path d="M563.676 261.216C542.556 261.216 523.068 256.317 505.214 246.519C487.577 236.503 473.533 222.677 463.082 205.04C452.848 187.186 447.731 167.154 447.731 144.945C447.731 122.736 452.848 102.813 463.082 85.1762C473.533 67.5395 487.577 53.822 505.214 44.0239C523.068 34.008 542.556 29 563.676 29C585.014 29 604.502 34.008 622.139 44.0239C639.993 53.822 654.037 67.5395 664.271 85.1762C674.504 102.813 679.621 122.736 679.621 144.945C679.621 167.154 674.504 187.186 664.271 205.04C654.037 222.677 639.993 236.503 622.139 246.519C604.502 256.317 585.014 261.216 563.676 261.216ZM563.676 228.883C578.7 228.883 592.091 225.508 603.849 218.758C615.606 211.79 624.751 201.992 631.283 189.363C638.033 176.517 641.408 161.711 641.408 144.945C641.408 128.179 638.033 113.482 631.283 100.853C624.751 88.2245 615.606 78.5352 603.849 71.7853C592.091 65.0355 578.7 61.6606 563.676 61.6606C548.652 61.6606 535.261 65.0355 523.504 71.7853C511.746 78.5352 502.492 88.2245 495.742 100.853C489.21 113.482 485.944 128.179 485.944 144.945C485.944 161.711 489.21 176.517 495.742 189.363C502.492 201.992 511.746 211.79 523.504 218.758C535.261 225.508 548.652 228.883 563.676 228.883Z" fill="currentColor"/>
                <path d="M710.925 261.216C689.805 261.216 670.317 256.317 652.463 246.519C634.826 236.503 620.782 222.677 610.331 205.04C600.097 187.186 594.98 167.154 594.98 144.945C594.98 122.736 600.097 102.813 610.331 85.1762C620.782 67.5395 634.826 53.822 652.463 44.0239C670.317 34.008 689.805 29 710.925 29C732.263 29 751.751 34.008 769.388 44.0239C787.242 53.822 801.286 67.5395 811.52 85.1762C821.753 102.813 826.87 122.736 826.87 144.945C826.87 167.154 821.753 187.186 811.52 205.04C801.286 222.677 787.242 236.503 769.388 246.519C751.751 256.317 732.263 261.216 710.925 261.216ZM710.925 228.883C725.949 228.883 739.34 225.508 751.098 218.758C762.855 211.79 772 201.992 778.532 189.363C785.282 176.517 788.657 161.711 788.657 144.945C788.657 128.179 785.282 113.482 778.532 100.853C772 88.2245 762.855 78.5352 751.098 71.7853C739.34 65.0355 725.949 61.6606 710.925 61.6606C695.901 61.6606 682.511 65.0355 670.753 71.7853C658.995 78.5352 649.741 88.2245 642.991 100.853C636.459 113.482 633.193 128.179 633.193 144.945C633.193 161.711 636.459 176.517 642.991 189.363C649.741 201.992 658.995 211.79 670.753 218.758C682.511 225.508 695.901 228.883 710.925 228.883Z" fill="currentColor"/>
                <path d="M1050 258.93H1012.77L900.741 89.4218V258.93H863.508V31.6127H900.741L1012.77 200.794V31.6127H1050V258.93Z" fill="currentColor"/>
            </svg>
           <h2 className="text-2xl font-bold text-text-primary">
             {mode === 'login' ? 'Welcome Back' : 'Create Account'}
           </h2>
           <p className="text-text-secondary mt-2">
             {mode === 'login' ? 'Sign in to access your wardrobe' : 'Join Cloon to start styling'}
           </p>
        </div>

        <form onSubmit={handleAuth} className="space-y-4">
          <div>
            <input
              type="email"
              placeholder="Email address"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              className="w-full p-4 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-black focus:shadow-soft outline-none transition-all"
            />
          </div>
          <div>
            <input
              type="password"
              placeholder="Password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              className="w-full p-4 bg-surface-subtle border-transparent rounded-btn focus:bg-white focus:border-black focus:shadow-soft outline-none transition-all"
            />
          </div>

          {error && (
            <div className="p-3 bg-red-50 text-red-600 text-sm rounded-lg">
              {error}
            </div>
          )}

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-4 bg-black text-white font-bold rounded-btn hover:scale-[1.02] active:scale-[0.98] transition-all shadow-elevated disabled:opacity-70 flex items-center justify-center"
          >
            {isLoading ? <Spinner /> : (mode === 'login' ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div className="mt-6 text-center">
          <button
            onClick={() => {
              setMode(mode === 'login' ? 'signup' : 'login');
              setError(null);
            }}
            className="text-sm font-medium text-text-secondary hover:text-black transition-colors"
          >
            {mode === 'login' ? "Don't have an account? Sign Up" : "Already have an account? Sign In"}
          </button>
        </div>
      </motion.div>
    </div>
  );
};

export default Auth;
