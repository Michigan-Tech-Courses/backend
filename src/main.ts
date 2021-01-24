import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import {
	FastifyAdapter,
	NestFastifyApplication
} from '@nestjs/platform-fastify';
import {AppModule} from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

	app.useGlobalPipes(new ValidationPipe({
		forbidNonWhitelisted: true,
		whitelist: true
	}));

	await app.listen(3000, '0.0.0.0');
}

void bootstrap();
