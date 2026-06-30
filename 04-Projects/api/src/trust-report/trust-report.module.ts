import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedAuthModule } from '../shared-auth/shared-auth.module';
import { AccountSocialModule } from '../account-social/account-social.module';
import { ReportTypeOrmEntity } from './infrastructure/persistence/typeorm-entities/report-type.orm-entity';
import { ReportOrmEntity } from './infrastructure/persistence/typeorm-entities/report.orm-entity';
import { TrustScoreOrmEntity } from './infrastructure/persistence/typeorm-entities/trust-score.orm-entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTypeOrmEntity, ReportOrmEntity, TrustScoreOrmEntity]),
    SharedAuthModule,
    AccountSocialModule,
  ],
  providers: [],
  controllers: [],
  exports: [],
})
export class TrustReportModule {}
