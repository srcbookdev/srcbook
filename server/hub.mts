import EventEmitter from 'events';

import { ISession, ICell } from './types';

const Hub = new EventEmitter();

interface CellUpdatedMessageType {
  cell: ICell;
  changeset: Record<string, { current: string; previous: string }>;
}

interface SessionCreatedMessageType {
  session: ISession;
}

interface SessionUpdatedMessageType {
  session: ISession;
}

type EventType = 'session:created' | 'session:updated' | 'cell:updated';
type MessageType = SessionCreatedMessageType | SessionUpdatedMessageType | CellUpdatedMessageType;

function emit(event: 'session:created', message: SessionCreatedMessageType): void;
function emit(event: 'session:updated', message: SessionUpdatedMessageType): void;
function emit(event: 'cell:updated', message: CellUpdatedMessageType): void;
function emit(event: EventType, message: MessageType): void {
  Hub.emit(event, message);
}

type SessionCreatedCallbackType = (message: SessionCreatedMessageType) => void;
type SessionUpdatedCallbackType = (message: SessionUpdatedMessageType) => void;
type CellUpdatedCallbackType = (message: CellUpdatedMessageType) => void;

type CallbackType =
  | SessionCreatedCallbackType
  | SessionUpdatedCallbackType
  | CellUpdatedCallbackType;

function on(event: 'session:created', callback: SessionCreatedCallbackType): void;
function on(event: 'session:updated', callback: SessionUpdatedCallbackType): void;
function on(event: 'cell:updated', callback: CellUpdatedCallbackType): void;
function on(event: EventType, callback: CallbackType): void {
  Hub.on(event, callback);
}

export default Object.freeze({
  on: on,
  emit: emit,
});
