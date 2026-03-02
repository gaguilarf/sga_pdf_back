import { Injectable, NestMiddleware } from '@nestjs/common';
import { MonitorService } from './monitor.service';

@Injectable()
export class MonitorMiddleware implements NestMiddleware {
  constructor(private readonly monitorService: MonitorService) {}

  use(req: any, res: any, next: () => void) {
    const start = Date.now();
    res.on('finish', () => {
      const duration = Date.now() - start;
      const endpoint = `${req.method} ${req.baseUrl || req.url}`;
      this.monitorService.recordRequest(endpoint, duration);
    });
    next();
  }
}
