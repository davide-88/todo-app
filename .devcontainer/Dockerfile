FROM mcr.microsoft.com/devcontainers/base:bookworm

ARG TZ
ENV TZ="$TZ"

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
