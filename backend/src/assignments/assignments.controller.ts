import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ConfirmAssignmentDto } from './dto/confirm-assignment.dto';
import { AssignmentsService } from './assignments.service';

@Controller('api/assignments')
export class AssignmentsController {
  constructor(private readonly service: AssignmentsService) {}

  @Post('confirm')
  @HttpCode(HttpStatus.CREATED)
  confirm(@Body() body: ConfirmAssignmentDto) {
    return this.service.confirm(body.applicationId);
  }
}
