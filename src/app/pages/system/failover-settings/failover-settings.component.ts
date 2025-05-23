import { AsyncPipe } from '@angular/common';
import {
  ChangeDetectionStrategy, Component, OnInit, signal,
} from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { MatProgressBar } from '@angular/material/progress-bar';
import { FormBuilder, FormControl } from '@ngneat/reactive-forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { Store } from '@ngrx/store';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { Subscription } from 'rxjs';
import {
  filter, map, switchMap, take,
} from 'rxjs/operators';
import { RequiresRolesDirective } from 'app/directives/requires-roles/requires-roles.directive';
import { UiSearchDirective } from 'app/directives/ui-search.directive';
import { Role } from 'app/enums/role.enum';
import { helptextSystemFailover } from 'app/helptext/system/failover';
import { AuthService } from 'app/modules/auth/auth.service';
import { DialogService } from 'app/modules/dialog/dialog.service';
import { IxCheckboxComponent } from 'app/modules/forms/ix-forms/components/ix-checkbox/ix-checkbox.component';
import { IxFieldsetComponent } from 'app/modules/forms/ix-forms/components/ix-fieldset/ix-fieldset.component';
import { IxInputComponent } from 'app/modules/forms/ix-forms/components/ix-input/ix-input.component';
import { FormErrorHandlerService } from 'app/modules/forms/ix-forms/services/form-error-handler.service';
import { SnackbarService } from 'app/modules/snackbar/services/snackbar.service';
import { TestDirective } from 'app/modules/test-id/test.directive';
import { ApiService } from 'app/modules/websocket/api.service';
import { WebSocketHandlerService } from 'app/modules/websocket/websocket-handler.service';
import { failoverElements } from 'app/pages/system/failover-settings/failover-settings.elements';
import { ErrorHandlerService } from 'app/services/errors/error-handler.service';
import { AppState } from 'app/store';
import { haSettingsUpdated } from 'app/store/ha-info/ha-info.actions';

@UntilDestroy({
  arrayName: 'subscriptions',
})
@Component({
  selector: 'ix-failover-settings',
  templateUrl: './failover-settings.component.html',
  styleUrls: ['./failover-settings.component.scss'],
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    MatCard,
    UiSearchDirective,
    MatCardContent,
    MatProgressBar,
    ReactiveFormsModule,
    IxFieldsetComponent,
    IxCheckboxComponent,
    IxInputComponent,
    RequiresRolesDirective,
    MatButton,
    TestDirective,
    TranslateModule,
    AsyncPipe,
  ],
})
export class FailoverSettingsComponent implements OnInit {
  protected readonly searchableElements = failoverElements;

  protected isLoading = signal(false);
  form = this.formBuilder.group({
    disabled: [false],
    master: [true],
    timeout: new FormControl(null as number | null),
  });

  subscriptions: Subscription[] = [];

  protected readonly requiredRoles = [Role.FailoverWrite];

  submitButtonText$ = this.form.select((values) => {
    if (!values.master) {
      return this.translate.instant('Save And Failover');
    }
    return this.translate.instant('Save');
  });

  readonly helptext = helptextSystemFailover;

  constructor(
    private formBuilder: FormBuilder,
    private api: ApiService,
    private dialogService: DialogService,
    private authService: AuthService,
    private errorHandler: ErrorHandlerService,
    private formErrorHandler: FormErrorHandlerService,
    private translate: TranslateService,
    private snackbar: SnackbarService,
    private store$: Store<AppState>,
    private wsManager: WebSocketHandlerService,
  ) {}

  ngOnInit(): void {
    this.loadFormValues();
  }

  onSubmit(): void {
    this.isLoading.set(true);
    const values = this.form.getRawValue();

    this.api.call('failover.update', [values])
      .pipe(
        map(() => { this.store$.dispatch(haSettingsUpdated()); }),
        untilDestroyed(this),
      )
      .subscribe({
        next: () => {
          this.snackbar.success(this.translate.instant('Settings saved.'));
          this.isLoading.set(false);

          if (values.disabled && !values.master) {
            this.authService.logout().pipe(untilDestroyed(this)).subscribe({
              next: () => {
                this.authService.clearAuthToken();
                this.wsManager.reconnect();
              },
            });
          }
        },
        error: (error: unknown) => {
          this.formErrorHandler.handleValidationErrors(error, this.form);
          this.isLoading.set(false);
        },
      });
  }

  onSyncToPeerPressed(): void {
    this.dialogService.confirm({
      title: helptextSystemFailover.dialog_sync_to_peer_title,
      message: helptextSystemFailover.dialog_sync_to_peer_message,
      buttonText: helptextSystemFailover.dialog_button_ok,
      secondaryCheckbox: true,
      secondaryCheckboxText: helptextSystemFailover.dialog_sync_to_peer_checkbox,
    })
      .pipe(
        filter((result) => result.confirmed),
        switchMap((result) => {
          this.isLoading.set(true);
          return this.api.call('failover.sync_to_peer', [{ reboot: result.secondaryCheckbox }]);
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackbar.success(
            helptextSystemFailover.confirm_dialogs.sync_to_message,
          );
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.errorHandler.showErrorModal(error);
        },
      });
  }

  onSyncFromPeerPressed(): void {
    this.dialogService.confirm({
      title: helptextSystemFailover.dialog_sync_from_peer_title,
      message: helptextSystemFailover.dialog_sync_from_peer_message,
      buttonText: helptextSystemFailover.dialog_button_ok,
    })
      .pipe(
        filter(Boolean),
        switchMap(() => {
          this.isLoading.set(true);
          return this.api.call('failover.sync_from_peer');
        }),
        untilDestroyed(this),
      )
      .subscribe({
        next: () => {
          this.isLoading.set(false);
          this.snackbar.success(
            this.translate.instant(helptextSystemFailover.confirm_dialogs.sync_from_message),
          );
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.errorHandler.showErrorModal(error);
        },
      });
  }

  private loadFormValues(): void {
    this.isLoading.set(true);

    this.api.call('failover.config')
      .pipe(untilDestroyed(this))
      .subscribe({
        next: (config) => {
          this.isLoading.set(false);
          this.form.patchValue({
            ...config,
            master: true,
          });
          this.setFailoverConfirmation();
          this.setFormRelations();
        },
        error: (error: unknown) => {
          this.isLoading.set(false);
          this.errorHandler.showErrorModal(error);
        },
      });
  }

  private setFailoverConfirmation(): void {
    this.form.controls.master.valueChanges
      .pipe(
        filter((isMaster) => !isMaster),
        switchMap(() => {
          return this.dialogService.confirm({
            title: helptextSystemFailover.master_dialog_title,
            message: helptextSystemFailover.master_dialog_warning,
            buttonText: this.translate.instant('Continue'),
            cancelText: this.translate.instant('Cancel'),
            disableClose: true,
          });
        }),
        take(1),
        filter((wasConfirmed) => !wasConfirmed),
        untilDestroyed(this),
      )
      .subscribe(() => {
        this.form.patchValue({ master: true });
      });
  }

  private setFormRelations(): void {
    this.subscriptions.push(
      this.form.controls.master.disabledWhile(
        this.form.select((values) => !values.disabled),
      ),
    );
  }
}
