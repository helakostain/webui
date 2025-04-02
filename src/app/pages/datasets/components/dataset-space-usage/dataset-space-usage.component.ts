import {
  ChangeDetectionStrategy, Component, OnInit, computed, signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatTooltipModule } from '@angular/material/tooltip';
import { RouterModule, ActivatedRoute } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateModule, TranslateService } from '@ngx-translate/core';
import {
  Chart, ChartConfiguration, ChartDataset,
} from 'chart.js';
import { TreemapController, TreemapElement } from 'chartjs-chart-treemap';
import { BaseChartDirective } from 'ng2-charts';
import { finalize } from 'rxjs';
import { DatasetQuotaType } from 'app/enums/dataset.enum';
import { DatasetQuota } from 'app/interfaces/dataset-quota.interface';
import { FakeProgressBarComponent } from 'app/modules/loader/components/fake-progress-bar/fake-progress-bar.component';
import { FileSizePipe } from 'app/modules/pipes/file-size/file-size.pipe';
import { ThemeService } from 'app/modules/theme/theme.service';
import { ApiService } from 'app/modules/websocket/api.service';
import { ErrorHandlerService } from 'app/services/errors/error-handler.service';

Chart.register(TreemapController, TreemapElement);

interface TreemapItem {
  id: number;
  label: string;
  value: number;
}

@UntilDestroy()
@Component({
  selector: 'ix-dataset-space-usage',
  templateUrl: './dataset-space-usage.component.html',
  styleUrls: ['./dataset-space-usage.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    TranslateModule,
    FileSizePipe,
    BaseChartDirective,
    MatCardModule,
    MatTooltipModule,
    RouterModule,
    FakeProgressBarComponent,
  ],
})
export class DatasetSpaceUsageComponent implements OnInit {
  protected datasetPath = signal<string>('');
  protected isLoading = signal(false);
  protected quotas = signal<DatasetQuota[]>([]);
  protected topUsers = signal<DatasetQuota[]>([]);

  protected chartConfig = computed<ChartConfiguration<'treemap', TreemapItem[]>>(() => {
    return {
      type: 'treemap',
      data: {
        datasets: [{
          // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-assignment
          tree: this.createTreemapData(this.quotas()) as any,
          key: 'value',
          data: [] as TreemapItem[],
          spacing: 1,
          borderWidth: 1,
          backgroundColor: (ctx) => {
            if (!ctx.raw) return 'rgba(0, 0, 0, 0.1)';
            return this.themeService.getRgbBackgroundColorByIndex(ctx.dataIndex % 10);
          },
          labels: {
            display: true,
            color: 'white',
            position: 'top',
            align: 'left',
            padding: 10,
            font: {
              size: 13,
            },
            formatter: (ctx) => {
              // eslint-disable-next-line @typescript-eslint/no-explicit-any,@typescript-eslint/no-unsafe-member-access
              return ((ctx.raw as any)._data as TreemapItem).label;
            },
          },
        } as ChartDataset<'treemap', TreemapItem[]>],
      },
      options: {
        maintainAspectRatio: false,
        options: {
          parsing: {
            xAxisKey: 'label',
          },
        },
        plugins: {
          legend: {
            display: false,
          },
          tooltip: {
            enabled: false,
          },
        },
      },
    };
  });

  protected totalUsed = computed(() => {
    return this.quotas().reduce((total, quota) => total + quota.used_bytes, 0);
  });

  constructor(
    private route: ActivatedRoute,
    private api: ApiService,
    private errorHandler: ErrorHandlerService,
    private translate: TranslateService,
    protected themeService: ThemeService,
  ) {}

  ngOnInit(): void {
    const datasetId = this.route.snapshot.paramMap.get('datasetId');
    if (datasetId) {
      this.datasetPath.set(datasetId);
      this.loadQuotaData();
    }
  }

  private loadQuotaData(): void {
    this.isLoading.set(true);
    this.api.call('pool.dataset.get_quota', [this.datasetPath(), DatasetQuotaType.User, []])
      .pipe(
        this.errorHandler.withErrorHandler(),
        finalize(() => this.isLoading.set(false)),
        untilDestroyed(this),
      )
      .subscribe((quotas: DatasetQuota[]) => {
        const nonZeroQuotas = quotas.filter((quota) => quota.used_bytes > 0);

        const sortedQuotas = [...nonZeroQuotas].sort((a, b) => b.used_bytes - a.used_bytes);

        this.quotas.set(sortedQuotas);

        // Get top 10 users by space usage for the legend
        this.topUsers.set(sortedQuotas.slice(0, 10));
      });
  }

  private createTreemapData(quotas: DatasetQuota[]): TreemapItem[] {
    if (quotas.length === 0) {
      return [];
    }

    const topQuotas = quotas.slice(0, 50);

    const treemapItems = topQuotas.map((quota) => {
      return {
        id: quota.id,
        label: quota.name || '?',
        value: quota.used_bytes,
      };
    });

    // Add an "Others" item if there are more than 50 quotas
    if (quotas.length > 50) {
      const othersValue = quotas.slice(50).reduce((sum, quota) => sum + quota.used_bytes, 0);
      if (othersValue > 0) {
        treemapItems.push({
          id: -1,
          label: this.translate.instant('Others'),
          value: othersValue,
        });
      }
    }

    return treemapItems;
  }
}
