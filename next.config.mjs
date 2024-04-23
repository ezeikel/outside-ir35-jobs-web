import { withSentryConfig } from '@sentry/nextjs';
import { withPlausibleProxy } from 'next-plausible';

/** @type {import('next').NextConfig} */
const nextConfig = {};

// Sentry configuration options
const sentryOptions = {
  silent: true,
  org: 'ezeikel',
  project: 'outside-ir35-jobs-web',
  widenClientFileUpload: true,
  transpileClientSDK: true,
  tunnelRoute: '/monitoring',
  hideSourceMaps: true,
  disableLogger: true,
  automaticVercelMonitors: true,
};

const configWithSentry = withSentryConfig(nextConfig, sentryOptions);

const configWithPlausible = withPlausibleProxy(configWithSentry);

export default configWithPlausible;
