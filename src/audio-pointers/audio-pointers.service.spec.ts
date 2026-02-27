import { Test, TestingModule } from '@nestjs/testing';
import { AudioPointersService } from './audio-pointers.service';

describe('AudioPointersService', () => {
  let service: AudioPointersService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [AudioPointersService],
    }).compile();

    service = module.get<AudioPointersService>(AudioPointersService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
