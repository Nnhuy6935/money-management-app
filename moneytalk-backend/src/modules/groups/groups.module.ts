import { Module } from '@nestjs/common';
import { UsersModule } from '../users/users.module';
import { GroupAccessService } from './group-access.service';
import { GroupInvitationsController } from './group-invitations.controller';
import { GroupInvitationsService } from './group-invitations.service';
import { GroupsController } from './groups.controller';
import { GroupSummaryService } from './group-summary.service';
import { GroupsService } from './groups.service';

@Module({
  imports: [UsersModule],
  controllers: [GroupsController, GroupInvitationsController],
  providers: [
    GroupAccessService,
    GroupsService,
    GroupSummaryService,
    GroupInvitationsService,
  ],
  exports: [GroupAccessService],
})
export class GroupsModule {}
