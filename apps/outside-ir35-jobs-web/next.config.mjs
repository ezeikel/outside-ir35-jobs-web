import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';

/** @type {import('next').NextConfig} */
const nextConfig = {
  // Transpile the workspace TS packages (shipped as raw source).
  transpilePackages: ['@outside-ir35/db', '@outside-ir35/storage'],
  // Renamed from experimental.serverComponentsExternalPackages in Next 15.
  serverExternalPackages: ['@react-pdf/renderer'],
};

// Only upload source maps to Sentry when an auth token is present (i.e. in
// CI / production). Locally there's no token, so skip the release/upload step
// entirely — otherwise the Sentry CLI fails the build with "project not found".
const sentryUploadEnabled = Boolean(process.env.SENTRY_AUTH_TOKEN);

// sentry configuration options
const sentryOptions = {
  silent: true,
  org: 'ezeikel',
  project: 'outside-ir35-jobs-web',
  authToken: process.env.SENTRY_AUTH_TOKEN,
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
  dryRun: !sentryUploadEnabled,
  disableServerWebpackPlugin: !sentryUploadEnabled,
  disableClientWebpackPlugin: !sentryUploadEnabled,
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

const configWithPlausible = withPlausibleProxy()(configWithSentry);

export default configWithPlausible;
