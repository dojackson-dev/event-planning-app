import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  
  // Enable CORS for frontend - support multiple origins
  const allowedOrigins = [
    'http://localhost:3000',
    'http://localhost:3001',
    'http://localhost:8002',
    'https://event-planning-app-frontend-alpha.vercel.app',
    'https://dovenuesuite.com',
    'https://www.dovenuesuite.com',
    process.env.FRONTEND_URL,
  ].filter(Boolean);

  app.enableCors({
    origin: (origin, callback) => {
      // Allow requests with no origin (mobile apps, curl, etc.)
      if (!origin) return callback(null, true);
      
      // Allow exact matches
      if (allowedOrigins.includes(origin)) {
        return callback(null, true);
      }
      
      // Allow all Vercel preview URLs for this project
      if (origin.includes('event-planning-app') && origin.includes('vercel.app')) {
        return callback(null, true);
      }
      
      // Allow do-venue-suites Vercel deployments
      if (origin.includes('do-venue-suites') && origin.includes('vercel.app')) {
        return callback(null, true);
      }
      
      console.log(`CORS blocked origin: ${origin}`);
      callback(null, false);
    },
    credentials: true,
  });
  
  const port = process.env.PORT ?? 3000;
  await app.listen(port);
  console.log(`Application is running on: http://localhost:${port}`);
}
bootstrap();
