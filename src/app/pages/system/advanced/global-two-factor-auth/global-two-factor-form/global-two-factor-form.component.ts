import {
  Component, ChangeDetectionStrategy, ChangeDetectorRef, OnInit, Inject,
} from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { MatButton } from '@angular/material/button';
import { MatCard, MatCardContent } from '@angular/material/card';
import { Router } from '@angular/router';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService, TranslateModule } from '@ngx-translate/core';
import { isEqual } from 'lodash-es';
import {
  EMPTY, Observable, catchError, filter, of, switchMap, tap,
} from 'rxjs';
import { RequiresRolesDirective } from 'app/directives/requires-roles/requires-roles.directive';
import { Role } from 'app/enums/role.enum';
import { WINDOW } from 'app/helpers/window.helper';
import { SlideIn2CloseConfirmation } from 'app/interfaces/slide-in-close-confirmation.interface';
import { GlobalTwoFactorConfig, GlobalTwoFactorConfigUpdate } from 'app/interfaces/two-factor-config.interface';
import { DialogService } from 'app/modules/dialog/dialog.service';
import { FormActionsComponent } from 'app/modules/forms/ix-forms/components/form-actions/form-actions.component';
import { IxCheckboxComponent } from 'app/modules/forms/ix-forms/components/ix-checkbox/ix-checkbox.component';
import { IxFieldsetComponent } from 'app/modules/forms/ix-forms/components/ix-fieldset/ix-fieldset.component';
import { IxInputComponent } from 'app/modules/forms/ix-forms/components/ix-input/ix-input.component';
import { ChainedRef } from 'app/modules/slide-ins/chained-component-ref';
import { ModalHeader2Component } from 'app/modules/slide-ins/components/modal-header2/modal-header2.component';
import { SnackbarService } from 'app/modules/snackbar/services/snackbar.service';
import { TestDirective } from 'app/modules/test-id/test.directive';
import { AuthService } from 'app/services/auth/auth.service';
import { ErrorHandlerService } from 'app/services/error-handler.service';
import { WebSocketService } from 'app/services/ws.service';

@UntilDestroy()
@Component({
  selector: 'ix-global-two-factor-auth-form',
  templateUrl: './global-two-factor-form.component.html',
  changeDetection: ChangeDetectionStrategy.OnPush,
  standalone: true,
  imports: [
    ModalHeader2Component,
    MatCard,
    MatCardContent,
    ReactiveFormsModule,
    IxFieldsetComponent,
    IxCheckboxComponent,
    IxInputComponent,
    FormActionsComponent,
    RequiresRolesDirective,
    MatButton,
    TestDirective,
    TranslateModule,
  ],
})
export class GlobalTwoFactorAuthFormComponent implements OnInit, SlideIn2CloseConfirmation {
  protected readonly requiredRoles = [Role.FullAdmin];

  isFormLoading = false;
  form = this.fb.group({
    enabled: [false],
    window: [null as number, Validators.required],
    ssh: [false],
  });

  enableWarning: string = this.translate.instant('Once enabled, users will be required to set up two factor authentication next time they login.');

  protected twoFactorConfig: GlobalTwoFactorConfig;

  constructor(
    private fb: FormBuilder,
    private ws: WebSocketService,
    private errorHandler: ErrorHandlerService,
    private dialogService: DialogService,
    private cdr: ChangeDetectorRef,
    private translate: TranslateService,
    private snackbar: SnackbarService,
    private authService: AuthService,
    private router: Router,
    private chainedRef: ChainedRef<GlobalTwoFactorConfig>,
    @Inject(WINDOW) private window: Window,
  ) {
    this.twoFactorConfig = this.chainedRef.getData();
  }

  requiresConfirmationOnClose(): Observable<boolean> {
    return of(this.form.dirty);
  }

  ngOnInit(): void {
    this.setupForm();
  }

  setupForm(): void {
    this.form.patchValue({
      enabled: this.twoFactorConfig.enabled,
      window: this.twoFactorConfig.window,
      ssh: this.twoFactorConfig.services.ssh,
    });
    this.cdr.markForCheck();
  }

  onSubmit(): void {
    let shouldWarn = true;
    if (!this.twoFactorConfig.enabled || !this.form.value.enabled) {
      shouldWarn = false;
    }

    const values = this.form.value;
    const payload: GlobalTwoFactorConfigUpdate = {
      enabled: values.enabled,
      services: { ssh: values.ssh },
      window: values.window,
    };
    const confirmation$ = shouldWarn
      ? this.dialogService.confirm({
        title: this.translate.instant('Warning!'),
        message: this.translate.instant('Changing global 2FA settings might cause user secrets to reset. Which means users will have to reconfigure their 2FA. Are you sure you want to continue?'),
      })
      : of(true);
    confirmation$.pipe(
      filter(Boolean),
      switchMap(() => {
        this.isFormLoading = true;
        return this.ws.call('auth.twofactor.update', [payload]);
      }),
      tap(() => {
        this.window.localStorage.setItem('showQr2FaWarning', `${this.form.value.enabled}`);
        this.isFormLoading = false;
        this.snackbar.success(this.translate.instant('Settings saved'));
        this.authService.globalTwoFactorConfigUpdated();
        if (!isEqual(this.twoFactorConfig, payload) && payload.enabled) {
          this.router.navigate(['/two-factor-auth']);
        }
        this.cdr.markForCheck();
        this.chainedRef.close({ response: true, error: null });
      }),
      catchError((error) => {
        this.isFormLoading = false;
        this.dialogService.error(this.errorHandler.parseError(error));
        this.cdr.markForCheck();
        return EMPTY;
      }),
    ).pipe(untilDestroyed(this)).subscribe();
  }
}
