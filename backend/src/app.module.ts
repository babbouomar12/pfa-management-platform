import 'dotenv/config';
import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AssignmentsController } from './assignments/assignments.controller';
import { AssignmentsService } from './assignments/assignments.service';
import { Application } from './database/entities/application.entity';
import { Assignment } from './database/entities/assignment.entity';
import { AssignmentMember } from './database/entities/assignment-member.entity';
import { Campaign } from './database/entities/campaign.entity';
import { GroupMember } from './database/entities/group-member.entity';
import { PfaGroup } from './database/entities/pfa-group.entity';
import { Student } from './database/entities/student.entity';
import { Subject } from './database/entities/subject.entity';
import { Teacher } from './database/entities/teacher.entity';
import { TeacherCapacity } from './database/entities/teacher-capacity.entity';

const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) {
  throw new Error('DATABASE_URL manquante : copier .env.example vers .env.');
}

@Module({
  imports: [
    TypeOrmModule.forRoot({
      type: 'postgres',
      url: databaseUrl,
      entities: [
        Application, Assignment, AssignmentMember, Campaign, GroupMember,
        PfaGroup, Student, Subject, Teacher, TeacherCapacity,
      ],
      synchronize: false,
      retryAttempts: 4,
      retryDelay: 1500,
    }),
  ],
  controllers: [AssignmentsController],
  providers: [AssignmentsService],
})
export class AppModule {}
