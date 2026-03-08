'use client';

import { Shield, TrendingUp, Globe } from 'lucide-react';

export default function AuthLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const features = [
    {
      icon: Shield,
      text: 'Bank-level security for your financial data',
    },
    {
      icon: TrendingUp,
      text: 'Real-time insights and reporting',
    },
    {
      icon: Globe,
      text: 'Built for Estonian businesses',
    },
  ];

  return (
    <div className="min-h-screen flex">
      {/* Left Panel - Branding (Desktop only) */}
      <div className="hidden md:flex md:w-1/2 lg:w-[55%] bg-[var(--sidebar-bg)] relative overflow-hidden">
        {/* Subtle geometric pattern overlay */}
        <div className="absolute inset-0 opacity-5">
          <div className="absolute inset-0" style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fill-rule='evenodd'%3E%3Cg fill='%23ffffff' fill-opacity='1'%3E%3Cpath d='M36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }} />
        </div>

        {/* Content */}
        <div className="relative z-10 flex flex-col justify-between p-8 lg:p-12 xl:p-16 w-full">
          {/* Top */}
          <div>
            <h1
              className="text-3xl lg:text-4xl font-bold text-white mb-4"
              style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
            >
              Arvelo
            </h1>
            <p className="text-lg text-slate-300 max-w-md">
              Modern bookkeeping for Estonian businesses
            </p>
          </div>

          {/* Middle - Features */}
          <div className="space-y-6 max-w-md">
            {features.map((feature, index) => {
              const Icon = feature.icon;
              return (
                <div key={index} className="flex items-start gap-4">
                  <div className="flex-shrink-0 w-10 h-10 rounded-lg bg-blue-500/10 flex items-center justify-center">
                    <Icon className="h-5 w-5 text-blue-400" strokeWidth={1.5} />
                  </div>
                  <p className="text-sm text-slate-400 pt-2">{feature.text}</p>
                </div>
              );
            })}
          </div>

          {/* Bottom */}
          <div>
            <p className="text-xs text-slate-500">
              Trusted by 500+ Estonian companies
            </p>
          </div>
        </div>
      </div>

      {/* Right Panel - Form Area */}
      <div className="flex-1 flex items-center justify-center bg-[var(--surface-elevated)] p-4 sm:p-6 lg:p-8">
        {/* Mobile Logo (visible only on mobile) */}
        <div className="md:hidden absolute top-8 left-0 right-0 text-center">
          <h1
            className="text-xl font-bold text-slate-900 mb-1"
            style={{ fontFamily: "'Plus Jakarta Sans', sans-serif" }}
          >
            Arvelo
          </h1>
          <p className="text-xs text-slate-500">
            Modern bookkeeping for Estonian businesses
          </p>
        </div>

        {/* Form Container */}
        <div className="w-full max-w-[420px] mt-16 md:mt-0 animate-fade-in">
          {children}
        </div>
      </div>

      <style jsx>{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }

        .animate-fade-in {
          animation: fadeIn 300ms ease-out;
        }
      `}</style>
    </div>
  );
}
