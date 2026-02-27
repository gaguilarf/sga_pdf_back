import { Test, TestingModule } from '@nestjs/testing';
import { PdfsService } from './pdfs.service';

describe('PdfsService', () => {
  let service: PdfsService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [PdfsService],
    }).compile();

    service = module.get<PdfsService>(PdfsService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
