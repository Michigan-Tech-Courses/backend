import * as Sentry from '@sentry/node';
import * as Tracing from '@sentry/tracing';

Sentry.init({
	dsn: process.env.SENTRY_DSN,
	tracesSampleRate: 1,
	integrations: [
		new Tracing.Integrations.Postgres(),
		new Sentry.Integrations.Http({tracing: true}),
	]
});
