import React, { useEffect, useRef } from 'react';

interface MathRendererProps {
  content: string;
  className?: string;
}

const MathRenderer: React.FC<MathRendererProps> = ({ content, className }) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current && (window as any).MathJax) {
      // Clear previous content handled by MathJax to avoid duplication issues
      containerRef.current.innerHTML = content;
      
      // Request MathJax to typeset the container
      (window as any).MathJax.typesetPromise([containerRef.current]).catch((err: any) => {
        console.warn('MathJax typeset failed: ', err);
      });
    }
  }, [content]);

  return (
    <div 
      ref={containerRef} 
      className={className}
    >
        {/* Initial render for server-side or before hydration */}
        {content}
    </div>
  );
};

export default MathRenderer;