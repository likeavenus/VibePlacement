import "reflect-metadata";
import "dotenv/config";
import { Controller, Get, Module, ValidationPipe } from "@nestjs/common";
import { NestFactory } from "@nestjs/core";
import {
  ApiOperation,
  ApiTags,
  DocumentBuilder,
  SwaggerModule,
} from "@nestjs/swagger";
@ApiTags("System")
@Controller()
class SystemController {
  @Get("health")
  @ApiOperation({ summary: "Liveness; does not claim database readiness" })
  health() {
    return {
      status: "ok",
      service: "vibeplacement-api",
      version: "0.2.0",
      mode: "foundation",
    };
  }
  @Get("capabilities")
  @ApiOperation({ summary: "Available capabilities and disabled integrations" })
  capabilities() {
    return {
      transport: "REST",
      documentation: "OpenAPI 3",
      database: "PostgreSQL + Prisma",
      objectStorage: "Selectel S3",
      auth: false,
      payments: false,
      uploads: false,
      frontendPersistence: "localStorage + IndexedDB",
      spine: { runtime: "4.2", formats: ["json", "atlas", "png"] },
    };
  }
}
@Module({ controllers: [SystemController] })
class AppModule {}
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix("api/v1");
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? "http://localhost:5186",
    credentials: true,
  });
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  const document = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle("VibePlacement API")
      .setDescription(
        "Backend foundation. Business endpoints will be enabled after authentication and database deployment.",
      )
      .setVersion("0.2.0")
      .addBearerAuth()
      .build(),
  );
  SwaggerModule.setup("api/docs", app, document);
  await app.listen(
    Number(process.env.PORT ?? 5188),
    process.env.HOST ?? "127.0.0.1",
  );
}
bootstrap().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
