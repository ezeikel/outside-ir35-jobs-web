import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace TS packages (shipped as raw source).
  transpilePackages: ['@outside-ir35/db', '@outside-ir35/storage'],
  // Renamed from experimental.serverComponentsExternalPackages in Next 15.
  serverExternalPackages: ['@react-pdf/renderer'],
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
