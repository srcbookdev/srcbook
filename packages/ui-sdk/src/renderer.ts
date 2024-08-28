export interface RenderComponent {
  type: string;
  props: any;
}

export interface Renderer {
  render(component: RenderComponent): Promise<any>;
}
