export type Location = {
  line: number;
  offset: number;
};

export type DiagnosticType = {
  code: number;
  category: string;
  text: string;
  start: Location;
  end: Location;
};
