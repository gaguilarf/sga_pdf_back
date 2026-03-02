import { Module, MiddlewareConsumer, RequestMethod } from '@nestjs/common';
import { MonitorController } from './monitor.controller';
import { MonitorService } from './monitor.service';
import { MonitorMiddleware } from './monitor.middleware';

@Module({
  controllers: [MonitorController],
  providers: [MonitorService],
  exports: [MonitorService],
})
export class MonitorModule {
  configure(consumer: MiddlewareConsumer) {
    consumer
      .apply(MonitorMiddleware)
      .forRoutes({ path: '*', method: RequestMethod.ALL });
  }
}
