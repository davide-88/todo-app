FROM mcr.microsoft.com/devcontainers/base:bookworm

ARG TZ
ENV TZ="$TZ"

# Add Docker's official apt repo and install CLI + Compose plugin
RUN export DEBIAN_FRONTEND=noninteractive \
    && apt-get update && apt-get install -y --no-install-recommends \
      ca-certificates curl gnupg \
    && install -m 0755 -d /etc/apt/keyrings \
    && curl -fsSL https://download.docker.com/linux/debian/gpg | gpg --dearmor -o /etc/apt/keyrings/docker.gpg \
    && chmod a+r /etc/apt/keyrings/docker.gpg \
    && echo "deb [arch=$(dpkg --print-architecture) signed-by=/etc/apt/keyrings/docker.gpg] https://download.docker.com/linux/debian bookworm stable" \
       > /etc/apt/sources.list.d/docker.list \
    && apt-get update && apt-get install -y --no-install-recommends \
      docker-ce-cli \
      docker-compose-plugin \
    && rm -rf /var/lib/apt/lists/*

RUN groupadd -f docker && usermod -aG docker vscode

# Install fnm and Node 24 for the vscode user
USER vscode
RUN curl -fsSL https://fnm.vercel.app/install | bash \
    && export PATH="/home/vscode/.local/share/fnm:$PATH" \
    && eval "$(fnm env)" \
    && fnm install 24.14.0 \
    && fnm default 24.14.0 \
    && corepack enable \
    && corepack prepare pnpm@latest-10 --activate \
    && npm install -g @anthropic-ai/claude-code

# Pre-create .claude dir so the volume mount inherits vscode ownership
RUN mkdir -p /home/vscode/.claude

# Mark /workspace as safe for git (ownership differs in containers)
RUN git config --global --add safe.directory /workspace

# Ensure fnm is on PATH for interactive and non-interactive shells
RUN echo 'export PATH="/home/vscode/.local/share/fnm:$PATH"' >> /home/vscode/.bashrc \
    && echo 'eval "$(fnm env)"' >> /home/vscode/.bashrc \
    && echo 'export PATH="/home/vscode/.local/share/fnm:$PATH"' >> /home/vscode/.zshrc \
    && echo 'eval "$(fnm env)"' >> /home/vscode/.zshrc

USER root

# Persist bash history.
RUN SNIPPET="export PROMPT_COMMAND='history -a' && export HISTFILE=/commandhistory/.bash_history" \
  && mkdir /commandhistory \
  && touch /commandhistory/.bash_history \
  && chown -R vscode /commandhistory
