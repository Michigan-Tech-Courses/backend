// eslint-disable-next-line import/no-unassigned-import, import/order
import './sentry';
import {NestFactory} from '@nestjs/core';
import {ValidationPipe} from '@nestjs/common';
import {
	FastifyAdapter, type
	NestFastifyApplication

} from '@nestjs/platform-fastify';
import {DocumentBuilder, SwaggerModule} from '@nestjs/swagger';
import {WorkerService} from 'nestjs-graphile-worker';
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

	app.enableShutdownHooks();

	await app.listen(process.env.PORT ? Number.parseInt(process.env.PORT, 10) : 3000, '0.0.0.0');

	void app.get(WorkerService).run();
}

// eslint-disable-next-line unicorn/prefer-top-level-await
void bootstrap();
