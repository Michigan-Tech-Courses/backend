import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';
import {ProfilingIntegration} from '@sentry/profiling-node';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: 1,
	integrations: [
		new Tracing.Integrations.Postgres(),
		new Sentry.Integrations.Http({tracing: true}),
		new ProfilingIntegration()
	],
	profilesSampleRate: 1,
});
