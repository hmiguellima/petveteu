import createNextIntlPlugin from 'next-intl/plugin';

export default createNextIntlPlugin('./i18n/request.ts')({
  poweredByHeader: false,
  distDir: process.env.E2E_TEST_MODE === 'true' ? '.e2e/next' : '.next',
});
