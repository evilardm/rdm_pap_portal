import { Component, Input, forwardRef, signal, computed, HostListener, ElementRef } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { CommonModule } from '@angular/common';

export interface TypeaheadOption {
  label: string;
  sublabel?: string;
  value: string;
}

@Component({
  selector: 'app-typeahead-input',
  standalone: true,
  imports: [CommonModule],
  providers: [{ provide: NG_VALUE_ACCESSOR, useExisting: forwardRef(() => TypeaheadInputComponent), multi: true }],
  templateUrl: './typeahead-input.component.html',
  styleUrl: './typeahead-input.component.scss',
})
export class TypeaheadInputComponent implements ControlValueAccessor {
  @Input() options: TypeaheadOption[] = [];
  @Input() placeholder = '';
  @Input() inputClass = '';
  @Input() hasError = false;

  inputValue = signal('');
  open = signal(false);
  disabled = signal(false);

  private onChange: (v: string) => void = () => {};
  private onTouched: () => void = () => {};

  constructor(private el: ElementRef) {}

  filtered = computed(() => {
    const q = this.inputValue().toLowerCase().trim();
    if (!q) return [];
    return this.options
      .filter(o => o.label.toLowerCase().includes(q) || (o.sublabel ?? '').toLowerCase().includes(q))
      .slice(0, 8);
  });

  @HostListener('document:click', ['$event'])
  onDocumentClick(e: MouseEvent) {
    if (!this.el.nativeElement.contains(e.target)) {
      this.open.set(false);
    }
  }

  onInput(value: string): void {
    this.inputValue.set(value);
    this.onChange(value);
    this.open.set(true);
  }

  onFocus(): void {
    if (this.inputValue().length > 0) this.open.set(true);
  }

  onBlur(): void {
    this.onTouched();
  }

  select(opt: TypeaheadOption): void {
    this.inputValue.set(opt.value);
    this.onChange(opt.value);
    this.open.set(false);
  }

  writeValue(v: string): void { this.inputValue.set(v ?? ''); }
  registerOnChange(fn: (v: string) => void): void { this.onChange = fn; }
  registerOnTouched(fn: () => void): void { this.onTouched = fn; }
  setDisabledState(d: boolean): void { this.disabled.set(d); }
}
