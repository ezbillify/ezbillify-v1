// src/components/shared/navigation/BackButton.js
import { useRouter } from 'next/router';

export const BackButton = ({ href, label = 'Back', onClick }) => {
  const router = useRouter();
  
  const handleClick = () => {
    if (onClick) {
      onClick();
    } else if (href) {
      router.push(href);
    } else {
      router.back();
    }
  };
  
  return (
    <button
      onClick={handleClick}
      className="inline-flex items-center space-x-2 text-sm text-slate-600 hover:text-slate-900 transition-colors"
    >
      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
      </svg>
      <span>{label}</span>
    </button>
  );
};

export default BackButton;