import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { SharedAuthModule } from '../shared-auth/shared-auth.module';
import { AccountSocialModule } from '../account-social/account-social.module';

// ORM Entities
import { ReportTypeOrmEntity } from './infrastructure/persistence/typeorm-entities/report-type.orm-entity';
import { ReportOrmEntity } from './infrastructure/persistence/typeorm-entities/report.orm-entity';
import { TrustScoreOrmEntity } from './infrastructure/persistence/typeorm-entities/trust-score.orm-entity';

// Port Tokens
import { REPORT_REPOSITORY_PORT } from './domain/ports/report.repository.port';
import { REPORT_TYPE_REPOSITORY_PORT } from './domain/ports/report-type.repository.port';
import { ACCOUNT_EXISTENCE_PORT } from './domain/ports/account-existence.port';

// Infrastructure Adapters (US1)
import { ReportOrmRepository } from './infrastructure/persistence/report.typeorm-repository';
import { ReportTypeOrmRepository } from './infrastructure/persistence/report-type.typeorm-repository';
import { AccountExistenceAdapter } from './infrastructure/persistence/account-existence.adapter';

// Application (US1)
import { ListReportTypesUseCase } from './application/queries/list-report-types.use-case';
import { SubmitReportUseCase } from './application/commands/submit-report.use-case';

// Controllers (US1)
import { ReportTypesController } from './interface/http/report-types.controller';
import { ReportsController } from './interface/http/reports.controller';

@Module({
  imports: [
    TypeOrmModule.forFeature([ReportTypeOrmEntity, ReportOrmEntity, TrustScoreOrmEntity]),
    SharedAuthModule,
    AccountSocialModule,
  ],
  providers: [
    // Repository bindings
    { provide: REPORT_REPOSITORY_PORT, useClass: ReportOrmRepository },
    { provide: REPORT_TYPE_REPOSITORY_PORT, useClass: ReportTypeOrmRepository },
    { provide: ACCOUNT_EXISTENCE_PORT, useClass: AccountExistenceAdapter },

    // Use cases (US1)
    ListReportTypesUseCase,
    SubmitReportUseCase,
  ],
  controllers: [ReportTypesController, ReportsController],
  exports: [],
})
export class TrustReportModule {}
