import { Module, Global } from '@nestjs/common';
import { AxiomService } from './axiom.service';

@Global()
@Module({
  providers: [AxiomService],
  exports: [AxiomService],
})
export class LoggerModule {}
