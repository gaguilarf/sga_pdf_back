import { Test, TestingModule } from '@nestjs/testing';
import { AudioPointersController } from './audio-pointers.controller';

describe('AudioPointersController', () => {
  let controller: AudioPointersController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [AudioPointersController],
    }).compile();

    controller = module.get<AudioPointersController>(AudioPointersController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
