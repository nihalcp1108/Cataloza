import React from 'react';
import { Link } from 'react-router-dom';
import { Layers, Home, ArrowLeft } from 'lucide-react';
import { Button } from '../../components/common/Button';

export const NotFoundPage: React.FC = () => {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-center items-center px-4 py-16 text-center">
      <div className="w-16 h-16 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center mb-6 shadow-sm">
        <Layers className="w-8 h-8" />
      </div>

      <span className="text-xs font-mono font-bold uppercase tracking-widest text-blue-600 mb-2">
        404 — Page Not Found
      </span>

      <h1 className="text-3xl sm:text-4xl font-black text-slate-900 tracking-tight">
        The page you requested does not exist
      </h1>

      <p className="mt-3 text-sm text-slate-500 max-w-md mx-auto leading-relaxed">
        The URL may have been mistyped, the wholesale shop slug could be inactive, or the catalogue page may have moved.
      </p>

      <div className="mt-8 flex flex-col sm:flex-row gap-3">
        <Link to="/">
          <Button variant="primary" icon={<Home className="w-4 h-4" />}>
            Platform Homepage
          </Button>
        </Link>
        <button onClick={() => window.history.back()}>
          <Button variant="outline" icon={<ArrowLeft className="w-4 h-4" />}>
            Go Back
          </Button>
        </button>
      </div>
    </div>
  );
};
