import {
	Injectable, type CallHandler, type ExecutionContext, type NestInterceptor
} from '@nestjs/common';
// NestJS bug: https://stackoverflow.com/a/63984129/12638523
import type {FastifyReply} from 'fastify';

@Injectable()
export class NoCacheUpdatedSinceInterceptor implements NestInterceptor {
	intercept(context: ExecutionContext, next: CallHandler) {
		const response = context.switchToHttp().getResponse<FastifyReply>();

		if ((response.request.query as Record<string, unknown>).updatedSince) {
			void response.header('Cache-Control', 'no-store');
		}

		return next.handle();
	}
}
