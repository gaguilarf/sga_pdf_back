import { Entity, PrimaryGeneratedColumn, Column, CreateDateColumn } from 'typeorm';

export enum PdfLevel {
  BEGINNER = 'Beginner',
  ELEMENTARY = 'Elementary',
  PRE_INTERMEDIATE = 'Pre Intermediate',
  INTERMEDIATE = 'Intermediate',
  UPPER_INTERMEDIATE = 'Upper Intermediate',
  ADVANCED = 'Advanced',
}

@Entity('pdfs')
export class Pdf {
  @PrimaryGeneratedColumn('uuid')
  id: string;

  @Column()
  title: string;

  @Column()
  filename: string;

  @Column({
    type: 'enum',
    enum: PdfLevel,
    default: PdfLevel.BEGINNER,
  })
  level: PdfLevel;

  @Column({ nullable: true })
  thumbnailUrl: string;

  @CreateDateColumn()
  createdAt: Date;
}
