// - Represents individual UI components (e.g., text input, button)
// - Manages component state and properties
export class IOComponent {
  id: string;
  type: string;
  props: any;
  private resolver: ((value: any) => void) | null = null;

  constructor(type: string, props: any) {
    this.id = Math.random().toString(36).substr(2, 9);
    this.type = type;
    this.props = props;
  }

  setResolver(resolver: (value: any) => void): void {
    this.resolver = resolver;
  }

  resolve(value: any): void {
    if (this.resolver) {
      this.resolver(value);
    }
  }
}
