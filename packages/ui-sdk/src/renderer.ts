export interface RenderComponent {
  id: string;
  type: string;
  props: any;
}

export interface RenderUpdate {
  components: RenderComponent[];
}

export interface Renderer {
  render(update: RenderUpdate): Promise<void>;
}
