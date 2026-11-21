import { useEffect, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Crown } from 'lucide-react';

export function LoadingScreen() {
  const [visible, setVisible] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setVisible(false), 680);
    return () => clearTimeout(timer);
  }, []);

  return (
    <AnimatePresence>
      {visible && (
        <motion.div
          initial={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.32, ease: 'easeOut' }}
          aria-hidden="true"
          className="fixed inset-0 z-[100] bg-[#050510] flex flex-col items-center justify-center gap-4 pointer-events-none"
        >
          <div className="relative">
            <div className="absolute -inset-6 rounded-full bg-violet-600/30 blur-2xl animate-pulse" />
            <motion.div
              animate={{ rotate: [0, 6, -6, 0], scale: [1, 1.06, 1] }}
              transition={{ duration: 1.4, repeat: Infinity, ease: 'easeInOut' }}
              className="relative w-16 h-16 rounded-2xl bg-gradient-to-br from-violet-600 to-indigo-800 border border-violet-400/60 flex items-center justify-center shadow-[0_0_36px_rgba(147,51,234,0.65)]"
            >
              <Crown className="w-8 h-8 text-amber-300" />
            </motion.div>
          </div>
          <div className="text-center space-y-1">
            <div className="font-display text-lg font-extrabold tracking-[0.26em] text-white">
              VOLEXMC
            </div>
            <div className="text-[11px] font-semibold tracking-[0.2em] text-violet-300/80 uppercase">
              Entering the Citadel
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
