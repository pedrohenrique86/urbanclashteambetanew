import React, { useState, useEffect, RefObject } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUp } from "lucide-react";

interface ScrollToTopButtonProps {
  scrollableRef?: RefObject<HTMLDivElement>;
}

export default function ScrollToTopButton({ scrollableRef }: ScrollToTopButtonProps) {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const targetElement = scrollableRef?.current || window;
    const scrollableElement = scrollableRef?.current;

    const toggleVisibility = () => {
      const yOffset = scrollableElement ? scrollableElement.scrollTop : window.pageYOffset;
      if (yOffset > 300) {
        setIsVisible(true);
      } else {
        setIsVisible(false);
      }
    };

    targetElement.addEventListener("scroll", toggleVisibility);

    return () => {
      targetElement.removeEventListener("scroll", toggleVisibility);
    };
  }, [scrollableRef]);

  const scrollToTop = () => {
    const target = scrollableRef?.current || window;
    target.scrollTo({
      top: 0,
      behavior: "smooth",
    });
  };

  return (
    <AnimatePresence>
      {isVisible && (
        <motion.button
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.5 }}
          onClick={scrollToTop}
          className="fixed bottom-8 right-8 bg-purple-600 hover:bg-purple-700 text-white rounded-full p-3 shadow-lg z-50 transition-all duration-300 ease-in-out transform hover:scale-110 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-gray-900 focus:ring-purple-500"
          aria-label="Voltar ao topo"
        >
          <ArrowUp className="h-6 w-6" />
        </motion.button>
      )}
    </AnimatePresence>
  );
}