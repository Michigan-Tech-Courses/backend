// Datadog integration
// eslint-disable-next-line import/no-unassigned-import
import './lib/tracer';
import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import type {
	NestFastifyApplication
} from '@nestjs/platform-fastify';
import {
	FastifyAdapter
} from '@nestjs/platform-fastify';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {AppModule} from './app.module';

async function bootstrap() {
	const app = await NestFactory.create<NestFastifyApplication>(AppModule, new FastifyAdapter());

	app.useGlobalPipes(new ValidationPipe({
		forbidNonWhitelisted: true,
		whitelist: true
	}));

	const config = new DocumentBuilder()
		.setTitle('Michigan Tech Courses')
		.setDescription('An API for courses and other information.')
		.setVersion('1.0')
		.build();
	const document = SwaggerModule.createDocument(app, config);
	SwaggerModule.setup('docs', app, document);

	app.enableCors();

	await app.listen(process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000, '0.0.0.0');
}

void bootstrap();
