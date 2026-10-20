import { IsUUID } from 'class-validator';

export class ConfirmAssignmentDto {
  @IsUUID('4')
  applicationId!: string;
}
