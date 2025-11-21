
/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
*/

import React, { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageCircleIcon, SendIcon, XIcon } from './icons';
import { createStylistChat } from '../services/geminiService';
import { Chat, GenerateContentResponse } from '@google/genai';
import Spinner from './Spinner';

interface Message {
  role: 'user' | 'model';
  text: string;
}

const ChatBot: React.FC = () => {
  const [isOpen, setIsOpen] = useState(false);
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
    scrollToBottom();
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
      // Create a placeholder for the model's response
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
    <>
      {/* Chat Toggle Button */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`fixed bottom-24 right-5 z-50 p-4 rounded-full shadow-[0_8px_30px_rgba(0,0,0,0.15)] transition-all duration-300 hover:scale-105 active:scale-95 ${
          isOpen ? 'bg-gray-200 text-gray-900 rotate-90' : 'bg-black text-white rotate-0'
        }`}
        aria-label={isOpen ? "Close chat" : "Open chat"}
      >
        {isOpen ? <XIcon className="w-6 h-6" /> : <MessageCircleIcon className="w-6 h-6" />}
      </button>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 40, scale: 0.9 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 40, scale: 0.9 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-40 right-5 z-50 w-[350px] sm:w-[380px] h-[550px] max-h-[65vh] bg-white/90 backdrop-blur-2xl rounded-[32px] shadow-[0_20px_60px_rgba(0,0,0,0.2)] border border-white/20 flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="bg-white/50 backdrop-blur-md p-4 border-b border-gray-100 flex items-center justify-between absolute top-0 left-0 right-0 z-10">
              <div className="flex flex-col items-center w-full">
                 <span className="text-xs font-medium text-gray-400 mb-0.5">Assistant</span>
                 <h3 className="text-sm font-bold text-gray-900">Cloon Stylist</h3>
              </div>
            </div>

            {/* Messages Area */}
            <div className="flex-grow overflow-y-auto p-5 pt-20 space-y-4 bg-transparent scrollbar-hide">
              <div className="text-center text-[10px] text-gray-400 font-medium mb-4 uppercase tracking-widest">Today</div>
              {messages.map((msg, index) => (
                <div
                  key={index}
                  className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                >
                  <div
                    className={`max-w-[80%] px-4 py-2.5 text-[15px] leading-relaxed shadow-sm ${
                      msg.role === 'user'
                        ? 'bg-[#007AFF] text-white rounded-[20px] rounded-br-sm'
                        : 'bg-[#E9E9EB] text-black rounded-[20px] rounded-bl-sm'
                    }`}
                  >
                    <p className="whitespace-pre-wrap">{msg.text}</p>
                  </div>
                </div>
              ))}
              {isLoading && messages[messages.length - 1]?.text === '' && (
                 <div className="flex justify-start">
                    <div className="bg-[#E9E9EB] px-4 py-3 rounded-[20px] rounded-bl-sm">
                        <div className="flex space-x-1">
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                            <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.4s' }}></div>
                        </div>
                    </div>
                 </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Input Area */}
            <div className="p-3 bg-white/80 backdrop-blur-lg border-t border-gray-100">
              <div className="flex items-center gap-2 relative">
                <input
                  type="text"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  onKeyDown={handleKeyDown}
                  placeholder="iMessage"
                  disabled={isLoading}
                  className="w-full pl-4 pr-10 py-2.5 bg-gray-100 border border-transparent focus:bg-white focus:border-gray-300 rounded-full text-[15px] text-gray-900 focus:outline-none transition-all placeholder-gray-400"
                />
                <button
                  onClick={handleSend}
                  disabled={!inputValue.trim() || isLoading}
                  className={`absolute right-1.5 p-1.5 rounded-full transition-colors ${inputValue.trim() ? 'bg-[#007AFF] text-white' : 'bg-gray-300 text-white'}`}
                  aria-label="Send message"
                >
                  <SendIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatBot;
