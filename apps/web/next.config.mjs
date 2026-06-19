import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace TS packages (shipped as raw source).
  transpilePackages: ['@outside-ir35-jobs/db', '@outside-ir35-jobs/storage'],
  // Renamed from experimental.serverComponentsExternalPackages in Next 15.
  serverExternalPackages: ['@react-pdf/renderer'],
  experimental: {
    // Contractor document uploads go through a server action; the default 1 MB
    // body cap is too small for a PDF/scan. Match the 10 MB validation ceiling.
    serverActions: {
      bodySizeLimit: '10mb',
    },
  },
};

// sentry configuration options
const sentryOptions = {
  silent: true,
  org: 'ezeikel',
  project: 'outside-ir35-jobs-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  bundleSizeOptimizations: {
    excludeDebugStatements: true,
  },
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

const configWithPlausible = withPlausibleProxy()(configWithSentry);

export default configWithPlausible;
