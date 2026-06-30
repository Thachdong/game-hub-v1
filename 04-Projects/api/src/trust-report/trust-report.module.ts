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
import { TRUST_SCORE_REPOSITORY_PORT } from './domain/ports/trust-score.repository.port';
import { ACCOUNT_EXISTENCE_PORT } from './domain/ports/account-existence.port';
import { EVENT_PUBLISHER_PORT } from './domain/ports/event-publisher.port';

// Infrastructure Adapters
import { ReportOrmRepository } from './infrastructure/persistence/report.typeorm-repository';
import { ReportTypeOrmRepository } from './infrastructure/persistence/report-type.typeorm-repository';
import { TrustScoreOrmRepository } from './infrastructure/persistence/trust-score.typeorm-repository';
import { AccountExistenceAdapter } from './infrastructure/persistence/account-existence.adapter';
import { TrustReportEventPublisherAdapter } from './infrastructure/events/event-publisher.adapter';

// Application (US1)
import { ListReportTypesUseCase } from './application/queries/list-report-types.use-case';
import { SubmitReportUseCase } from './application/commands/submit-report.use-case';

// Application (US2)
import { ReviewReportUseCase } from './application/commands/review-report.use-case';
import { ListReportsUseCase } from './application/queries/list-reports.use-case';

// Application (US3)
import { CreateReportTypeUseCase } from './application/commands/create-report-type.use-case';
import { UpdateReportTypeUseCase } from './application/commands/update-report-type.use-case';
import { DeactivateReportTypeUseCase } from './application/commands/deactivate-report-type.use-case';
import { ListAllReportTypesUseCase } from './application/queries/list-all-report-types.use-case';

// Application (US4)
import { GetTrustScoreUseCase } from './application/queries/get-trust-score.use-case';

// Controllers (US1)
import { ReportTypesController } from './interface/http/report-types.controller';
import { ReportsController } from './interface/http/reports.controller';

// Controllers (US2)
import { AdminReportsController } from './interface/http/admin/admin-reports.controller';

// Controllers (US3)
import { AdminReportTypesController } from './interface/http/admin/admin-report-types.controller';

// Controllers (US4)
import { TrustScoreController } from './interface/http/trust-score.controller';

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
    { provide: TRUST_SCORE_REPOSITORY_PORT, useClass: TrustScoreOrmRepository },
    { provide: ACCOUNT_EXISTENCE_PORT, useClass: AccountExistenceAdapter },
    { provide: EVENT_PUBLISHER_PORT, useClass: TrustReportEventPublisherAdapter },

    // Use cases (US1)
    ListReportTypesUseCase,
    SubmitReportUseCase,

    // Use cases (US2)
    ReviewReportUseCase,
    ListReportsUseCase,

    // Use cases (US3)
    CreateReportTypeUseCase,
    UpdateReportTypeUseCase,
    DeactivateReportTypeUseCase,
    ListAllReportTypesUseCase,

    // Use cases (US4)
    GetTrustScoreUseCase,
  ],
  controllers: [
    ReportTypesController,
    ReportsController,
    AdminReportsController,
    AdminReportTypesController,
    TrustScoreController,
  ],
  exports: [],
})
export class TrustReportModule {}
