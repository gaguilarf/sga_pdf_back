import { Test, TestingModule } from '@nestjs/testing';
import { PdfsController } from './pdfs.controller';

describe('PdfsController', () => {
  let controller: PdfsController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [PdfsController],
    }).compile();

    controller = module.get<PdfsController>(PdfsController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
