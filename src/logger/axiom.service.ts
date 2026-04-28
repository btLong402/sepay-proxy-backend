import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { Axiom } from '@axiomhq/js';

@Injectable()
export class AxiomService implements OnModuleDestroy {
  private axiom: Axiom | null = null;
  private dataset: string;

  constructor() {
    const token = process.env.AXIOM_TOKEN;
    this.dataset = process.env.AXIOM_DATASET || 'sepay-logs';

    if (token) {
      this.axiom = new Axiom({ token });
    } else {
      console.warn('AXIOM_TOKEN missing. Axiom logging disabled.');
    }
  }

  async logEvent(event: Record<string, any>) {
    const logData = {
      ...event,
      _time: new Date().toISOString(),
    };

    if (this.axiom) {
      await this.axiom.ingest(this.dataset, [logData]);
    } else {
      // Fallback to console in dev
      console.log('[Axiom Log Target]:', JSON.stringify(logData));
    }
  }

  async onModuleDestroy() {
    if (this.axiom) {
      await this.axiom.flush();
    }
  }
}
