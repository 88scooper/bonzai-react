"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { AnimatePresence, motion } from "framer-motion";
import { X, Sparkles, Check } from "lucide-react";
import Button from "@/components/Button";

export default function PageGuideModal({ 
  isOpen, 
  onClose, 
  pageName, 
  bullets,
  onDontShowAgain 
}) {
  const [mounted, setMounted] = useState(false);
  const [dontShowAgain, setDontShowAgain] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  // Debug logging
  useEffect(() => {
    if (mounted) {
      console.log('[PageGuideModal] Props:', {
        isOpen,
        pageName,
        bulletsCount: bullets?.length,
        mounted
      });
    }
  }, [isOpen, pageName, bullets, mounted]);

  if (!mounted) return null;

  const handleClose = () => {
    if (dontShowAgain && onDontShowAgain) {
      onDontShowAgain();
    }
    onClose();
  };

  return createPortal(
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/20"
            onClick={handleClose}
          />
          
          {/* Modal */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.4 }}
            className="fixed inset-0 z-50 flex items-center justify-center p-4 pointer-events-none"
          >
            <div
              className="bg-white dark:bg-neutral-950 rounded-2xl shadow-[0_20px_50px_rgba(0,0,0,0.1)] max-w-lg w-full mx-4 overflow-hidden flex flex-col border border-black/10 dark:border-white/10 pointer-events-auto"
              onClick={(e) => e.stopPropagation()}
            >
              {/* Header */}
              <div className="flex items-start justify-between p-6 border-b border-black/10 dark:border-white/10">
                <div className="flex items-center gap-3 flex-1">
                  <div className="h-10 w-10 rounded-full bg-[#205A3E]/10 dark:bg-[#205A3E]/20 flex items-center justify-center flex-shrink-0">
                    <Sparkles className="w-5 h-5 text-[#205A3E] dark:text-[#66B894]" />
                  </div>
                  <div className="flex-1">
                    <p className="text-[10px] font-semibold uppercase tracking-widest text-gray-400 mb-1">
                      WELCOME
                    </p>
                    <h2 className="text-xl font-semibold text-gray-900 dark:text-white">
                      {pageName}
                    </h2>
                  </div>
                </div>
                <button
                  onClick={handleClose}
                  className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300 transition-colors flex-shrink-0 ml-4"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              {/* Content */}
              <div className="overflow-y-auto flex-1 p-6">
                <div className="space-y-4">
                  <ul className="space-y-3">
                    {bullets.map((bullet, index) => (
                      <li key={index} className="flex items-start gap-3">
                        <div className="flex-shrink-0 mt-0.5">
                          <Check className="w-4 h-4 text-[#205A3E] dark:text-[#66B894]" />
                        </div>
                        <p className="text-sm text-gray-700 dark:text-gray-300 leading-relaxed">
                          {bullet}
                        </p>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>

              {/* Footer */}
              <div className="p-6 border-t border-black/10 dark:border-white/10 space-y-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={dontShowAgain}
                    onChange={(e) => setDontShowAgain(e.target.checked)}
                    className="w-4 h-4 rounded border-gray-300 dark:border-gray-600 bg-white dark:bg-neutral-900 accent-[#205A3E] focus:ring-0 focus:ring-offset-0 transition-colors cursor-pointer"
                  />
                  <span className="text-sm text-gray-700 dark:text-gray-300">
                    Don't show this guide again for this page
                  </span>
                </label>
                <Button
                  onClick={handleClose}
                  className="w-full rounded-lg bg-[#205A3E] hover:bg-[#1a4932] dark:bg-[#2F7E57] dark:hover:bg-[#205A3E] text-white"
                >
                  Got it
                </Button>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>,
    document.body
  );
}
