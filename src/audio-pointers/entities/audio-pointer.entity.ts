import { Entity, Column, PrimaryGeneratedColumn, CreateDateColumn, UpdateDateColumn } from 'typeorm';

@Entity('audio_pointers')
export class AudioPointer {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  pdfId: string;

  @Column('float')
  x: number;

  @Column('float')
  y: number;

  @Column()
  page: number;

  @Column({ nullable: true, length: 1000 })
  audioPath: string;

  @CreateDateColumn()
  createdAt: Date;

  @UpdateDateColumn()
  updatedAt: Date;
}
