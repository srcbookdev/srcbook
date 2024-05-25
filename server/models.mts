import { action, makeObservable, reaction, observable } from 'mobx';
import Hub from './hub.mjs';
import type { IObservableArray } from 'mobx';
import type {
  ISession,
  ICell,
  ITitleCell,
  IMarkdownCell,
  IPackageJsonCell,
  ICodeCell,
} from './types';

export class TitleCell implements ITitleCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type = 'title';

  text: string;

  constructor(attributes: { id: string; sessionId: string; text: string }) {
    makeObservable(this, {
      text: observable,
      setText: action,
    });

    this.id = attributes.id;
    (this.sessionId = attributes.sessionId), (this.text = attributes.text);

    reaction(
      () => this.text,
      (curr, prev) =>
        Hub.emit('cell:updated', {
          cell: this,
          changeset: { text: { current: curr, previous: prev } },
        }),
    );
  }

  setText(text: string) {
    this.text = text;
  }
}

export class MarkdownCell implements IMarkdownCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type = 'markdown';

  text: string;

  constructor(attributes: { id: string; sessionId: string; text: string }) {
    makeObservable(this, {
      text: observable,
      setText: action,
    });

    this.id = attributes.id;
    (this.sessionId = attributes.sessionId), (this.text = attributes.text);

    reaction(
      () => this.text,
      (curr, prev) =>
        Hub.emit('cell:updated', {
          cell: this,
          changeset: { text: { current: curr, previous: prev } },
        }),
    );
  }

  setText(text: string) {
    this.text = text;
  }
}

export class PackageJsonCell implements IPackageJsonCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type = 'package.json';

  readonly output = [];

  source: string;

  constructor(attributes: { id: string; sessionId: string; source: string }) {
    makeObservable(this, {
      source: observable,
      setSource: action,
    });

    this.id = attributes.id;
    (this.sessionId = attributes.sessionId), (this.source = attributes.source);

    reaction(
      () => this.source,
      (curr, prev) =>
        Hub.emit('cell:updated', {
          cell: this,
          changeset: { source: { current: curr, previous: prev } },
        }),
    );
  }

  setSource(text: string) {
    this.source = text;
  }
}

export class CodeCell implements ICodeCell {
  readonly id: string;
  readonly sessionId: string;
  readonly type = 'code';

  readonly output = [];

  source: string;
  language: string;
  filename: string;

  constructor(attributes: {
    id: string;
    sessionId: string;
    source: string;
    filename: string;
    language: string;
  }) {
    makeObservable(this, {
      source: observable,
      language: observable,
      filename: observable,
      setSource: action,
      setFilename: action,
      setLanguage: action,
    });

    this.id = attributes.id;
    (this.sessionId = attributes.sessionId), (this.source = attributes.source);
    this.language = attributes.language;
    this.filename = attributes.filename;

    reaction(
      () => ({
        source: this.source,
        filename: this.filename,
        language: this.language,
      }),
      (curr, prev) => {
        const changeset = (Object.keys(curr) as Array<keyof typeof curr>).reduce(
          (cs, key) => {
            const currVal = curr[key];
            const prevVal = prev[key];

            if (currVal !== prevVal) {
              cs[key] = { current: currVal, previous: prevVal };
            }

            return cs;
          },
          {} as Record<keyof typeof curr, { current: string; previous: string }>,
        );

        Hub.emit('cell:updated', { cell: this, changeset: changeset });
      },
    );
  }

  setSource(source: string) {
    this.source = source;
  }

  setFilename(filename: string) {
    this.filename = filename;
  }

  setLanguage(language: string) {
    this.language = language;
  }
}

type SessionAttributes = {
  id: string;
  dir: string;
  cells: ICell[];
};

export class Session implements ISession {
  readonly id: string;
  readonly dir: string;

  cells: IObservableArray<ICell>;

  constructor(attributes: SessionAttributes) {
    makeObservable(this, {
      cells: observable,
      addCell: action,
      removeCell: action,
    });

    this.id = attributes.id;
    this.dir = attributes.dir;
    this.cells = observable.array(attributes.cells);

    reaction(
      () => this.cells.slice(),
      () => Hub.emit('session:updated', { session: this }),
    );
  }

  getCell(id: string) {
    return this.cells.find((cell) => cell.id === id);
  }

  addCell(cell: ICell, idx: number) {
    this.cells.splice(idx, 0, cell);
  }

  removeCell(cell: ICell) {
    this.cells.remove(cell);
  }
}

export class SessionStore {
  private sessions: Record<string, ISession> = {};

  list() {
    return Object.values(this.sessions);
  }

  get(id: string) {
    return this.sessions[id];
  }

  create(attributes: SessionAttributes) {
    const session = new Session(attributes);
    this.sessions[session.id] = session;
    Hub.emit('session:created', { session });
    return session;
  }
}
