import {
  Component, OnInit,
} from '@angular/core';
import { FormGroup } from '@angular/forms';
import { UntilDestroy, untilDestroyed } from '@ngneat/until-destroy';
import { TranslateService } from '@ngx-translate/core';
import { parseMode } from 'app/helpers/mode.helper';
import { FieldConfig } from 'app/pages/common/entity/entity-form/models/field-config.interface';
import { Field } from 'app/pages/common/entity/entity-form/models/field.interface';

@UntilDestroy()
@Component({
  selector: 'form-permissions',
  styleUrls: ['../dynamic-field/dynamic-field.scss', 'form-permissions.scss'],
  templateUrl: './form-permissions.component.html',
})
export class FormPermissionsComponent implements Field, OnInit {
  config: FieldConfig;
  group: FormGroup;
  fieldShow: string;

  private ownerRead = false;
  private ownerWrite = false;
  private ownerExec = false;
  private groupRead = false;
  private groupWrite = false;
  private groupExec = false;
  private otherRead = false;
  private otherWrite = false;
  private otherExec = false;

  private owner = 0;
  private grp = 0;
  private other = 0;
  private value: string;
  private control: any;

  private formatRe = new RegExp('^[0-7][0-7][0-7]$');

  constructor(public translate: TranslateService) {}

  toggleOwnerRead(): void {
    if (this.ownerRead) {
      this.ownerRead = false;
      this.owner -= 4;
    } else {
      this.ownerRead = true;
      this.owner += 4;
    }
    this.refreshPermissions();
  }

  toggleOwnerWrite(): void {
    if (this.ownerWrite) {
      this.ownerWrite = false;
      this.owner -= 2;
    } else {
      this.ownerWrite = true;
      this.owner += 2;
    }
    this.refreshPermissions();
  }

  toggleOwnerExec(): void {
    if (this.ownerExec) {
      this.ownerExec = false;
      this.owner -= 1;
    } else {
      this.ownerExec = true;
      this.owner += 1;
    }
    this.refreshPermissions();
  }

  toggleGroupRead(): void {
    if (this.groupRead) {
      this.groupRead = false;
      this.grp -= 4;
    } else {
      this.groupRead = true;
      this.grp += 4;
    }
    this.refreshPermissions();
  }

  toggleGroupWrite(): void {
    if (this.groupWrite) {
      this.groupWrite = false;
      this.grp -= 2;
    } else {
      this.groupWrite = true;
      this.grp += 2;
    }
    this.refreshPermissions();
  }

  toggleGroupExec(): void {
    if (this.groupExec) {
      this.groupExec = false;
      this.grp -= 1;
    } else {
      this.groupExec = true;
      this.grp += 1;
    }
    this.refreshPermissions();
  }

  toggleOtherRead(): void {
    if (this.otherRead) {
      this.otherRead = false;
      this.other -= 4;
    } else {
      this.otherRead = true;
      this.other += 4;
    }
    this.refreshPermissions();
  }

  toggleOtherWrite(): void {
    if (this.otherWrite) {
      this.otherWrite = false;
      this.other -= 2;
    } else {
      this.otherWrite = true;
      this.other += 2;
    }
    this.refreshPermissions();
  }

  toggleOtherExec(): void {
    if (this.otherExec) {
      this.otherExec = false;
      this.other -= 1;
    } else {
      this.otherExec = true;
      this.other += 1;
    }
    this.refreshPermissions();
  }

  refreshPermissions(): void {
    this.value = this.owner.toString() + this.grp.toString() + this.other.toString();
    this.group.controls[this.config.name].setValue(this.value);
  }

  ngOnInit(): void {
    this.control = this.group.controls[this.config.name];
    this.control.valueChanges.pipe(untilDestroyed(this)).subscribe((data: any) => {
      if (this.value != data) {
        this.setValue(data);
        this.refreshPermissions();
      }
    });
    if (this.control.value && this.formatRe.test(this.control.value)) {
      this.setValue(this.control.value);
    } else {
      this.setValue();
    }
    this.refreshPermissions();
  }

  setValue(value = '000'): void {
    if (this.config.value && this.formatRe.test(this.config.value)) {
      this.value = this.config.value;
    } else if (value && this.formatRe.test(value)) {
      this.value = value;
    }

    this.owner = parseInt(this.value[0]);
    this.grp = parseInt(this.value[1]);
    this.other = parseInt(this.value[2]);

    const permissions = parseMode(this.value);

    this.ownerRead = permissions.owner.read;
    this.ownerWrite = permissions.owner.write;
    this.ownerExec = permissions.owner.execute;

    this.groupRead = permissions.group.read;
    this.groupWrite = permissions.group.write;
    this.groupExec = permissions.group.execute;

    this.otherRead = permissions.other.read;
    this.otherWrite = permissions.other.write;
    this.otherExec = permissions.other.execute;
  }
}
