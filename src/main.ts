import {platformBrowserDynamic} from '@angular/platform-browser-dynamic';
import {AppModule} from './app/app.module';

platformBrowserDynamic().bootstrapModule(AppModule);

// declare var System: any;
// function func(){
//   const lazyFile = './lazy-file';
//   System.import(lazyFile);
// }