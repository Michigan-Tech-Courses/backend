import * as Sentry from '@sentry/node';

export const sentryScope = (tags: Record<string, string>) => (_target: unknown,
	_propertyKey: string,
	descriptor: PropertyDescriptor) => {
	// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
	const originalMethod: (...args: unknown[]) => Promise<unknown> = descriptor.value;

	descriptor.value = function (...args: unknown[]) {
		let result;
		Sentry.withScope(async scope => {
			scope.setTags(tags);

			result = await originalMethod.apply(this, args);
		});

		return result;
	};

	return descriptor;
};
