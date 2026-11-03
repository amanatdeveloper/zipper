import { defineCloudflareConfig } from '@opennextjs/cloudflare';

// The dashboard is fully dynamic (force-dynamic) and the marketing pages are
// statically generated at build time, so no incremental cache bindings are
// required. Add an R2 incremental cache here if ISR is introduced later.
export default defineCloudflareConfig({});
