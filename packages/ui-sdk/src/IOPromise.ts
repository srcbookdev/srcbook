// - Wraps IOComponents in a promise-like interface
// - Allows for async/await syntax in actions
import { IOComponent } from './IOComponent.js';
import { IOClient } from './IOClient.js';

export class IOPromise<T> implements PromiseLike<T> {
  private component: IOComponent;
  private client: IOClient;

  constructor(component: IOComponent, client: IOClient) {
    this.component = component;
    this.client = client;
    this.client.addComponent(component);
  }

  then<TResult1 = T, TResult2 = never>(
    onfulfilled?: ((value: T) => TResult1 | PromiseLike<TResult1>) | null,
    onrejected?: ((reason: any) => TResult2 | PromiseLike<TResult2>) | null,
  ): PromiseLike<TResult1 | TResult2> {
    return this.client.awaitUserInput(this.component).then(onfulfilled, onrejected);
  }
}
