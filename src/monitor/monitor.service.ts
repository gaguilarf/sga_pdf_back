import { Injectable } from '@nestjs/common';
import * as os from 'os';

@Injectable()
export class MonitorService {
  private requestCounts: Record<string, number> = {};
  private requestDurations: Record<string, number[]> = {};

  recordRequest(endpoint: string, duration: number) {
    this.requestCounts[endpoint] = (this.requestCounts[endpoint] || 0) + 1;
    if (!this.requestDurations[endpoint]) this.requestDurations[endpoint] = [];
    this.requestDurations[endpoint].push(duration);
    // Keep only last 100 durations per endpoint
    if (this.requestDurations[endpoint].length > 100) this.requestDurations[endpoint].shift();
  }

  clearStats() {
    this.requestCounts = {};
    this.requestDurations = {};
  }

  getStats() {
    const stats: any = {};
    for (const endpoint in this.requestCounts) {
      const durations = this.requestDurations[endpoint];
      const avg = durations.reduce((a, b) => a + b, 0) / durations.length;
      stats[endpoint] = {
        count: this.requestCounts[endpoint],
        avgDurationMs: Math.round(avg),
      };
    }

    return {
      endpoints: stats,
      memory: {
        free: os.freemem(),
        total: os.totalmem(),
        usagePercent: Math.round(((os.totalmem() - os.freemem()) / os.totalmem()) * 100),
      },
      uptime: process.uptime(),
      cpu: os.loadavg(),
    };
  }
}
