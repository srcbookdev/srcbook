---
'@srcbook/api': patch
---

Stop several inputs from crashing the server.

A malformed websocket frame, a websocket message referring to a session that no longer exists,
or unexpected tsserver output could each end the process. In every case the throw happened
inside an event-emitter callback, where the surrounding `try`/`catch` could not reach it. They
are now logged and the operation is dropped.

Running the same cell twice before the first run exited corrupted the process registry: the
first process's exit handler deleted the entry belonging to the second, leaving a process
running that stop reported as nonexistent.

tsserver requests (hover, completions, go-to-definition) now time out after 10 seconds and
reject if the tsserver process exits. They previously waited forever and leaked their
resolvers.
