import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router';
import { useDocumentTitle } from '../hooks/useDocumentTitle';

export default function NotFound() {
  useDocumentTitle('Page not found');
  return (
    <section className="relative isolate overflow-hidden">
      <div className="bg-grid absolute inset-0 -z-10" aria-hidden="true" />
      <div className="container-x flex min-h-[70vh] flex-col items-center justify-center py-16 text-center">
        <p className="h-display text-gradient animate-fade-up text-[7rem] leading-none sm:text-[10rem]">404</p>
        <h1 className="h-display mt-4 animate-fade-up text-3xl sm:text-4xl [animation-delay:80ms]">Wrong turn.</h1>
        <p className="muted mt-3 max-w-md animate-fade-up [animation-delay:160ms]">
          This road doesn't go anywhere. Let's take a U-turn and get you back on track.
        </p>
        <Link to="/" className="btn-primary mt-8 animate-fade-up [animation-delay:240ms]">
          Back to home <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
    </section>
  );
}
