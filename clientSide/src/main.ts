import { bootstrapApplication } from '@angular/platform-browser';
import { provideAnimations } from '@angular/platform-browser/animations';
import { appConfig } from './app/app.config';
import { App } from './app/app';

bootstrapApplication(App, {
  ...appConfig,
  providers: [
    ...(appConfig.providers || []), // keep any existing providers
    provideAnimations()             // ✅ enable Angular animations globally
  ]
})
.catch((err) => console.error(err));
