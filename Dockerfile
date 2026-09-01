FROM denoland/deno:alpine-2.9.6

WORKDIR /app

# Dependencies first so source edits don't bust the layer cache.
COPY deno.json deno.lock ./
RUN deno install --frozen

COPY src ./src
RUN deno check src/http.ts src/stdio.ts

# Cache-warm the npm graph and drop privileges for runtime.
RUN chown -R deno:deno /deno-dir /app
USER deno

EXPOSE 8080

# No filesystem writes, no subprocesses: net + env are all this server needs.
CMD ["serve", "--allow-net", "--allow-env", "--allow-read=/app,/deno-dir", \
     "--port", "8080", "--host", "0.0.0.0", "src/http.ts"]
