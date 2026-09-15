import { useEffect, useRef } from 'react';
import { landingMarkup } from './landingMarkup';
import './landing.css';

const FONT_LINKS = [
  { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
  { rel: 'preconnect', href: 'https://fonts.gstatic.com', crossOrigin: 'anonymous' },
  {
    rel: 'stylesheet',
    href: 'https://fonts.googleapis.com/css2?family=M+PLUS+Rounded+1c:wght@500;700;800;900&family=Zen+Kaku+Gothic+New:wght@400;500;700;900&display=swap',
  },
];

export default function LandingPage({ onNavigateToAuth }: { onNavigateToAuth: (view: 'login' | 'signup') => void }) {
  const rootRef = useRef<HTMLDivElement>(null);

  // The landing page uses its own display fonts (M PLUS Rounded 1c / Zen Kaku
  // Gothic New) instead of the app's Noto Sans JP — loaded lazily here so
  // the rest of the app never pays for fonts it doesn't use.
  useEffect(() => {
    const added: HTMLLinkElement[] = [];
    for (const attrs of FONT_LINKS) {
      if (document.querySelector(`link[href="${attrs.href}"]`)) continue;
      const link = document.createElement('link');
      Object.assign(link, attrs);
      document.head.appendChild(link);
      added.push(link);
    }
    return () => added.forEach((l) => l.remove());
  }, []);

  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const onClick = (e: MouseEvent) => {
      const target = (e.target as HTMLElement).closest('[data-action]') as HTMLElement | null;
      if (!target) return;
      const action = target.getAttribute('data-action');
      if (action === 'signup' || action === 'login') {
        e.preventDefault();
        onNavigateToAuth(action);
      }
    };
    root.addEventListener('click', onClick);
    return () => root.removeEventListener('click', onClick);
  }, [onNavigateToAuth]);

  return <div className="paile-landing" ref={rootRef} dangerouslySetInnerHTML={{ __html: landingMarkup }} />;
}
