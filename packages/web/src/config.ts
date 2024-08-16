// Expected to be defined in index.html
declare global {
  interface Window {
    SRCBOOK_CONFIG: {
      api: {
        host: string;
        origin: string;
      };
    };
  }
}

export default window.SRCBOOK_CONFIG;
