export class Action {
  constructor(
    public name: string,
    private handler: () => Promise<any>,
  ) {}

  async execute(): Promise<any> {
    return this.handler();
  }
}
