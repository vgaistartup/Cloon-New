
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { SendIcon, XIcon } from './icons';
import { createStylistChat } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';

interface Message {
  role: 'user' | 'model';
  text: string;
}

interface ChatBotProps {
  isOpen: boolean;
  onClose: () => void;
}

const ChatBot: React.FC<ChatBotProps> = ({ isOpen, onClose }) => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'model', text: "Hi! I'm your personal stylist. How can I help you look your best today?" }
  ]);
  const [inputValue, setInputValue] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const chatSessionRef = useRef<Chat | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!chatSessionRef.current) {
      chatSessionRef.current = createStylistChat();
    }
  }, []);

  useEffect(() => {
    if (isOpen) {
       setTimeout(scrollToBottom, 100);
    }
  }, [messages, isOpen]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSend = async () => {
    if (!inputValue.trim() || isLoading || !chatSessionRef.current) return;

    const userMessage = inputValue.trim();
    setInputValue('');
    setMessages(prev => [...prev, { role: 'user', text: userMessage }]);
    setIsLoading(true);

    try {
      setMessages(prev => [...prev, { role: 'model', text: '' }]);
      
      const resultStream = await chatSessionRef.current.sendMessageStream({
        message: userMessage
      });

      let fullText = '';
      for await (const chunk of resultStream) {
        const c = chunk as GenerateContentResponse;
        const text = c.text || '';
        fullText += text;
        
        setMessages(prev => {
          const newMessages = [...prev];
          const lastMessage = newMessages[newMessages.length - 1];
          if (lastMessage.role === 'model') {
             lastMessage.text = fullText;
          }
          return newMessages;
        });
      }

    } catch (error) {
      console.error("Chat error:", error);
      setMessages(prev => [...prev, { role: 'model', text: "I'm having a little trouble connecting. Try again in a moment!" }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  return (
      <AnimatePresence>
        {isOpen && (
            <>
             <motion.div 
                 initial={{ opacity: 0 }}
                 animate={{ opacity: 1 }}
                 exit={{ opacity: 0 }}
                 onClick={onClose}
                 className="fixed inset-0 z-40 bg-white/20 backdrop-blur-sm"
             />
             
              <motion.div
                initial={{ opacity: 0, y: "100%", scale: 1 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: "100%", scale: 1 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed z-50 flex flex-col bg-white shadow-float border-t border-border overflow-hidden
                           bottom-0 left-0 right-0 w-full h-[85vh] rounded-t-sheet
                           md:bottom-24 md:right-6 md:left-auto md:w-[380px] md:h-[600px] md:rounded-[32px] md:border border-border"
              >
                {/* Header */}
                <div className="bg-white p-5 border-b border-border flex items-center justify-between z-10 shrink-0">
                  <div className="flex items-center justify-center w-full relative">
                     <div className="flex flex-col items-center">
                        <span className="text-[10px] font-bold text-text-secondary uppercase tracking-wider">Assistant</span>
                        <h3 className="text-lg font-bold text-text-primary">Cloon Stylist</h3>
                     </div>
                     <button 
                        onClick={onClose}
                        className="absolute right-0 p-2 hover:bg-surface-subtle rounded-full transition-all"
                     >
                        <XIcon className="w-5 h-5 text-text-primary" />
                     </button>
                  </div>
                </div>

                {/* Messages Area */}
                <div className="flex-grow overflow-y-auto p-5 space-y-5 bg-white scrollbar-hide">
                  <div className="text-center text-[10px] text-text-secondary font-bold uppercase tracking-widest opacity-50">Today</div>
                  {messages.map((msg, index) => (
                    <div
                      key={index}
                      className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                    >
                      <div
                        className={`max-w-[85%] px-5 py-3.5 text-[15px] leading-relaxed shadow-sm ${
                          msg.role === 'user'
                            ? 'bg-black text-white rounded-[20px] rounded-br-sm'
                            : 'bg-white text-text-primary border border-border rounded-[20px] rounded-bl-sm shadow-soft'
                        }`}
                      >
                        <p className="whitespace-pre-wrap">{msg.text}</p>
                      </div>
                    </div>
                  ))}
                  {isLoading && messages[messages.length - 1]?.text === '' && (
                     <div className="flex justify-start">
                        <div className="bg-white border border-border px-4 py-3 rounded-[20px] rounded-bl-sm shadow-soft">
                            <div className="flex space-x-1">
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                                <div className="w-1.5 h-1.5 bg-gray-300 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                            </div>
                        </div>
                     </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>

                {/* Input Area - Adjusted for safe area */}
                <div className="px-4 pt-4 pb-[calc(1rem+env(safe-area-inset-bottom))] bg-white border-t border-border shrink-0">
                  <div className="flex items-center gap-2 relative">
                    <input
                      type="text"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      onKeyDown={handleKeyDown}
                      placeholder="Ask for style advice..."
                      disabled={isLoading}
                      className="w-full pl-5 pr-12 py-3.5 bg-surface-subtle border border-transparent focus:bg-white focus:border-border focus:shadow-sm rounded-pill text-[15px] text-text-primary focus:outline-none transition-all placeholder-text-secondary"
                      autoFocus
                    />
                    <button
                      onClick={handleSend}
                      disabled={!inputValue.trim() || isLoading}
                      className={`absolute right-1.5 p-2.5 rounded-full transition-all ${inputValue.trim() ? 'bg-black text-white scale-100 shadow-md' : 'bg-gray-200 text-white scale-90'}`}
                      aria-label="Send message"
                    >
                      <SendIcon className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              </motion.div>
            </>
        )}
      </AnimatePresence>
  );
};

export default ChatBot;